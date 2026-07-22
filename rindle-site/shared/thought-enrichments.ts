/**
 * Pure structured-tag extraction shared by every thought authoring callsite.
 *
 * These grammars intentionally match the final legacy Thoughts worker. A structured capture starts
 * only when its marker is the first thing on a line; following lines become its description until
 * another structured marker starts. The extracted rows are stateful records, not render-time views:
 * callers run this once when a thought is created and pass stable ids/timestamps to the shared
 * mutator.
 */

export interface TitledEnrichment {
  title: string;
  description: string | null;
}

export interface EventEnrichment extends TitledEnrichment {
  dateText: string;
  /** Epoch seconds, matching imported legacy events. */
  dateEpoch: number;
}

export interface ThoughtEnrichments {
  projects: TitledEnrichment[];
  tasks: TitledEnrichment[];
  questions: TitledEnrichment[];
  events: EventEnrichment[];
  locations: TitledEnrichment[];
  books: TitledEnrichment[];
  movies: TitledEnrichment[];
  albums: TitledEnrichment[];
}

const DATE_PATTERN =
  "(?:today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday|\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?)";
const TIME_PATTERN = "\\d{1,2}(?::\\d{2})?";

export const EVENT_PATTERN = new RegExp(
  `^#e\\s+(${DATE_PATTERN})(?:\\s+(${TIME_PATTERN}))?\\s+(.+)`,
  "i",
);
export const LOCATION_PATTERN = /^#l\s+(.+)/i;
export const MOVIE_PATTERN = /^#m\s+(.+)/i;
export const BOOK_PATTERN = /^#b\s+(.+)/i;
export const QUESTION_PATTERN = /^#q\s+(.+)/i;
export const ALBUM_PATTERN = /^#a\s+(.+)/i;
export const PROJECT_PATTERN = /^#p\s+(.+)/i;

interface ExtractSpec {
  start: RegExp;
  stops: readonly RegExp[];
}

function extractTitled(body: string, spec: ExtractSpec): TitledEnrichment[] {
  const rows: TitledEnrichment[] = [];
  let current: TitledEnrichment | null = null;
  let descriptionLines: string[] = [];

  const finish = () => {
    if (!current) return;
    current.description = descriptionLines.join("\n").trim() || null;
    rows.push(current);
    current = null;
    descriptionLines = [];
  };

  for (const line of body.split("\n")) {
    const match = line.match(spec.start);
    if (match) {
      finish();
      current = { title: match[1].trim(), description: null };
      continue;
    }
    if (!current) continue;
    if (spec.stops.some((pattern) => pattern.test(line))) finish();
    else descriptionLines.push(line);
  }
  finish();
  return rows;
}

/** Legacy `#t` was the sole case-sensitive capture marker; retain that compatibility. */
export function extractTasks(body: string): TitledEnrichment[] {
  return extractTitled(body, {
    start: /^#t\s+(.+)/,
    stops: [
      EVENT_PATTERN,
      LOCATION_PATTERN,
      MOVIE_PATTERN,
      BOOK_PATTERN,
      QUESTION_PATTERN,
      ALBUM_PATTERN,
      PROJECT_PATTERN,
    ],
  });
}

