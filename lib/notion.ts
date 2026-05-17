import type { Classification } from "./classifyTask";

export type NotionTask = {
  id: string;
  title: string;
  status: string;      // 未着手/今日やる/今週やる/後回し/完了
  priority: string;    // 高/中/低
  category: string;    // 売上/法務税務/etc
  source: string;
  originalText: string;
  due_date: string | null;
  risk: string;        // 通常/注意/危険
  nextAction: string;
  createdAt: string;
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

    const status = (props.Status as { select: { name: string } })?.select?.name ?? "";
    const priority = (props.Priority as { select: { name: string } })?.select?.name ?? "";
    const category = (props.Category as { select: { name: string } })?.select?.name ?? "";
    const source = (props.Source as { select: { name: string } })?.select?.name ?? "";

    const origArr = (props.OriginalText as { rich_text: Array<{ plain_text: string }> })?.rich_text ?? [];
    const originalText = origArr.map((t) => t.plain_text).join("");

    const due_date = (props.DueDate as { date: { start: string } })?.date?.start ?? null;
    const risk = (props.Risk as { select: { name: string } })?.select?.name ?? "";

    const naArr = (props.NextAction as { rich_text: Array<{ plain_text: string }> })?.rich_text ?? [];
    const nextAction = naArr.map((t) => t.plain_text).join("");

    const createdAt = (props.CreatedAt as { date: { start: string } })?.date?.start ?? "";

    return { id: p.id, title, status, priority, category, source, originalText, due_date, risk, nextAction, createdAt };
  });
}

// ── Tasks DB ──────────────────────────────────────────────────

export async function notionQueryTasks(options: {
  excludeDone?: boolean;
  dueOnOrBefore?: string;
  dueOnOrAfter?: string;
  status?: string;
  priority?: string;
  risk?: string;
} = {}): Promise<NotionTask[]> {
  const dbId = process.env.NOTION_TASKS_DATABASE_ID;
  if (!dbId) {
    throw new Error("NOTION_TASKS_DATABASE_IDが未設定です");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: any[] = [];
  if (options.excludeDone) filters.push({ property: "Status", select: { does_not_equal: "完了" } });
  if (options.status) filters.push({ property: "Status", select: { equals: options.status } });
  if (options.priority) filters.push({ property: "Priority", select: { equals: options.priority } });
  if (options.risk) filters.push({ property: "Risk", select: { equals: options.risk } });
  if (options.dueOnOrBefore) filters.push({ property: "DueDate", date: { on_or_before: options.dueOnOrBefore } });
  if (options.dueOnOrAfter) filters.push({ property: "DueDate", date: { on_or_after: options.dueOnOrAfter } });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = filters.length === 0 ? undefined
    : filters.length === 1 ? filters[0]
    : { and: filters };

  try {
    const body: Record<string, unknown> = {
      sorts: [{ property: "DueDate", direction: "ascending" }],
      page_size: 30,
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
    console.error("[notion] NOTION_TASKS_DATABASE_IDが未設定です");
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {
    Name:         { title: [{ text: { content: title } }] },
    Status:       { select: { name: classification.status } },
    Priority:     { select: { name: classification.priority } },
    Category:     { select: { name: classification.category } },
    Source:       { select: { name: classification.source } },
    OriginalText: { rich_text: [{ text: { content: classification.originalText } }] },
    Risk:         { select: { name: classification.risk } },
    NextAction:   { rich_text: [{ text: { content: classification.nextAction } }] },
    CreatedAt:    { date: { start: new Date().toISOString().slice(0, 10) } },
  };
  if (classification.due_date) {
    properties.DueDate = { date: { start: classification.due_date } };
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
      filter: {
        property: "Name",
        title: { contains: keyword },
      },
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
      properties: {
        Status: { select: { name: "完了" } },
      },
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
  category?: string;
  due_date?: string | null;
  risk?: string;
  nextAction?: string;
  originalText?: string;
}): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {};
  if (updates.status !== undefined)       properties.Status       = { select: { name: updates.status } };
  if (updates.priority !== undefined)     properties.Priority     = { select: { name: updates.priority } };
  if (updates.category !== undefined)     properties.Category     = { select: { name: updates.category } };
  if (updates.risk !== undefined)         properties.Risk         = { select: { name: updates.risk } };
  if (updates.nextAction !== undefined)   properties.NextAction   = { rich_text: [{ text: { content: updates.nextAction } }] };
  if (updates.originalText !== undefined) properties.OriginalText = { rich_text: [{ text: { content: updates.originalText } }] };
  if (updates.due_date !== undefined) {
    properties.DueDate = updates.due_date ? { date: { start: updates.due_date } } : { date: null };
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
      filter: { property: "Status", select: { does_not_equal: "完了" } },
      page_size: 100,
    });
    const tasks = extractTasks(res.results ?? []);

    const seen = new Map<string, string>(); // normalizedTitle -> first pageId
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
  if (!dbId) {
    console.error("[notion] NOTION_INBOX_DATABASE_IDが未設定です");
    return;
  }

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
