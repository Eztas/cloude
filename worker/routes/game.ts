import { Hono } from 'hono'
import type { Bindings, GameState } from '../types.ts'
import { parseGameState } from '../lib/validation.ts'
import { generateBoardWords, generateHint, generateEmbeddings } from '../services/aiService.ts'
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

  const baseBoard = assignBoardTypes(words)

  // 盤面単語の事前Embedding取得
  const embeddings = await generateEmbeddings(c.env, words)
  const rawBoard = baseBoard.map((item, idx) => ({
    ...item,
    ...(embeddings && embeddings[idx] ? { vector: embeddings[idx] } : {}),
  }))

  // 初期ヒント生成
  const { hintText, reasoning } = await generateHint(c.env, rawBoard)
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

// プレイヤーの回答判定・カード開封エンドポイント
game.post('/guess', async (c) => {
  const body = await c.req.json<{
    sessionId: string
    word: string
  }>()

  const gameStateString = await c.env.cloude_kv.get(body.sessionId)
  if (!gameStateString) {
    return c.json({ error: 'Game session not found' }, 404)
  }

  const gameState = parseGameState(gameStateString)
  if (!gameState) {
    return c.json({ error: 'Invalid game state' }, 500)
  }

  const targetItem = gameState.board.find(item => item.word === body.word)
  if (!targetItem || targetItem.revealed) {
    return c.json(gameState)
  }

  // カードを表にする
  targetItem.revealed = true
  gameState.remainingGuesses = Math.max(0, gameState.remainingGuesses - 1)

  // 判定結果の更新
  if (targetItem.type === 'spy') {
    gameState.gameStatus = 'game_over'
    gameState.remainingGuesses = 0
  } else {
    const unrevealedCorrect = gameState.board.filter(i => i.type === 'correct' && !i.revealed)
    if (unrevealedCorrect.length === 0) {
      gameState.gameStatus = 'won'
      gameState.remainingGuesses = 0
    }
  }

  gameState.history.push({
    hint: gameState.currentHint?.hint ?? '',
    guess: body.word,
    result: targetItem.type,
  })

  await c.env.cloude_kv.put(gameState.sessionId, JSON.stringify(gameState))
  return c.json(gameState)
})

// AIターン：次のヒントのみを要求して更新するエンドポイント
game.post('/hint', async (c) => {
  const body = await c.req.json<{
    sessionId: string
    boardItems?: GameState['board']
  }>()

  const gameStateString = await c.env.cloude_kv.get(body.sessionId)
  let gameState: GameState | null = null
  if (gameStateString) {
    gameState = parseGameState(gameStateString)
  }

  // フロントから渡された boardItems がある場合は優先して KV の gameState.board も更新
  if (body.boardItems && gameState) {
    gameState.board = body.boardItems
  }

  const currentBoard = body.boardItems ?? gameState?.board ?? []
  const activeBoardItems = currentBoard.filter(i => !i.revealed)

  const correctCount = activeBoardItems.filter(i => i.type === 'correct').length
  if (correctCount === 0) {
    return c.json({ error: 'No remaining correct words for hint' }, 400)
  }

  const { hintText, reasoning } = await generateHint(c.env, activeBoardItems)
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

