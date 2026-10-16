import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { extractTitlesFromRss, extractArticlesFromRss, fetchZennTitles, fetchZennArticles } from './zennFeed.ts'

import type { Bindings } from '../types.ts'

describe('zennFeed Unit Tests', () => {
  describe('extractTitlesFromRss', () => {
    it('RSS XMLから記事タイトルを正常に抽出できること', () => {
      const xml = `
        <rss>
          <channel>
            <item>
              <title>TypeScript 5.0の新機能解説</title>
            </item>
            <item>
              <title>React 19での変更点まとめ</title>
            </item>
          </channel>
        </rss>
      `
      const titles = extractTitlesFromRss(xml)
      assert.deepEqual(titles, [
        'TypeScript 5.0の新機能解説',
        'React 19での変更点まとめ',
      ])
    })

    it('HTMLエンティティが正しくデコードされること', () => {
      const xml = `
        <rss>
          <channel>
            <item>
              <title>Node &amp; Express &lt;V2&gt; &#39;Test&#39; &quot;Guide&quot;</title>
            </item>
          </channel>
        </rss>
      `
      const titles = extractTitlesFromRss(xml)
      assert.deepEqual(titles, ["Node & Express <V2> 'Test' \"Guide\""])
    })

    it('CDATA内のタイトルを抽出できること', () => {
      const xml = `
        <rss>
          <channel>
            <item>
              <title><![CDATA[Vite & Cloudflare Workers構成案]]></title>
            </item>
          </channel>
        </rss>
      `
      const titles = extractTitlesFromRss(xml)
      assert.deepEqual(titles, ['Vite & Cloudflare Workers構成案'])
    })

    it('指定した件数制限(limit)が機能すること', () => {
      const xml = `
        <rss>
          <channel>
            ${Array.from({ length: 20 }, (_, i) => `<item><title>記事 ${i + 1}</title></item>`).join('\n')}
          </channel>
        </rss>
      `
      const titles = extractTitlesFromRss(xml, 5)
      assert.strictEqual(titles.length, 5)
      assert.strictEqual(titles[0], '記事 1')
      assert.strictEqual(titles[4], '記事 5')
    })
  })

  describe('extractArticlesFromRss', () => {
    it('RSS XMLからタイトルとURLの両方を正常に抽出できること', () => {
      const xml = `
        <rss>
          <channel>
            <item>
              <title>TypeScript 5.0解説</title>
              <link>https://zenn.dev/dev/articles/typescript-5</link>
            </item>
            <item>
              <title><![CDATA[Cloudflare入門]]></title>
              <link><![CDATA[https://zenn.dev/dev/articles/cloudflare-intro]]></link>
            </item>
          </channel>
        </rss>
      `
      const articles = extractArticlesFromRss(xml)
      assert.deepEqual(articles, [
        {
          title: 'TypeScript 5.0解説',
          url: 'https://zenn.dev/dev/articles/typescript-5',
        },
        {
          title: 'Cloudflare入門',
          url: 'https://zenn.dev/dev/articles/cloudflare-intro',
        },
      ])
    })
  })

  describe('fetchZennFeed', () => {
    const dummyEnv = {
      cloude_kv: {} as any,
      cloude_AI: {} as any,
      WORKERS_AI_WORDS_MODEL_NAME: 'dummy-words-model',
      WORKERS_AI_HINTS_MODEL_NAME: 'dummy-hints-model',
      ZENN_FEED_URL: 'https:/dummy.feeds',
    } satisfies Bindings

    it('成功時にタイトルリストを返せること', async () => {
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
        const titles = await fetchZennTitles(dummyEnv)
        assert.deepEqual(titles, ['Zenn記事1', 'Zenn記事2'])

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
        const titles = await fetchZennTitles(dummyEnv)
        assert.deepEqual(titles, [])
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
        const titles = await fetchZennTitles(dummyEnv)
        assert.deepEqual(titles, [])
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })
})
