import type { BoardItem } from '../types.ts'

/**
 * 2つの数値ベクトルのコサイン類似度を計算する (-1.0 〜 1.0)
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

/**
 * 盤面の単語リストと各単語のEmbedding配列から、
 * 各正解単語(correct)のスパイ単語(spy)に対する最高コサイン類似度(spySimilarity)を計算して付与する
 */
export const calculateBoardSpySimilarities = (
  items: BoardItem[],
  embeddings: number[][] | null
): BoardItem[] => {
  if (!embeddings || embeddings.length !== items.length) {
    return items
  }

  const spyIndices: number[] = []
  items.forEach((item, idx) => {
    if (item.type === 'spy') {
      spyIndices.push(idx)
    }
  })

  if (spyIndices.length === 0) {
    return items
  }

  return items.map((item, idx) => {
    if (item.type !== 'correct') {
      return item
    }

    const correctVector = embeddings[idx]
    let maxSpySim = -Infinity

    for (const spyIdx of spyIndices) {
      const spyVector = embeddings[spyIdx]
      const sim = cosineSimilarity(correctVector, spyVector)
      if (sim > maxSpySim) {
        maxSpySim = sim
      }
    }

    // 小数点第3位で丸める (例: 0.824)
    const spySimilarity = Math.round(maxSpySim * 1000) / 1000

    return {
      ...item,
      spySimilarity,
    }
  })
}
