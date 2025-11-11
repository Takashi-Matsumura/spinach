# Spinach

AIチャット + RAG（Retrieval-Augmented Generation）アプリケーション

## 概要

Spinachは、ローカルLLMとRAGを組み合わせたWebアプリケーションです。llama.cppサーバーを利用してGoogle Gemma 3N-E4Bモデルを実行し、ChromaDBベクトルデータベースを使用してドキュメントベースの文脈強化型チャットを提供します。

## 主な機能

- **AIチャット**: ローカルLLMとのストリーミング対話
- **コンテキストウィンドウ管理**:
  - リアルタイムで使用率を可視化するプログレスバー
  - 使用率に応じた色分け（緑：正常、黄：警告、赤：危険）
  - コンテキスト溢れを事前に察知可能
- **RAG機能**: ドキュメントベースの文脈強化型応答
  - 埋め込み表示型のドキュメント管理画面
  - ファイル/テキストモード切り替え対応
- **日報機能（報連相）**:
  - 対話形式による日報作成
  - 社員情報管理（名前・部署）
  - 日報履歴の自動保存・閲覧・編集・削除
  - 既存履歴の自動読み込み（重複防止）
  - 日付・社員ごとの履歴管理
  - JSONコードブロックの視認性改善（明るい背景、読みやすい配色）
  - 提出状態の可視化（完了/未提出アイコン）
  - 修正モードから簡単に日報を提出できる機能
- **セッション管理**: チャット履歴のデータベース保存と復元（Prisma + SQLite/PostgreSQL）
- **ドキュメント管理**: PDFやテキストファイルのアップロードと管理
- **アプリ情報**: 使用中のモデルのスペック表示と設定の表示・編集
- **音声入力**: Web Speech APIを使用した音声認識（対応ブラウザのみ）
- **Mermaid図表**: チャット内でのMermaid図表のレンダリング
- **モノクロデザイン**: 統一されたグレースケールUIデザイン
- **レスポンシブデザイン**: モバイル・デスクトップ対応のUIデザイン

## 技術スタック

### フロントエンド
- **Next.js** 15.5.4 (App Router)
- **React** 19.1.0
- **TypeScript** 5.x
- **Tailwind CSS** 4.x
- **Prisma** 6.19.0 - ORM（SQLite/PostgreSQL）
- **react-markdown** - Markdown レンダリング
- **Mermaid** - 図表生成
- **Biome** - リンター/フォーマッター

### バックエンド
- **FastAPI** 0.115.6
- **Python** 3.11+
- **ChromaDB** 0.5.23 - ベクトルデータベース（RAG用）
- **Sentence Transformers** 3.3.1 - 埋め込みモデル
- **llama.cpp** - LLM推論エンジン（外部サービス）

### インフラ
- **Docker** - コンテナ化
- **Docker Compose** - マルチコンテナ管理
- **Node 20 Alpine** - フロントエンドコンテナベースイメージ
- **Python 3.11 Slim** - バックエンドコンテナベースイメージ

### データベース
- **開発環境**: SQLite（Prisma経由）
- **本番環境**: PostgreSQL（推奨）
- **ベクトルDB**: ChromaDB（RAG機能用、変更なし）

### LLMモデル
- **Google Gemma 3N-E4B** (6.9B パラメータ, Q6_K量子化)
- **埋め込みモデル**: intfloat/multilingual-e5-base

## 前提条件

### システム要件
- **Node.js** 18.x以上
- **Python** 3.11以上
- **llama.cpp サーバー** (OpenAI互換APIモード)

### llama.cpp サーバーのセットアップ

llama.cpp サーバーが起動している必要があります。デフォルトでは `http://localhost:8080` でリッスンしている想定です。

```bash
# llama.cpp サーバーの起動例
llama-server \
  --model /path/to/your/model.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --ctx-size 32768
```

## セットアップ

### 方法1: Docker を使用（推奨）

Dockerを使用すると、依存関係のインストールや環境構築を簡単に行えます。

#### 前提条件
- **Docker Desktop** がインストールされ、起動していること
- **llama.cpp サーバー** が起動していること（`http://localhost:8080`）

#### 手順

