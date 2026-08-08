import app from './index.ts'
import assert from 'node:assert'
import { describe, test } from 'node:test'

describe('Worker Integration Tests', () => {
  test('ALL /api/unknown - 存在しないAPIで404を返す', async () => {
    const res = await app.request('/api/unknown', { method: 'GET' })
    assert.strictEqual(res.status, 404)

    const json = (await res.json()) as { error: string }
    assert.strictEqual(json.error, 'Not Found')
  })
})
