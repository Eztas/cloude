import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
// tsx実行環境でのJSX互換用
globalThis.React = React
import type { BoardItem } from '../types/game.ts'
import { GameBoard } from './GameBoard.tsx'

describe('GameBoard Component Tests', () => {
  const dummyBoard: BoardItem[] = [
    { word: '太陽', type: 'correct', revealed: false },
    { word: '月', type: 'spy', revealed: false },
    { word: '星', type: 'correct', revealed: true },
  ]

  const renderBoard = (props: {
    board?: BoardItem[]
    gameStatus?: 'playing' | 'won' | 'game_over'
    guessingWord?: string | null
    isMaster?: boolean
    onGuess?: (word: string) => void
  }) => {
    return renderToStaticMarkup(
      React.createElement(GameBoard, {
        board: props.board ?? dummyBoard,
        gameStatus: props.gameStatus ?? 'playing',
        guessingWord: props.guessingWord ?? null,
        isMaster: props.isMaster ?? false,
        onGuess: props.onGuess ?? (() => {}),
      })
    )
  }

  describe('AIヒントモード（isMaster = false）の動作検証', () => {
    it('未開封のスパイカードが赤色にハイライトされず、ネタバレしないこと', () => {
      const html = renderBoard({ isMaster: false })

      // 月（未開封スパイ）のボタン要素を抽出して検証
      // bg-rose- や border-rose- が含まれていないこと
      assert.ok(html.includes('月'))
      assert.ok(!html.includes('月</span><span class="mt-2 text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-black/40">スパイ'))

      // 月が含まれるボタンタグの文字列を検証
      const spyButtonMatch = html.match(/<button[^>]*>.*?月.*?<\/button>/)
      assert.ok(spyButtonMatch, '未開封スパイのボタンが存在すること')
      const spyButtonHtml = spyButtonMatch[0]

      assert.ok(
        !spyButtonHtml.includes('bg-rose-950/90'),
        'AIヒントモードでは未開封スパイに赤色背景が適用されないこと'
      )
      assert.ok(
        !spyButtonHtml.includes('border-rose-600'),
        'AIヒントモードでは未開封スパイに赤色ボーダーが適用されないこと'
      )
    })

    it('未開封カードはクリック可能で、開封済みカードはdisabledであること', () => {
      const html = renderBoard({ isMaster: false })

      const sunMatch = html.match(/<button[^>]*>.*?太陽.*?<\/button>/)
      assert.ok(sunMatch)
      assert.ok(!sunMatch[0].includes('disabled=""'), '未開封正解カードはクリック可能')

      const moonMatch = html.match(/<button[^>]*>.*?月.*?<\/button>/)
      assert.ok(moonMatch)
      assert.ok(!moonMatch[0].includes('disabled=""'), '未開封スパイカードもクリック可能')

      const starMatch = html.match(/<button[^>]*>.*?星.*?<\/button>/)
      assert.ok(starMatch)
      assert.ok(starMatch[0].includes('disabled=""'), '開封済みカードはdisabled')
    })
  })

  describe('スパイマスターモード（isMaster = true）の動作検証', () => {
    it('未開封のスパイカードが赤色にハイライトされること', () => {
      const html = renderBoard({ isMaster: true })

      const spyButtonMatch = html.match(/<button[^>]*>.*?月.*?<\/button>/)
      assert.ok(spyButtonMatch, '未開封スパイのボタンが存在すること')
      const spyButtonHtml = spyButtonMatch[0]

      assert.ok(
        spyButtonHtml.includes('bg-rose-950/90'),
        'スパイマスターモードでは未開封スパイに赤色背景が適用されること'
      )
      assert.ok(
        spyButtonHtml.includes('border-rose-600'),
        'スパイマスターモードでは未開封スパイに赤色ボーダーが適用されること'
      )
    })

    it('未開封の正解カードは赤くならないこと', () => {
      const html = renderBoard({ isMaster: true })

      const correctButtonMatch = html.match(/<button[^>]*>.*?太陽.*?<\/button>/)
      assert.ok(correctButtonMatch)
      assert.ok(!correctButtonMatch[0].includes('bg-rose-950/90'))
    })

    it('スパイマスターモードでは回答を行わないため全カードがdisabledかつcursor-defaultであること', () => {
      const html = renderBoard({ isMaster: true })

      const sunMatch = html.match(/<button[^>]*>.*?太陽.*?<\/button>/)
      assert.ok(sunMatch)
      assert.ok(sunMatch[0].includes('disabled=""'), 'スパイマスター時は正解カードもdisabled')
      assert.ok(sunMatch[0].includes('cursor-default'), 'スパイマスター時はcursor-default')

      const moonMatch = html.match(/<button[^>]*>.*?月.*?<\/button>/)
      assert.ok(moonMatch)
      assert.ok(moonMatch[0].includes('disabled=""'), 'スパイマスター時はスパイカードもdisabled')
      assert.ok(moonMatch[0].includes('cursor-default'), 'スパイマスター時はcursor-default')
    })
  })

  describe('ゲームステータスに応じたdisabled制御の検証', () => {
    it('ゲーム終了時（won / game_over）はすべてのカードがdisabledになること', () => {
      const wonHtml = renderBoard({ isMaster: false, gameStatus: 'won' })
      const sunWonMatch = wonHtml.match(/<button[^>]*>.*?太陽.*?<\/button>/)
      assert.ok(sunWonMatch)
      assert.ok(sunWonMatch[0].includes('disabled=""'))

      const overHtml = renderBoard({ isMaster: false, gameStatus: 'game_over' })
      const sunOverMatch = overHtml.match(/<button[^>]*>.*?太陽.*?<\/button>/)
      assert.ok(sunOverMatch)
      assert.ok(sunOverMatch[0].includes('disabled=""'))
    })
  })

  describe('guessingWord によるdisabled制御の検証', () => {
    it('guessingWordが設定されているとき、未開封カードもdisabledになること', () => {
      const html = renderBoard({ isMaster: false, guessingWord: '太陽' })

      // 未開封の正解カード（太陽）がdisabledになること
      const sunMatch = html.match(/<button[^>]*>.*?太陽.*?<\/button>/)
      assert.ok(sunMatch)
      assert.ok(sunMatch[0].includes('disabled=""'), 'guessingWord設定中は未開封カードもdisabled')

      // 未開封のスパイカード（月）もdisabledになること
      const moonMatch = html.match(/<button[^>]*>.*?月.*?<\/button>/)
      assert.ok(moonMatch)
      assert.ok(moonMatch[0].includes('disabled=""'), 'guessingWord設定中はスパイカードもdisabled')
    })

    it('guessingWordと一致するカードにscale-95とopacity-80が適用されること', () => {
      const html = renderBoard({ isMaster: false, guessingWord: '太陽' })

      const sunMatch = html.match(/<button[^>]*>.*?太陽.*?<\/button>/)
      assert.ok(sunMatch)
      assert.ok(sunMatch[0].includes('scale-95'), '選択中カードにscale-95が適用されること')
      assert.ok(sunMatch[0].includes('opacity-80'), '選択中カードにopacity-80が適用されること')

      // 一致しないカードには適用されないこと
      // 正規表現は1行HTMLで複数ボタンを跨いでマッチするため、split で個別取得する
      const moonButtonHtml = html.split('</button>').find((s) => s.includes('月'))! + '</button>'
      assert.ok(moonButtonHtml.includes('月'), '月ボタンが存在すること')
      assert.ok(!moonButtonHtml.includes('scale-95'), '非選択カードにscale-95が適用されないこと')
    })
  })

  describe('開封済みカードのスタイル検証', () => {
    const boardWithRevealedSpy: BoardItem[] = [
      { word: '太陽', type: 'correct', revealed: false },
      { word: '月', type: 'spy', revealed: true },
      { word: '星', type: 'correct', revealed: true },
    ]

    it('開封済みスパイカードが赤色で表示されること', () => {
      const html = renderBoard({ board: boardWithRevealedSpy })

      const moonMatch = html.match(/<button[^>]*>.*?月.*?<\/button>/)
      assert.ok(moonMatch)
      assert.ok(moonMatch[0].includes('bg-rose-950/90'), '開封済みスパイに赤色背景が適用されること')
      assert.ok(moonMatch[0].includes('border-rose-600'), '開封済みスパイに赤色ボーダーが適用されること')
    })

    it('開封済み正解カードが緑色で表示されること', () => {
      const html = renderBoard({ board: boardWithRevealedSpy })

      const starMatch = html.match(/<button[^>]*>.*?星.*?<\/button>/)
      assert.ok(starMatch)
      assert.ok(starMatch[0].includes('bg-emerald-950/90'), '開封済み正解に緑色背景が適用されること')
      assert.ok(starMatch[0].includes('border-emerald-600'), '開封済み正解に緑色ボーダーが適用されること')
    })

    it('開封済みカードにタイプラベル（「スパイ」「正解」）が表示されること', () => {
      const html = renderBoard({ board: boardWithRevealedSpy })

      // 開封済みスパイに「スパイ」ラベルが表示されること
      const moonIdx = html.indexOf('月')
      const moonSection = html.slice(moonIdx - 200, moonIdx + 200)
      assert.ok(moonSection.includes('スパイ'), '開封済みスパイに「スパイ」タグが表示されること')

      // 開封済み正解に「正解」ラベルが表示されること
      const starIdx = html.indexOf('星')
      const starSection = html.slice(starIdx - 200, starIdx + 200)
      assert.ok(starSection.includes('正解'), '開封済み正解に「正解」タグが表示されること')

      // 未開封カードにはラベルが表示されないこと
      const sunIdx = html.indexOf('太陽')
      const sunSection = html.slice(sunIdx - 200, sunIdx + 400)
      assert.ok(!sunSection.includes('bg-black/40'), '未開封カードにタグが表示されないこと')
    })
  })
})
