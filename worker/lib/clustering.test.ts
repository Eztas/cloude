import assert from 'node:assert'
import { describe, test } from 'node:test'
import { cosineSimilarity, findBestSafeCluster } from './clustering.ts'
import type { BoardItem } from '../types.ts'

describe('clustering Unit Tests', () => {
  test('cosineSimilarity - 同一ベクトルの類似度は1.0となること', () => {
    const v1 = [1, 0, 0]
    const v2 = [1, 0, 0]
    assert.strictEqual(Math.round(cosineSimilarity(v1, v2) * 100) / 100, 1.0)
  })

  test('cosineSimilarity - 直交ベクトルの類似度は0.0となること', () => {
    const v1 = [1, 0, 0]
    const v2 = [0, 1, 0]
    assert.strictEqual(cosineSimilarity(v1, v2), 0.0)
  })

  test('findBestSafeCluster - 類似した正解単語ペアが選ばれ、スパイに近いものが除外されること', () => {
    // 正解: 果物A [1, 0.9, 0], 果物B [0.95, 1, 0], 乗り物C [0, 0, 1]
    // スパイ: 爆弾D [0.1, 0, 0.95] (乗り物Cと類似)
    const activeBoard: BoardItem[] = [
      { word: 'りんご', type: 'correct', revealed: false, vector: [1, 0.9, 0] },
      { word: 'みかん', type: 'correct', revealed: false, vector: [0.95, 1, 0] },
      { word: 'ロケット', type: 'correct', revealed: false, vector: [0, 0, 1] },
      { word: 'ミサイル', type: 'spy', revealed: false, vector: [0.1, 0, 0.95] },
    ]

    const cluster = findBestSafeCluster(activeBoard, { maxSpySimilarityThreshold: 0.5 })
    const words = cluster.map((i) => i.word)

    assert.ok(words.includes('りんご'))
    assert.ok(words.includes('みかん'))
    assert.strictEqual(words.includes('ロケット'), false)
  })
})
