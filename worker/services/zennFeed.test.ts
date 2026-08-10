import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractTitlesFromRss, fetchZennFeed } from './zennFeed.ts'

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

  describe('fetchZennFeed', () => {
    it('モックfetchを使用して成功時にタイトルリストを返せること', async () => {
      const mockXml = `
        <rss>
          <channel>
            <item><title>Zenn記事1</title></item>
            <item><title>Zenn記事2</title></item>
          </channel>
        </rss>
      `
      const mockFetch = async () =>
        new Response(mockXml, {
          status: 200,
          headers: { 'Content-Type': 'application/xml' },
        })

      const titles = await fetchZennFeed({ fetchFn: mockFetch as typeof fetch })
      assert.deepEqual(titles, ['Zenn記事1', 'Zenn記事2'])
    })

    it('HTTPエラー時にエラーハンドリングされ空配列を返すこと', async () => {
      const mockFetch = async () =>
        new Response('Internal Error', {
          status: 500,
        })

      const titles = await fetchZennFeed({ fetchFn: mockFetch as typeof fetch, silent: true })
      assert.deepEqual(titles, [])
    })

    it('ネットワーク例外発生時に空配列を返すこと', async () => {
      const mockFetch = async () => {
        throw new Error('Network error')
      }

      const titles = await fetchZennFeed({ fetchFn: mockFetch as typeof fetch, silent: true })
      assert.deepEqual(titles, [])
    })
  })
})
