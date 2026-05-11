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
export type TaskPriority = "high" | "medium" | "low";

export type Classification = {
  project: TaskProject;
  status: TaskStatus;
  priority: TaskPriority;
  urgency: string;
  impact: string;
};

const includes = (text: string, words: string[]) => words.some((w) => text.includes(w));

export function classifyTask(title: string): Classification {
  const t = title.toLowerCase();

  if (includes(t, ["売上", "請求", "契約", "案件", "営業", "法人", "税務", "登記", "支払い", "期限"])) {
    return { project: "KANON法人", status: "today", priority: "high", urgency: "high", impact: "high" };
  }
  if (includes(t, ["ホークリーク"])) return { project: "ホークリーク", status: "week", priority: "medium", urgency: "medium", impact: "future_asset" };
  if (includes(t, ["津幡町sns", "津幡町", "sns"])) return { project: "津幡町SNS", status: "week", priority: "medium", urgency: "medium", impact: "future_asset" };
  if (includes(t, ["映像"])) return { project: "映像案件", status: "week", priority: "medium", urgency: "medium", impact: "future_asset" };
  if (includes(t, ["アプリ"])) return { project: "アプリ開発", status: "week", priority: "medium", urgency: "medium", impact: "future_asset" };
  if (includes(t, ["家族", "保育園", "妻", "子供"])) return { project: "家族", status: "today", priority: "medium", urgency: "medium", impact: "family" };
  if (includes(t, ["株", "投資", "調査", "比較"])) return { project: "投資", status: "research", priority: "medium", urgency: "low", impact: "medium" };
  if (includes(t, ["思いつき", "ネタ", "いつか"])) return { project: "その他", status: "later", priority: "low", urgency: "low", impact: "low" };

  return { project: "その他", status: "inbox", priority: "medium", urgency: "medium", impact: "medium" };
}
