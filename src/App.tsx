import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import cloudflareLogo from './assets/cloudflare.svg'
import heroImg from './assets/hero.png'
import './index.css'
import { Button } from '@/components/ui/button'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 初期値を取得
  useEffect(() => {
    fetch('/api/counter')
      .then((res) => res.json())
      .then((data) => setCount(data.count))
  }, [])

  // インクリメント処理
  const increment = async () => {
    const res = await fetch('/api/counter', { method: 'POST' })
    const data = await res.json()
    setCount(data.count)
  }

  // Workers AI リクエスト処理
  const askAI = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isLoading) return

    setIsLoading(true)
    setResponse('')
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      if (data.response) {
        setResponse(data.response)
      } else if (data.error) {
        setResponse(`Error: ${data.error}`)
      } else {
        setResponse(JSON.stringify(data, null, 2))
      }
    } catch (err) {
      setResponse(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started with Cloudflare</h1>
          <p>
            Edit <code>src/App.tsx</code> or <code>worker/index.ts</code> and save to test <code>HMR</code>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Button onClick={increment}>
            KV Count is {count}
          </Button>
        </div>

        {/* Workers AI テストUI */}
        <div className="mt-8 w-full max-w-md p-4 rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur-sm text-left">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            ✨ Workers AI Playground
          </h2>
          <form onSubmit={askAI} className="flex flex-col gap-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="質問を入力してください (例: Tell me a joke)"
              className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <Button type="submit" disabled={isLoading || !prompt.trim()}>
              {isLoading ? 'AI生成中...' : 'AIに質問する'}
            </Button>
          </form>
          {response && (
            <div className="mt-4 p-3 rounded-md bg-slate-950 border border-slate-800 text-sm whitespace-pre-wrap">
              <span className="text-xs text-slate-400 font-semibold block mb-1">レスポンス:</span>
              {response}
            </div>
          )}
        </div>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
            <li>
              <a href="https://workers.cloudflare.com/" target="_blank">
                <img className="button-icon" src={cloudflareLogo} alt="" />
                Workers Docs
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
