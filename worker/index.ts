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

const AI_BOARD_SCHEMA = {
  type: 'object',
  properties: {
    board: {
      type: 'array',
      minItems: 9,
      maxItems: 9,
      items: {
        type: 'object',
        properties: {
          word: { type: 'string' },
          type: { type: 'string', enum: ['correct', 'spy'] }
        },
        required: ['word', 'type']
      }
    }
  },
  required: ['board']
};

// ponytail: ヒント生成関数
const generateHint = async (env: Bindings, correctWords: string[]): Promise<string> => {
  const result = await env.cloude_AI.run(WORKERS_AI_MODEL_NAME, {
    messages: [
      {
        role: 'system',
        content: 'あなたはヒントを出す役割です。以下の単語群から連想される、10文字以内の単語を1つだけ返してください。余計な文字は一切出力しないでください。'
      },
      {
        role: 'user',
        content: `残りの正解単語: ${correctWords.join(', ')}`
      }
    ]
  });
  return (result as { response: string }).response.trim();
};

// 新しいゲームセッションの開始
app.post('/api/game/start', async (c) => {
  const result = await c.env.cloude_AI.run(WORKERS_AI_MODEL_NAME, {
    messages: [
      {
        role: 'system',
        content: '日本語の名詞のみを生成するアシスタントです。指定されたJSON Schemaに厳密に従って出力してください。'
      },
      {
        role: 'user',
        content: '9つの異なる日本語の名詞を生成し、そのうち2つを type: "spy"、7つを type: "correct" としてランダムに割り当ててください。'
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: AI_BOARD_SCHEMA
    }
  });

  // JSON Mode時は result.response が既にオブジェクト（パース済み）
  const rawBoard = (result as { response?: { board?: unknown } }).response?.board;
  console.log('AI Response:', JSON.stringify(rawBoard, null, 2));

  if (!isBoardItemList(rawBoard)) {
    console.log('Unexpected AI response:', JSON.stringify(result));
    return c.json({ error: 'Failed to generate valid game board' }, 500);
  }

  const gameState: GameState = {
    sessionId: crypto.randomUUID(),
    board: rawBoard.map(item => ({ ...item, revealed: false })),
    gameStatus: 'playing',
    history: []
  };

  // ponytail: 初期ヒント生成
  const initialHint = await generateHint(c.env, gameState.board.filter(i => i.type === 'correct').map(i => i.word));
  gameState.history.push({ hint: initialHint, guess: 'ゲーム開始', result: 'correct' });

  await c.env.cloude_kv.put(gameState.sessionId, JSON.stringify(gameState));
  return c.json(gameState);
});


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
    
    // ponytail: 次のヒント生成
    const remainingCorrect = gameState.board.filter(i => i.type === 'correct' && !i.revealed).map(i => i.word);
    let nextHint = '';
    if (remainingCorrect.length > 0) {
      nextHint = await generateHint(c.env, remainingCorrect);
    }
    
    // 履歴追加
    gameState.history.push({
      hint: nextHint,
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
