import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Header } from '@/components/Header'
import '../index.css' // 共通スタイルをこちらにインポート

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 font-sans">
      <Header />
      <main className="w-full max-w-4xl flex-grow flex flex-col items-center justify-center">
        {/* 子ルートがここにレンダリングされる */}
        <Outlet />
      </main>
    </div>
  )
}
