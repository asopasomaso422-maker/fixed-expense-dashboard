import { Client } from "@notionhq/client";
import type { Classification } from "./classifyTask";

export type NotionTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
};

function getEnv() {
  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;
  if (!apiKey || !dbId) return null;
  return { notion: new Client({ auth: apiKey }), dbId };
}

function extractTasks(results: unknown[]): NotionTask[] {
  return results.map((page) => {
    const p = (page as { properties: Record<string, unknown> }).properties;
    const titleArr = (p.Name as { title: Array<{ plain_text: string }> })?.title ?? [];
    const title = titleArr.map((t) => t.plain_text).join("");
    const status = (p["ステータス"] as { select: { name: string } })?.select?.name ?? "";
    const priority = (p["優先度"] as { select: { name: string } })?.select?.name ?? "";
    const due_date = (p["期限日"] as { date: { start: string } })?.date?.start ?? null;
    return { id: (page as { id: string }).id, title, status, priority, due_date };
  });
}

export async function notionAddTask(title: string, c: Classification) {
  const env = getEnv();
  if (!env) return;
  const { notion, dbId } = env;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Record<string, any> = {
    Name: { title: [{ text: { content: title } }] },
    プロジェクト: { select: { name: c.project } },
    ステータス: { select: { name: c.status } },
    優先度: { select: { name: c.priority } },
    ソース: { rich_text: [{ text: { content: "slack" } }] },
  };
  if (c.due_date) {
    properties["期限日"] = { date: { start: c.due_date } };
  }

  try {
    await notion.pages.create({ parent: { database_id: dbId }, properties });
  } catch (e) {
    console.error("[notion] addTask ERROR:", e instanceof Error ? e.message : e);
  }
}

export async function notionQueryTasks(options: {
  excludeDone?: boolean;
  dueOnOrBefore?: string;
} = {}): Promise<NotionTask[]> {
  const env = getEnv();
  if (!env) return [];
  const { notion, dbId } = env;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: any[] = [];
  if (options.excludeDone) {
    filters.push({ property: "ステータス", select: { does_not_equal: "done" } });
  }
  if (options.dueOnOrBefore) {
    filters.push({ property: "期限日", date: { on_or_before: options.dueOnOrBefore } });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = filters.length === 0 ? undefined
    : filters.length === 1 ? filters[0]
    : { and: filters };

  try {
    // Notion SDK v5: dataSources.query replaces databases.query
    const res = await notion.dataSources.query({
      data_source_id: dbId,
      filter,
      sorts: [{ property: "期限日", direction: "ascending" }],
      page_size: 20,
    });
    return extractTasks(res.results);
  } catch (e) {
    console.error("[notion] queryTasks ERROR:", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function notionFindTask(keyword: string): Promise<NotionTask[]> {
  const env = getEnv();
  if (!env) return [];
  const { notion, dbId } = env;

  try {
    const res = await notion.dataSources.query({
      data_source_id: dbId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filter: { and: [
        { property: "Name", title: { contains: keyword } },
        { property: "ステータス", select: { does_not_equal: "done" } },
      ] } as any,
      page_size: 5,
    });
    return extractTasks(res.results);
  } catch (e) {
    console.error("[notion] findTask ERROR:", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function notionCompleteTask(pageId: string): Promise<boolean> {
  const env = getEnv();
  if (!env) return false;
  const { notion } = env;
  try {
    await notion.pages.update({
      page_id: pageId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      properties: { ステータス: { select: { name: "done" } } } as any,
    });
    return true;
  } catch (e) {
    console.error("[notion] completeTask ERROR:", e instanceof Error ? e.message : e);
    return false;
  }
}
