import type { Bindings } from '../types.ts'
import {
  AI_BOARD_SCHEMA,
  AI_HINT_SCHEMA,
  isWordList,
  isAiHintOutput,
} from '../lib/validation.ts'
import {
  BOARD_SYSTEM_PROMPT,
  getBoardUserPrompt,
  getHintSystemPrompt,
  getHintUserPrompt,
} from '../prompts/gamePrompts.ts'

export const generateBoardWords = async (
  env: Bindings,
  zennTitles: string[] = []
): Promise<string[] | null> => {
  const result = await env.cloude_AI.run(env.WORKERS_AI_WORDS_MODEL_NAME, {
    messages: [
      {
        role: 'system',
        content: BOARD_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: getBoardUserPrompt(zennTitles),
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: AI_BOARD_SCHEMA,
    },
  })

  const rawWords = (result as { response?: { words?: unknown } }).response?.words
  if (!isWordList(rawWords)) {
    return null
  }

  return rawWords
}

export const generateHint = async (
  env: Bindings,
  correctWords: string[],
  spyWords: string[] = []
): Promise<{ hintText: string; reasoning?: string }> => {
  const maxCount = Math.min(3, correctWords.length)
  const result = await env.cloude_AI.run(env.WORKERS_AI_HINTS_MODEL_NAME, {
    messages: [
      {
        role: 'system',
        content: getHintSystemPrompt(maxCount),
      },
      {
        role: 'user',
        content: getHintUserPrompt(correctWords, spyWords),
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
    return {
      hintText: `${hintWord}: ${count}枚`,
      reasoning: rawHint.reasoning,
    }
  }

  // テキスト形式フォールバック
  if (typeof rawHint === 'string') {
    return { hintText: rawHint.trim() }
  }

  return { hintText: 'ヒント: 1枚' }
}
