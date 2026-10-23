# AGENTS.md - Cloude

コードの作成・変更・レビュー時に、該当領域のチェック項目を確認すること。
違反を見つけたら、黙って直さず「何が問題か」を一言添えて修正または指摘する。
判断に迷う場合は推測で進めず、ユーザーに確認する。

領域: [共通](#共通) / [フロントエンド](#フロントエンド) / [バックエンド](#バックエンド) / [テスト](#テスト) / [インフラ・デプロイ](#インフラデプロイ) / [セキュリティ](#セキュリティ)

---

## 共通

### 技術スタック
- スタック: React + TanStack Router (Vite) / Hono on Cloudflare Workers / KV / Workers AI
- 厳格 TypeScript (`strict: true`)。`any` で逃げない
- 依存追加は必要性を精査し、既存の util・shadcn/ui で代替できないか先に確認する
- ロックファイル (`pnpm-lock.yaml`) はコミットし、手編集しない。パッケージは pnpm で管理
- Lint は `pnpm lint` (oxlint)。CI を green にしてから PR を出す

### 自動生成ファイル（手編集しない）
- `src/routeTree.gen.ts`: `pnpm dev` で TanStack Router が自動生成
- `worker-configuration.d.ts`: `pnpm run cf-typegen` で生成（バインディング変更後に実行）

### コード品質
- エラーを握りつぶさない。AI や RSS の取得失敗は null / エラーレスポンスとして明示的に扱う
- デッドコード・未使用 import は削除。負債を残す場合は TODO に理由と期限を書く
- ドキュメント (`README.md`, `docs/*.md`) も一緒に更新する

---

## フロントエンド

### ルーティング・UI
- ページ追加は `src/routes/` のファイルベースルーティング。共通レイアウトは `__root.tsx`
- UI 追加は shadcn/ui（`pnpm dlx shadcn@latest add <component>`）。生の `innerHTML` / `dangerouslySetInnerHTML` は禁止
- ロジックはルートファイルに直接書かず、`src/lib/` `src/hooks/` に切り出し、フックは副作用を持たない純粋化を意識する

### 通信
- API 呼び出しは `src/lib/api.ts` の Hono RPC クライアント (`hc`) 経由。生の `fetch` で URL を直書きしない
- API の型はバックエンド（`worker/routes/game.ts`）から自動推論される。フロントで型を上書きせず、食い違う場合はバックエンドを直す
- 共通型は `src/types/game.ts` と `worker/types.ts` で重複定義せず、片方に寄せる

---

## バックエンド

### Workers・Hono
- エンドポイントは `worker/routes/` に実装。Hono RPC の型推論が効くよう既存構成を壊さない
- HTTP ステータスは意味に合わせる（バリデーション失敗は 4xx）。エラーに 200 を返さない
- ビジネスロジックをエンドポイントに直書きせず、`worker/lib/` `worker/services/` に置く

### KV
- KV はゲームセッションの保存に使う。書き込みは冪等にし、セッション文字列はバリデーション済みの値のみ保存する

### AI・外部データ（プロンプトインジェクション対策）
- Workers AI のモデル名は `wrangler.jsonc` / secret 具体バージョンで固定（latest 等のエイリアス禁止）。
- AI・Zenn RSS は「信頼できない外部データ」。`worker/lib/validation.ts` と `jsonParser.ts` で必ず検証してから利用する
- Zenn タイトル等の外部テキストをプロンプトに埋め込む場合は、指示として解釈されない形にする
- 外部接続 (`aiService.ts`, `zennFeed.ts`) はタイムアウトと null フォールバックを持たせ、依存先障害でゲーム全体が止まらないようにする

---

## テスト

- 構成（`vitest.config.ts`）: `frontend`(jsdom) / `worker`(node, 高速・CI 独立) / `worker integration`(workerd, `cloudflareTest`)
- 新規ロジックには単体テストを追加し、テストは 3 プロジェクトの適切な方に置く
  - AI・ RSS 等の実接続を伴うもの → `worker integration`（`pnpm test:integration`）に隔離
  - `env` はモック注入（DI）できる設計にし、単体テストで重い workerd ランタイムを起動しない
- `worker integration`（`*.integration.test.ts`）は実バインディング（workerd）で動かす
  - 実 `env` は `import { env } from 'cloudflare:workers'` で取得し、`env as unknown as Bindings` を介して参照。KV 等はモックではなく実バインディングで直接読み書きして検証する
  - D1 を使うテストは `import { applyD1Migrations, type D1Migration } from 'cloudflare:test'` でマイグレーションを適用してから実行する
  - `cloudflare:test` / `cloudflare:workers` の型は `tsconfig.worker.json` の `types` に入っている `@cloudflare/vitest-plugin/types` が解決する（削除すると型エラーになるため依存関係に注意）
- `worker integration` の wrangler 設定は `wrangler.vitest.jsonc`（AI バインディングを除外したテスト専用設定。実 AI を使う結合テストを追加する際は設定を見直す。詳細は `docs/vitest.md`）
- モックは外部境界（AI、RSS、KV）のみ。テスト対象自身をモックしない
- バグ修正時はまず再現テストを書く。flaky テストは無効化せず原因を特定する
- 実行: `pnpm test`（単体）/ `pnpm test:integration` / `pnpm test:all`

---

## インフラ・デプロイ

- 設定は `wrangler.jsonc` に集約。バインディング変更後は `pnpm run cf-typegen` を必ず実行
- KV namespace は 本番/ローカルを分け、binding 名はこのコードの `cloude_kv` の運用済みのものを参考にする
- デプロイは `pnpm deploy` (wrangler deploy)、プレビューは `pnpm preview`。手動での Cloudflare ダッシュボード設定変更をしない

---

## セキュリティ

### シークレット
- シークレットをコード・コミットに入れない。`.dev.vars*`・`.env*` は .gitignore 済み、ローカルは `.dev.vars.example` を参考にする
- 本番シークレットは `pnpm wrangler secret put` で管理する

### 入力・出力
- リクエストボディのユーザーヒント (`/api/game/guess` 等) はサーバー側で型・長さ・形式を検証 (`worker/lib/validation.ts`)
- AI 出力・Zenn RSS はユーザー入力と同様に信頼せず、検証後にのみレスポンスへ反映する
- エラーレスポンスには内部情報（プロンプト全文・スタックトレース・API トークン等）を含めない
