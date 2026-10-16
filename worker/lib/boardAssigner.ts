import type { BoardItem } from '../types.ts'

export const getSpyCount = (totalCards: number): number => {
  if (totalCards >= 25) return 4
  if (totalCards >= 16) return 3
  return 2
}

export type WordInput = string | { word: string; url?: string }

export const assignBoardTypes = (words: WordInput[]): BoardItem[] => {
  const spyCount = getSpyCount(words.length)
  const normalizedWords = words.map(item =>
    typeof item === 'string' ? { word: item } : item
  )
  const shuffledWords = [...normalizedWords].sort(() => Math.random() - 0.5)
  const items: BoardItem[] = shuffledWords.map((item, index) => ({
    word: item.word,
    type: index < spyCount ? 'spy' : 'correct',
    ...(item.url ? { url: item.url } : {}),
  }))
  return items.sort(() => Math.random() - 0.5)
}

