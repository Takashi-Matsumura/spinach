# Spinach

AIチャット + RAG（Retrieval-Augmented Generation）アプリケーション

## 概要

Spinachは、ローカルLLMとRAGを組み合わせたWebアプリケーションです。llama.cppサーバーを利用してGoogle Gemma 3N-E4Bモデルを実行し、ChromaDBベクトルデータベースを使用してドキュメントベースの文脈強化型チャットを提供します。

## 主な機能

- **AIチャット**: ローカルLLMとのストリーミング対話
- **RAG機能**: ドキュメントベースの文脈強化型応答
- **セッション管理**: チャット履歴の保存と復元
- **ドキュメント管理**: PDFやテキストファイルのアップロードと管理
- **アプリ情報**: 使用中のモデルのスペック表示と設定の表示・編集
- **音声入力**: Web Speech APIを使用した音声認識（対応ブラウザのみ）
- **Mermaid図表**: チャット内でのMermaid図表のレンダリング
- **レスポンシブデザイン**: モバイル・デスクトップ対応のUIデザイン

## 技術スタック

### フロントエンド
- **Next.js** 15.5.4 (App Router)
- **React** 19.1.0
- **TypeScript** 5.x
- **Tailwind CSS** 4.x
- **react-markdown** - Markdown レンダリング
- **Mermaid** - 図表生成
- **Biome** - リンター/フォーマッター

### バックエンド
- **FastAPI** 0.115.6
- **Python** 3.11+
- **ChromaDB** 0.5.23 - ベクトルデータベース
- **Sentence Transformers** 3.3.1 - 埋め込みモデル
- **llama.cpp** - LLM推論エンジン（外部サービス）

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

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd spinach
```

### 2. フロントエンドのセットアップ

```bash
# 依存パッケージのインストール
npm install

# 環境変数ファイルの作成（オプション）
# .env.local ファイルを作成して以下の内容を記載
cat > .env.local << 'EOF'
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Application Info
NEXT_PUBLIC_APP_NAME=Spinach
NEXT_PUBLIC_APP_VERSION=0.1.0
EOF

# 開発サーバーの起動
npm run dev
```

フロントエンドは `http://localhost:3000` で起動します。

### 3. バックエンドのセットアップ

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

### 4. 環境変数の設定（オプション）

#### フロントエンド（`.env.local`）

プロジェクトルートに `.env.local` ファイルを作成：

```env
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Application Info
NEXT_PUBLIC_APP_NAME=Spinach
NEXT_PUBLIC_APP_VERSION=0.1.0
```

**注意**: バックエンドURLとLLMサーバURLは、アプリの「アプリ情報」画面から実行時に変更できます。

#### バックエンド（`backend/.env`）

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

### セッション管理

- 履歴アイコンをクリックして過去のチャットセッションを表示
- セッションを選択して復元
- 新規チャットボタン（+）で新しいセッションを作成

### アプリ情報の確認と設定

- ヘッダーの情報アイコン（i）をクリックして「アプリ情報」画面を表示
- **LLMモデルタブ**: モデルのパラメータ数、ファイルサイズ、語彙サイズなどの詳細情報を表示
- **アプリ設定タブ**:
  - フロントエンド設定: バックエンドURLの確認・編集
  - LLMサーバ設定: LLMサーバURLの確認・編集
  - ChromaDB設定: ベクトルデータベースの設定確認
  - 埋め込みモデル設定: 使用中の埋め込みモデル確認
  - RAG設定: 検索パラメータの確認・編集

## プロジェクト構造

```
spinach/
├── app/                      # Next.js アプリケーション
│   ├── components/           # Reactコンポーネント
│   │   ├── AppInfo.tsx       # アプリ情報・設定画面
│   │   ├── ChatMessage.tsx   # チャットメッセージ表示
│   │   ├── ControlBar.tsx    # 入力コントロール
│   │   ├── DocumentManager.tsx # ドキュメント管理
│   │   ├── MermaidDiagram.tsx  # Mermaid図表レンダリング
│   │   └── SessionSidebar.tsx # セッション履歴
│   ├── hooks/                # カスタムフック
│   │   └── useSpeechRecognition.ts
│   ├── types/                # TypeScript型定義
│   ├── config.ts             # 設定管理（環境変数・localStorage）
│   └── page.tsx              # メインページ
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
├── package.json              # Node.js依存関係
├── requirements.txt          # Python依存関係
├── biome.json                # Biome設定
├── tailwind.config.ts        # Tailwind CSS設定
└── tsconfig.json             # TypeScript設定
```

## 開発

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
# プロダクションビルド
npm run build

# プロダクションサーバー起動
npm start
```

### APIエンドポイント

#### バックエンドAPI

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

## 注意事項

- このアプリケーションはローカル環境での使用を想定しています
- llama.cppサーバーが正常に起動していることを確認してください
- 初回実行時、埋め込みモデルのダウンロードに時間がかかる場合があります
- RAG機能を使用するには、事前にドキュメントをアップロードする必要があります
