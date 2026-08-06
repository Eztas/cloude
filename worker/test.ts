import app, { type GameState } from './index.ts';
import assert from 'node:assert';

async function testGameLogic() {
  console.log('Running game logic test...');

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

  // 1. Test /api/game/start
  const startRes = await app.request('/api/game/start', { method: 'POST' }, mockEnv);
  assert.strictEqual(startRes.status, 200);
  const gameState = (await startRes.json()) as GameState;
  assert.ok(gameState.sessionId);
  console.log('Test /api/game/start: PASSED');

  // 2. Test /api/game/guess
  const guessRes = await app.request('/api/game/guess', {
    method: 'POST',
    body: JSON.stringify({ sessionId: '1', word: 'test' }),
    headers: { 'Content-Type': 'application/json' }
  }, mockEnv);
  assert.strictEqual(guessRes.status, 200);
  const updatedState = (await guessRes.json()) as GameState;
  assert.strictEqual(updatedState.board[0].revealed, true);
  console.log('Test /api/game/guess: PASSED');
}

testGameLogic().catch(err => {
  console.error(err);
  process.exit(1);
});
