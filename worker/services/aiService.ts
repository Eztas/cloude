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
        content: 'あなたはヒントを出す役割です。以下の単語群から連想される、10文字以内の単語を1つだけ返してください。余計な文字は一切出力しないでください。',
      },
      {
        role: 'user',
        content: `残りの正解単語: ${correctWords.join(', ')}`,
      },
    ],
  })
  return (result as { response: string }).response.trim()
}
