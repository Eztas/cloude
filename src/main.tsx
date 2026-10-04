import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import './index.css'

// 自動生成されたルートツリーをインポート
import { routeTree } from './routeTree.gen'

// ルーターインスタンスを作成
const router = createRouter({ routeTree })

// ルーターの型定義を登録
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
