import { Hono } from 'hono'
import type { Bindings, GameState } from '../types.ts'
import { parseGameState } from '../utils/validation.ts'
import { generateBoard, generateHint } from '../services/aiService.ts'

const game = new Hono<{ Bindings: Bindings }>()

// 新しいゲームセッションの開始
game.post('/start', async (c) => {
  const rawBoard = await generateBoard(c.env)

  if (!rawBoard) {
    return c.json({ error: 'Failed to generate valid game board' }, 500)
  }

  const gameState: GameState = {
    sessionId: crypto.randomUUID(),
    board: rawBoard.map(item => ({ ...item, revealed: false })),
    gameStatus: 'playing',
    history: [],
  }

  // 初期ヒント生成
  const spyWords = gameState.board.filter(i => i.type === 'spy').map(i => i.word)
  const initialHint = await generateHint(
    c.env,
    gameState.board.filter(i => i.type === 'correct').map(i => i.word),
    spyWords
  )
  gameState.history.push({ hint: initialHint, guess: 'ゲーム開始', result: 'correct' })

  await c.env.cloude_kv.put(gameState.sessionId, JSON.stringify(gameState))
  return c.json(gameState)
})

// ユーザーの回答を送信し、判定と次のヒントを取得
game.post('/guess', async (c) => {
  const { sessionId, word } = await c.req.json<{ sessionId: string; word: string }>()

  const gameStateString = await c.env.cloude_kv.get(sessionId)
  if (!gameStateString) return c.json({ error: 'Session not found' }, 404)

  const gameState = parseGameState(gameStateString)
  if (!gameState) return c.json({ error: 'Failed to parse game state' }, 500)

  // 判定ロジック
  const targetBoardItem = gameState.board.find(item => item.word === word)
  if (targetBoardItem && !targetBoardItem.revealed) {
    targetBoardItem.revealed = true

    // 次のヒント生成
    const remainingCorrect = gameState.board
      .filter(i => i.type === 'correct' && !i.revealed)
      .map(i => i.word)
    const currentSpyWords = gameState.board
      .filter(i => i.type === 'spy')
      .map(i => i.word)
    let nextHint = ''
    if (remainingCorrect.length > 0) {
      nextHint = await generateHint(c.env, remainingCorrect, currentSpyWords)
    }

    // 履歴追加
    gameState.history.push({
      hint: nextHint,
      guess: word,
      result: targetBoardItem.type,
    })

    if (targetBoardItem.type === 'spy') {
      gameState.gameStatus = 'game_over'
    } else if (gameState.board.every(item => item.type === 'spy' || item.revealed)) {
      gameState.gameStatus = 'won'
    }
  }

  await c.env.cloude_kv.put(sessionId, JSON.stringify(gameState))

  return c.json(gameState)
})

export default game
