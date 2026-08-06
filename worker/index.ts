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

const parseGameState = (str: string): GameState | null => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

const isBoardItem = (item: unknown): item is BoardItem => {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as Record<string, unknown>).word === 'string' &&
    ((item as Record<string, unknown>).type === 'correct' ||
      (item as Record<string, unknown>).type === 'spy')
  );
};

const isBoardItemList = (items: unknown): items is BoardItem[] => {
  return Array.isArray(items) && items.length > 0 && items.every(isBoardItem);
};

// 新しいゲームセッションの開始
app.post('/api/game/start', async (c) => {
  const prompt = `9つの異なる名詞を生成し、そのうち2枚を「スパイ」、7枚を「正解」にランダムに設定してJSONで出力してください。
[
  {"word": "単語1", "type": "correct"},
  {"word": "単語2", "type": "spy"},
  ...
]
`;
  const rawBoard = await c.env.cloude_AI.run(WORKERS_AI_MODEL_NAME, { prompt });

  if (!isBoardItemList(rawBoard)) {
    return c.json({ error: 'Failed to generate valid game board' }, 500);
  }

  const gameState: GameState = {
    sessionId: crypto.randomUUID(),
    board: rawBoard.map(item => ({ ...item, revealed: false })),
    gameStatus: 'playing',
    history: []
  };

  // ponytail: 簡易的なKV保存を想定して現状はメモリ上で返す。本番は c.env.cloude_kv.put(gameState.sessionId, JSON.stringify(gameState))
  return c.json(gameState)
})

// ユーザーの回答を送信し、判定と次のヒントを取得
app.post('/api/game/guess', async (c) => {
  const { sessionId, word } = await c.req.json<{ sessionId: string, word: string }>();

  const gameStateString = await c.env.cloude_kv.get(sessionId);
  if (!gameStateString) return c.json({ error: 'Session not found' }, 404);

  const gameState = parseGameState(gameStateString);
  if (!gameState) return c.json({ error: 'Failed to parse game state' }, 500);
  
  // 判定ロジック
  const targetBoardItem = gameState.board.find(item => item.word === word);
  if (targetBoardItem && !targetBoardItem.revealed) {
    targetBoardItem.revealed = true;
    
    // 履歴追加
    gameState.history.push({
      hint: '', // TODO: AIで生成
      guess: word,
      result: targetBoardItem.type
    });

    if (targetBoardItem.type === 'spy') {
      gameState.gameStatus = 'game_over';
    } else if (gameState.board.every(item => item.type === 'spy' || item.revealed)) {
      gameState.gameStatus = 'won';
    }
  }

  // ponytail: KV保存
  await c.env.cloude_kv.put(sessionId, JSON.stringify(gameState));
  
  return c.json(gameState);
});

// 存在しない API ルートへのレスポンスなど
app.all('/api/*', (c) => {
  return c.json({ error: 'Not Found' }, 404)
})

export default app
