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
        mode: 'user_hint',
        board: [
          { word: 'りんご', type: 'correct', revealed: false },
          { word: 'みかん', type: 'correct', revealed: false },
          { word: '爆弾', type: 'spy', revealed: false },
        ],
        gameStatus: 'playing',
        history: [],
        currentHint: null,
        remainingGuesses: 0,
      }),
      put: async () => { }
    },
    cloude_AI: {
      run: async (_model: string, options: any) => {
        if (options?.response_format?.json_schema?.properties?.hint) {
          return {
            response: {
              reasoning: 'りんごとみかんは果物であり、爆弾には連想されません。',
              hint: '果物',
              count: 2,
              targetWords: ['りんご', 'みかん'],
            },
          }
        }
        if (options?.response_format?.json_schema?.properties?.words) {
          return {
            response: {
              words: ['単語1', '単語2', '単語3', '単語4', '単語5', '単語6', '単語7', '単語8', '単語9']
            }
          }
        }
        if (options?.response_format?.json_schema?.properties?.guesses) {
          return {
            response: { guesses: ['りんご'], reasoning: 'ヒントに合致' }
          }
        }
        return { response: '果物: 2枚' }
      }
    }
  }

  test('POST /start/ai-hint - 諜報員モードでゲームを開始しヒントが生成されること', async () => {
    const res = await gameApp.request(
      '/start/ai-hint',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useZenn: false }),
      },
      mockEnv
    )
    assert.strictEqual(res.status, 200)

    const gameState = (await res.json()) as GameState
    assert.ok(gameState.sessionId)
    assert.strictEqual(gameState.mode, 'user_hint')
    assert.ok(gameState.currentHint)
    assert.strictEqual(gameState.currentHint.hint, '果物')
    assert.strictEqual(gameState.remainingGuesses, 2)
  })

  test('POST /start/user-hint - スパイマスターモードでゲームを開始しヒントなしで即時返却されること', async () => {
    const res = await gameApp.request(
      '/start/user-hint',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useZenn: false }),
      },
      mockEnv
    )
    assert.strictEqual(res.status, 200)

    const gameState = (await res.json()) as GameState
    assert.ok(gameState.sessionId)
    assert.strictEqual(gameState.mode, 'user_hint')
    assert.strictEqual(gameState.currentHint, null)
    assert.strictEqual(gameState.remainingGuesses, 0)
    assert.strictEqual(gameState.board.length, 9)
  })

  test('POST /start/ai-hint - 不正なAI出力の場合に500エラーを返す', async () => {
    const invalidAiEnv = {
      ...mockEnv,
      cloude_AI: { run: async () => 'invalid-ai-response' }
    }
    const res = await gameApp.request('/start/ai-hint', { method: 'POST' }, invalidAiEnv)
    assert.strictEqual(res.status, 500)

    const errorJson = (await res.json()) as { error: string }
    assert.strictEqual(errorJson.error, 'Failed to generate valid game board')
  })

  test('POST /hint - 次のヒント生成要求', async () => {
    const hintEnv = {
      ...mockEnv,
      cloude_kv: {
        ...mockEnv.cloude_kv,
        get: async (key: string) => JSON.stringify({
          sessionId: key,
          mode: 'ai_hint',
          board: [
            { word: 'りんご', type: 'correct', revealed: false },
            { word: 'みかん', type: 'correct', revealed: false },
            { word: '爆弾', type: 'spy', revealed: false },
          ],
          gameStatus: 'playing',
          history: [],
          currentHint: { hint: '果物', count: 2 },
          remainingGuesses: 2,
        }),
      },
    }
    const hintRes = await gameApp.request('/hint', {
      method: 'POST',
      body: JSON.stringify({ sessionId: '1', correctWords: ['りんご', 'みかん'], spyWords: ['爆弾'] }),
      headers: { 'Content-Type': 'application/json' }
    }, hintEnv)
    assert.strictEqual(hintRes.status, 200)

    const json = (await hintRes.json()) as { currentHint: HintInfo; remainingGuesses: number }
    assert.strictEqual(json.currentHint.hint, '果物')
    assert.strictEqual(json.remainingGuesses, 2)
  })

  test('POST /ai-guess - AIが推測してカードを開示すること', async () => {
    const res = await gameApp.request('/ai-guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'session-1', hint: '果物', count: 1 }),
    }, mockEnv)
    assert.strictEqual(res.status, 200)

    const json = (await res.json()) as { gameState: GameState; reasoning: string }
    const revealedWords = json.gameState.board.filter(i => i.revealed).map(i => i.word)
    assert.ok(revealedWords.includes('りんご'))
  })

  test('POST /ai-guess - セッションが存在しない場合に404を返すこと', async () => {
    const noSessionEnv = {
      ...mockEnv,
      cloude_kv: { get: async () => null, put: async () => { } }
    }
    const res = await gameApp.request('/ai-guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'no-session', hint: '果物', count: 1 }),
    }, noSessionEnv)
    assert.strictEqual(res.status, 404)
  })
})
