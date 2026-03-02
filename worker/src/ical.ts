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
  return `${y}${mo}${day}T${h}${min}${s}Z`;
}

export function generateICS(events: ICalEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//tantaman.com//events//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:event-${event.id}@tantaman.com`);
    lines.push(`SUMMARY:${escapeText(event.title)}`);

    if (hasTime(event.date_text)) {
      lines.push(`DTSTART:${formatDateTime(event.date_epoch)}`);
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
