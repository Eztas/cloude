import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { assignBoardTypes, getSpyCount } from './boardAssigner.ts'

describe('boardAssigner Unit Tests', () => {
  it('getSpyCount が枚数に応じて正しいスパイ数を返すこと', () => {
    assert.strictEqual(getSpyCount(9), 2)
    assert.strictEqual(getSpyCount(16), 3)
    assert.strictEqual(getSpyCount(25), 4)
  })

  it('9個の単語を受け取り、2個のspyと7個のcorrectを割り当てること', () => {
    const words = Array.from({ length: 9 }, (_, i) => `単語${i + 1}`)
    const result = assignBoardTypes(words)

    assert.strictEqual(result.length, 9)
    assert.strictEqual(result.filter(item => item.type === 'spy').length, 2)
    assert.strictEqual(result.filter(item => item.type === 'correct').length, 7)

    const resultWords = result.map(item => item.word).sort()
    assert.deepEqual(resultWords, [...words].sort())
  })

  it('16個の単語を受け取り、3個のspyと13個のcorrectを割り当てること', () => {
    const words = Array.from({ length: 16 }, (_, i) => `単語${i + 1}`)
    const result = assignBoardTypes(words)

    assert.strictEqual(result.length, 16)
    assert.strictEqual(result.filter(item => item.type === 'spy').length, 3)
    assert.strictEqual(result.filter(item => item.type === 'correct').length, 13)
  })

  it('25個の単語を受け取り、4個のspyと21個のcorrectを割り当てること', () => {
    const words = Array.from({ length: 25 }, (_, i) => `単語${i + 1}`)
    const result = assignBoardTypes(words)

    assert.strictEqual(result.length, 25)
    assert.strictEqual(result.filter(item => item.type === 'spy').length, 4)
    assert.strictEqual(result.filter(item => item.type === 'correct').length, 21)
  })
})

