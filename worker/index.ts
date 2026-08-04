import { Hono } from 'hono'

// Cloudflare Workers の Env (Bindings) 型定義
type Bindings = {
  cloude_kv: KVNamespace
}

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

// 存在しない API ルートへのレスポンスなど
app.all('/api/*', (c) => {
  return c.json({ error: 'Kummerspeck' }, 404)
})

export default app
