import { Hono } from 'hono'
import type { Bindings } from './types.ts'
import gameApp from './routes/game.ts'

const app = new Hono<{ Bindings: Bindings }>()

app.route('/api/game', gameApp)

// 存在しない API ルートへのレスポンスなど
app.all('/api/*', (c) => {
  return c.json({ error: 'Not Found' }, 404)
})

export default app

