import gameApp from './game.ts'
import type { GameState, HintInfo } from '../types.ts'
import assert from 'node:assert'
import { describe, test } from 'node:test'

describe('Game Routes Tests', () => {
  const mockEnv = {
    WORKERS_AI_WORDS_MODEL_NAME: 'dummy-words-model',
    WORKERS_AI_HINTS_MODEL_NAME: 'dummy-hints-model',
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
        if (options?.text) {
          return {
            data: options.text.map((txt: string) => {
              // 単語文字列を数値ハッシュ化して決定論的な2次元ベクトルを生成
              let hash = 0
              for (let i = 0; i < txt.length; i++) hash += txt.charCodeAt(i)
              return [Math.cos(hash), Math.sin(hash), 0]
            }),
          }
        }
        if (options?.response_format?.json_schema?.properties?.hint) {
          return {
            response: {
              reasoning: 'りんごとみかんは果物であり、爆弾には連想されません。',
              hint: '果物',
              count: 3,
              targetWords: ['単語1', '単語2', '単語3'],
            },
          }
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

  test('POST /start - ゲームの開始とセッションIDの生成 (デフォルト/useZenn: true)', async () => {
    const startRes = await gameApp.request(
      '/start',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useZenn: true }),
      },
      mockEnv
    )
    assert.strictEqual(startRes.status, 200)

    const gameState = (await startRes.json()) as GameState
    assert.ok(gameState.sessionId)
    assert.ok(gameState.currentHint)
    assert.strictEqual(gameState.currentHint.hint, '果物')
    assert.strictEqual(gameState.remainingGuesses, 3)
    assert.strictEqual(gameState.board.length, 9)
    assert.ok(Array.isArray(gameState.board[0].vector))
    assert.strictEqual(gameState.board[0].vector?.length, 3)
  })

  test('POST /start - useZenn: false で Zenn トレンドを含めずにゲーム開始', async () => {
    const startRes = await gameApp.request(
      '/start',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useZenn: false }),
      },
      mockEnv
    )
    assert.strictEqual(startRes.status, 200)

    const gameState = (await startRes.json()) as GameState
    assert.ok(gameState.sessionId)
    assert.strictEqual(gameState.board.length, 9)
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
      body: JSON.stringify({
        sessionId: '1',
        boardItems: [
          { word: 'りんご', type: 'correct' },
          { word: 'みかん', type: 'correct' },
          { word: '爆弾', type: 'spy' },
        ],
      }),
      headers: { 'Content-Type': 'application/json' }
    }, mockEnv)
    assert.strictEqual(hintRes.status, 200)

    const json = (await hintRes.json()) as { currentHint: HintInfo; remainingGuesses: number }
    assert.strictEqual(json.currentHint.hint, '果物')
    assert.strictEqual(json.remainingGuesses, 2)
  })
})

