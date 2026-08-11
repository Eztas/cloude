import gameApp from './game.ts'
import type { GameState, HintInfo } from '../types.ts'
import assert from 'node:assert'
import { describe, test } from 'node:test'

describe('Game Routes Tests', () => {
  const mockEnv = {
    WORKERS_AI_MODEL_NAME: 'dummy',
    ZENN_FEED_URL: 'https://zenn.dev/feed',
    cloude_kv: {
      get: async (key: string) => JSON.stringify({
        sessionId: key,
        board: [
          { word: 'りんご', type: 'correct', revealed: false },
          { word: 'みかん', type: 'correct', revealed: false },
          { word: '爆弾', type: 'spy', revealed: false },
        ],
        gameStatus: 'playing',
        history: [],
        currentHint: { hint: '果物', count: 2 },
        remainingGuesses: 2
      }),
      put: async () => { }
    },
    cloude_AI: {
      run: async (_model: string, options: any) => {
        if (options?.response_format?.json_schema?.properties?.hint) {
          return { response: { hint: '果物', count: 2, targetWords: ['りんご', 'みかん'] } }
        }
        if (options?.response_format?.json_schema?.properties?.words) {
          return {
            response: {
              words: [
                '単語1', '単語2', '単語3', '単語4', '単語5', '単語6', '単語7', '単語8', '単語9'
              ]
            }
          }
        }
        return { response: '果物: 2枚' }
      }
    }
  }

  test('POST /start - ゲームの開始とセッションIDの生成', async () => {
    const startRes = await gameApp.request('/start', { method: 'POST' }, mockEnv)
    assert.strictEqual(startRes.status, 200)

    const gameState = (await startRes.json()) as GameState
    assert.ok(gameState.sessionId)
    assert.ok(gameState.currentHint)
    assert.strictEqual(gameState.currentHint.hint, '果物')
    assert.strictEqual(gameState.remainingGuesses, 2)
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

  test('POST /hint - 次のヒント生成要求', async () => {
    const hintRes = await gameApp.request('/hint', {
      method: 'POST',
      body: JSON.stringify({ sessionId: '1', correctWords: ['りんご', 'みかん'], spyWords: ['爆弾'] }),
      headers: { 'Content-Type': 'application/json' }
    }, mockEnv)
    assert.strictEqual(hintRes.status, 200)

    const json = (await hintRes.json()) as { currentHint: HintInfo; remainingGuesses: number }
    assert.strictEqual(json.currentHint.hint, '果物')
    assert.strictEqual(json.remainingGuesses, 2)
  })
})

