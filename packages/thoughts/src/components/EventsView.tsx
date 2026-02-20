import { useState } from 'react';
import type { Event } from '../types';
import { useEvents } from '../hooks/useCache';

const DAY_SECONDS = 86400;
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function daysInMonthUTC(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function startDowUTC(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 1)).getUTCDay();
}

function todayEpoch(): number {
  const now = new Date();
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000);
}

function formatMonthYear(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function EventsView() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { data } = useEvents(year, month);
  const events: Event[] = data?.events ?? [];
  const loading = !data;

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
    setSelectedDay(null);
  };

  // Group events by day epoch
  const byDay = new Map<number, Event[]>();
  for (const ev of events) {
    const dayKey = ev.date_epoch - (ev.date_epoch % DAY_SECONDS);
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    byDay.get(dayKey)!.push(ev);
  }

  const numDays = daysInMonthUTC(year, month);
  const startDow = startDowUTC(year, month);
  const today = todayEpoch();
  const monthStart = Date.UTC(year, month, 1) / 1000;

  const selectedEvents = selectedDay != null ? (byDay.get(selectedDay) || []) : [];

  return (
    <div className="events-view">
      <div className="events-header">
        <h2 className="events-title">Events</h2>
      </div>
      <div className="calendar-nav">
        <button className="calendar-nav-btn" onClick={prevMonth}>&lsaquo;</button>
        <span className="calendar-month-label">{formatMonthYear(year, month)}</span>
        <button className="calendar-nav-btn" onClick={nextMonth}>&rsaquo;</button>
      </div>
      {loading ? (
        <div className="thought-loading">Loading...</div>
      ) : (
        <>
          <div className="calendar-grid">
            {DOW.map((d) => (
              <div key={d} className="calendar-dow">{d}</div>
            ))}
            {Array.from({ length: startDow }, (_, i) => (
              <div key={`empty-${i}`} className="calendar-day calendar-day--empty" />
            ))}
            {Array.from({ length: numDays }, (_, i) => {
              const dayEpoch = monthStart + i * DAY_SECONDS;
              const hasEvents = byDay.has(dayEpoch);
              const isToday = dayEpoch === today;
              const isSelected = dayEpoch === selectedDay;
              let cls = 'calendar-day';
              if (hasEvents) cls += ' calendar-day--has-events';
              if (isToday) cls += ' calendar-day--today';
              if (isSelected) cls += ' calendar-day--selected';
              return (
                <button
                  key={i}
                  className={cls}
                  onClick={() => hasEvents && setSelectedDay(isSelected ? null : dayEpoch)}
                  disabled={!hasEvents}
                >
                  <span>{i + 1}</span>
                  {hasEvents && <span className="calendar-day-dot" />}
                </button>
              );
            })}
          </div>
          {selectedDay != null && selectedEvents.length > 0 && (
            <div className="events-detail">
              <ul className="events-list">
                {selectedEvents.map((ev) => (
                  <li key={ev.id} className="event-item">
                    <span className="event-time">{ev.date_text}</span>
                    <span className="event-title">{ev.title}</span>
                    {ev.description && (
                      <span className="event-description">{ev.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
