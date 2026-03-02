import { describe, test, expect } from "vitest";
import { generateICS, ICalEvent } from "./ical";

function makeEvent(overrides: Partial<ICalEvent> & { id: number }): ICalEvent {
  return {
    title: "Test Event",
    description: null,
    date_text: "today",
    date_epoch: Math.floor(Date.UTC(2026, 2, 15) / 1000),
    ...overrides,
  };
}

describe("generateICS", () => {
  test("wraps events in VCALENDAR", () => {
    const ics = generateICS([]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//tantaman.com//events//EN");
    expect(ics).toContain("END:VCALENDAR");
  });

  test("all-day event uses VALUE=DATE", () => {
    const event = makeEvent({ id: 1, date_text: "3/15" });
    const ics = generateICS([event]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260315");
    expect(ics).not.toContain("DURATION");
  });

  test("timed event uses UTC datetime and duration", () => {
    const epoch = Math.floor(Date.UTC(2026, 2, 15, 14, 0, 0) / 1000);
    const event = makeEvent({ id: 2, date_text: "3/15 14:00", date_epoch: epoch });
    const ics = generateICS([event]);
    expect(ics).toContain("DTSTART:20260315T140000Z");
    expect(ics).toContain("DURATION:PT1H");
  });

  test("timed event with hour-only time", () => {
    const epoch = Math.floor(Date.UTC(2026, 2, 15, 9, 0, 0) / 1000);
    const event = makeEvent({ id: 3, date_text: "3/15 9", date_epoch: epoch });
    const ics = generateICS([event]);
    expect(ics).toContain("DTSTART:20260315T090000Z");
    expect(ics).toContain("DURATION:PT1H");
  });

  test("stable UIDs", () => {
    const event = makeEvent({ id: 42 });
    const ics = generateICS([event]);
    expect(ics).toContain("UID:event-42@tantaman.com");
  });

  test("escapes description text", () => {
    const event = makeEvent({
      id: 5,
      description: "Line1\nLine2; with semicolons, commas\\and backslashes",
    });
    const ics = generateICS([event]);
    expect(ics).toContain(
      "DESCRIPTION:Line1\\nLine2\\; with semicolons\\, commas\\\\and backslashes"
    );
  });

  test("escapes summary text", () => {
    const event = makeEvent({ id: 6, title: "Meeting, 1:1; sync" });
    const ics = generateICS([event]);
    expect(ics).toContain("SUMMARY:Meeting\\, 1:1\\; sync");
  });

  test("omits DESCRIPTION when null", () => {
    const event = makeEvent({ id: 7, description: null });
    const ics = generateICS([event]);
    expect(ics).not.toContain("DESCRIPTION:");
  });

  test("uses CRLF line endings", () => {
    const ics = generateICS([makeEvent({ id: 8 })]);
    // Every line should end with \r\n
    const lines = ics.split("\r\n");
    // Last element after final \r\n is empty string
    expect(lines[lines.length - 1]).toBe("");
    // No bare \n without preceding \r
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });

  test("multiple events", () => {
    const events = [
      makeEvent({ id: 10, title: "First" }),
      makeEvent({ id: 11, title: "Second" }),
    ];
    const ics = generateICS(events);
    const veventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(veventCount).toBe(2);
    expect(ics).toContain("SUMMARY:First");
    expect(ics).toContain("SUMMARY:Second");
  });
});
