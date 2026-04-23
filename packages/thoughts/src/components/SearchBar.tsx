import { useState, useEffect } from 'react';

export function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [input, setInput] = useState('');

  useEffect(() => {
    const id = setTimeout(() => onSearch(input.trim()), 300);
    return () => clearTimeout(id);
  }, [input, onSearch]);

  return (
    <div className="search-bar">
      <input
        className="search-input"
        type="text"
        placeholder="Search thoughts, pastes, amps..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      {input && (
        <button
          className="search-clear"
          onClick={() => setInput('')}
          aria-label="Clear search"
        >
          &times;
        </button>
      )}
    </div>
  );
}
