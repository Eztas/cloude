import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { fetchZennArticles } from './zennFeed.ts'
import type { Bindings } from '../types.ts'

describe('zennFeed Integration Test (実際の通信)', () => {
  it('実際のURLから1件以上の記事（タイトルとURL）が取得できること', async () => {
    const dummyEnv = {
      cloude_kv: {} as any,
      cloude_AI: {} as any,
      WORKERS_AI_WORDS_MODEL_NAME: 'dummy-words-model',
      WORKERS_AI_HINTS_MODEL_NAME: 'dummy-hints-model',
      ZENN_FEED_URL: 'https://zenn.dev/feed',
    } satisfies Bindings
    const articles = await fetchZennArticles(dummyEnv)
    console.log('\n--- [Integration Test] 実際に取得したZenn記事 (一部) ---')
    articles.slice(0, 5).forEach((article, index) => {
      console.log(`[${index + 1}] ${article.title} (${article.url})`)
    })
    console.log('------------------------------------------------------------\n')

    assert.ok(articles.length > 0, '取得記事数が1件以上であること')
    assert.strictEqual(typeof articles[0].title, 'string', 'titleが文字列であること')
    assert.strictEqual(typeof articles[0].url, 'string', 'urlが文字列であること')
  })
})
