import type { Bindings, BoardItem } from '../types.ts'
import {
  AI_BOARD_SCHEMA,
  AI_HINT_SCHEMA,
  isBoardItemList,
  isAiHintOutput,
} from '../lib/validation.ts'

export const WORKERS_AI_MODEL_NAME = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

export const generateBoard = async (env: Bindings): Promise<BoardItem[] | null> => {
  const result = await env.cloude_AI.run(WORKERS_AI_MODEL_NAME, {
    messages: [
      {
        role: 'system',
        content: `あなたはコードネーム風カードゲームのゲームマスターAIです。

【単語生成の厳格ルール】
1. 【ジャンルの完全多様化】毎回ランダムに全く異なる9つの異なるジャンル・領域を自由に想定し、各ジャンルから1つずつ、合計9つの日本語名詞を生成してください。
2. 【例への偏り防止】特定の分野に偏らないよう、毎回全く新しい多種多様な世界観・ジャンルから単語を選出してください。（プロンプト内の固定例には一切囚われないこと）
3. 【安易な単語の禁止】「犬」「猫」「山」「空」「海」「リンゴ」「車」などの一般的・日常的すぎる簡単な単語は使用禁止（NG）です。
4. 9つのうち 2つを type: "spy"、7つを type: "correct" としてランダムに割り当ててください。`,
      },
      {
        role: 'user',
        content: '9つすべてが異なるジャンルから選ばれた、多岐にわたるユニークな日本語名詞を生成し、2つをspy、7つをcorrectとして割り当ててください。',
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: AI_BOARD_SCHEMA,
    },
  })

  const rawBoard = (result as { response?: { board?: unknown } }).response?.board
  if (!isBoardItemList(rawBoard)) {
    return null
  }

  return rawBoard
}

export const generateHint = async (
  env: Bindings,
  correctWords: string[],
  spyWords: string[] = []
): Promise<string> => {
  const maxCount = Math.min(3, correctWords.length)
  const result = await env.cloude_AI.run(WORKERS_AI_MODEL_NAME, {
    messages: [
      {
        role: 'system',
        content: `あなたはコードネーム風カードゲームのマスターAIです。

【タスク】
「残りの正解単語」の中から 1〜${maxCount} 個の単語（targetWords）を選び、それらに共通する上位概念「hint」と枚数「count」を JSON Schema に従って決定してください。

【厳格な禁止・注意事項】
1. 【スパイ連想の絶対禁止】生成する hint は「スパイ単語 (連想絶対NG)」に含まれるどの単語にも連想・該当してはいけません。（例: スパイに「空」がある場合、「自然」「天気」「雲」などの上位・関連概念は絶対NG）
2. 【盤面単語の再利用禁止】盤面にある全単語（正解・スパイ問わず）の文字列そのものを hint に使用してはいけません。
3. 【枚数制限】count は選んだ targetWords の個数（1〜${maxCount}）と一致させてください。7枚など全体の枚数を出してはいけません。`,
      },
      {
        role: 'user',
        content: `残りの正解単語: ${correctWords.join(', ')}\nスパイ単語 (連想絶対NG): ${spyWords.join(', ')}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: AI_HINT_SCHEMA,
    },
  })

  const rawHint = (result as { response?: unknown }).response
  if (isAiHintOutput(rawHint)) {
    const hintWord = rawHint.hint.replace(/[\s:：枚]/g, '')
    const count = Math.min(Math.max(1, rawHint.count), maxCount)
    return `${hintWord}: ${count}枚`
  }

  // テキスト形式フォールバック
  if (typeof rawHint === 'string') {
    return rawHint.trim()
  }

  return 'ヒント: 1枚'
}
