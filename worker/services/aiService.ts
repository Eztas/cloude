import type { Bindings, BoardItem } from '../types.ts'
import { AI_BOARD_SCHEMA, isBoardItemList } from '../utils/validation.ts'

export const WORKERS_AI_MODEL_NAME = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

export const generateBoard = async (env: Bindings): Promise<BoardItem[] | null> => {
  const result = await env.cloude_AI.run(WORKERS_AI_MODEL_NAME, {
    messages: [
      {
        role: 'system',
        content: '日本語の名詞のみを生成するアシスタントです。指定されたJSON Schemaに厳密に従って出力してください。',
      },
      {
        role: 'user',
        content: '9つの異なる日本語の名詞を生成し、そのうち2つを type: "spy"、7つを type: "correct" としてランダムに割り当ててください。',
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
  const result = await env.cloude_AI.run(WORKERS_AI_MODEL_NAME, {
    messages: [
      {
        role: 'system',
        content: `あなたはコードネーム風カードゲームのマスターAIです。
                  【厳格なルール】
                  1. 残りの「正解単語リスト」の中から、共通する2〜3個の単語を連想できる上位概念やカテゴリを1つ考えてください。
                  2. 生成するヒントは、「スパイ単語リスト」に含まれる単語には絶対に連想・該当してはいけません（NG）。
                  3. 盤面上の全単語（正解・スパイ）に含まれる文字列そのものをヒントに指定することは禁止（NG）です。
                  4. 出力は余計な解説を一切含めず、「ヒント単語: N枚」（例: 「料理: 2枚」）の形式のみで出力してください。`,
      },
      {
        role: 'user',
        content: `残りの正解単語: ${correctWords.join(', ')}\nスパイ単語 (連想NG): ${spyWords.join(', ')}`,
      },
    ],
  })
  return (result as { response: string }).response.trim()
}

