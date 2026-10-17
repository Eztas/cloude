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
    const dummyEnv = {
      cloude_kv: {} as any,
      cloude_AI: {} as any,
      WORKERS_AI_WORDS_MODEL_NAME: 'dummy-words-model',
      WORKERS_AI_HINTS_MODEL_NAME: 'dummy-hints-model',
      ZENN_FEED_URL: 'https:/dummy.feeds',
    } satisfies Bindings

    it('成功時に記事リストを返せること', async () => {
      const mockXml = `
        <rss>
          <channel>
            <item><title>Zenn記事1</title><link>https://zenn.dev/1</link></item>
            <item><title>Zenn記事2</title><link>https://zenn.dev/2</link></item>
          </channel>
        </rss>
      `
      const originalFetch = globalThis.fetch
      globalThis.fetch = (async () =>
        new Response(mockXml, {
          status: 200,
          headers: { 'Content-Type': 'application/xml' },
        })) as typeof fetch

      try {
        const articles = await fetchZennArticles(dummyEnv)
        assert.deepEqual(articles, [
          { title: 'Zenn記事1', url: 'https://zenn.dev/1' },
          { title: 'Zenn記事2', url: 'https://zenn.dev/2' },
        ])
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('HTTPエラー時にエラーハンドリングされ空配列を返すこと', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = (async () =>
        new Response('Internal Error', {
          status: 500,
        })) as typeof fetch

      try {
        const articles = await fetchZennArticles(dummyEnv)
        assert.deepEqual(articles, [])
      } finally {
        globalThis.fetch = originalFetch
      }
    })

    it('ネットワーク例外発生時に空配列を返すこと', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = (async () => {
        throw new Error('Network error')
      }) as typeof fetch

      try {
        const articles = await fetchZennArticles(dummyEnv)
        assert.deepEqual(articles, [])
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })
})
