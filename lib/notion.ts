import { Client } from "@notionhq/client";
import type { Classification } from "./classifyTask";

export async function notionAddTask(title: string, c: Classification) {
  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;
  if (!apiKey || !dbId) return;

  const notion = new Client({ auth: apiKey });
  try {
    await notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        Name: { title: [{ text: { content: title } }] },
        プロジェクト: { select: { name: c.project } },
        ステータス: { select: { name: c.status } },
        優先度: { select: { name: c.priority } },
        ソース: { rich_text: [{ text: { content: "slack" } }] },
      },
    });
  } catch (e) {
    console.error("[notion] ERROR:", e instanceof Error ? e.message : e);
  }
}
