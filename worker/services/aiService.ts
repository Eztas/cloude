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

export const generateHint = async (env: Bindings, correctWords: string[]): Promise<string> => {
  const result = await env.cloude_AI.run(WORKERS_AI_MODEL_NAME, {
    messages: [
      {
        role: 'system',
        content: `あなたはワードゲームのヒント出しマスターです。
                  【厳格なルール】
                  1. 残りの正解単語リストの中から、共通する2〜3個の単語をまとめて連想・選択できるような上位概念や関連カテゴリの言葉を1つだけ考えて出力してください。
                  2. 正解単語リストに含まれる単語そのもの、またはその文字列の一部を含んだ言葉をヒントにすることは絶対に禁止（NG）です。
                  3. 挨拶や解説などの余計なテキストは一切出力せず、ヒントとなる単語（10文字以内）のみを出力してください。`,
      },
      {
        role: 'user',
        content: `残りの正解単語: ${correctWords.join(', ')}`,
      },
    ],
  })
  return (result as { response: string }).response.trim()
}
