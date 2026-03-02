export interface ICalEvent {
  id: number;
  title: string;
  description: string | null;
  date_text: string;
  date_epoch: number;
}

const TIME_RE = /\d{1,2}(:\d{2})?$/;

function hasTime(dateText: string): boolean {
  const tokens = dateText.trim().split(/\s+/);
  return tokens.length > 1 && TIME_RE.test(tokens[tokens.length - 1]);
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatDateOnly(epoch: number): string {
  const d = new Date(epoch * 1000);
  const y = d.getUTCFullYear().toString();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${y}${m}${day}`;
}

function formatDateTime(epoch: number): string {
  const d = new Date(epoch * 1000);
  const y = d.getUTCFullYear().toString();
  const mo = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  const h = d.getUTCHours().toString().padStart(2, "0");
  const min = d.getUTCMinutes().toString().padStart(2, "0");
  const s = d.getUTCSeconds().toString().padStart(2, "0");
  return `${y}${mo}${day}T${h}${min}${s}`;
}

const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:America/New_York",
  "BEGIN:STANDARD",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
].join("\r\n");

export function generateICS(events: ICalEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//tantaman.com//events//EN",
    "CALSCALE:GREGORIAN",
    VTIMEZONE,
  ];

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:event-${event.id}@tantaman.com`);
    lines.push(`SUMMARY:${escapeText(event.title)}`);

    if (hasTime(event.date_text)) {
      lines.push(`DTSTART;TZID=America/New_York:${formatDateTime(event.date_epoch)}`);
      lines.push("DURATION:PT1H");
    } else {
      lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(event.date_epoch)}`);
    }

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
}
