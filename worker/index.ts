import { Hono } from 'hono'

// Cloudflare Workers の Env (Bindings) 型定義
type Bindings = {
  cloude_kv: KVNamespace
  cloude_AI: Ai
}

// 残しておく
// const WORKERS_AI_MODEL_NAME = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

// ゲーム状態の型定義
export interface GameState {
  sessionId: string;
  board: {
    word: string;
    type: 'correct' | 'spy';
    revealed: boolean;
  }[]; // 9 elements
  gameStatus: 'playing' | 'won' | 'game_over';
  history: { hint: string; guess: string; result: 'correct' | 'spy' }[];
}

const app = new Hono<{ Bindings: Bindings }>()

// 新しいゲームセッションの開始
app.post('/api/game/start', async (c) => {
  // TODO: AIで単語を生成し、KVに保存して返す
  const gameState: GameState = {
    sessionId: crypto.randomUUID(),
    board: Array(9).fill(null).map(() => ({ word: '仮の単語', type: 'correct', revealed: false })),
    gameStatus: 'playing',
    history: []
  };
  return c.json(gameState)
})

// ユーザーの回答を送信し、判定と次のヒントを取得
app.post('/api/game/guess', async (c) => {
  const { sessionId, word } = await c.req.json<{ sessionId: string, word: string }>()
  
  // TODO: KVからセッションを取得し、判定ロジックを実行して更新
  const updatedGameState: GameState = {
    sessionId,
    board: Array(9).fill(null).map(() => ({ word: '仮の単語', type: 'correct', revealed: true })),
    gameStatus: 'playing',
    history: [{ hint: 'テストヒント', guess: word, result: 'correct' }]
  };
  
  return c.json(updatedGameState)
})

// 存在しない API ルートへのレスポンスなど
app.all('/api/*', (c) => {
  return c.json({ error: 'Not Found' }, 404)
})

export default app