```bash
# リポジトリのクローン
git clone <repository-url>
cd spinach

# 環境変数ファイルの作成（必要に応じて編集）
# .env ファイル（Prisma用）
cat > .env << 'EOF'
DATABASE_URL="file:./dev.db"
EOF

# .env.local ファイル（オプション）
cat > .env.local << 'EOF'
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Spinach
NEXT_PUBLIC_APP_VERSION=0.1.0
DATABASE_URL="file:./dev.db"
EOF

# backend/.env ファイル（必要に応じて編集）
cat > backend/.env << 'EOF'
LM_STUDIO_BASE_URL=http://host.docker.internal:8080/v1
LM_STUDIO_MODEL=/path/to/your/model.gguf
CHROMA_PERSIST_DIR=/app/chroma_data
EMBEDDING_MODEL=intfloat/multilingual-e5-base
RAG_TOP_K=3
RAG_SIMILARITY_THRESHOLD=0.5
CORS_ORIGINS=http://localhost:3000,https://localhost:3000
EOF

# Dockerコンテナのビルドと起動
docker-compose up -d --build

# ログの確認
docker-compose logs -f

# コンテナの停止
docker-compose down
```

#### アクセス
- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **ヘルスチェック**:
  - フロントエンド: http://localhost:3000/api/health
  - バックエンド: http://localhost:8000/health

#### 注意事項
- **MacまたはWindows**: `backend/.env`の`LM_STUDIO_BASE_URL`は`http://host.docker.internal:8080/v1`を使用してください（ホストマシンのllama.cppサーバーにアクセスするため）
- **Linux**: `http://172.17.0.1:8080/v1`を使用するか、`docker-compose.yml`のネットワーク設定を調整してください
- 初回起動時は埋め込みモデルのダウンロードに時間がかかる場合があります

### 方法2: ローカルセットアップ

#### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd spinach
```

#### 2. フロントエンドのセットアップ

```bash
# 依存パッケージのインストール
npm install

# 環境変数ファイルの作成
# .env ファイルを作成（Prisma用）
cat > .env << 'EOF'
DATABASE_URL="file:./dev.db"
EOF

# .env.local ファイルを作成（オプション）
cat > .env.local << 'EOF'
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Application Info
NEXT_PUBLIC_APP_NAME=Spinach
NEXT_PUBLIC_APP_VERSION=0.1.0
DATABASE_URL="file:./dev.db"
EOF

# Prismaマイグレーションの実行
npx prisma migrate dev --name init
# または既存のマイグレーションを適用する場合
# npx prisma migrate deploy

# Prisma Clientの生成
npx prisma generate

# 開発サーバーの起動
npm run dev
```

フロントエンドは `http://localhost:3000` で起動します。

#### 3. バックエンドのセットアップ

```bash
cd backend

# 仮想環境の作成（推奨）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存パッケージのインストール
pip install -r requirements.txt

# バックエンドサーバーの起動
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

バックエンドは `http://localhost:8000` で起動します。

#### 4. 環境変数の設定（オプション）

##### フロントエンド（`.env.local`）

プロジェクトルートに `.env.local` ファイルを作成：

```env
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Application Info
NEXT_PUBLIC_APP_NAME=Spinach
NEXT_PUBLIC_APP_VERSION=0.1.0
```

**注意**: バックエンドURLとLLMサーバURLは、アプリの「アプリ情報」画面から実行時に変更できます。

##### バックエンド（`backend/.env`）

バックエンドディレクトリに `.env` ファイルを作成：

```env
# LLM Server (llama.cpp)
LM_STUDIO_BASE_URL=http://localhost:8080/v1
LM_STUDIO_MODEL=/path/to/your/model.gguf

# Backend Server
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# ChromaDB
CHROMA_PERSIST_DIR=../chroma_data
CHROMA_COLLECTION_NAME=documents

# Embeddings
EMBEDDING_MODEL=intfloat/multilingual-e5-base
EMBEDDING_DEVICE=cpu

# RAG Settings
RAG_TOP_K=3
RAG_SIMILARITY_THRESHOLD=0.5
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# CORS
CORS_ORIGINS=http://localhost:3000,https://localhost:3000
```

## 使い方

### チャット機能

1. ブラウザで `http://localhost:3000` を開く
2. テキスト入力欄にメッセージを入力
3. 送信ボタンをクリック、またはEnterキーで送信
4. LLMからのストリーミング応答を確認

### RAG機能の使用

1. ヘッダーのデータベースアイコンをクリックしてRAGを有効化（デフォルト：有効）
2. データベースアイコンを長押しでドキュメント管理画面を表示
3. PDFやテキストファイルをアップロード
4. RAGが有効な状態でチャットすると、アップロードしたドキュメントの文脈を考慮した応答が返される

### 日報機能（報連相）の使用

1. メイン画面の日報ボタン（クリップボードアイコン）をクリック
2. アプリ情報の「日報設定」タブで社員情報を登録
3. 日報画面で社員名と日付を選択
4. AIとの対話形式で日報を作成
5. 右サイドバーで過去の日報履歴を確認・編集・削除

