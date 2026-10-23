import { env } from 'cloudflare:workers'
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { fetchZennArticles } from './zennFeed.ts'
import type { Bindings, ZennArticle } from '../types.ts'

// cloudflare:workers の env は workerd 上で動く実バインディング（wrangler.vitest.jsonc の cloude_kv）
const bindings = env as unknown as Bindings
const CACHE_KEY = 'zenn:trend-articles:v1'

// テスト間でキャッシュが混ざらないよう、各テストの冒頭でキャッシュキーを初期化する
async function resetCache(): Promise<void> {
  await bindings.cloude_kv.delete(CACHE_KEY)
}

describe('zennFeed Integration Test (実際の通信)', () => {
  it('実際のURLから1件以上の記事（タイトルとURL）が取得できること', async () => {
    await resetCache()
    const articles = await fetchZennArticles(bindings)
    console.log('\n--- [Integration Test] 実際に取得したZenn記事 (一部) ---')
    articles.slice(0, 5).forEach((article, index) => {
      console.log(`[${index + 1}] ${article.title} (${article.url})`)
    })
    console.log('------------------------------------------------------------\n')

    assert.ok(articles.length > 0, '取得記事数が1件以上であること')
    assert.strictEqual(typeof articles[0].title, 'string', 'titleが文字列であること')
    assert.strictEqual(typeof articles[0].url, 'string', 'urlが文字列であること')
  })

  it('取得結果が実KVにキャッシュされ、中身が元の記事配列と一致すること', async () => {
    await resetCache()
    const articles = await fetchZennArticles(bindings)
    assert.ok(articles.length > 0, '前提: 実通信で1件以上取得できること')

    // KVの中身を直接読んで検証（データベースの中身を見れるテスト）
    const raw = await bindings.cloude_kv.get(CACHE_KEY)
    assert.ok(raw, 'KVにキャッシュが保存されていること')
    const cached: unknown = JSON.parse(raw)
    assert.deepEqual(cached, articles)
  })

  it('キャッシュがあれば外部アクセス不能でも実KVからキャッシュを返すこと', async () => {
    const sentinel: ZennArticle[] = [
      { title: 'CACHE-SENTINEL', url: 'https://example.com/sentinel' },
    ]
    await resetCache()
    await bindings.cloude_kv.put(CACHE_KEY, JSON.stringify(sentinel))

    // 到達不能なURLを指定することで、キャッシュヒット時はfetchに到達しないことを証明する
    const unreachableEnv = { ...bindings, ZENN_FEED_URL: 'http://127.0.0.1:1/feed' }
    const articles = await fetchZennArticles(unreachableEnv)
    assert.deepEqual(articles, sentinel)

    // ヒット時はキャッシュを上書きしないことの中身検証
    const raw = await bindings.cloude_kv.get(CACHE_KEY)
    assert.ok(raw, 'KVのキャッシュが残っていること')
    assert.deepEqual(JSON.parse(raw), sentinel)
  })
})
