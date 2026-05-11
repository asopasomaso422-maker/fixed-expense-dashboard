import { TaskBoard } from "../components/TaskBoard";
import { supabaseListTasks } from "../lib/supabase";
export default async function Page() {
  const initialTasks = await supabaseListTasks().catch(() => []);
  return <main className="min-h-screen bg-green-50 p-6 md:p-10"><div className="mx-auto max-w-5xl space-y-6">
    <h1 className="text-3xl font-bold">自分専用AI秘書 v1</h1>
    <p className="text-gray-600">Slackで送ったタスクを自動分類して一覧表示します。</p>
    <TaskBoard initialTasks={initialTasks} />
  </div></main>;
}
