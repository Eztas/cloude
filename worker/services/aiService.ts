import type { Bindings } from '../types.ts'
import {
  AI_BOARD_SCHEMA,
  AI_HINT_SCHEMA,
  isWordList,
  isAiHintOutput,
} from '../lib/validation.ts'
import { parseAiJsonResponse } from '../lib/jsonParser.ts'
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

  const rawResponse = (result as { response?: unknown }).response
  const parsedResponse = parseAiJsonResponse<{ words?: unknown }>(rawResponse)
  const rawWords = parsedResponse?.words

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
  const parsedHint = parseAiJsonResponse(rawHint)

  if (isAiHintOutput(parsedHint)) {
    const hintWord = parsedHint.hint.replace(/[\s:：枚]/g, '')
    const count = Math.min(Math.max(1, parsedHint.count), maxCount)
    return {
      hintText: `${hintWord}: ${count}枚`,
      reasoning: parsedHint.reasoning,
    }
  }

  return { hintText: 'ヒントなし' }
}
