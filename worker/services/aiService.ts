import type { Bindings, AiGuessOutput } from '../types.ts'
import {
  AI_BOARD_SCHEMA,
  AI_HINT_SCHEMA,
  AI_GUESS_SCHEMA,
  isWordList,
  isAiHintOutput,
  isAiGuessOutput,
  isValidUserHint,
} from '../lib/validation.ts'
import { parseAiJsonResponse } from '../lib/jsonParser.ts'
import {
  BOARD_SYSTEM_PROMPT,
  getBoardUserPrompt,
  getHintSystemPrompt,
  getHintUserPrompt,
} from '../prompts/gamePrompts.ts'
import {
  GUESSER_SYSTEM_PROMPT,
  getGuesserUserPrompt,
} from '../prompts/guesserPrompts.ts'

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

export const guessWords = async (
  env: Bindings,
  hint: string,
  count: number,
  candidateWords: string[]
): Promise<AiGuessOutput | null> => {
  const trimmedHint = hint?.trim()
  if (!isValidUserHint(trimmedHint, 10)) {
    return null
  }

  const safeCount = Math.max(1, count)
  const result = await env.cloude_AI.run(env.WORKERS_AI_HINTS_MODEL_NAME, {
    messages: [
      {
        role: 'system',
        content: GUESSER_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: getGuesserUserPrompt(trimmedHint, safeCount, candidateWords),
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: AI_GUESS_SCHEMA,
    },
  })

  const raw = (result as { response?: unknown }).response
  const parsed = parseAiJsonResponse(raw)

  if (!isAiGuessOutput(parsed)) {
    return null
  }

  // 盤面にない単語を除外し、count上限でトリム
  const validGuesses = parsed.guesses
    .filter(g => candidateWords.includes(g))
    .slice(0, count)

  return { guesses: validGuesses, reasoning: parsed.reasoning }
}
