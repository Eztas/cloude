/**
 * AIのレスポンス（オブジェクト、JSON文字列、マークダウン付きJSON文字列）を安全にパースする
 */
export const parseAiJsonResponse = <T = unknown>(input: unknown): T | null => {
  if (input === null || input === undefined) {
    return null
  }

  if (typeof input === 'object') {
    return input as T
  }

  if (typeof input === 'string') {
    let cleanStr = input.trim()

    // ```json 〜 ``` または ``` 〜 ``` のマークダウンコードブロックを除去
    const codeBlockMatch = cleanStr.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
    if (codeBlockMatch) {
      cleanStr = codeBlockMatch[1].trim()
    }

    try {
      const parsed = JSON.parse(cleanStr)
      if (parsed !== null && typeof parsed === 'object') {
        return parsed as T
      }
      return null
    } catch {
      return null
    }
  }

  return null
}
