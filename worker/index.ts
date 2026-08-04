import { Hono } from 'hono'

// Cloudflare Workers の Env (Bindings) 型定義
type Bindings = {
  cloude_kv: KVNamespace
  cloude_AI: Ai
}

const WORKERS_AI_MODEL_NAME = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

const app = new Hono<{ Bindings: Bindings }>()

// カウンターの取得
app.get('/api/counter', async (c) => {
  const count = await c.env.cloude_kv.get('counter')
  return c.json({ count: parseInt(count || '0') })
})

// カウンターのインクリメント
app.post('/api/counter', async (c) => {
  const current = await c.env.cloude_kv.get('counter')
  const next = parseInt(current || '0') + 1
  await c.env.cloude_kv.put('counter', next.toString())
  return c.json({ count: next })
})

// Workers AI チャットエンドポイント
app.post('/api/ai/chat', async (c) => {
  try {
    const { prompt } = await c.req.json<{ prompt: string }>()
    if (!prompt) {
      return c.json({ error: 'Prompt is required' }, 400)
    }

    const aiResponse = await c.env.cloude_AI.run(WORKERS_AI_MODEL_NAME, {
      prompt,
    })

    return c.json(aiResponse)
  } catch (error) {
    console.error('AI execution error:', error)
    return c.json({ error: 'Failed to execute AI model' }, 500)
  }
})

// 存在しない API ルートへのレスポンスなど
app.all('/api/*', (c) => {
  return c.json({ error: 'Kummerspeck' }, 404)
})

export default app
