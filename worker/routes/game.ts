import { Hono } from 'hono'
import type { Bindings, GameState } from '../types.ts'
import { parseGameState } from '../lib/validation.ts'
import { generateBoardWords, generateHint } from '../services/aiService.ts'
import { fetchZennTitles } from '../services/zennFeed.ts'
import { parseHintString } from '../lib/hintParser.ts'
import { assignBoardTypes } from '../lib/boardAssigner.ts'

const game = new Hono<{ Bindings: Bindings }>()

// 新しいゲームセッションの開始
game.post('/start', async (c) => {
  const body = await c.req.json<{ useZenn?: boolean }>().catch(() => ({}) as { useZenn?: boolean })
  const useZenn = body.useZenn ?? true

  let selectedTitles: string[] = []
  if (useZenn) {
    const zennTitles = await fetchZennTitles(c.env)
    const shuffledTitles = [...zennTitles].sort(() => Math.random() - 0.5)
    selectedTitles = shuffledTitles.slice(0, 3)
  }

  const words = await generateBoardWords(c.env, selectedTitles)

  if (!words) {
    return c.json({ error: 'Failed to generate valid game board' }, 500)
  }

  const rawBoard = assignBoardTypes(words)

  // 初期ヒント生成
  const spyWords = rawBoard.filter(i => i.type === 'spy').map(i => i.word)
  const correctWords = rawBoard.filter(i => i.type === 'correct').map(i => i.word)
  const { hintText, reasoning } = await generateHint(c.env, correctWords, spyWords)
  const currentHint = {
    ...parseHintString(hintText),
    ...(reasoning ? { reasoning } : {}),
  }

  const gameState: GameState = {
    sessionId: crypto.randomUUID(),
    board: rawBoard.map(item => ({ ...item, revealed: false })),
    gameStatus: 'playing',
    history: [],
    currentHint,
    remainingGuesses: currentHint.count,
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

export default game

