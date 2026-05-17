# タスク管理ダッシュボード

SlackからNotionへタスクを自動追加・管理するシステム。OpenAIでタスクを分類し、Google Calendarと連携して毎朝サマリーをSlackに送信します。

---

## Notion Integration セットアップ

### 1. Integration を作成する

1. https://www.notion.so/my-integrations にアクセス
2. 「新しいインテグレーション」をクリック
3. 名前（例: `task-bot`）を入力して送信
4. 表示された **Internal Integration Token** をコピー → `NOTION_API_KEY` に設定

### 2. Tasks DBを作成する

以下のプロパティを持つデータベースを作成:

| プロパティ名 | 型 | 選択肢 |
|-------------|-----|--------|
| Name | タイトル | — |
| Status | セレクト | 未着手 / 今日やる / 今週やる / 後回し / 完了 |
| Priority | セレクト | 高 / 中 / 低 |
| Category | セレクト | 売上 / 法務税務 / 納品 / クライアント / 資産化 / 家族生活 / 投資調査 / アイデア |
| Source | セレクト | Slack / Gmail / Calendar / Manual |
| OriginalText | テキスト | — |
| DueDate | 日付 | — |
| Risk | セレクト | 通常 / 注意 / 危険 |
| NextAction | テキスト | — |
| CreatedAt | 日付 | — |

### 3. Inbox DBを作成する

| プロパティ名 | 型 | 選択肢 |
|-------------|-----|--------|
| Title | タイトル | — |
| Source | セレクト | Slack / Gmail / Calendar |
| RawText | テキスト | — |
| Summary | テキスト | — |
| Processed | チェックボックス | — |
| CreatedAt | 日付 | — |

### 4. Database ID を取得する

NotionでDBを開いたときのURL:
```
https://www.notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...
```
`?v=` の前の32文字（ハイフンなし）が Database ID。

### 5. Integration をDBに共有する

各DBページ右上の「...」→「接続を追加」→ 作成したインテグレーションを選択。

---

## 環境変数の設定

`.env.local`（ローカル）とVercelのEnvironment Variablesに以下を設定:

```env
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Slack
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SLACK_DEFAULT_CHANNEL_ID=

# Cron認証
CRON_SECRET=

# OpenAI
OPENAI_API_KEY=

# Notion
NOTION_API_KEY=
NOTION_TASKS_DATABASE_ID=
NOTION_INBOX_DATABASE_ID=

# Google Calendar（サービスアカウント）
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_CALENDAR_ID=primary
```

---

## Slack コマンドリファレンス

### タスク追加
自然な文章を送るだけでタスクが追加されます。期限・優先度も自動分類されます。

```
明日までに請求書を送る
来週月曜にクライアントMTG
```

### タスク確認
| コマンド | 説明 |
|---------|------|
| `タスク一覧` | 全未完了タスク（最大5件） |
| `今日のタスク` | ステータスが「今日やる」、または今日が期限のタスク |
| `今週のタスク` | ステータスが「今週やる」のタスク |
| `高優先度` | 優先度「高」のタスク |
| `危険なタスク` / `やばい` | リスクが「注意」「危険」のタスク |
| `重複削除` | タイトルが重複しているタスクをアーカイブ |

### タスク操作
| コマンド | 説明 |
|---------|------|
| `完了 タスク名` | タスクのステータスを「完了」に変更 |
| `優先度変更 タスク名 高/中/低` | 優先度を変更 |

### AI秘書
| コマンド | 説明 |
|---------|------|
| `今日の計画` | AIが今日の行動計画を生成 |
| 質問や相談 | 疑問符や「教えて」を含むメッセージはAIが回答 |

---

## データフロー

### Slack → Notion
1. Slackにメッセージ送信
2. `/api/slack/events` がWebhookを受信
3. OpenAI GPT-4o-miniでタスクを分類（ステータス・優先度・カテゴリ・リスク・次のアクション）
4. NotionのTasks DBに追加
5. NotionのInbox DBにも生テキストを保存
6. Supabaseにも記録

### Gmail / Calendar → Notion（予定）
- Gmail: `/api/gmail/webhook` でメールを受信してInbox DBに保存
- Calendar: 朝のCronジョブでGoogle Calendarから予定を取得してSlackに通知

### 毎朝サマリー（Cron）
`/api/cron/morning` が毎朝実行:
1. Notion Tasks DBから未完了タスクを取得
2. 期限日=今日のタスクを自動で「今日やる」に昇格
3. Google Calendarから今日の予定を取得
4. AIサマリーを生成
5. Slackに朝のブリーフィングを送信

---

## ローカル開発

```bash
npm install
npm run dev
```

Slackのイベントをローカルで受けるには ngrok などを使用:
```bash
ngrok http 3000
```
取得したURLを Slack App の Event Subscriptions に設定。

## TypeScriptチェック

```bash
npx tsc --noEmit
```

## デプロイ

Vercelへのデプロイ:
```bash
git push origin main
```
Vercelが自動デプロイします。Vercelの環境変数に上記の`.env`項目をすべて設定してください。
