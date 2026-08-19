import assert from 'node:assert'
import { describe, test } from 'node:test'
import { generateHint, generateBoardWords } from './aiService.ts'
import type { Bindings } from '../types.ts'

describe('aiService Unit Tests', () => {
  test('generateHint - JSON文字列レスポンスを正常にパースしてヒントを返せること', async () => {
    const mockEnv = {
      WORKERS_AI_HINTS_MODEL_NAME: '@cf/meta/llama-3-instruct',
      cloude_AI: {
        run: async () => ({
          response: '{"hint": "プログラミング", "count": 2, "reasoning": "思考プロセス"}',
        }),
      },
    } as unknown as Bindings

    const result = await generateHint(mockEnv, ['JavaScript', 'TypeScript'], ['Python'])
    assert.strictEqual(result.hintText, 'プログラミング: 2枚')
    assert.strictEqual(result.reasoning, '思考プロセス')
  })

  test('generateHint - マークダウン付きJSON文字列を正常にパースしてヒントを返せること', async () => {
    const mockEnv = {
      WORKERS_AI_HINTS_MODEL_NAME: '@cf/meta/llama-3-instruct',
      cloude_AI: {
        run: async () => ({
          response: '```json\n{"hint": "言語", "count": 1, "reasoning": "コードブロック思考"}\n```',
        }),
      },
    } as unknown as Bindings

    const result = await generateHint(mockEnv, ['Ruby'], ['Rust'])
    assert.strictEqual(result.hintText, '言語: 1枚')
    assert.strictEqual(result.reasoning, 'コードブロック思考')
  })

  test('generateBoardWords - マークダウン付きJSON文字列から単語リストを取得できること', async () => {
    const mockEnv = {
      WORKERS_AI_WORDS_MODEL_NAME: '@cf/meta/llama-3-instruct',
      cloude_AI: {
        run: async () => ({
          response: '```json\n{"words": ["1", "2", "3", "4", "5", "6", "7", "8", "9"]}\n```',
        }),
      },
    } as unknown as Bindings

    const words = await generateBoardWords(mockEnv)
    assert.strictEqual(words?.length, 9)
    assert.strictEqual(words?.[0], '1')
  })

  test('generateHint - 不正なレスポンスの場合に「ヒントなし」を返すこと', async () => {
    const mockEnv = {
      WORKERS_AI_HINTS_MODEL_NAME: '@cf/meta/llama-3-instruct',
      cloude_AI: {
        run: async () => ({
          response: '不正なプレーンテキストレスポンス',
        }),
      },
    } as unknown as Bindings

    const result = await generateHint(mockEnv, ['JavaScript'], ['Python'])
    assert.strictEqual(result.hintText, 'ヒントなし')
  })
})

