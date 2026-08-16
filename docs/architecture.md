# システムアーキテクチャ & シーケンス設計

本ドキュメントでは、1人プレイ用コードネーム風ボードゲーム「Cloude」の主要なディレクトリ構成、システムアーキテクチャおよび主要なインタラクションシーケンスを解説します。

---

## 主要なディレクトリ構成

```
.
├── docs/                     # ドキュメント
├── public/                   # 画像
├── src/                      # フロントエンド（React + Vite）
│   ├── components/           # UIコンポーネント
│   │   ├── ui/               # shadcn/uiコンポーネント
│   │   ├── GameBoard.tsx     # カードボード表示
│   │   ├── GameStatusOverlay.tsx # 勝敗などのオーバーレイ
│   │   └── Header.tsx        # ロゴ・タイトル表示
│   ├── hooks/                # カスタムフック
│   │   └── useGame.ts        # UI状態とAPI連携、ターン遷移の管理
│   ├── lib/                  # フロントエンドのロジック
│   │   ├── gameRules.ts      # 回答時の状態遷移・勝敗判定
│   │   └── hintParser.ts     # ヒントテキストの抽出
│   └── types/                # 共通の型定義
│       └── game.ts
└── worker/                   # バックエンド（Cloudflare Workers + Hono）
    ├── lib/                  # バックエンドのロジック
    │   ├── hintParser.ts     # AIが返したヒントテキストの解釈
    │   ├── jsonParser.ts     # AIレスポンス(JSON/マークダウン)の安全なパース
    │   ├── similarity.ts     # Embedding(ベクトル類似度)によるヒント検閲・判定
    │   └── validation.ts     # ボード状態やAI出力スキーマの検証
    ├── routes/               # APIルーティング
    │   └── game.ts           # ゲーム関連のAPI
    ├── services/             # 外部サービス連携
    │   ├── aiService.ts      # Cloudflare Workers AI の呼び出し
    │   └── zennFeed.ts       # Zenn RSS フィードからのトレンドタイトル取得
    └── index.ts              # Workerのエントリーポイント
```

---

## 1. システムアーキテクチャ図

クライアントサイド（Vite + React）とサーバーサイド（Cloudflare Workers + Hono）が、Cloudflare KV と Workers AI を介してどのように連携しているかを示す

```mermaid
graph TD
    subgraph Client ["クライアント領域 (React + Vite)"]
        App["App.tsx (UI描画)"]
        useGame["useGame.ts (ゲーム状態フック)"]
        applyGuess["applyGuess.ts (ゲームルール/判定)"]
        App -->|イベント処理| useGame
        useGame -->|状態評価| applyGuess
    end

    subgraph Cloudflare ["Cloudflare プラットフォーム"]
        subgraph Worker ["バックエンド (Hono Worker)"]
            index["index.ts (エントリーポイント)"]
            gameRouter["game.ts (ルーティング)"]
            aiService["aiService.ts (AI連携)"]
            zennFeed["zennFeed.ts"]
            index --> gameRouter
            gameRouter --> aiService
            gameRouter --> zennFeed
        end
        
        KV[("Cloudflare KV: cloude_kv")]
        WorkersAI["Cloudflare Workers AI"]
    end

    ExternalFeed["Zenn フィード"]

    %% 通信経路
    useGame -->|HTTP POST /api/game/start| gameRouter
    useGame -->|HTTP POST /api/game/hint| gameRouter
    gameRouter -->|ゲーム状態の保存・取得| KV
    zennFeed -->|RSS XMLの取得| ExternalFeed
    aiService -->|プロンプト推論| WorkersAI
```

---

## 2. シーケンス図

### 2.1 新規ゲーム開始シーケンス
ゲームの開始時に Zenn RSS フィードからトレンド記事タイトルを取得し、その単語キーワードを含むボード（単語・スパイ配置）および最初のヒントを Workers AI で生成して状態を保存・返却するまでの流れです。主に、`api/game/start` 周りの内容を指す。

```mermaid
sequenceDiagram
    autonumber
    actor User as プレイヤー
    participant Client as クライアント (React)
    participant Worker as バックエンド (Hono Worker)
    participant Zenn as Zenn RSS (zennFeed.ts)
    participant KV as Cloudflare KV
    participant AI as Workers AI

    User ->> Client: 「ゲームをスタート」クリック
    Client ->> Worker: POST /api/game/start
    
    rect rgb(20, 30, 45)
        Note over Worker, Zenn: トレンドタイトルの取得
        Worker ->> Zenn: Zenn RSSフィードの取得・タイトル抽出
        Zenn -->> Worker: 記事タイトル一覧 (ランダムに3件選出)
    end

    rect rgb(20, 30, 45)
        Note over Worker, AI: ボード単語生成
        Worker ->> AI: ボード単語生成要求 (Zenn3タイトルキーワード + 6別ジャンル単語、正解/スパイ割り当て)
        AI -->> Worker: 生成されたボード単語データ
    end

    rect rgb(20, 30, 45)
        Note over Worker, AI: 盤面単語の事前Embedding取得
        Worker ->> AI: 9単語のベクトル化要求 (@cf/baai/bge-base-en-v1.5)
        AI -->> Worker: 9単語のベクトル多次元配列
        Note over Worker: 各BoardItemにvector属性を付与
    end

    rect rgb(20, 30, 45)
        Note over Worker, AI: 初期ヒント生成 & 検閲
        Worker ->> AI: 初期ヒント生成要求 (正解単語リスト vs スパイ単語リスト)
        AI -->> Worker: 試作ヒント
        Note over Worker: 試作ヒントをEmbedding化し事前保持ベクトルと比較検閲 (NGならリトライ)
    end

    Note over Worker: 各カードのvectorを含む GameState の構築
    Worker ->> KV: セッションIDをキーに GameState を保存
    Worker -->> Client: 初期 GameState (JSON)
    Client -->> User: 初期ボードとヒントを表示
```

