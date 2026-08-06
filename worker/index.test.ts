import app, { type GameState } from './index.ts';
import assert from 'node:assert';
import { describe, test } from 'node:test';

describe('Game Logic Tests', () => {
  const mockEnv = {
    cloude_kv: {
      get: async (key: string) => JSON.stringify({
        sessionId: key,
        board: [{ word: 'test', type: 'correct', revealed: false }],
        gameStatus: 'playing',
        history: []
      }),
      put: async () => { }
    },
    cloude_AI: { run: async () => [{ word: 'test', type: 'correct' }] }
  };

  test('POST /api/game/start - ゲームの開始とセッションIDの生成', async () => {
    const startRes = await app.request('/api/game/start', { method: 'POST' }, mockEnv);
    assert.strictEqual(startRes.status, 200);

    const gameState = (await startRes.json()) as GameState;
    assert.ok(gameState.sessionId);
  });

  test('POST /api/game/guess - 単語の回答とボードの状態更新', async () => {
    const guessRes = await app.request('/api/game/guess', {
      method: 'POST',
      body: JSON.stringify({ sessionId: '1', word: 'test' }),
      headers: { 'Content-Type': 'application/json' }
    }, mockEnv);
    assert.strictEqual(guessRes.status, 200);

    const updatedState = (await guessRes.json()) as GameState;
    assert.strictEqual(updatedState.board[0].revealed, true);
  });
});
