import type { Bindings, BoardItem } from '../types.ts'
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
  correctWords: (string | BoardItem)[],
  spyWords: string[] = []
): Promise<{ hintText: string; reasoning?: string }> => {
  if (correctWords.length === 0) {
    return { hintText: 'ヒントなし' }
  }

  // バックエンド側で spySimilarity（低いほど安全）に基づいてソート
  const sortedItems = [...correctWords].sort((a, b) => {
    const simA = typeof a === 'string' ? 0 : (a.spySimilarity ?? 0)
    const simB = typeof b === 'string' ? 0 : (b.spySimilarity ?? 0)
    return simA - simB
  })

  // 最も安全な上位2〜3個の単語グループを自動選定
  const targetCount = Math.min(3, Math.max(1, Math.min(sortedItems.length, 3)))
  const selectedGroupItems = sortedItems.slice(0, targetCount)
  const selectedGroupWords = selectedGroupItems.map(item => typeof item === 'string' ? item : item.word)

  const result = await env.cloude_AI.run(env.WORKERS_AI_HINTS_MODEL_NAME, {
    messages: [
      {
        role: 'system',
        content: getHintSystemPrompt(targetCount),
      },
      {
        role: 'user',
        content: getHintUserPrompt(selectedGroupWords, spyWords),
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
    return {
      hintText: `${hintWord}: ${targetCount}枚`,
      reasoning: parsedHint.reasoning,
    }
  }

  return { hintText: 'ヒントなし' }
}

export const generateEmbeddings = async (
  env: Bindings,
  texts: string[]
): Promise<number[][] | null> => {
  if (texts.length === 0) return []
  const model = env.WORKERS_AI_EMBEDDING_MODEL_NAME || '@cf/baai/bge-base-en-v1.5'
  try {
    const result = await env.cloude_AI.run(model as Parameters<typeof env.cloude_AI.run>[0], {
      text: texts,
    })
    const data = (result as { data?: number[][] }).data
    if (Array.isArray(data) && data.length === texts.length) {
      return data
    }
    return null
  } catch (error) {
    console.error('Failed to generate embeddings:', error)
    return null
  }
}
