// @ts-ignore
import React from 'https://esm.sh/react';

export default function PullQuote({ children }) {
  return (
    <div style={{
      borderTop: '2px solid var(--border-heavy, #555)',
      borderBottom: '2px solid var(--border-heavy, #555)',
      margin: '2.5rem auto',
      padding: '1.5rem 2rem',
      maxWidth: '80%',
      textAlign: 'center',
      fontStyle: 'italic',
      fontSize: '1.2rem',
      lineHeight: 1.6,
      color: 'var(--text-muted, #999)',
    }}>
      {children}
    </div>
  );
}
