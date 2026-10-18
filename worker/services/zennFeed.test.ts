import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { extractArticlesFromRss, fetchZennArticles } from './zennFeed.ts'

import type { Bindings } from '../types.ts'

describe('zennFeed Unit Tests', () => {
  describe('extractArticlesFromRss', () => {
    it('RSS XMLから記事タイトルとURLを正常に抽出できること', () => {
      const xml = `
        <rss>
          <channel>
            <item>
              <title>TypeScript 5.0の新機能解説</title>
              <link>https://zenn.dev/articles/ts-5</link>
            </item>
            <item>
              <title>React 19での変更点まとめ</title>
              <link>https://zenn.dev/articles/react-19</link>
            </item>
          </channel>
        </rss>
      `
      const articles = extractArticlesFromRss(xml)
      assert.deepEqual(articles, [
        {
          title: 'TypeScript 5.0の新機能解説',
          url: 'https://zenn.dev/articles/ts-5',
        },
        {
          title: 'React 19での変更点まとめ',
          url: 'https://zenn.dev/articles/react-19',
        },
      ])
    })

    it('HTMLエンティティが正しくデコードされること', () => {
      const xml = `
        <rss>
          <channel>
            <item>
              <title>Node &amp; Express &lt;V2&gt; &#39;Test&#39; &quot;Guide&quot;</title>
              <link>https://zenn.dev/articles/node</link>
            </item>
          </channel>
        </rss>
      `
      const articles = extractArticlesFromRss(xml)
      assert.deepEqual(articles, [
        {
          title: "Node & Express <V2> 'Test' \"Guide\"",
          url: 'https://zenn.dev/articles/node',
        },
      ])
    })

    it('CDATA内のタイトルとリンクを抽出できること', () => {
      const xml = `
        <rss>
          <channel>
            <item>
              <title><![CDATA[Vite & Cloudflare Workers構成案]]></title>
              <link><![CDATA[https://zenn.dev/articles/vite-cloudflare]]></link>
            </item>
          </channel>
        </rss>
      `
      const articles = extractArticlesFromRss(xml)
      assert.deepEqual(articles, [
        {
          title: 'Vite & Cloudflare Workers構成案',
          url: 'https://zenn.dev/articles/vite-cloudflare',
        },
      ])
    })

    it('指定した件数制限(limit)が機能すること', () => {
      const xml = `
        <rss>
          <channel>
            ${Array.from({ length: 20 }, (_, i) => `<item><title>記事 ${i + 1}</title><link>https://zenn.dev/${i + 1}</link></item>`).join('\n')}
          </channel>
        </rss>
      `
      const articles = extractArticlesFromRss(xml, 5)
      assert.strictEqual(articles.length, 5)
      assert.strictEqual(articles[0].title, '記事 1')
      assert.strictEqual(articles[4].title, '記事 5')
    })
  })

  describe('fetchZennArticles', () => {
    const mockXml = `
      <rss>
        <channel>
          <item><title>Zenn記事1</title><link>https://zenn.dev/1</link></item>
          <item><title>Zenn記事2</title><link>https://zenn.dev/2</link></item>
        </channel>
      </rss>
    `
    const dummyXmlUrl = 'https://dummy.feeds'
    const expectedArticles = [
      { title: 'Zenn記事1', url: 'https://zenn.dev/1' },
      { title: 'Zenn記事2', url: 'https://zenn.dev/2' },
    ]

    // fetchをモックして呼び出し回数を数えるヘルパー
    const stubFetch = (response: () => Response) => {
      let callCount = 0
      const originalFetch = globalThis.fetch
      globalThis.fetch = (async () => {
        callCount += 1
        return response()
      }) as typeof fetch
      return {
        calls: () => callCount,
        restore: () => {
          globalThis.fetch = originalFetch
        },
      }
    }

    // KVのモック（put呼び出しのオプションも記録する）
    const createKvMock = () => {
      const store = new Map<string, string>()
      const puts: { key: string; value: string; options?: { expirationTtl?: number } }[] = []
      return {
        store,
        puts,
        bind: {
          get: async (key: string) => store.get(key) ?? null,
          put: async (key: string, value: string, options?: { expirationTtl?: number }) => {
            puts.push({ key, value, options })
            store.set(key, value)
          },
        },
      }
    }

    const createEnv = (kv: ReturnType<typeof createKvMock>['bind']) =>
      ({
        cloude_kv: kv as any,
        cloude_AI: {} as any,
        WORKERS_AI_WORDS_MODEL_NAME: 'dummy-words-model',
        WORKERS_AI_HINTS_MODEL_NAME: 'dummy-hints-model',
        ZENN_FEED_URL: dummyXmlUrl,
      }) satisfies Bindings

    it('成功時に記事リストを返し、TTL 7200秒（2時間）でKVにキャッシュすること', async () => {
      const kv = createKvMock()
      const fetchStub = stubFetch(() => new Response(mockXml, { status: 200 }))

      try {
        const articles = await fetchZennArticles(createEnv(kv.bind))
        assert.deepEqual(articles, expectedArticles)
        assert.strictEqual(fetchStub.calls(), 1)
        assert.deepEqual(kv.puts, [
          {
            key: 'zenn:trend-articles:v1',
            value: JSON.stringify(expectedArticles),
            options: { expirationTtl: 7200 },
          },
        ])
      } finally {
        fetchStub.restore()
      }
    })

    it('キャッシュヒット時はfetchせずキャッシュを返すこと', async () => {
      const kv = createKvMock()
      kv.store.set('zenn:trend-articles:v1', JSON.stringify(expectedArticles))
      const fetchStub = stubFetch(() => new Response('', { status: 500 }))

      try {
        const articles = await fetchZennArticles(createEnv(kv.bind))
        assert.deepEqual(articles, expectedArticles)
        assert.strictEqual(fetchStub.calls(), 0)
        assert.strictEqual(kv.puts.length, 0)
      } finally {
        fetchStub.restore()
      }
    })

    it('KVに破損データがある場合はフェッチにフォールバックし、正常データでキャッシュを更新すること', async () => {
      const kv = createKvMock()
      kv.store.set('zenn:trend-articles:v1', 'not-json{')
      const fetchStub = stubFetch(() => new Response(mockXml, { status: 200 }))

      try {
        const articles = await fetchZennArticles(createEnv(kv.bind))
        assert.deepEqual(articles, expectedArticles)
        assert.strictEqual(fetchStub.calls(), 1)
        assert.deepEqual(JSON.parse(kv.store.get('zenn:trend-articles:v1') ?? ''), expectedArticles)
      } finally {
        fetchStub.restore()
      }
    })

    it('RSS取得結果が空の場合はKVにキャッシュしないこと', async () => {
      const kv = createKvMock()
      const fetchStub = stubFetch(() => new Response('<rss><channel></channel></rss>', { status: 200 }))

      try {
        const articles = await fetchZennArticles(createEnv(kv.bind))
        assert.deepEqual(articles, [])
        assert.strictEqual(fetchStub.calls(), 1)
        assert.strictEqual(kv.puts.length, 0)
      } finally {
        fetchStub.restore()
      }
    })

    it('KV書き込みに失敗しても記事リストを返せること', async () => {
      const kv = createKvMock()
      kv.bind.put = async () => {
        throw new Error('KV put error')
      }
      const fetchStub = stubFetch(() => new Response(mockXml, { status: 200 }))

      try {
        const articles = await fetchZennArticles(createEnv(kv.bind))
        assert.deepEqual(articles, expectedArticles)
      } finally {
        fetchStub.restore()
      }
    })

    it('HTTPエラー時にエラーハンドリングされ空配列を返すこと', async () => {
      const kv = createKvMock()
      const fetchStub = stubFetch(() => new Response('Internal Error', { status: 500 }))

      try {
        const articles = await fetchZennArticles(createEnv(kv.bind))
        assert.deepEqual(articles, [])
      } finally {
        fetchStub.restore()
      }
    })

    it('ネットワーク例外発生時に空配列を返すこと', async () => {
      const kv = createKvMock()
      const originalFetch = globalThis.fetch
      globalThis.fetch = (async () => {
        throw new Error('Network error')
      }) as typeof fetch

      try {
        const articles = await fetchZennArticles(createEnv(kv.bind))
        assert.deepEqual(articles, [])
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })
})
