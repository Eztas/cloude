import type { HintInfo } from '../types.ts'

export function parseHintString(hintText: string): HintInfo {
  if (!hintText) {
    return { hint: 'ヒントなし', count: 1 }
  }

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
