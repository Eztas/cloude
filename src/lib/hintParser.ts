import type { HintInfo } from '../types/game'

// AIが生成した "ヒント名: X枚" や "ヒント名" の文字列から HintInfo をパースする関数
export function parseHintString(hintText: string): HintInfo {
  if (!hintText) {
    return { hint: 'ヒントなし', count: 1 }
  }

  // "料理: 2枚" や "果物：3" などのパターンを正規表現で検出
  const match = hintText.match(/^(.+?)[\s:：]+(\d+)\s*枚?$/)
  if (match) {
    const hint = match[1].trim()
    const count = parseInt(match[2], 10)
    return {
      hint: hint || hintText.trim(),
      count: isNaN(count) || count < 1 ? 1 : count,
    }
  }

  return {
    hint: hintText.trim(),
    count: 1,
  }
}
