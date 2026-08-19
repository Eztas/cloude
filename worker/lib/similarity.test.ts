import assert from 'node:assert'
import { describe, test } from 'node:test'
import { cosineSimilarity, calculateBoardSpySimilarities } from './similarity.ts'
import type { BoardItem } from '../types.ts'

describe('similarity Unit Tests', () => {
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

  test('calculateBoardSpySimilarities - 各正解単語にスパイとの最高類似度が正確に設定されること', () => {
    const items: BoardItem[] = [
      { word: 'りんご', type: 'correct' },
      { word: 'みかん', type: 'correct' },
      { word: '爆弾', type: 'spy' },
    ]
    const embeddings = [
      [1, 0, 0], // りんご
      [0, 1, 0], // みかん
      [1, 0, 0], // 爆弾 (りんごと同一)
    ]

    const result = calculateBoardSpySimilarities(items, embeddings)

    assert.strictEqual(result[0].spySimilarity, 1.0) // りんご vs 爆弾 -> 1.0
    assert.strictEqual(result[1].spySimilarity, 0.0) // みかん vs 爆弾 -> 0.0
    assert.strictEqual(result[2].spySimilarity, undefined) // スパイ自体には付与されない
  })
})
