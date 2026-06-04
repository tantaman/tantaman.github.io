import { EVENT_RE } from "./events";
import { LOCATION_RE } from "./locations";
import { MOVIE_RE } from "./movies";
import { BOOK_RE } from "./books";

export interface QuestionDef {
  title: string;
  description: string | null;
}

export const QUESTION_RE = /^#q\s+(.+)/i;

export function extractQuestions(body: string): QuestionDef[] {
  const lines = body.split('\n');
  const questions: QuestionDef[] = [];
  let current: QuestionDef | null = null;
  let descLines: string[] = [];

  for (const line of lines) {
    const match = line.match(QUESTION_RE);
    if (match) {
      if (current) {
        current.description = descLines.join('\n').trim() || null;
        questions.push(current);
      }
      current = { title: match[1].trim(), description: null };
      descLines = [];
    } else if (current) {
      if (line.match(EVENT_RE) || line.match(/^#[tlmbap]\s+/) || line.match(LOCATION_RE)) {
        current.description = descLines.join('\n').trim() || null;
        questions.push(current);
        current = null;
        descLines = [];
      } else {
        descLines.push(line);
      }
    }
  }

  if (current) {
    current.description = descLines.join('\n').trim() || null;
    questions.push(current);
  }

  return questions;
}
