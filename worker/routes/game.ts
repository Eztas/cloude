import { Hono } from 'hono'
import type { Bindings, GameState } from '../types.ts'
import { parseGameState } from '../utils/validation.ts'
import { generateBoard, generateHint } from '../services/aiService.ts'
import { parseHintString } from '../utils/hintParser.ts'

const game = new Hono<{ Bindings: Bindings }>()

// 新しいゲームセッションの開始
game.post('/start', async (c) => {
  const rawBoard = await generateBoard(c.env)

  if (!rawBoard) {
    return c.json({ error: 'Failed to generate valid game board' }, 500)
  }

  // 初期ヒント生成
  const spyWords = rawBoard.filter(i => i.type === 'spy').map(i => i.word)
  const correctWords = rawBoard.filter(i => i.type === 'correct').map(i => i.word)
  const initialHintText = await generateHint(c.env, correctWords, spyWords)
  const currentHint = parseHintString(initialHintText)

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

  const nextHintText = await generateHint(c.env, correctWords, spyWords)
  const currentHint = parseHintString(nextHintText)

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