**特徴**:
- 同じ社員・同じ日付の日報が既に存在する場合、自動的に読み込まれます
- AIの応答完了ごとに自動保存されます（データベース保存）
- 履歴から過去の日報を選択して続きを編集できます
- 日報のJSONサマリーは明るい背景で読みやすく表示されます
- 履歴カードに提出状態アイコンが表示されます：
  - ✅ 緑色のチェックマーク: 提出完了
  - 🕐 黄色の時計: 未提出（編集中）
- 修正モード時に「日報を提出」ボタンで簡単に再提出できます

### セッション管理

- 履歴アイコンをクリックして過去のチャットセッションを表示（データベースから取得）
- セッションを選択して復元
- 新規チャットボタン（+）で新しいセッションを作成
- チャット履歴はPrisma経由でSQLite/PostgreSQLに自動保存されます
- localStorageは使用せず、すべてデータベースで管理

### アプリ情報の確認と設定

- ヘッダーの情報アイコン（i）をクリックして「アプリ情報」画面を表示
- **LLMモデルタブ**: モデルのパラメータ数、ファイルサイズ、語彙サイズなどの詳細情報を表示
- **アプリ設定タブ**:
  - フロントエンド設定: バックエンドURLの確認・編集
  - LLMサーバ設定: LLMサーバURLの確認・編集
  - ChromaDB設定: ベクトルデータベースの設定確認
  - 埋め込みモデル設定: 使用中の埋め込みモデル確認
  - RAG設定: 検索パラメータの確認・編集
- **日報設定タブ**:
  - 日報ユーザー管理: 社員名と部署の追加・編集・削除
  - 日報システムプロンプト: AIの振る舞いのカスタマイズ

## プロジェクト構造

```
spinach/
├── app/                      # Next.js アプリケーション
│   ├── api/                  # Next.js API Routes
│   │   ├── daily-report-users/ # 日報ユーザー管理API
│   │   │   ├── route.ts      # GET, POST
│   │   │   └── [id]/         # PUT, DELETE
│   │   ├── daily-reports/    # 日報管理API
│   │   │   ├── route.ts      # GET, POST
│   │   │   └── [id]/         # GET, PUT, DELETE
│   │   ├── chat-sessions/    # チャットセッション管理API
│   │   │   ├── route.ts      # GET, POST
│   │   │   └── [id]/         # GET, PUT, DELETE
│   │   └── settings/         # 設定管理API
│   │       └── route.ts      # GET, PUT
│   ├── components/           # Reactコンポーネント
│   │   ├── AppInfo.tsx       # アプリ情報・設定画面
│   │   ├── ChatMessage.tsx   # チャットメッセージ表示
│   │   ├── ControlBar.tsx    # 入力コントロール
│   │   ├── DocumentManager.tsx # ドキュメント管理
│   │   ├── HorensoChat.tsx   # 日報チャット（履歴管理機能付き）
│   │   ├── HorensoForm.tsx   # 日報フォーム選択
│   │   ├── MermaidDiagram.tsx  # Mermaid図表レンダリング
│   │   └── SessionSidebar.tsx # セッション履歴
│   ├── horenso/              # 日報（報連相）機能
│   │   └── templates.ts      # 日報テンプレート定義
│   ├── hooks/                # カスタムフック
│   │   └── useSpeechRecognition.ts
│   ├── types/                # TypeScript型定義
│   ├── config.ts             # 設定管理（環境変数・localStorage）
│   └── page.tsx              # メインページ
├── prisma/                   # Prisma ORM
│   ├── schema.prisma         # データベーススキーマ定義
│   └── migrations/           # マイグレーションファイル
├── lib/                      # ライブラリ
│   └── prisma.ts             # Prisma Client singleton
├── backend/                  # FastAPI バックエンド
│   ├── routes/               # APIルート
│   │   ├── chat.py           # チャットエンドポイント
│   │   ├── documents.py      # ドキュメント管理
│   │   └── rag.py            # RAGクエリ
│   ├── config.py             # 設定管理
│   ├── embeddings.py         # 埋め込みモデル
│   ├── llm.py                # LLMクライアント
│   ├── models.py             # Pydanticモデル
│   ├── text_processing.py    # テキスト処理
│   ├── vectordb.py           # ChromaDB管理
│   └── main.py               # FastAPIアプリケーション
├── public/                   # 静的ファイル
├── Dockerfile                # フロントエンド用Dockerイメージ定義
├── backend/
│   └── Dockerfile            # バックエンド用Dockerイメージ定義
├── docker-compose.yml        # Docker Compose設定
├── package.json              # Node.js依存関係
├── requirements.txt          # Python依存関係
├── prisma.config.ts          # Prisma設定
├── biome.json                # Biome設定
├── tailwind.config.ts        # Tailwind CSS設定
└── tsconfig.json             # TypeScript設定
```

