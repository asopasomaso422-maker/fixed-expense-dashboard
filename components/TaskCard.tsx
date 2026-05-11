"use client";
import type { Task } from "./TaskBoard";
export function TaskCard({ task, onUpdate, onDelete }: { task: Task; onUpdate: (id: string, patch: Partial<Task>) => void; onDelete: (id: string) => void }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm border border-green-100 space-y-2">
    <div className="font-medium">{task.title}</div>
    <div className="text-sm text-gray-500">{task.project} / {task.priority}</div>
    <textarea className="w-full rounded-xl border p-2" value={task.memo || ""} onChange={(e) => onUpdate(task.id, { memo: e.target.value })} placeholder="メモ" />
    <div className="flex gap-2">
      <select className="rounded-xl border p-2" value={task.status} onChange={(e) => onUpdate(task.id, { status: e.target.value })}>
        {["inbox","today","week","later","research","done"].map((s) => <option key={s}>{s}</option>)}
      </select>
      <button className="rounded-xl bg-red-100 px-3" onClick={() => onDelete(task.id)}>削除</button>
    </div>
  </div>;
}
