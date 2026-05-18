import OpenAI from "openai";

export type Classification = {
  title: string;
  status: "未着手" | "今日やる" | "今週やる" | "後回し";
  priority: "高" | "中" | "低";
  category: "編集" | "企画" | "撮影" | "営業" | "経理" | "開発" | "調査" | "連絡調整" | "事務" | "その他";
  source: "Slack";
  originalText: string;
  due_date: string | null;
  risk: "通常" | "注意" | "危険";
  nextAction: string;
};

function buildPrompt(title: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `あなたはタスク管理アシスタントです。
以下のメッセージを分析し、JSON のみを返してください（説明文不要）。
今日の日付: ${today}

ステータス候補:
- 今日やる: 今日中にやるべきこと、緊急なもの
- 今週やる: 今週中にやるべきこと
- 後回し: いつかやればよいもの、緊急性なし
- 未着手: デフォルト（判断できない場合）

優先度候補: 高, 中, 低

ジャンル候補（1つ選択）:
- 編集: 動画・写真・音声の編集作業
- 企画: 企画・アイデア・構想・コンテンツ計画
- 撮影: 写真・動画の撮影
- 営業: 営業・販売・契約・請求・売上
- 経理: 経理・税務・申告・法人手続き・請求書
- 開発: アプリ・システム・ウェブ開発
- 調査: リサーチ・調査・情報収集
- 連絡調整: 返信・打ち合わせ・MTG・顧客対応
- 事務: 書類・手続き・管理業務
- その他: 上記に当てはまらないもの

リスク候補:
- 危険: 期限切れ・法的リスク・重大な損失の可能性
- 注意: 期限が迫っている・放置すると問題になる可能性
- 通常: 通常のタスク

期限日: 「明日」「今週金曜」「5/20まで」「来週月曜」などが含まれていれば今日の日付を基準に YYYY-MM-DD 形式で返す。期限の記載がなければ null。

nextAction: このタスクで最初にやるべき具体的な行動を1文で（例: 「請求書テンプレートを開く」）

返却フォーマット（JSONのみ）:
{
  "status": "未着手|今日やる|今週やる|後回し",
  "priority": "高|中|低",
  "category": "編集|企画|撮影|営業|経理|開発|調査|連絡調整|事務|その他",
  "due_date": "YYYY-MM-DD or null",
  "risk": "通常|注意|危険",
  "nextAction": "最初にやること"
}

タスク: ${title}`;
}

function fallback(): Classification {
  return {
    title: "",
    status: "未着手",
    priority: "中",
    category: "その他",
    source: "Slack",
    originalText: "",
    due_date: null,
    risk: "通常",
    nextAction: "",
  };
}

function parseJson(text: string, title: string, originalText: string): Classification | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const data = JSON.parse(match[0]);

    const validStatuses   = ["未着手", "今日やる", "今週やる", "後回し"] as const;
    const validPriorities = ["高", "中", "低"] as const;
    const validCategories = ["編集", "企画", "撮影", "営業", "経理", "開発", "調査", "連絡調整", "事務", "その他"] as const;
    const validRisks      = ["通常", "注意", "危険"] as const;

    return {
      title,
      status:       validStatuses.includes(data.status)     ? data.status     : "未着手",
      priority:     validPriorities.includes(data.priority) ? data.priority   : "中",
      category:     validCategories.includes(data.category) ? data.category   : "その他",
      source:       "Slack",
      originalText,
      due_date:     typeof data.due_date === "string" && data.due_date !== "null" ? data.due_date : null,
      risk:         validRisks.includes(data.risk)          ? data.risk        : "通常",
      nextAction:   typeof data.nextAction === "string"     ? data.nextAction  : "",
    };
  } catch {
    return null;
  }
}

export async function classifyTask(title: string): Promise<Classification> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ...fallback(), title, originalText: title };
  try {
    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: buildPrompt(title) }],
      max_tokens: 200,
      response_format: { type: "json_object" },
    });
    const text = res.choices[0]?.message?.content ?? "";
    return parseJson(text, title, title) ?? { ...fallback(), title, originalText: title };
  } catch {
    return { ...fallback(), title, originalText: title };
  }
}
