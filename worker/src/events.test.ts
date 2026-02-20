import { describe, test, expect } from 'vitest';
import { extractEvents, EVENT_RE } from './events';

// Fixed reference: 2026-02-20T12:00:00Z (a Friday)
const REF_EPOCH = Math.floor(Date.UTC(2026, 1, 20, 12, 0, 0) / 1000);

function startOfDayUTC(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m, d) / 1000);
}

describe('extractEvents', () => {
  test('single event, date-only (today)', () => {
    const events = extractEvents('#e today Meeting', REF_EPOCH);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Meeting');
    expect(events[0].dateText).toBe('today');
    expect(events[0].dateEpoch).toBe(startOfDayUTC(2026, 1, 20));
    expect(events[0].description).toBeNull();
  });

  test('event with time', () => {
    const events = extractEvents('#e tomorrow 14:30 Call', REF_EPOCH);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Call');
    expect(events[0].dateText).toBe('tomorrow 14:30');
    expect(events[0].dateEpoch).toBe(startOfDayUTC(2026, 1, 21) + 14 * 3600 + 30 * 60);
  });

  test('named day (friday)', () => {
    // Reference is Friday, so "friday" should resolve to next Friday (+7 days)
    const events = extractEvents('#e friday Standup', REF_EPOCH);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Standup');
    expect(events[0].dateEpoch).toBe(startOfDayUTC(2026, 1, 27));
  });

  test('named day (monday from friday)', () => {
    // Reference is Friday (day 5), Monday is day 1 → +3 days
    const events = extractEvents('#e monday Standup', REF_EPOCH);
    expect(events).toHaveLength(1);
    expect(events[0].dateEpoch).toBe(startOfDayUTC(2026, 1, 23));
  });

  test('explicit date MM/DD', () => {
    const events = extractEvents('#e 3/15 Launch', REF_EPOCH);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Launch');
    expect(events[0].dateText).toBe('3/15');
    expect(events[0].dateEpoch).toBe(startOfDayUTC(2026, 2, 15));
  });

  test('explicit date MM/DD/YYYY', () => {
    const events = extractEvents('#e 12/25/2026 Christmas', REF_EPOCH);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Christmas');
    expect(events[0].dateEpoch).toBe(startOfDayUTC(2026, 11, 25));
  });

  test('explicit date MM/DD/YY (2-digit year)', () => {
    const events = extractEvents('#e 02/26/27 13:00 eye', REF_EPOCH);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('eye');
    expect(events[0].dateText).toBe('02/26/27 13:00');
    expect(events[0].dateEpoch).toBe(startOfDayUTC(2027, 1, 26) + 13 * 3600);
  });

  test('multi-line description', () => {
    const input = '#e today Meeting\nBring notes\nAsk about budget';
    const events = extractEvents(input, REF_EPOCH);
    expect(events).toHaveLength(1);
    expect(events[0].description).toBe('Bring notes\nAsk about budget');
  });

  test('multiple events', () => {
    const input = '#e today First\nsome details\n#e tomorrow Second';
    const events = extractEvents(input, REF_EPOCH);
    expect(events).toHaveLength(2);
    expect(events[0].title).toBe('First');
    expect(events[0].description).toBe('some details');
    expect(events[1].title).toBe('Second');
    expect(events[1].description).toBeNull();
  });

  test('event terminated by #t line', () => {
    const input = '#e today Meeting\n#t Buy groceries';
    const events = extractEvents(input, REF_EPOCH);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Meeting');
    expect(events[0].description).toBeNull();
  });

  test('no events returns empty array', () => {
    const events = extractEvents('just some plain text\nnothing here', REF_EPOCH);
    expect(events).toEqual([]);
  });
});

describe('EVENT_RE', () => {
  test('matches valid #e lines', () => {
    expect('#e today Meeting').toMatch(EVENT_RE);
    expect('#e tomorrow 14:30 Call').toMatch(EVENT_RE);
    expect('#e friday Standup').toMatch(EVENT_RE);
    expect('#e 3/15 Launch').toMatch(EVENT_RE);
    expect('#e 12/25/2026 Christmas').toMatch(EVENT_RE);
    expect('#e 02/26/27 13:00 eye').toMatch(EVENT_RE); // 2-digit year
    expect('#E today Meeting').toMatch(EVENT_RE); // case insensitive
  });

  test('rejects non-event lines', () => {
    expect('not an event').not.toMatch(EVENT_RE);
    expect('#t a task').not.toMatch(EVENT_RE);
    expect('#e').not.toMatch(EVENT_RE);
    expect('hello #e today Meeting').not.toMatch(EVENT_RE); // must be at start
  });
});
