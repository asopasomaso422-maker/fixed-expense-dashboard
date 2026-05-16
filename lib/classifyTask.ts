import OpenAI from "openai";

export type TaskProject =
  | "KANON法人"
  | "ホークリーク"
  | "津幡町SNS"
  | "映像案件"
  | "アプリ開発"
  | "家族"
  | "投資"
  | "その他";

export type TaskStatus = "inbox" | "today" | "week" | "later" | "research" | "done";
export type TaskPriority = "高" | "中" | "低";
export type TaskImportance = "高" | "中" | "低";
export type TaskGenre =
  | "編集" | "企画" | "撮影" | "営業" | "経理"
  | "開発" | "調査" | "連絡調整" | "事務" | "その他";

export type Classification = {
  project: TaskProject;
  status: TaskStatus;
  priority: TaskPriority;
  importance: TaskImportance;
  genre: TaskGenre;
  urgency: string;
  impact: string;
  due_date: string | null; // YYYY-MM-DD
};

const PROJECTS: TaskProject[] = [
  "KANON法人", "ホークリーク", "津幡町SNS", "映像案件",
  "アプリ開発", "家族", "投資", "その他",
];

function buildPrompt(title: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `あなたはタスク管理アシスタントです。
以下のメッセージを分析し、JSON のみを返してください（説明文不要）。
今日の日付: ${today}

プロジェクト候補（必ずいずれかを選ぶ）:
- KANON法人: 売上・請求・契約・営業・税務・支払い・法人関連
- ホークリーク: ホークリーク関連
- 津幡町SNS: SNS・投稿・地域情報
- 映像案件: 動画・編集・撮影・構成・ポッドキャスト・音声・YouTube・ハナ・三和・能登・ana・パブリックラウンジ
- アプリ開発: アプリ・開発・プログラム・システム
- 家族: 家族・妻・子供・保育園・明日の用意・個人の準備
- 投資: 株・投資・調査・比較・資産
- その他: 上記に当てはまらない場合

ステータス候補: inbox(未分類), today(今日中), week(今週中), later(いつか), research(調査), done(完了)
優先度候補: 高, 中, 低
重要度候補: 高（戦略的・長期的に大切）, 中, 低
ジャンル候補（作業の種類）:
- 編集: 動画・音声・文章・画像の編集・書き起こし
- 企画: 提案書・企画・構成・アイデア出し・プレゼン
- 撮影: 写真・動画の撮影・ロケ・収録
- 営業: 営業・商談・提案・見積・契約
- 経理: 請求書・支払・領収書・経費・税務・確定申告
- 開発: アプリ・システム・プログラム・ウェブ開発
- 調査: リサーチ・情報収集・比較・分析
- 連絡調整: メール・電話・打ち合わせ・スケジュール調整
- 事務: 書類・申請・手続き・登録・更新
- その他: 上記に当てはまらない場合

期限日: 「明日」「今週金曜」「5/20まで」「来週月曜」などが含まれていれば今日の日付を基準に YYYY-MM-DD 形式で返す。期限の記載がなければ null を返す。

返却フォーマット（JSONのみ）:
{"project":"...","status":"...","priority":"高|中|低","importance":"高|中|低","genre":"編集|企画|撮影|営業|経理|開発|調査|連絡調整|事務|その他","urgency":"high|medium|low","impact":"high|medium|low","due_date":"YYYY-MM-DD or null"}

タスク: ${title}`;
}

function fallback(): Classification {
  return { project: "その他", status: "inbox", priority: "中", importance: "中", genre: "その他", urgency: "medium", impact: "medium", due_date: null };
}

function parseJson(text: string): Classification | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    if (!PROJECTS.includes(obj.project)) return null;
    if (obj.due_date === "null" || obj.due_date === "") obj.due_date = null;
    return obj as Classification;
  } catch {
    return null;
  }
}

export async function classifyTask(title: string): Promise<Classification> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback();
  try {
    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: buildPrompt(title) }],
      max_tokens: 200,
      response_format: { type: "json_object" },
    });
    const text = res.choices[0]?.message?.content ?? "";
    return parseJson(text) ?? fallback();
  } catch {
    return fallback();
  }
}
