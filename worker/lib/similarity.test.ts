import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { cosineSimilarity, validateHintSafety, calculateDistanceMatrix } from './similarity.ts'
import type { BoardItem } from '../types.ts'

describe('similarity Unit Tests', () => {
  describe('cosineSimilarity', () => {
    it('同一ベクトルのコサイン類似度が 1.0 になること', () => {
      const v = [1, 2, 3]
      const result = cosineSimilarity(v, v)
      assert.strictEqual(Math.round(result * 1000) / 1000, 1)
    })

    it('直交するベクトルのコサイン類似度が 0 になること', () => {
      const v1 = [1, 0]
      const v2 = [0, 1]
      const result = cosineSimilarity(v1, v2)
      assert.strictEqual(result, 0)
    })

    it('逆向きベクトルのコサイン類似度が -1.0 になること', () => {
      const v1 = [1, 2]
      const v2 = [-1, -2]
      const result = cosineSimilarity(v1, v2)
      assert.strictEqual(Math.round(result * 1000) / 1000, -1)
    })

    it('長さの異なるベクトルでは 0 を返すこと', () => {
      const v1 = [1, 2]
      const v2 = [1, 2, 3]
      assert.strictEqual(cosineSimilarity(v1, v2), 0)
    })
  })

  describe('validateHintSafety', () => {
    const correctVector = [1, 0, 0]
    const spyVector = [0, 1, 0]

    const boardItems: BoardItem[] = [
      { word: '公園', type: 'correct', vector: correctVector },
      { word: 'GPU', type: 'spy', vector: spyVector },
    ]

    it('正解単語と類似度が高くスパイ単語と低い場合は true を返すこと', () => {
      const hintVector = [0.9, 0.1, 0] // 正解(1,0,0)に極めて近く、スパイ(0,1,0)から遠い
      const isValid = validateHintSafety(hintVector, boardItems)
      assert.strictEqual(isValid, true)
    })

    it('スパイ単語との類似度が閾値(0.55)を超えている場合は false を返すこと', () => {
      const hintVector = [0.2, 0.9, 0] // スパイ(0,1,0)と類似度が高い
      const isValid = validateHintSafety(hintVector, boardItems)
      assert.strictEqual(isValid, false)
    })

    it('スパイ単語との類似度が正解単語の類似度を上回る場合は false を返すこと', () => {
      const hintVector = [0.4, 0.5, 0] // スパイ類似度 > 正解類似度（かつ閾値以下の場合でも）
      const isValid = validateHintSafety(hintVector, boardItems, { maxSpySimilarityThreshold: 0.8 })
      assert.strictEqual(isValid, false)
    })
  })

  describe('calculateDistanceMatrix', () => {
    it('全ペアの類似度マップを正しく計算・作成できること', () => {
      const items = [
        { word: 'A', vector: [1, 0] },
        { word: 'B', vector: [0, 1] },
        { word: 'C', vector: [1, 0] },
      ]
      const matrix = calculateDistanceMatrix(items)
      assert.strictEqual(matrix['A:B'], 0)
      assert.strictEqual(matrix['B:A'], 0)
      assert.strictEqual(Math.round(matrix['A:C'] * 100) / 100, 1)
      assert.strictEqual(Math.round(matrix['C:A'] * 100) / 100, 1)
    })
  })
})
