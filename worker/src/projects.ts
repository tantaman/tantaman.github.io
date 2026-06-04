import { EVENT_RE } from "./events";
import { LOCATION_RE } from "./locations";

export interface ProjectDef {
  title: string;
  description: string | null;
}

export const PROJECT_RE = /^#p\s+(.+)/i;

export function extractProjects(body: string): ProjectDef[] {
  const lines = body.split('\n');
  const projects: ProjectDef[] = [];
  let current: ProjectDef | null = null;
  let descLines: string[] = [];

  for (const line of lines) {
    const match = line.match(PROJECT_RE);
    if (match) {
      if (current) {
        current.description = descLines.join('\n').trim() || null;
        projects.push(current);
      }
      current = { title: match[1].trim(), description: null };
      descLines = [];
    } else if (current) {
      if (line.match(EVENT_RE) || line.match(/^#[tlmbqa]\s+/) || line.match(LOCATION_RE)) {
        current.description = descLines.join('\n').trim() || null;
        projects.push(current);
        current = null;
        descLines = [];
      } else {
        descLines.push(line);
      }
    }
  }

  if (current) {
    current.description = descLines.join('\n').trim() || null;
    projects.push(current);
  }

  return projects;
}
