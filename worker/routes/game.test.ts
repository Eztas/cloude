import gameApp from './game.ts'
import type { GameState } from '../types.ts'
import assert from 'node:assert'
import { describe, test } from 'node:test'

describe('Game Routes Tests', () => {
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
    cloude_AI: {
      run: async (_model: string, options: any) => {
        if (options?.response_format?.json_schema?.properties?.hint) {
          return { response: { hint: 'テストヒント', count: 2, targetWords: ['test'] } }
        }
        if (options?.response_format?.json_schema?.properties?.board) {
          return { response: { board: [{ word: 'test', type: 'correct' }] } }
        }
        return { response: 'mocked hint' }
      }
    }
  }

  test('POST /start - ゲームの開始とセッションIDの生成', async () => {
    const startRes = await gameApp.request('/start', { method: 'POST' }, mockEnv)
    assert.strictEqual(startRes.status, 200)

    const gameState = (await startRes.json()) as GameState
    assert.ok(gameState.sessionId)
  })

  test('POST /start - 不正なAI出力の場合に500エラーを返す', async () => {
    const invalidAiEnv = {
      ...mockEnv,
      cloude_AI: { run: async () => 'invalid-ai-response' }
    }
    const startRes = await gameApp.request('/start', { method: 'POST' }, invalidAiEnv)
    assert.strictEqual(startRes.status, 500)

    const errorJson = (await startRes.json()) as { error: string }
    assert.strictEqual(errorJson.error, 'Failed to generate valid game board')
  })

  test('POST /guess - 単語の回答とボードの状態更新', async () => {
    const guessRes = await gameApp.request('/guess', {
      method: 'POST',
      body: JSON.stringify({ sessionId: '1', word: 'test' }),
      headers: { 'Content-Type': 'application/json' }
    }, mockEnv)
    assert.strictEqual(guessRes.status, 200)

    const updatedState = (await guessRes.json()) as GameState
    assert.strictEqual(updatedState.board[0].revealed, true)
  })

  test('POST /guess - 壊れたKVデータの場合に500エラーを返す', async () => {
    const invalidEnv = {
      ...mockEnv,
      cloude_kv: {
        ...mockEnv.cloude_kv,
        get: async () => 'invalid-json-{',
      }
    }
    const guessRes = await gameApp.request('/guess', {
      method: 'POST',
      body: JSON.stringify({ sessionId: '1', word: 'test' }),
      headers: { 'Content-Type': 'application/json' }
    }, invalidEnv)
    assert.strictEqual(guessRes.status, 500)

    const errorJson = (await guessRes.json()) as { error: string }
    assert.strictEqual(errorJson.error, 'Failed to parse game state')
  })
})
