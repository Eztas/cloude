import assert from 'node:assert'
import { describe, test } from 'node:test'
import { parseAiJsonResponse } from './jsonParser.ts'

describe('parseAiJsonResponse Unit Tests', () => {
  test('オブジェクトがそのまま渡された場合はそのまま返すこと', () => {
    const input = { hint: 'テスト', count: 2 }
    const result = parseAiJsonResponse<{ hint: string; count: number }>(input)
    assert.deepStrictEqual(result, input)
  })

  test('JSON文字列が渡された場合に正しくパースすること', () => {
    const input = '{"hint": "プログラミング", "count": 2, "reasoning": "解説"}'
    const result = parseAiJsonResponse<{ hint: string; count: number; reasoning: string }>(input)
    assert.strictEqual(result?.hint, 'プログラミング')
    assert.strictEqual(result?.count, 2)
    assert.strictEqual(result?.reasoning, '解説')
  })

  test('マークダウンコードブロック付きJSON文字列が渡された場合に正しくパースすること', () => {
    const input = '```json\n{"hint": "言語", "count": 1}\n```'
    const result = parseAiJsonResponse<{ hint: string; count: number }>(input)
    assert.strictEqual(result?.hint, '言語')
    assert.strictEqual(result?.count, 1)
  })

  test('言語指定なしマークダウンコードブロック付きJSON文字列をパースできること', () => {
    const input = '```\n{"hint": "開発", "count": 3}\n```'
    const result = parseAiJsonResponse<{ hint: string; count: number }>(input)
    assert.strictEqual(result?.hint, '開発')
    assert.strictEqual(result?.count, 3)
  })

  test('不正なJSON文字列の場合はnullを返すこと', () => {
    const input = '{"hint": "不完全'
    const result = parseAiJsonResponse(input)
    assert.strictEqual(result, null)
  })

  test('nullまたはundefinedが渡された場合はnullを返すこと', () => {
    assert.strictEqual(parseAiJsonResponse(null), null)
    assert.strictEqual(parseAiJsonResponse(undefined), null)
  })
})
