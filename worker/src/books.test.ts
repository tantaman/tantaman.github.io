import { describe, test, expect } from 'vitest';
import { extractBooks, BOOK_RE } from './books';

describe('extractBooks', () => {
  test('single book, no description', () => {
    const books = extractBooks('#b Neuromancer');
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Neuromancer');
    expect(books[0].description).toBeNull();
  });

  test('book with multi-line description', () => {
    const input = '#b Neuromancer\n  William Gibson.\n  Classic cyberpunk.';
    const books = extractBooks(input);
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Neuromancer');
    expect(books[0].description).toBe('William Gibson.\n  Classic cyberpunk.');
  });

  test('multiple books', () => {
    const input = '#b Neuromancer\nWilliam Gibson\n#b Snow Crash\nNeal Stephenson';
    const books = extractBooks(input);
    expect(books).toHaveLength(2);
    expect(books[0].title).toBe('Neuromancer');
    expect(books[0].description).toBe('William Gibson');
    expect(books[1].title).toBe('Snow Crash');
    expect(books[1].description).toBe('Neal Stephenson');
  });

  test('book terminated by #t', () => {
    const input = '#b Neuromancer\nWilliam Gibson\n#t Buy groceries';
    const books = extractBooks(input);
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Neuromancer');
    expect(books[0].description).toBe('William Gibson');
  });

  test('book terminated by #e', () => {
    const input = '#b Neuromancer\nWilliam Gibson\n#e today Meeting';
    const books = extractBooks(input);
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Neuromancer');
    expect(books[0].description).toBe('William Gibson');
  });

  test('book terminated by #l', () => {
    const input = '#b Neuromancer\nWilliam Gibson\n#l Some Place';
    const books = extractBooks(input);
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Neuromancer');
    expect(books[0].description).toBe('William Gibson');
  });

  test('book terminated by #m', () => {
    const input = '#b Neuromancer\nWilliam Gibson\n#m The Matrix';
    const books = extractBooks(input);
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Neuromancer');
    expect(books[0].description).toBe('William Gibson');
  });

  test('no books returns empty array', () => {
    const books = extractBooks('just some plain text\nnothing here');
    expect(books).toEqual([]);
  });

  test('case insensitivity', () => {
    const books = extractBooks('#B Neuromancer');
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Neuromancer');
  });
});

describe('BOOK_RE', () => {
  test('matches valid #b lines', () => {
    expect('#b Neuromancer').toMatch(BOOK_RE);
    expect('#B Neuromancer').toMatch(BOOK_RE);
    expect('#b The Lord of the Rings').toMatch(BOOK_RE);
  });

  test('rejects non-book lines', () => {
    expect('not a book').not.toMatch(BOOK_RE);
    expect('#t a task').not.toMatch(BOOK_RE);
    expect('#b').not.toMatch(BOOK_RE);
    expect('hello #b Neuromancer').not.toMatch(BOOK_RE);
  });
});
