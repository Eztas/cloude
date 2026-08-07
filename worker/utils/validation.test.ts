import assert from 'node:assert'
import { describe, test } from 'node:test'
import { parseGameState, isBoardItem, isBoardItemList } from './validation.ts'

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
})
