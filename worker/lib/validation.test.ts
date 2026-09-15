import assert from 'node:assert'
import { describe, test } from 'node:test'
import { parseGameState, isBoardItem, isBoardItemList, isAiGuessOutput } from './validation.ts'

describe('Validation Utils Unit Tests', () => {
  test('parseGameState - 正常なJSON文字列をGameStateにパースする', () => {
    const jsonStr = JSON.stringify({
      sessionId: 'test-id',
      board: [{ word: 'りんご', type: 'correct', revealed: false }],
      gameStatus: 'playing',
      history: [],
    })
    const parsed = parseGameState(jsonStr)
    assert.notStrictEqual(parsed, null)
    assert.strictEqual(parsed?.sessionId, 'test-id')
  })

  test('parseGameState - 不正なJSON文字列でnullを返す', () => {
    assert.strictEqual(parseGameState('invalid-json{'), null)
  })

  test('isBoardItem - 有効なBoardItemを正確に判定する', () => {
    assert.strictEqual(isBoardItem({ word: 'みかん', type: 'correct' }), true)
    assert.strictEqual(isBoardItem({ word: 'スパイ', type: 'spy' }), true)
    assert.strictEqual(isBoardItem({ word: 'バナナ', type: 'invalid' }), false)
    assert.strictEqual(isBoardItem(null), false)
  })

  test('isBoardItemList - ボード配列全体を判定する', () => {
    const validList = [
      { word: '1', type: 'correct' },
      { word: '2', type: 'spy' },
    ]
    assert.strictEqual(isBoardItemList(validList), true)
    assert.strictEqual(isBoardItemList([]), false)
    assert.strictEqual(isBoardItemList('not-an-array'), false)
  })

  test('isAiGuessOutput - 有効なAiGuessOutputを判定する', () => {
    // 正常系: reasoning あり
    assert.strictEqual(
      isAiGuessOutput({ guesses: ['りんご', 'みかん'], reasoning: '果物だから' }),
      true
    )
    // 正常系: reasoning なし / undefined
    assert.strictEqual(isAiGuessOutput({ guesses: ['単語'] }), true)
    assert.strictEqual(isAiGuessOutput({ guesses: ['単語'], reasoning: undefined }), true)
    assert.strictEqual(isAiGuessOutput({ guesses: [] }), true)

    // 異常系: guesses が配列でない
    assert.strictEqual(isAiGuessOutput({ guesses: 'not-an-array' }), false)
    assert.strictEqual(isAiGuessOutput({ guesses: 123 }), false)
    assert.strictEqual(isAiGuessOutput({ guesses: null }), false)
    assert.strictEqual(isAiGuessOutput({}), false)

    // 異常系: guesses の要素に文字列以外が混入
    assert.strictEqual(isAiGuessOutput({ guesses: [123] }), false)
    assert.strictEqual(isAiGuessOutput({ guesses: ['りんご', null] }), false)
    assert.strictEqual(isAiGuessOutput({ guesses: ['りんご', undefined] }), false)
    assert.strictEqual(isAiGuessOutput({ guesses: ['りんご', {}] }), false)

    // 異常系: reasoning が文字列以外
    assert.strictEqual(isAiGuessOutput({ guesses: ['単語'], reasoning: 123 }), false)
    assert.strictEqual(isAiGuessOutput({ guesses: ['単語'], reasoning: null }), false)
    assert.strictEqual(isAiGuessOutput({ guesses: ['単語'], reasoning: {} }), false)

    // 異常系: オブジェクト以外（プリミティブ / null）
    assert.strictEqual(isAiGuessOutput(null), false)
    assert.strictEqual(isAiGuessOutput(undefined), false)
    assert.strictEqual(isAiGuessOutput('string'), false)
    assert.strictEqual(isAiGuessOutput(123), false)
    assert.strictEqual(isAiGuessOutput(true), false)
  })
})
