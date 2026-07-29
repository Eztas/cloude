import { Hono } from 'hono'

// Cloudflare Workers の Env (Bindings) 型定義
type Bindings = {
  KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

// APIルートの定義
app.get('/api/hello', (c) => {
  return c.json({
    message: 'Hello from Hono & Cloudflare Workers!',
  })
})

// 存在しない API ルートへのレスポンスなど
app.all('/api/*', (c) => {
  return c.json({ error: 'Not Found' }, 404)
})

export default app
