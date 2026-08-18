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
import { findBestSafeCluster } from '../lib/clustering.ts'

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
  boardItems: BoardItem[]
): Promise<{ hintText: string; reasoning?: string }> => {
  // 0. めくられた（revealed: true）カードはAIの処理対象から完全に除外する
  const activeUnrevealedItems = boardItems.filter((i) => i.revealed !== true)

  // 1. ベクトル類似度＆スパイ危険性チェックによる安全なターゲットグループの選定
  const targetCluster = findBestSafeCluster(activeUnrevealedItems)
  if (targetCluster.length === 0) {
    return { hintText: 'ヒントなし' }
  }

  const targetWords = targetCluster.map((i) => i.word)
  const spyWords = boardItems.filter((i) => i.type === 'spy' && !i.revealed).map((i) => i.word)
  const targetCount = targetWords.length

  // 2. 選定されたグループの共通点命名をLLMに要求
  const result = await env.cloude_AI.run(env.WORKERS_AI_HINTS_MODEL_NAME, {
    messages: [
      {
        role: 'system',
        content: getHintSystemPrompt(targetCount),
      },
      {
        role: 'user',
        content: getHintUserPrompt(targetWords, spyWords),
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

