import { Hono } from 'hono'

// Cloudflare Workers の Env (Bindings) 型定義
type Bindings = {
  cloude_kv: KVNamespace
  cloude_AI: Ai
}

const WORKERS_AI_MODEL_NAME = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

// ゲーム状態の型定義
export type BoardItem = {
  word: string;
  type: 'correct' | 'spy';
};

export interface GameState {
  sessionId: string;
  board: (BoardItem & { revealed: boolean })[];
  gameStatus: 'playing' | 'won' | 'game_over';
  history: { hint: string; guess: string; result: 'correct' | 'spy' }[];
}

const app = new Hono<{ Bindings: Bindings }>()

// 新しいゲームセッションの開始
app.post('/api/game/start', async (c) => {
  const prompt = `9つの異なる名詞を生成し、そのうち2枚を「スパイ」、7枚を「正解」にランダムに設定してJSONで出力してください。
[
  {"word": "単語1", "type": "correct"},
  {"word": "単語2", "type": "spy"},
  ...
]
`;
  const board = await c.env.cloude_AI.run(WORKERS_AI_MODEL_NAME, { prompt });

  const gameState: GameState = {
    sessionId: crypto.randomUUID(),
    board: (board as BoardItem[]).map(item => ({ ...item, revealed: false })),
    gameStatus: 'playing',
    history: []
  };

  // ponytail: 簡易的なKV保存を想定して現状はメモリ上で返す。本番は c.env.cloude_kv.put(gameState.sessionId, JSON.stringify(gameState))
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