## 開発

### Docker コマンド

```bash
# コンテナの起動（バックグラウンド）
docker-compose up -d

# コンテナの起動（フォアグラウンド・ログ表示）
docker-compose up

# コンテナの再ビルドと起動
docker-compose up -d --build

# コンテナの停止
docker-compose down

# コンテナの停止とボリューム削除
docker-compose down -v

# ログの確認
docker-compose logs -f

# 特定のサービスのログ確認
docker-compose logs -f frontend
docker-compose logs -f backend

# コンテナの状態確認
docker-compose ps

# コンテナ内でコマンド実行
docker-compose exec frontend sh
docker-compose exec backend bash
```

### コードチェックとフォーマット

```bash
# Biomeでリント実行
npm run lint

# Biomeでリントチェックのみ
npm run lint:check

# フォーマット
npm run format

# フォーマットチェック
npm run format:check
```

### ビルド

```bash
# プロダクションビルド（ローカル）
npm run build

# プロダクションサーバー起動（ローカル）
npm start

# Dockerイメージのビルドのみ
docker-compose build
```

### APIエンドポイント

#### フロントエンドAPI（Next.js API Routes）

**日報ユーザー管理**:
- `GET /api/daily-report-users` - 全ユーザー取得
- `POST /api/daily-report-users` - ユーザー作成
- `PUT /api/daily-report-users/[id]` - ユーザー更新
- `DELETE /api/daily-report-users/[id]` - ユーザー削除

**日報管理**:
- `GET /api/daily-reports?userId={userId}&reportDate={date}` - 日報取得（フィルタ可）
- `POST /api/daily-reports` - 日報作成/更新（upsert）
- `GET /api/daily-reports/[id]` - 日報詳細取得
- `PUT /api/daily-reports/[id]` - 日報更新
- `DELETE /api/daily-reports/[id]` - 日報削除

**チャットセッション管理**:
- `GET /api/chat-sessions` - 全セッション取得
- `POST /api/chat-sessions` - セッション作成/更新（upsert）
- `GET /api/chat-sessions/[id]` - セッション詳細取得
- `PUT /api/chat-sessions/[id]` - セッション更新
- `DELETE /api/chat-sessions/[id]` - セッション削除

**設定管理**:
- `GET /api/settings` - 全設定取得（key-valueオブジェクト）
- `PUT /api/settings` - 設定更新（複数のkey-valueを一括更新）

#### バックエンドAPI（FastAPI）

- `GET /health` - ヘルスチェック
- `GET /api/llm-info` - LLMモデル情報取得
- `GET /api/model-status` - 埋め込みモデルステータス
- `GET /api/settings` - バックエンド設定取得
- `PUT /api/settings` - バックエンド設定更新（ランタイムのみ）
- `POST /api/chat/completions` - チャット完了（RAG対応、ストリーミング）
- `POST /api/rag/query` - RAGクエリ
- `GET /api/rag/stats` - RAG統計情報
- `POST /api/documents/upload` - ドキュメントアップロード
- `GET /api/documents/list` - ドキュメント一覧
- `DELETE /api/documents/{document_id}` - ドキュメント削除

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 貢献

プルリクエストやイシューの報告を歓迎します。

## データベース

### データ永続化

アプリケーションデータは以下のように管理されています：

- **日報ユーザー**: Prisma（SQLite）に保存
- **日報データ**: Prisma（SQLite）に保存
- **チャットセッション**: Prisma（SQLite）に保存
- **アプリ設定**: Prisma（SQLite）に保存
- **RAGベクトルデータ**: ChromaDB（`chroma_data/`ディレクトリ）に保存

### PostgreSQLへの移行（本番環境）

本番環境でPostgreSQLを使用する場合：

1. `prisma/schema.prisma`の`datasource db`を編集：
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. `.env`ファイルの`DATABASE_URL`を更新：
```env
DATABASE_URL="postgresql://user:password@localhost:5432/spinach?schema=public"
```

3. マイグレーションを実行：
```bash
npx prisma migrate deploy
```

### Prismaデバッグコマンド

```bash
# Prisma Studioでデータを確認
npx prisma studio

# スキーマをデータベースに反映（開発時）
npx prisma db push

# マイグレーションをリセット（開発時のみ）
npx prisma migrate reset
```

## 注意事項

- このアプリケーションはローカル環境での使用を想定しています
- llama.cppサーバーが正常に起動していることを確認してください
- 初回実行時、埋め込みモデルのダウンロードに時間がかかる場合があります
- RAG機能を使用するには、事前にドキュメントをアップロードする必要があります
- データベースファイル（`dev.db`など）はGit管理から除外されています
