import type { BoardItem } from '../types.ts'

export const assignBoardTypes = (words: string[]): BoardItem[] => {
  const shuffledWords = [...words].sort(() => Math.random() - 0.5)
  const items: BoardItem[] = shuffledWords.map((word, index) => ({
    word,
    type: index < 2 ? 'spy' : 'correct',
  }))
  return items.sort(() => Math.random() - 0.5)
}
