import { EVENT_RE } from "./events";

export interface TaskDef {
  title: string;
  description: string | null;
}

export function extractTasks(body: string): TaskDef[] {
  const lines = body.split('\n');
  const tasks: TaskDef[] = [];
  let current: TaskDef | null = null;
  let descLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^#t\s+(.+)/);
    if (match) {
      if (current) {
        current.description = descLines.join('\n').trim() || null;
        tasks.push(current);
      }
      current = { title: match[1].trim(), description: null };
      descLines = [];
    } else if (current) {
      if (line.match(EVENT_RE)) {
        current.description = descLines.join('\n').trim() || null;
        tasks.push(current);
        current = null;
        descLines = [];
      } else {
        descLines.push(line);
      }
    }
  }

  if (current) {
    current.description = descLines.join('\n').trim() || null;
    tasks.push(current);
  }

  return tasks;
}
