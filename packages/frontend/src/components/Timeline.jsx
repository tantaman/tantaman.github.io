// @ts-ignore
import React, { useState, useEffect, useRef, useCallback } from 'https://esm.sh/react';

const DEFAULT_PX_PER_YEAR = 40;
const EVENT_SPACING = 60;
const LINE_WIDTH = 2;
const NODE_RADIUS = 8;

// --- Color interpolation ---

function parseHex(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function lerpColor(c1, c2, t) {
  const [r1, g1, b1] = parseHex(c1);
  const [r2, g2, b2] = parseHex(c2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

function getColorForYear(year, backgrounds) {
  if (!backgrounds || backgrounds.length === 0) return '#1a1a1a';
  if (year <= backgrounds[0].year) return backgrounds[0].color;
  if (year >= backgrounds[backgrounds.length - 1].year)
    return backgrounds[backgrounds.length - 1].color;

  for (let i = 0; i < backgrounds.length - 1; i++) {
    if (year >= backgrounds[i].year && year <= backgrounds[i + 1].year) {
      const t =
        (year - backgrounds[i].year) /
        (backgrounds[i + 1].year - backgrounds[i].year);
      return lerpColor(backgrounds[i].color, backgrounds[i + 1].color, t);
    }
  }
  return backgrounds[backgrounds.length - 1].color;
}

// --- FadeElement: fades/slides in on intersection ---

function FadeElement({ children, side }) {
  const ref = useRef(null);
  const [ratio, setRatio] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setRatio(entry.intersectionRatio);
        }
      },
      {
        threshold: [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1.0],
        rootMargin: '-8% 0px -8% 0px',
      }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Map ratio to a smoother opacity curve
  const opacity = Math.min(1, ratio * 1.5);
  const translateX = side === 'left' ? -20 * (1 - opacity) : side === 'right' ? 20 * (1 - opacity) : 0;
  const translateY = side ? 0 : -10 * (1 - opacity);

  return (
    <div
      ref={ref}
      style={{
        opacity,
        transform: `translate(${translateX}px, ${translateY}px)`,
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}

// --- EraHeader ---

function EraHeader({ title }) {
  return (
    <div
      style={{
        textAlign: 'center',
        fontFamily: "'Crimson Pro', Georgia, 'Times New Roman', serif",
        fontSize: '1.8rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: 'rgba(255,255,255,0.92)',
        marginBottom: '16px',
        lineHeight: 1.3,
      }}
    >
      {title}
    </div>
  );
}

// --- EraNode: circle on the timeline ---

function EraNode() {
  return (
    <div
      style={{
        width: NODE_RADIUS * 2 + 'px',
        height: NODE_RADIUS * 2 + 'px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.7)',
        border: '2px solid rgba(255,255,255,0.3)',
        margin: '0 auto 24px auto',
        position: 'relative',
        zIndex: 2,
      }}
    />
  );
}

// --- EventCard ---

function EventCard({ text, side }) {
  const isLeft = side === 'left';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isLeft ? 'flex-end' : 'flex-start',
        width: '100%',
        marginBottom: EVENT_SPACING + 'px',
      }}
    >
      <div
        style={{
          width: '50%',
          ...(isLeft
            ? { paddingRight: '20px', marginRight: 'auto' }
            : { paddingLeft: '20px', marginLeft: 'auto' }),
        }}
      >
        <div
          style={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: '0.95rem',
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.82)',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '14px 18px',
            textAlign: isLeft ? 'right' : 'left',
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

// --- EraNoteCard ---

function EraNoteCard({ note }) {
  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto 32px auto',
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontSize: '1rem',
        fontStyle: 'italic',
        lineHeight: 1.7,
        color: 'rgba(255,255,255,0.55)',
        textAlign: 'center',
        padding: '0 24px',
      }}
    >
      {note}
    </div>
  );
}

// --- TimelineEra ---

function TimelineEra({ era, prevEndYear, pixelsPerYear, eraIndex }) {
  const gapYears = prevEndYear != null ? era.year - prevEndYear : 0;
  const marginTop = gapYears > 0 ? gapYears * pixelsPerYear : 0;
  const side = eraIndex % 2 === 0 ? 'left' : 'right';

  return (
    <div style={{ marginTop: marginTop + 'px', position: 'relative' }}>
      <EraHeader title={era.title} />
      <EraNode />
      {era.events.map((event, i) => (
        <FadeElement key={i} side={side}>
          <EventCard text={event} side={side} />
        </FadeElement>
      ))}
      {era.note && (
        <FadeElement>
          <EraNoteCard note={era.note} />
        </FadeElement>
      )}
    </div>
  );
}

// --- YearIndicator: sticky element at bottom ---

function YearIndicator({ year }) {
  return (
    <div
      style={{
        position: 'sticky',
        bottom: '24px',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
          fontSize: '0.85rem',
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.7)',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '20px',
          padding: '6px 18px',
          boxShadow: '0 0 20px rgba(255,255,255,0.05)',
        }}
      >
        ◈ {year}
      </div>
    </div>
  );
}

// --- Main Timeline component ---

export default function Timeline({
  eras = [],
  pixelsPerYear = DEFAULT_PX_PER_YEAR,
  backgrounds = [],
}) {
  const containerRef = useRef(null);
  const [currentYear, setCurrentYear] = useState(
    eras.length > 0 ? eras[0].year : 2026
  );
  const [bgColor, setBgColor] = useState(
    backgrounds.length > 0 ? backgrounds[0].color : '#1a1a1a'
  );

  const startYear = eras.length > 0 ? eras[0].year : 2026;
  const endYear =
    eras.length > 0
      ? Math.max(...eras.map((e) => e.endYear || e.year))
      : 2150;

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const containerTop = -rect.top;
    const containerHeight = container.scrollHeight - window.innerHeight;

    if (containerHeight <= 0) return;

    const fraction = Math.max(0, Math.min(1, containerTop / containerHeight));
    const year = startYear + fraction * (endYear - startYear);

    setCurrentYear(Math.round(year));
    setBgColor(getColorForYear(year, backgrounds));
  }, [startYear, endYear, backgrounds]);

  useEffect(() => {
    let rafId = null;
    const onScroll = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        handleScroll();
        rafId = null;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // Initial calculation
    handleScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [handleScroll]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        minHeight: '100vh',
        backgroundColor: bgColor,
        transition: 'background-color 0.3s ease',
        padding: '80px 0 120px 0',
        overflow: 'hidden',
      }}
    >
      {/* Central vertical line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '50%',
          width: LINE_WIDTH + 'px',
          marginLeft: -(LINE_WIDTH / 2) + 'px',
          background: 'rgba(255,255,255,0.12)',
          zIndex: 1,
        }}
      />

      {/* Eras */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '800px',
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        {eras.map((era, i) => (
          <TimelineEra
            key={i}
            era={era}
            prevEndYear={i > 0 ? eras[i - 1].endYear || eras[i - 1].year : null}
            pixelsPerYear={pixelsPerYear}
            eraIndex={i}
          />
        ))}
      </div>

      {/* Year indicator */}
      <YearIndicator year={currentYear} />
    </div>
  );
}
