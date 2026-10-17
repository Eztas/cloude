import type { Bindings, ZennArticle } from '../types.ts'

// RSS XMLから記事情報を抽出する関数
export function extractArticlesFromRss(xmlText: string, limit = 15): ZennArticle[] {
  // CDATAセクションの処理も含めた<item>内の<title>と<link>抽出パターン
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  const articles: ZennArticle[] = []
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1] ?? ''

    const titleMatch = /<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/.exec(itemContent)
    const rawTitle = titleMatch?.[1] ?? titleMatch?.[2] ?? ''

    let title = rawTitle
      .trim()
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")

    title = title.replace(/\s+-\s+[^ -]+$/, '')

    const linkMatch = /<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/.exec(itemContent)
    const url = (linkMatch?.[1] ?? linkMatch?.[2] ?? '').trim()

    if (title) {
      articles.push({ title, url })
    }
  }

  return articles.slice(0, limit)
}

// Zennのフィードを取得して記事一覧を返す関数
export async function fetchZennArticles(env: Bindings): Promise<ZennArticle[]> {
  try {
    const res = await fetch(env.ZENN_FEED_URL)
    if (!res.ok) {
      throw new Error(`RSS取得エラー: ${res.status}`)
    }
    const xmlText = await res.text()
    return extractArticlesFromRss(xmlText)
  } catch (error) {
    console.error('Zennフィードの取得に失敗:', error)
    return []
  }
}
