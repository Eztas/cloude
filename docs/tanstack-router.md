# TanStack Router セットアップ手順

本プロジェクトにおける TanStack Router の導入とセットアップの手順を記録します。

## 1. ライブラリ導入
TanStack Router を導入し、型安全なルーティング基盤を構築しました。

```bash
pnpm add @tanstack/react-router
pnpm add -D @tanstack/router-plugin
```

## 2. `src/routes/` でのファイルベースルーティング
- 全画面共通(ラッパー div、Header、グローバル CSS) → `__root.tsx`
- そのページ固有(state、ロジック、本文 JSX) → `routes/xxx.tsx`
- `__root.tsx`
    - 全ルートの共通レイアウト（`Outlet`）を定義。
    - `src/index.css` を適切にインポート。
- `src/routes/index.tsx`
    - ルートページ（/）のコンポーネント。
    - `src/App.tsx`の内容を移行
    - `createFileRoute`でパス(今回はルート"/")とそのパスで表示するコンポーネントを定義
      ```ts
        import { createFileRoute } from '@tanstack/react-router'

        export const Route = createFileRoute('/')({
          component: IndexComponent,
        })
      ```
- `routeTree.gen.ts` が`pnpm dev`で自動生成される。

## 3. TypeScript 設定の厳格化
TanStack Router の型安全性要件を満たすため、`tsconfig.app.json` にて `strict: true` を有効化。
- これにより `strictNullChecks` が有効になり、予期せぬ型エラーを防止。

## 4. 不要なファイルの整理
TanStack Router の導入に伴うコンポーネント構造の最適化の過程で、以下のファイルを削除しました。

- `src/App.css`: Tailwind CSS を使用する現在の構成では不要であるため削除。
- `src/App.tsx`: TanStack Router への移行に伴い、ルートベースの構成へ変更したため不要となり削除。

## 参考

Antigravityの自動生成

0から作成をするTech Blogは見つかったが、移行するBlogが見つからなかったので、Antigravityで一度作成した。動作はしたので問題ないと判断。
