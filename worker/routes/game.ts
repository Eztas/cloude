import { Hono } from 'hono'
import type { Bindings, GameState } from '../types.ts'
import { parseGameState } from '../lib/validation.ts'
import { generateBoardWords, generateHint, guessWords } from '../services/aiService.ts'
import { fetchZennTitles } from '../services/zennFeed.ts'
import { parseHintString } from '../lib/hintParser.ts'
import { assignBoardTypes } from '../lib/boardAssigner.ts'

const game = new Hono<{ Bindings: Bindings }>()

// ボード生成の共通処理
const buildBoard = async (env: Bindings, useZenn: boolean) => {
  let selectedTitles: string[] = []
  if (useZenn) {
    const zennTitles = await fetchZennTitles(env)
    const shuffledTitles = [...zennTitles].sort(() => Math.random() - 0.5)
    selectedTitles = shuffledTitles.slice(0, 3)
  }
  const words = await generateBoardWords(env, selectedTitles)
  if (!words) return null
  return assignBoardTypes(words)
}

// 諜報員モード: AIがヒントを出してプレイヤーがカードを当てる
game.post('/start/ai-hint', async (c) => {
  const body = await c.req.json<{ useZenn?: boolean }>().catch(() => ({}) as { useZenn?: boolean })
  const rawBoard = await buildBoard(c.env, body.useZenn ?? true)

  if (!rawBoard) {
    return c.json({ error: 'Failed to generate valid game board' }, 500)
  }

  const spyWords = rawBoard.filter(i => i.type === 'spy').map(i => i.word)
  const correctWords = rawBoard.filter(i => i.type === 'correct').map(i => i.word)
  const { hintText, reasoning } = await generateHint(c.env, correctWords, spyWords)
  const currentHint = {
    ...parseHintString(hintText),
    ...(reasoning ? { reasoning } : {}),
  }

  const gameState: GameState = {
    sessionId: crypto.randomUUID(),
    mode: 'user_hint',
    board: rawBoard.map(item => ({ ...item, revealed: false })),
    gameStatus: 'playing',
    history: [],
    currentHint,
    remainingGuesses: currentHint.count,
  }

  await c.env.cloude_kv.put(gameState.sessionId, JSON.stringify(gameState))
  return c.json(gameState)
})

// スパイマスターモード: プレイヤーがヒントを出してAIがカードを当てる（ヒント生成なしで即時開始）
game.post('/start/user-hint', async (c) => {
  const body = await c.req.json<{ useZenn?: boolean }>().catch(() => ({}) as { useZenn?: boolean })
  const rawBoard = await buildBoard(c.env, body.useZenn ?? true)

  if (!rawBoard) {
    return c.json({ error: 'Failed to generate valid game board' }, 500)
  }

  const gameState: GameState = {
    sessionId: crypto.randomUUID(),
    mode: 'user_hint',
    board: rawBoard.map(item => ({ ...item, revealed: false })),
    gameStatus: 'playing',
    history: [],
    currentHint: null,
    remainingGuesses: 0,
  }

  await c.env.cloude_kv.put(gameState.sessionId, JSON.stringify(gameState))
  return c.json(gameState)
})

// AIターン：次のヒントのみを要求して更新するエンドポイント
game.post('/hint', async (c) => {
  const body = await c.req.json<{
    sessionId: string
    correctWords?: string[]
    spyWords?: string[]
  }>()

  const gameStateString = await c.env.cloude_kv.get(body.sessionId)
  let gameState: GameState | null = null
  if (gameStateString) {
    gameState = parseGameState(gameStateString)
  }

  const correctWords =
    body.correctWords ??
    (gameState ? gameState.board.filter(i => i.type === 'correct' && !i.revealed).map(i => i.word) : [])
  const spyWords =
    body.spyWords ??
    (gameState ? gameState.board.filter(i => i.type === 'spy').map(i => i.word) : [])

  if (correctWords.length === 0) {
    return c.json({ error: 'No remaining correct words for hint' }, 400)
  }

  const { hintText, reasoning } = await generateHint(c.env, correctWords, spyWords)
  const currentHint = {
    ...parseHintString(hintText),
    ...(reasoning ? { reasoning } : {}),
  }

  if (gameState) {
    gameState.currentHint = currentHint
    gameState.remainingGuesses = currentHint.count
    await c.env.cloude_kv.put(body.sessionId, JSON.stringify(gameState))
  }

  return c.json({
    currentHint,
    remainingGuesses: currentHint.count,
    gameState,
  })
})

// スパイマスターモード: プレイヤーのヒントを受け取りAIが推測してカードを開示するエンドポイント
game.post('/ai-guess', async (c) => {
  const body = await c.req.json<{ sessionId: string; hint: string; count: number }>()

  const gameStateString = await c.env.cloude_kv.get(body.sessionId)
  if (!gameStateString) {
    return c.json({ error: 'Session not found' }, 404)
  }

  const gameState = parseGameState(gameStateString)
  if (!gameState || gameState.gameStatus !== 'playing') {
    return c.json({ error: 'Game is not in progress' }, 400)
  }

  const candidateWords = gameState.board
    .filter(i => !i.revealed)
    .map(i => i.word)

  const aiResult = await guessWords(c.env, body.hint, body.count, candidateWords)
  if (!aiResult) {
    return c.json({ error: 'AI guess failed' }, 500)
  }

  // 推測した単語を順番に開示して勝敗判定
  for (const guess of aiResult.guesses) {
    const card = gameState.board.find(i => i.word === guess && !i.revealed)
    if (!card) continue

    card.revealed = true
    gameState.history.push({ hint: body.hint, guess, result: card.type })

    if (card.type === 'spy') {
      gameState.gameStatus = 'game_over'
      gameState.remainingGuesses = 0
      break
    }

    const unrevealedCorrect = gameState.board.filter(i => i.type === 'correct' && !i.revealed)
    if (unrevealedCorrect.length === 0) {
      gameState.gameStatus = 'won'
      gameState.remainingGuesses = 0
      break
    }
  }

  if (gameState.gameStatus === 'playing') {
    gameState.currentHint = { hint: body.hint, count: body.count, reasoning: aiResult.reasoning }
    gameState.remainingGuesses = 0
  }

  await c.env.cloude_kv.put(body.sessionId, JSON.stringify(gameState))
  return c.json({ gameState, reasoning: aiResult.reasoning })
})

export default game
