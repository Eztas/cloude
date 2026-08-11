import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { fetchZennTitles } from './zennFeed.ts'

describe('zennFeed Integration Test (実際の通信)', () => {
  it('実際のURLから1件以上のタイトルが取得できること', async () => {
    const dummyEnv = {
      cloude_kv: {} as any,
      cloude_AI: {} as any,
      WORKERS_AI_MODEL_NAME: 'dummy',
      ZENN_FEED_URL: 'https://zenn.dev/feed',
    }
    const titles = await fetchZennTitles(dummyEnv)
    console.log('\n--- [Integration Test] 実際に取得したZennタイトル (一部) ---')
    titles.slice(0, 5).forEach((title, index) => {
      console.log(`[${index + 1}] ${title}`)
    })
    console.log('------------------------------------------------------------\n')

    assert.ok(titles.length > 0, '取得タイトル数が1件以上であること')
    assert.strictEqual(typeof titles[0], 'string', '各要素が文字列であること')
  })
})
