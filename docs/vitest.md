# Vitest 導入と環境分離の記録（2026/10/12）

本ドキュメントは、本プロジェクト（Cloude）においてテストフレームワークを `node:test` から `Vitest` へ移行し、フロントエンド（React）とバックエンド（Cloudflare Workers）のマルチプロジェクト構成を確立するまでに直面した課題と解決策をまとめた記録です。

---

## 1. 移行の背景と目的

- **以前の構成**:
  - バックエンド（Worker）のテストに Node.js 組み込みの `node:test` + `node:assert` を使用。
  - フロントエンド（React / Testing Library）の単体テスト実行環境が未整備だった。
- **目的**:
  - Vite エコシステムと親和性の高い Vitest に統一。
  - フロントエンド（`jsdom`）とバックエンド（Cloudflare Workers / Hono）の両方を一括かつ高速にテスト可能な基盤の構築。

---

## 2. ぶつかった壁と苦労した点

### ① Cloudflare 公式プラグインの選定と移行
- **課題**:
  - 当初は 他プロジェクトで当時使っていた`@cloudflare/vitest-pool-workers` を使用して設定していたが、Cloudflare 公式の推奨パッケージが `@cloudflare/vitest-plugin` へと移行しており、パッケージ選定や Vitest の設定変更が必要となった。
- **対応**:
  - `@cloudflare/vitest-plugin` を採用し、Vitest 設定（`vitest.config.ts`）に `cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })` を組み込み。

### ② フロントエンドとバックエンドの実行環境の衝突
- **課題**:
  - フロントエンドは DOM API を必要とするため `jsdom` 環境が必要。
  - 一方で Worker は Cloudflare 特有の環境や Node.js 互換環境を想定しており、同一のテスト設定ではプラグインやエイリアス、環境（`environment`）が衝突する。
- **対応**:
  - Vitest の **`workspace / projects` 機能** を活用。
  - `frontend`、`worker`、`worker integration` の 3 つのプロジェクトに分割し、それぞれのスコープとプラグインを完全に分離。

### ③ CI（GitHub Actions）における Workers AI リモートプロキシの認証エラー
- **最大のハマりどころ**:
  - ローカル環境でテストが通った後、GitHub Actions（非対話環境）で `pnpm test` を実行すると以下のエラーが発生：
    ```
    Error: [vitest-pool]: Failed to start cloudflare-pool worker
    Caused by: Error: Failed to start the remote proxy session.
    In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN environment variable for wrangler to work.
    ```
- **原因**:
  - `wrangler.jsonc` で Workers AI バインディング（`ai: { binding: "cloude_AI" }`）を定義しているため、`cloudflareTest` プラグイン経由で worker プールを起動すると、Cloudflare のリモートサーバーへプロキシ接続を試みる。
  - ローカルでは過去の wrangler ログイン情報や `.dev.vars` が参照され暗黙的に動いていたが、CI 環境では `CLOUDFLARE_API_TOKEN` が未設定のためプール起動自体がクラッシュしていた。
  - さらに、単体テスト（`validation.test.ts`, `jsonParser.test.ts` 等）は AI と通信しない純粋なロジックテストであり、サービス層（`aiService.test.ts`, `game.test.ts`）もすべてモックオブジェクトを渡していたため、そもそもリモートプロキシ接続が不要だった。
- **対応**:
  - 単体テスト（`worker` プロジェクト）から `cloudflareTest` プラグインを除去し、純粋な `node` 環境で実行するように修正。
  - 実際の外部接続を伴う結合テストのみを `worker integration`（`pnpm test:integration`）に隔離。
  - これにより、単体テストはトークン不要かつ 0.6 秒台で超高速に完了するようになった。

---

## 3. 最終的なテスト構成

### プロジェクト構成（[vitest.config.ts](file:///Users/brainscience/Documents/VSCode/cloude/vitest.config.ts)）

| プロジェクト名 | 対象ファイル | 実行環境 | プラグイン | 用途 |
| :--- | :--- | :--- | :--- | :--- |
| `frontend` | `src/**/*.test.{ts,tsx}` | `jsdom` | `@vitejs/plugin-react` | UI コンポーネントおよびフロントエンドロジック |
| `worker` | `worker/**/!(*.integration).test.ts` | `node` | なし（モック利用） | Worker 単体テスト（高速・CI 完全独立） |
| `worker integration` | `worker/**/*.integration.test.ts` | workerd | `cloudflareTest` | 実際の外部接続を伴う結合テスト |

## 4. 得られた知見・教訓

1. **モック可能な単体テストに重いランタイムを被せない**:
   - `cloudflareTest` プラグインは本物の workerd ランタイムやバインディング検証に有用だが、プール起動コストと外部接続のオーバーヘッドが大きい。
   - 引数経由で `env` をモック注入できる設計（DI・純粋関数）にしていれば、単体テストは標準の `node` 環境で走らせるのが最も堅牢で高速。
2. **ローカルのログイン状態と CI の非対話環境のギャップに注意**:
   - wrangler はローカル認証キャッシュを透過的に使うため、CI で初めてリモートプロキシ認証必須のエラーが顕在化する。CI を意識した環境設計が不可欠。

### ⑤（2026/10/19 追記）リモートプロキシ起動エラーの根本回避: テスト専用 wrangler 設定
- **事象**: デプロイ済みドメインが Cloudflare Access の後ろに置かれた状態で `pnpm test:integration` を実行すると、AI バインディング経由のリモートプロキシセッション起動時に「no Access Service Token credentials were found」とプールごと落ちた。
- **原因**: `cloudflareTest` は `wrangler.jsonc` の AI バインディングを検出すると、ローカル workerd では実行不能な AI をリモート（デプロイ済み Worker）にプロキシしようとする。実オンラインの結合テスト（当時は zennFeed のみ）は AI 未使用なのに、設定の存在だけでリモート接続が必須になっていた。
- **対応**: AI バインディングを含まない**テスト専用設定 `wrangler.vitest.jsonc`**（KV + `ZENN_FEED_URL` のみ）を作成し、`vitest.config.ts` の `worker integration` プロジェクトの `configPath` に指定した。
- **効果**: エージェント・CI 等の非対話環境でも認証情報なしで結合テストが完走する（実 KV はローカル workerd 上に実体化）。
- **注意**: 将来的に実 AI を叩く結合テストを追加する場合は、`wrangler.vitest.jsonc` に AI バインディングを足すか、そのテストだけ `wrangler.jsonc` を指す別プロジェクトに隔離する。