---

### 2.2 カード回答 & ヒント更新シーケンス
プレイヤーがカードを選択した際のフロントエンド即時判定、および推測回数がなくなった場合の次のAIヒント取得の流れです。主に、`api/game/hint` 周りの内容を指す。

```mermaid
sequenceDiagram
    autonumber
    actor User as プレイヤー
    participant Client as クライアント (React)
    participant Rule as ゲームルール (applyGuess)
    participant Worker as バックエンド (Hono Worker)
    participant KV as Cloudflare KV
    participant AI as Workers AI

    User ->> Client: カードをめくる (単語の選択)
    Client ->> Rule: applyGuess(gameState, word) の実行
    Note over Client: 即座にフロントエンド側で正誤判定

    alt スパイ単語をめくってしまった場合
        Client -->> User: ゲームオーバー (敗北)
    else すべての正解単語をめくった場合
        Client -->> User: ゲームクリア (勝利)
    else 正解単語だが、推測回数が残っている場合
        Client -->> User: めくったカードの色を「正解」にし、推測回数を減らして継続
    else 推測回数が 0 になった場合 (かつ未クリア) または 手動で「ヒント再生成」を押した場合
        Note over Client: ヒント要求処理を開始
        Client ->> Worker: POST /api/game/hint
        Worker ->> KV: セッションIDから現在のGameStateを取得
        
        rect rgb(20, 30, 45)
            Note over Worker, AI: 次のヒント生成
            Worker ->> AI: 次のヒント生成要求 (未開示の正解単語 vs スパイ単語)
            AI -->> Worker: 新しいヒント・枚数テキスト
        end
        
        Worker ->> KV: 更新したGameStateを保存
        Worker -->> Client: 新しいヒントと推測回数を返却
        Client -->> User: 新しいヒントと推測回数を表示して継続
    end
```

---

## 3. Embedding (ベクトル埋め込み) によるゲーム開始時のヒント検証・ガードレール構造

### 3.1 原理と狙い
- **Embedding（ベクトル埋め込み）**: Cloudflare Workers AI (`@cf/baai/bge-base-en-v1.5`) を用い、単語の意味や概念を多次元の数値配列（ベクトル）に変換します。
- **コサイン類似度（Cosine Similarity）**: 2つのベクトル間の角度の余弦（-1.0〜1.0）を計算し、文字が異なっていても概念的な近さを数値化します。
- **スパイ誤爆の検閲（ガードレール）**: AIが作成した初期ヒント単語をベクトル化し、盤面にあるスパイ単語および正解単語のベクトルと比較・検閲します。以下の条件のいずれかに該当する場合は「不安全（スパイ誤爆リスク大）」と判定し、AIにヒントの再生成（リトライ）を行わせます。
  1. スパイ単語との最高類似度が閾値（`0.55`）を超えている場合
  2. スパイ単語との最高類似度が正解単語との最高類似度を上回っている場合

### 3.2 ゲーム開始時の詳細シーケンスとファイル遷移

```mermaid
sequenceDiagram
    autonumber
    participant Client as クライアント (React)
    participant GameRoute as game.ts (ルーティング)
    participant AIService as aiService.ts (Workers AI)
    participant Similarity as similarity.ts (類似度計算)
    participant KV as Cloudflare KV

    Client ->> GameRoute: POST /api/game/start
    GameRoute ->> AIService: 盤面9単語の埋め込み取得 (generateEmbeddings)
    AIService -->> GameRoute: 9単語の vector 配列
    
    loop 最大3回リトライ
        GameRoute ->> AIService: 初期ヒント生成 (generateHint)
        AIService -->> GameRoute: 試作ヒント単語 (例: "果物")
        GameRoute ->> AIService: ヒント単語の埋め込み取得 ("果物" の vector)
        AIService -->> GameRoute: ヒントの vector
        GameRoute ->> Similarity: ヒントと盤面単語の検証 (validateHintSafety)
        Similarity -->> GameRoute: OK (安全) or NG (スパイ誤爆リスク)
    end

    GameRoute ->> KV: 各カードに vector を持たせた GameState を保存
    GameRoute -->> Client: 初期 GameState を返却
```

### 3.3 主な関連ファイルと役割
- **[worker/services/aiService.ts](file:///Users/brainscience/Documents/VSCode/cloude/worker/services/aiService.ts)**
  - `generateEmbeddings`: Workers AI の Embedding モデルを呼び出し、テキスト単語を数値ベクトル `number[][]` に変換します。
- **[worker/lib/similarity.ts](file:///Users/brainscience/Documents/VSCode/cloude/worker/lib/similarity.ts)**
  - `cosineSimilarity`: 2つのベクトル間のコサイン類似度を算出します。
  - `validateHintSafety`: スパイ単語・正解単語のベクトルとヒントベクトルを比較し、誤爆判定ルールに基づき安全性を `boolean` で判定します。
- **[worker/routes/game.ts](file:///Users/brainscience/Documents/VSCode/cloude/worker/routes/game.ts)**
  - `POST /start` ルートにて全9単語のベクトル付与、初期ヒントのベクトル検証および最大3回のリトライ制御を実行し、`vector` を含む `GameState` を Cloudflare KV へ保存します。

