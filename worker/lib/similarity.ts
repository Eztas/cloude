import type { BoardItem } from '../types.ts'

/**
 * 2つの数値ベクトルのコサイン類似度を計算する
 */
export const cosineSimilarity = (v1: number[], v2: number[]): number => {
  if (v1.length === 0 || v2.length === 0 || v1.length !== v2.length) {
    return 0
  }

  let dotProduct = 0
  let norm1Sq = 0
  let norm2Sq = 0

  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i]
    norm1Sq += v1[i] * v1[i]
    norm2Sq += v2[i] * v2[i]
  }

  if (norm1Sq === 0 || norm2Sq === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(norm1Sq) * Math.sqrt(norm2Sq))
}

export type ValidateHintOptions = {
  maxSpySimilarityThreshold?: number
}

/**
 * ヒントのベクトルと盤面単語のベクトルを比較し、スパイ単語への誤爆リスクがないか検証する
 */
export const validateHintSafety = (
  hintVector: number[],
  boardItems: BoardItem[],
  options: ValidateHintOptions = {}
): boolean => {
  const threshold = options.maxSpySimilarityThreshold ?? 0.55

  const spyItems = boardItems.filter((item) => item.type === 'spy' && item.vector)
  const correctItems = boardItems.filter((item) => item.type === 'correct' && item.vector)

  if (spyItems.length === 0) {
    return true
  }

  let maxSpySim = -Infinity
  for (const spy of spyItems) {
    if (!spy.vector) continue
    const sim = cosineSimilarity(hintVector, spy.vector)
    if (sim > maxSpySim) {
      maxSpySim = sim
    }
  }

  if (maxSpySim === -Infinity) {
    return true
  }

  // スパイ単語との最高類似度が閾値を超えている場合は不安全
  if (maxSpySim > threshold) {
    return false
  }

  let maxCorrectSim = -Infinity
  for (const correct of correctItems) {
    if (!correct.vector) continue
    const sim = cosineSimilarity(hintVector, correct.vector)
    if (sim > maxCorrectSim) {
      maxCorrectSim = sim
    }
  }

  // スパイ単語との最高類似度が正解単語との最高類似度を上回っている場合は不安全
  if (maxCorrectSim !== -Infinity && maxSpySim > maxCorrectSim) {
    return false
  }

  return true
}

/**
 * 盤面単語の全ペア（36ペア）におけるコサイン類似度行列（マッピング）を計算する
 */
export const calculateDistanceMatrix = (
  boardItems: { word: string; vector?: number[] }[]
): Record<string, number> => {
  const matrix: Record<string, number> = {}

  for (let i = 0; i < boardItems.length; i++) {
    const itemA = boardItems[i]
    for (let j = i + 1; j < boardItems.length; j++) {
      const itemB = boardItems[j]
      if (itemA.vector && itemB.vector) {
        const sim = cosineSimilarity(itemA.vector, itemB.vector)
        matrix[`${itemA.word}:${itemB.word}`] = sim
        matrix[`${itemB.word}:${itemA.word}`] = sim
      }
    }
  }

  return matrix
}
