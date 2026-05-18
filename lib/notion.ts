import type { Classification } from "./classifyTask";

export type NotionTask = {
  id: string;
  title: string;
  status: string;      // inbox/today/week/later/done
  priority: string;    // 高/中/低
  category: string;    // 編集/企画/撮影/etc.
  source: string;
  originalText: string;
  due_date: string | null;
  risk: string;        // 重要度: 高/中/低
  nextAction: string;
  createdAt: string;
};

// status英語 → 日本語表示
export const STATUS_JA: Record<string, string> = {
  inbox:    "未着手",
  today:    "今日やる",
  week:     "今週やる",
  later:    "後回し",
  research: "調査中",
  done:     "完了",
};

// 日本語 → status英語（書き込み用）
export const STATUS_EN: Record<string, string> = {
  "未着手":  "inbox",
  "今日やる": "today",
  "今週やる": "week",
  "後回し":  "later",
  "調査中":  "research",
  "完了":    "done",
};

async function notionFetch(path: string, method: string, body?: object) {
  const key = process.env.NOTION_API_KEY;
  if (!key) throw new Error("NOTION_API_KEY未設定");
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${key}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Notion API error ${res.status}: ${(err as { message?: string }).message || "unknown"}`);
  }
  return res.json();
}

function extractTasks(results: unknown[]): NotionTask[] {
  return results.map((page) => {
    const p = (page as { id: string; properties: Record<string, unknown> });
    const props = p.properties;

    const titleArr = (props.Name as { title: Array<{ plain_text: string }> })?.title ?? [];
    const title = titleArr.map((t) => t.plain_text).join("");

    const statusRaw = (props["ステータス"] as { select: { name: string } })?.select?.name ?? "inbox";
    const status  = STATUS_JA[statusRaw] ?? statusRaw;
    const priority = (props["優先度"]   as { select: { name: string } })?.select?.name ?? "中";
    const category = (props["ジャンル"] as { select: { name: string } })?.select?.name ?? "その他";
    const risk     = (props["重要度"]   as { select: { name: string } })?.select?.name ?? "中";

    const srcArr = (props["ソース"] as { rich_text: Array<{ plain_text: string }> })?.rich_text ?? [];
    const source = srcArr.map((t) => t.plain_text).join("");

    const memoArr = (props["メモ"] as { rich_text: Array<{ plain_text: string }> })?.rich_text ?? [];
    const nextAction = memoArr.map((t) => t.plain_text).join("");

    const due_date = (props["期限日"] as { date: { start: string } })?.date?.start ?? null;

    return {
      id: p.id,
      title,
      status,
      priority,
      category,
      source,
      originalText: title,
      due_date,
      risk,
      nextAction,
      createdAt: "",
    };
  });
}

// ── Tasks DB ──────────────────────────────────────────────────

export async function notionQueryTasks(options: {
  excludeDone?: boolean;
  status?: string;        // 日本語 or 英語どちらでも可
  priority?: string;
  risk?: string;
} = {}): Promise<NotionTask[]> {
  const dbId = process.env.NOTION_TASKS_DATABASE_ID;
  if (!dbId) throw new Error("NOTION_TASKS_DATABASE_IDが未設定");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: any[] = [];

  if (options.excludeDone) {
    filters.push({ property: "ステータス", select: { does_not_equal: "done" } });
  }
  if (options.status) {
    const en = STATUS_EN[options.status] ?? options.status;
    filters.push({ property: "ステータス", select: { equals: en } });
  }
  if (options.priority) {
    filters.push({ property: "優先度", select: { equals: options.priority } });
  }
  if (options.risk) {
    filters.push({ property: "重要度", select: { equals: options.risk } });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = filters.length === 0 ? undefined
    : filters.length === 1 ? filters[0]
    : { and: filters };

  try {
    const body: Record<string, unknown> = {
      sorts: [{ property: "期限日", direction: "ascending" }],
      page_size: 50,
    };
    if (filter) body.filter = filter;

    const res = await notionFetch(`databases/${dbId}/query`, "POST", body);
    return extractTasks(res.results ?? []);
  } catch (e) {
    console.error("[notion] queryTasks ERROR:", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function notionAddTask(title: string, classification: Classification) {
  const dbId = process.env.NOTION_TASKS_DATABASE_ID;
  if (!dbId) {
    console.error("[notion] NOTION_TASKS_DATABASE_IDが未設定");
    return;
  }

  const statusEn = STATUS_EN[classification.status] ?? "inbox";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {
    Name:      { title: [{ text: { content: title } }] },
    ステータス: { select: { name: statusEn } },
    優先度:    { select: { name: classification.priority } },
    重要度:    { select: { name: classification.risk === "危険" ? "高" : classification.risk === "注意" ? "中" : "低" } },
    ジャンル:  { select: { name: classification.category } },
    ソース:    { rich_text: [{ text: { content: "Slack" } }] },
  };
  if (classification.due_date) {
    properties["期限日"] = { date: { start: classification.due_date } };
  }

  try {
    await notionFetch("pages", "POST", { parent: { database_id: dbId }, properties });
  } catch (e) {
    console.error("[notion] addTask ERROR:", e instanceof Error ? e.message : e);
  }
}

export async function notionFindTask(keyword: string): Promise<NotionTask[]> {
  const dbId = process.env.NOTION_TASKS_DATABASE_ID;
  if (!dbId) return [];

  try {
    const res = await notionFetch(`databases/${dbId}/query`, "POST", {
      filter: { property: "Name", title: { contains: keyword } },
      page_size: 10,
    });
    return extractTasks(res.results ?? []);
  } catch (e) {
    console.error("[notion] findTask ERROR:", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function notionCompleteTask(pageId: string): Promise<boolean> {
  try {
    await notionFetch(`pages/${pageId}`, "PATCH", {
      properties: { ステータス: { select: { name: "done" } } },
    });
    return true;
  } catch (e) {
    console.error("[notion] completeTask ERROR:", e instanceof Error ? e.message : e);
    return false;
  }
}

export async function notionUpdateTask(pageId: string, updates: {
  status?: string;
  priority?: string;
  risk?: string;
  due_date?: string | null;
  nextAction?: string;
  originalText?: string;
  category?: string;
}): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {};
  if (updates.status !== undefined) {
    const en = STATUS_EN[updates.status] ?? updates.status;
    properties["ステータス"] = { select: { name: en } };
  }
  if (updates.priority !== undefined)   properties["優先度"]  = { select: { name: updates.priority } };
  if (updates.risk !== undefined)       properties["重要度"]  = { select: { name: updates.risk } };
  if (updates.category !== undefined)   properties["ジャンル"] = { select: { name: updates.category } };
  if (updates.nextAction !== undefined) properties["メモ"]    = { rich_text: [{ text: { content: updates.nextAction } }] };
  if (updates.due_date !== undefined) {
    properties["期限日"] = updates.due_date ? { date: { start: updates.due_date } } : { date: null };
  }

  try {
    await notionFetch(`pages/${pageId}`, "PATCH", { properties });
    return true;
  } catch (e) {
    console.error("[notion] updateTask ERROR:", e instanceof Error ? e.message : e);
    return false;
  }
}

export async function notionArchiveTask(pageId: string): Promise<boolean> {
  try {
    await notionFetch(`pages/${pageId}`, "PATCH", { archived: true });
    return true;
  } catch (e) {
    console.error("[notion] archiveTask ERROR:", e instanceof Error ? e.message : e);
    return false;
  }
}

export async function notionDeduplicateTasks(): Promise<{ removed: NotionTask[] }> {
  const dbId = process.env.NOTION_TASKS_DATABASE_ID;
  if (!dbId) return { removed: [] };

  try {
    const res = await notionFetch(`databases/${dbId}/query`, "POST", {
      filter: { property: "ステータス", select: { does_not_equal: "done" } },
      page_size: 100,
    });
    const tasks = extractTasks(res.results ?? []);

    const seen = new Map<string, string>();
    const removed: NotionTask[] = [];

    for (const task of tasks) {
      const key = task.title.trim().toLowerCase();
      if (seen.has(key)) {
        await notionArchiveTask(task.id);
        removed.push(task);
      } else {
        seen.set(key, task.id);
      }
    }
    return { removed };
  } catch (e) {
    console.error("[notion] deduplicateTasks ERROR:", e instanceof Error ? e.message : e);
    return { removed: [] };
  }
}

// ── Inbox DB ──────────────────────────────────────────────────

export async function notionAddInbox(data: {
  title: string;
  source: "Slack" | "Gmail" | "Calendar";
  rawText: string;
  summary?: string;
}): Promise<void> {
  const dbId = process.env.NOTION_INBOX_DATABASE_ID;
  if (!dbId) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const properties: Record<string, any> = {
      Title:     { title: [{ text: { content: data.title } }] },
      Source:    { select: { name: data.source } },
      RawText:   { rich_text: [{ text: { content: data.rawText.slice(0, 2000) } }] },
      Processed: { checkbox: false },
      CreatedAt: { date: { start: new Date().toISOString().slice(0, 10) } },
    };
    if (data.summary) {
      properties.Summary = { rich_text: [{ text: { content: data.summary.slice(0, 2000) } }] };
    }
    await notionFetch("pages", "POST", { parent: { database_id: dbId }, properties });
  } catch (e) {
    console.error("[notion] addInbox ERROR:", e instanceof Error ? e.message : e);
  }
}
