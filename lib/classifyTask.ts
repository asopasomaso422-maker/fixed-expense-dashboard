import OpenAI from "openai";

export type Classification = {
  title: string;
  status: "未着手" | "今日やる" | "今週やる" | "後回し";
  priority: "高" | "中" | "低";
  category: "売上" | "法務税務" | "納品" | "クライアント" | "資産化" | "家族生活" | "投資調査" | "アイデア";
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

カテゴリ候補（1つ選択）:
- 売上: 請求・営業・契約・売上に関すること
- 法務税務: 法律・税務・申告・法人手続き
- 納品: 成果物提出・納品・完成物の送付
- クライアント: 顧客対応・ミーティング・打ち合わせ
- 資産化: コンテンツ作成・仕組み化・資産になる作業
- 家族生活: 家族・子供・生活・プライベート
- 投資調査: 株・投資・調査・リサーチ
- アイデア: アイデア・企画・構想・検討

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
  "category": "売上|法務税務|納品|クライアント|資産化|家族生活|投資調査|アイデア",
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
    category: "アイデア",
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

    const validStatuses = ["未着手", "今日やる", "今週やる", "後回し"] as const;
    const validPriorities = ["高", "中", "低"] as const;
    const validCategories = ["売上", "法務税務", "納品", "クライアント", "資産化", "家族生活", "投資調査", "アイデア"] as const;
    const validRisks = ["通常", "注意", "危険"] as const;

    return {
      title,
      status: validStatuses.includes(data.status) ? data.status : "未着手",
      priority: validPriorities.includes(data.priority) ? data.priority : "中",
      category: validCategories.includes(data.category) ? data.category : "アイデア",
      source: "Slack",
      originalText,
      due_date: typeof data.due_date === "string" && data.due_date !== "null" ? data.due_date : null,
      risk: validRisks.includes(data.risk) ? data.risk : "通常",
      nextAction: typeof data.nextAction === "string" ? data.nextAction : "",
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
