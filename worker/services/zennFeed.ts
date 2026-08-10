// RSS XMLから記事タイトルを抽出する関数
export function extractTitlesFromRss(xmlText: string, limit = 15): string[] {
  // CDATAセクションの処理も含めた<item>内の<title>抽出パターン
  const itemRegex = /<item>[\s\S]*?<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/g
  const titles: string[] = []
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const rawTitle = match[1] ?? match[2] ?? ''
    let title = rawTitle
      .trim()
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")

    title = title.replace(/\s+-\s+[^ -]+$/, '')
    if (title) {
      titles.push(title)
    }
  }

  return titles.slice(0, limit)
}

interface FetchZennFeedOptions {
  fetchFn?: typeof fetch
  rssUrl?: string
  silent?: boolean
}

// ZennのRSSフィードを取得してタイトル一覧を返す関数
export async function fetchZennFeed(options: FetchZennFeedOptions = {}): Promise<string[]> {
  const { fetchFn = fetch, rssUrl = 'https://zenn.dev/feed', silent = false } = options

  try {
    const res = await fetchFn(rssUrl)
    if (!res.ok) {
      throw new Error(`RSS取得エラー: ${res.status}`)
    }
    const xmlText = await res.text()
    return extractTitlesFromRss(xmlText)
  } catch (error) {
    if (!silent) {
      console.error('Zennフィードの取得に失敗:', error)
    }
    return []
  }
}
