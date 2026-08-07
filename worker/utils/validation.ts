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

export const isBoardItemList = (items: unknown): items is BoardItem[] => {
  return Array.isArray(items) && items.length > 0 && items.every(isBoardItem)
}

export const AI_BOARD_SCHEMA = {
  type: 'object',
  properties: {
    board: {
      type: 'array',
      minItems: 9,
      maxItems: 9,
      items: {
        type: 'object',
        properties: {
          word: { type: 'string' },
          type: { type: 'string', enum: ['correct', 'spy'] },
        },
        required: ['word', 'type'],
      },
    },
  },
  required: ['board'],
}
