import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { assignBoardTypes } from './boardAssigner.ts'

describe('boardAssigner Unit Tests', () => {
  it('9個の単語を受け取り、2個のspyと7個のcorrectを割り当てること', () => {
    const words = ['単語1', '単語2', '単語3', '単語4', '単語5', '単語6', '単語7', '単語8', '単語9']
    const result = assignBoardTypes(words)

    assert.strictEqual(result.length, 9)

    const spyCount = result.filter(item => item.type === 'spy').length
    const correctCount = result.filter(item => item.type === 'correct').length

    assert.strictEqual(spyCount, 2)
    assert.strictEqual(correctCount, 7)

    const resultWords = result.map(item => item.word).sort()
    assert.deepEqual(resultWords, [...words].sort())
  })
})