export function extractProjects(body: string): TitledEnrichment[] {
  return extractTitled(body, {
    start: PROJECT_PATTERN,
    stops: [EVENT_PATTERN, /^#[tlmbqa]\s+/i, LOCATION_PATTERN],
  });
}

export function extractQuestions(body: string): TitledEnrichment[] {
  return extractTitled(body, {
    start: QUESTION_PATTERN,
    stops: [EVENT_PATTERN, /^#[tlmbap]\s+/i, LOCATION_PATTERN],
  });
}

export function extractLocations(body: string): TitledEnrichment[] {
  return extractTitled(body, {
    start: LOCATION_PATTERN,
    stops: [EVENT_PATTERN, /^#[tmbqap]\s+/i],
  });
}

export function extractBooks(body: string): TitledEnrichment[] {
  return extractTitled(body, {
    start: BOOK_PATTERN,
    stops: [EVENT_PATTERN, /^#[tlmqap]\s+/i, LOCATION_PATTERN],
  });
}

export function extractMovies(body: string): TitledEnrichment[] {
  return extractTitled(body, {
    start: MOVIE_PATTERN,
    stops: [EVENT_PATTERN, /^#[tlbqap]\s+/i, LOCATION_PATTERN],
  });
}

export function extractAlbums(body: string): TitledEnrichment[] {
  return extractTitled(body, {
    start: ALBUM_PATTERN,
    stops: [EVENT_PATTERN, /^#[tlmbqp]\s+/i, LOCATION_PATTERN],
  });
}

export function normalizeMovieTitle(title: string): string {
  return title.toLowerCase().trim();
}

export function normalizeAlbumTitle(title: string): string {
  return title.toLowerCase().trim();
}

function startOfDayUtc(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1_000);
}

function parseTime(token: string): number | null {
  const match = token.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hours = Number.parseInt(match[1], 10);
  const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
  if (hours > 23 || minutes > 59) return null;
  return hours * 3_600 + minutes * 60;
}

function resolveDateTime(dateText: string, referenceEpochSeconds: number): number {
  const tokens = dateText.trim().split(/\s+/);
  let timeOffset = 0;
  if (tokens.length > 1) {
    const parsed = parseTime(tokens[tokens.length - 1]);
    if (parsed !== null) {
      timeOffset = parsed;
      tokens.pop();
    }
  }

  const text = tokens.join(" ").toLowerCase();
  const reference = new Date(referenceEpochSeconds * 1_000);
  let dayEpoch: number;
  if (text === "today") {
    dayEpoch = startOfDayUtc(reference);
  } else if (text === "tomorrow") {
    const date = new Date(reference);
    date.setUTCDate(date.getUTCDate() + 1);
    dayEpoch = startOfDayUtc(date);
  } else {
    const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const weekday = weekdays.indexOf(text);
    if (weekday !== -1) {
      let daysAhead = weekday - reference.getUTCDay();
      if (daysAhead <= 0) daysAhead += 7;
      const date = new Date(reference);
      date.setUTCDate(date.getUTCDate() + daysAhead);
      dayEpoch = startOfDayUtc(date);
    } else {
      const full = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      const short = text.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (full) {
        let year = Number.parseInt(full[3], 10);
        if (year < 100) year += 2_000;
        dayEpoch = Math.floor(Date.UTC(year, Number.parseInt(full[1], 10) - 1, Number.parseInt(full[2], 10)) / 1_000);
      } else if (short) {
        dayEpoch = Math.floor(
          Date.UTC(reference.getUTCFullYear(), Number.parseInt(short[1], 10) - 1, Number.parseInt(short[2], 10)) / 1_000,
        );
      } else {
        dayEpoch = startOfDayUtc(reference);
      }
    }
  }
  return dayEpoch + timeOffset;
}

export function extractEvents(body: string, referenceEpochSeconds: number): EventEnrichment[] {
  const rows: EventEnrichment[] = [];
  let current: EventEnrichment | null = null;
  let descriptionLines: string[] = [];

  const finish = () => {
    if (!current) return;
    current.description = descriptionLines.join("\n").trim() || null;
    rows.push(current);
    current = null;
    descriptionLines = [];
  };

  for (const line of body.split("\n")) {
    const match = line.match(EVENT_PATTERN);
    if (match) {
      finish();
      const dateText = match[2] ? `${match[1]} ${match[2]}` : match[1];
      current = {
        title: match[3].trim(),
        description: null,
        dateText,
        dateEpoch: resolveDateTime(dateText, referenceEpochSeconds),
      };
      continue;
    }
    if (!current) continue;
    if (/^#[telmbap]\s+/i.test(line)) finish();
    else descriptionLines.push(line);
  }
  finish();
  return rows;
}

export function extractThoughtEnrichments(body: string, referenceTimestamp: number): ThoughtEnrichments {
  const referenceEpochSeconds = referenceTimestamp < 100_000_000_000
    ? referenceTimestamp
    : Math.floor(referenceTimestamp / 1_000);
  return {
    projects: extractProjects(body),
    tasks: extractTasks(body),
    questions: extractQuestions(body),
    events: extractEvents(body, referenceEpochSeconds),
    locations: extractLocations(body),
    books: extractBooks(body),
    movies: extractMovies(body),
    albums: extractAlbums(body),
  };
}
