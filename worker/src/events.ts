export interface EventDef {
  title: string;
  description: string | null;
  dateText: string;
  dateEpoch: number;
}

function startOfDayUTC(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000);
}

function parseTime(token: string): number | null {
  const m = token.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (h > 23 || min > 59) return null;
  return h * 3600 + min * 60;
}

function resolveDateTime(dateText: string, referenceEpoch: number): number {
  const tokens = dateText.trim().split(/\s+/);

  // Check if last token is a time
  let timeOffset = 0;
  if (tokens.length > 1) {
    const parsed = parseTime(tokens[tokens.length - 1]);
    if (parsed !== null) {
      timeOffset = parsed;
      tokens.pop();
    }
  }

  const text = tokens.join(' ').toLowerCase();
  const refDate = new Date(referenceEpoch * 1000);
  let dayEpoch: number;

  if (text === 'today') {
    dayEpoch = startOfDayUTC(refDate);
  } else if (text === 'tomorrow') {
    const d = new Date(refDate);
    d.setUTCDate(d.getUTCDate() + 1);
    dayEpoch = startOfDayUTC(d);
  } else {
    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayIndex = dayNames.indexOf(text);
    if (dayIndex !== -1) {
      const currentDay = refDate.getUTCDay();
      let daysAhead = dayIndex - currentDay;
      if (daysAhead <= 0) daysAhead += 7;
      const d = new Date(refDate);
      d.setUTCDate(d.getUTCDate() + daysAhead);
      dayEpoch = startOfDayUTC(d);
    } else {
      const fullMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (fullMatch) {
        let year = +fullMatch[3];
        if (year < 100) year += 2000;
        dayEpoch = Math.floor(Date.UTC(year, +fullMatch[1] - 1, +fullMatch[2]) / 1000);
      } else {
        const shortMatch = text.match(/^(\d{1,2})\/(\d{1,2})$/);
        if (shortMatch) {
          dayEpoch = Math.floor(Date.UTC(refDate.getUTCFullYear(), +shortMatch[1] - 1, +shortMatch[2]) / 1000);
        } else {
          dayEpoch = startOfDayUTC(refDate);
        }
      }
    }
  }

  return dayEpoch + timeOffset;
}

const DATE_PAT = '(?:today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday|\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?)';
const TIME_PAT = '\\d{1,2}(?::\\d{2})?';
export const EVENT_RE = new RegExp(`^#e\\s+(${DATE_PAT})(?:\\s+(${TIME_PAT}))?\\s+(.+)`, 'i');

export function extractEvents(body: string, referenceEpoch: number): EventDef[] {
  const lines = body.split('\n');
  const events: EventDef[] = [];
  let current: EventDef | null = null;
  let descLines: string[] = [];

  for (const line of lines) {
    const match = line.match(EVENT_RE);
    if (match) {
      if (current) {
        current.description = descLines.join('\n').trim() || null;
        events.push(current);
      }
      const dateText = match[2] ? `${match[1]} ${match[2]}` : match[1];
      current = {
        title: match[3].trim(),
        description: null,
        dateText,
        dateEpoch: resolveDateTime(dateText, referenceEpoch),
      };
      descLines = [];
    } else if (current) {
      if (line.match(/^#[telmbap]\s+/)) {
        current.description = descLines.join('\n').trim() || null;
        events.push(current);
        current = null;
        descLines = [];
      } else {
        descLines.push(line);
      }
    }
  }

  if (current) {
    current.description = descLines.join('\n').trim() || null;
    events.push(current);
  }

  return events;
}
