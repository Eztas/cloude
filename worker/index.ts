import { Hono } from 'hono'

// Cloudflare Workers の Env (Bindings) 型を適用
const app = new Hono<{ Bindings: Env }>()

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
