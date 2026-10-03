import { hc } from 'hono/client'
import type { AppType } from '@worker/index'

// ブラウザ環境では同一オリジン宛にリクエストを送信
export const client = hc<AppType>('/')
