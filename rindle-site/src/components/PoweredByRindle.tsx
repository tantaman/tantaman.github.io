// "Powered by rindle" credit — this site runs on the rindle sync platform, so a quiet fixed
// bottom-right pill links back to rindle.sh from every surface. Ported from Strut's badge; the mark
// is the rindle brand logo (ink tile + paper outline + orange accent dot) inlined so it needs no
// asset fetch and stays crisp. The logo colours are fixed on purpose (a logo doesn't recolour with
// the theme); the pill's chrome uses the site's own CSS variables so it reads right in light + dark.
export function PoweredByRindle() {
  return (
    <a
      className="powered-by"
      href="https://rindle.sh"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Powered by rindle"
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="#171411" />
        <rect
          x="7.1"
          y="6.4"
          width="14.6"
          height="14.6"
          rx="4"
          fill="none"
          stroke="#f2eee7"
          strokeWidth="2.2"
        />
        <circle cx="23" cy="22.3" r="3.4" fill="#ff4d00" />
      </svg>
      <span>powered by rindle</span>
    </a>
  );
}
