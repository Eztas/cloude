import type { BoardItem, GameState } from '../types.ts'

export const parseGameState = (str: string): GameState | null => {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

export const isBoardItem = (item: unknown): item is BoardItem => {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as Record<string, unknown>).word === 'string' &&
    ((item as Record<string, unknown>).type === 'correct' ||
      (item as Record<string, unknown>).type === 'spy')
  )
}

export const isWordList = (words: unknown): words is string[] => {
  return Array.isArray(words) && words.length === 9 && words.every(w => typeof w === 'string')
}

export const isBoardItemList = (items: unknown): items is BoardItem[] => {
  return Array.isArray(items) && items.length > 0 && items.every(isBoardItem)
}

export const AI_BOARD_SCHEMA = {
  type: 'object',
  properties: {
    words: {
      type: 'array',
      minItems: 9,
      maxItems: 9,
      items: { type: 'string' },
      description: '生成された9つの名詞単語リスト',
    },
  },
  required: ['words'],
}

export interface AiHintOutput {
  hint: string
  count: number
  targetWords?: string[]
}

export const isAiHintOutput = (obj: unknown): obj is AiHintOutput => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Record<string, unknown>).hint === 'string' &&
    typeof (obj as Record<string, unknown>).count === 'number'
  )
}

export const AI_HINT_SCHEMA = {
  type: 'object',
  properties: {
    hint: { type: 'string', description: '1つのヒント単語（例：料理）' },
    count: {
      type: 'integer',
      description: '対象となる正解単語の枚数（1〜3の数値）',
      minimum: 1,
      maximum: 3,
    },
    targetWords: {
      type: 'array',
      items: { type: 'string' },
      description: 'ヒントに関連付けた正解単語（1〜3個）',
    },
  },
  required: ['hint', 'count', 'targetWords'],
}
