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

// KVキャッシュのキーとTTL（2時間）。トレンドの鮮度要件が低いためフェッチ自体の回数を抑えている
const ZENN_ARTICLES_CACHE_KEY = 'zenn:trend-articles:v1'
const ZENN_ARTICLES_CACHE_TTL_SECONDS = 2 * 60 * 60

const isArticle = (value: unknown): value is ZennArticle =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ZennArticle).title === 'string' &&
  typeof (value as ZennArticle).url === 'string'

// KVキャッシュから記事を取得する。破損データやKV障害はnullとして扱いフェッチにフォールバックする
async function readArticlesCache(kv: KVNamespace): Promise<ZennArticle[] | null> {
  try {
    const raw = await kv.get(ZENN_ARTICLES_CACHE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter(isArticle)
  } catch {
    return null
  }
}

// 記事リストをKVに保存する。書き込み失敗はゲーム進行を止めないため握りつぶさずログのみ残す
async function writeArticlesCache(kv: KVNamespace, articles: ZennArticle[]): Promise<void> {
  try {
    await kv.put(ZENN_ARTICLES_CACHE_KEY, JSON.stringify(articles), {
      expirationTtl: ZENN_ARTICLES_CACHE_TTL_SECONDS,
    })
  } catch (error) {
    console.error('Zenn記事キャッシュの書き込みに失敗:', error)
  }
}

// Zennのフィードを取得して記事一覧を返す関数（2時間TTLのKVキャッシュ経由）
export async function fetchZennArticles(env: Bindings): Promise<ZennArticle[]> {
  const cachedArticles = await readArticlesCache(env.cloude_kv)
  if (cachedArticles && cachedArticles.length > 0) {
    return cachedArticles
  }

  try {
    const res = await fetch(env.ZENN_FEED_URL)
    if (!res.ok) {
      throw new Error(`RSS取得エラー: ${res.status}`)
    }
    const xmlText = await res.text()
    const articles = extractArticlesFromRss(xmlText)
    // 空結果をキャッシュするとTTL期間中ずっと空のままになるため非空のみ保存する
    if (articles.length > 0) {
      await writeArticlesCache(env.cloude_kv, articles)
    }
    return articles
  } catch (error) {
    console.error('Zennフィードの取得に失敗:', error)
    return []
  }
}
