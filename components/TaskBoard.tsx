"use client";
import { useState } from "react";
import { TaskCard } from "./TaskCard";
export type Task = { id: string; title: string; memo?: string; project: string; status: string; priority: string };
export function TaskBoard({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [error, setError] = useState("");
  const load = async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    if (!res.ok) return setError(data.error || "load error");
    setTasks(data as Task[]);
  };
  const onUpdate = async (id: string, patch: Partial<Task>) => { await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); load(); };
  const onDelete = async (id: string) => { await fetch(`/api/tasks/${id}`, { method: "DELETE" }); load(); };
  const groups: Task["status"][] = ["today","week","later","research","done"];
  return <div className="space-y-6">{error && <div className="rounded-xl bg-red-50 p-3 text-red-600">{error}</div>}
    {groups.map((g) => <section key={g} className="space-y-3"><h2 className="text-xl font-semibold capitalize">{g}</h2><div className="grid gap-3 md:grid-cols-2">{tasks.filter((t) => t.status === g).map((t) => <TaskCard key={t.id} task={t} onUpdate={onUpdate} onDelete={onDelete} />)}</div></section>)}
  </div>;
}
