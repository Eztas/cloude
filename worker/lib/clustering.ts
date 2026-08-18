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

export type SafeClusterResult = {
  targetItems: BoardItem[]
  score: number
}

export type FindClusterOptions = {
  maxSpySimilarityThreshold?: number // スパイとの許容最大類似度 (デフォルト: 0.55)
}

/**
 * ベクトル非依存のフォールバック（ベクトルがない場合のグループ切り出し）
 */
const getFallbackCluster = (correctItems: BoardItem[]): BoardItem[] => {
  if (correctItems.length === 0) return []
  const count = Math.min(3, Math.max(1, Math.min(correctItems.length, 2)))
  return correctItems.slice(0, count)
}

/**
 * 未開示の正解単語から、コサイン類似度の高い2〜3個のグループを形成し、
 * 未開示のスパイ単語との誤爆リスクが低い安全なグループを最良順で検索する
 */
export const findBestSafeCluster = (
  activeBoardItems: BoardItem[],
  options: FindClusterOptions = {}
): BoardItem[] => {
  const threshold = options.maxSpySimilarityThreshold ?? 0.55

  const correctItems = activeBoardItems.filter((item) => item.type === 'correct' && item.revealed !== true)
  const spyItems = activeBoardItems.filter((item) => item.type === 'spy' && item.revealed !== true)

  if (correctItems.length === 0) {
    return []
  }

  // ベクトルがないアイテムが混ざっている場合はフォールバック
  const hasVectors = correctItems.every((item) => item.vector && item.vector.length > 0)
  if (!hasVectors) {
    return getFallbackCluster(correctItems)
  }

  // 1. 候補グループ（サイズ 3, 2, 1）の全組み合せを生成
  const candidateGroups: BoardItem[][] = []

  // サイズ 3 の組み合わせ（正解が3個以上の場合）
  if (correctItems.length >= 3) {
    for (let i = 0; i < correctItems.length; i++) {
      for (let j = i + 1; j < correctItems.length; j++) {
        for (let k = j + 1; k < correctItems.length; k++) {
          candidateGroups.push([correctItems[i], correctItems[j], correctItems[k]])
        }
      }
    }
  }

  // サイズ 2 の組み合わせ（正解が2個以上の場合）
  if (correctItems.length >= 2) {
    for (let i = 0; i < correctItems.length; i++) {
      for (let j = i + 1; j < correctItems.length; j++) {
        candidateGroups.push([correctItems[i], correctItems[j]])
      }
    }
  }

  // サイズ 1 の組み合わせ（フォールバック用）
  for (const item of correctItems) {
    candidateGroups.push([item])
  }

  // 2. 各グループの安全度と内部類似度スコアを計算
  const validClusters: SafeClusterResult[] = []

  for (const group of candidateGroups) {
    // グループ内の平均類似度（グループ結束度）の計算
    let intraSim = 0
    if (group.length > 1) {
      let pairCount = 0
      let pairSimSum = 0
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          pairSimSum += cosineSimilarity(group[i].vector!, group[j].vector!)
          pairCount++
        }
      }
      intraSim = pairSimSum / pairCount
    } else {
      intraSim = 0.5 // 1個の場合は中間の基本スコア
    }

    // スパイ単語との最高類似度のチェック
    let maxSpySim = -1
    for (const spy of spyItems) {
      if (!spy.vector) continue
      for (const item of group) {
        const sim = cosineSimilarity(item.vector!, spy.vector)
        if (sim > maxSpySim) {
          maxSpySim = sim
        }
      }
    }

    // 判定基準:
    // a) スパイ単語との最高類似度が一定（デフォルト0.75）未満、または
    //    複数枚グループの場合はスパイとの類似度よりグループ内の類似度が高いこと
    const isSafeFromSpy =
      maxSpySim < threshold || (group.length > 1 && intraSim > maxSpySim)

    if (isSafeFromSpy) {
      const sizeBonus = group.length * 2.0 // 複数枚（3枚・2枚）を優先させる大きなボーナス
      const totalScore = sizeBonus + intraSim - maxSpySim
      validClusters.push({ targetItems: group, score: totalScore })
    }
  }

  // スコア順にソート（最高スコアのグループを返す）
  if (validClusters.length > 0) {
    validClusters.sort((a, b) => b.score - a.score)
    return validClusters[0].targetItems
  }

  // 安全なグループが見つからなかった場合の最終フォールバック（正解1枚）
  return [correctItems[0]]
}
