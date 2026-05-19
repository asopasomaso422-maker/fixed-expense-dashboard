import { NextResponse } from "next/server";
import { notionQueryTasks } from "../../../../lib/notion";

export async function GET() {
  const tasks = await notionQueryTasks({ excludeDone: true });
  return NextResponse.json({
    db: process.env.NOTION_TASKS_DATABASE_ID,
    count: tasks.length,
    tasks: tasks.slice(0, 10).map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
    })),
  });
}
