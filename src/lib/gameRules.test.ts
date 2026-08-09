import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { GameState } from '../types/game.ts'
import { applyGuess } from './gameRules.ts'

describe('gameRules Unit Tests', () => {
  const initialGameState: GameState = {
    sessionId: 'test-session',
    board: [
      { word: 'リンゴ', type: 'correct', revealed: false },
      { word: 'バナナ', type: 'correct', revealed: false },
      { word: '爆弾', type: 'spy', revealed: false },
    ],
    gameStatus: 'playing',
    history: [],
    currentHint: { hint: '果物', count: 2 },
    remainingGuesses: 2,
  }

  it('正解カードを選択した場合、カードが表になり remainingGuesses がデクリメントされること', () => {
    const nextState = applyGuess(initialGameState, 'リンゴ')
    assert.equal(nextState.board[0].revealed, true)
    assert.equal(nextState.gameStatus, 'playing')
    assert.equal(nextState.remainingGuesses, 1)
    assert.equal(nextState.history.length, 1)
    assert.equal(nextState.history[0].guess, 'リンゴ')
    assert.equal(nextState.history[0].result, 'correct')
  })

  it('スパイカードを選択した場合、即座に game_over となり remainingGuesses が 0 になること', () => {
    const nextState = applyGuess(initialGameState, '爆弾')
    assert.equal(nextState.board[2].revealed, true)
    assert.equal(nextState.gameStatus, 'game_over')
    assert.equal(nextState.remainingGuesses, 0)
    assert.equal(nextState.history[0].result, 'spy')
  })

  it('全正解カードを開封した場合、won となり remainingGuesses が 0 になること', () => {
    const state1 = applyGuess(initialGameState, 'リンゴ')
    const state2 = applyGuess(state1, 'バナナ')
    assert.equal(state2.gameStatus, 'won')
    assert.equal(state2.remainingGuesses, 0)
  })

  it('すでに revealed なカードを選択しても状態が変わらないこと', () => {
    const state1 = applyGuess(initialGameState, 'リンゴ')
    const state2 = applyGuess(state1, 'リンゴ')
    assert.deepEqual(state1, state2)
  })
})
