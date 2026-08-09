import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseHintString } from './hintParser.ts'

describe('hintParser Unit Tests', () => {
  it('ヒント単語と枚数が含まれる文字列を正常にパースできること', () => {
    const result = parseHintString('料理: 2枚')
    assert.deepEqual(result, { hint: '料理', count: 2 })
  })

  it('全角コロンやスペースが含まれる文字列を正常にパースできること', () => {
    const result = parseHintString('果物： 3枚')
    assert.deepEqual(result, { hint: '果物', count: 3 })
  })

  it('枚数が記載されていない場合はデフォルト1枚とすること', () => {
    const result = parseHintString('乗り物')
    assert.deepEqual(result, { hint: '乗り物', count: 1 })
  })

  it('空文字列の場合はデフォルト値を返すこと', () => {
    const result = parseHintString('')
    assert.deepEqual(result, { hint: 'ヒントなし', count: 1 })
  })
})
