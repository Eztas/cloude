import type { BoardItem } from '../types.ts'

export const getSpyCount = (totalCards: number): number => {
  if (totalCards >= 25) return 4
  if (totalCards >= 16) return 3
  return 2
}

export const assignBoardTypes = (words: string[]): BoardItem[] => {
  const spyCount = getSpyCount(words.length)
  const shuffledWords = [...words].sort(() => Math.random() - 0.5)
  const items: BoardItem[] = shuffledWords.map((word, index) => ({
    word,
    type: index < spyCount ? 'spy' : 'correct',
  }))
  return items.sort(() => Math.random() - 0.5)
}

