import { describe, test, expect } from 'vitest';
import { extractMovies, MOVIE_RE } from './movies';

describe('extractMovies', () => {
  test('single movie, no description', () => {
    const movies = extractMovies('#m The Matrix');
    expect(movies).toHaveLength(1);
    expect(movies[0].title).toBe('The Matrix');
    expect(movies[0].description).toBeNull();
  });

  test('movie with multi-line description', () => {
    const input = '#m The Matrix\n  Great sci-fi.\n  Keanu Reeves.';
    const movies = extractMovies(input);
    expect(movies).toHaveLength(1);
    expect(movies[0].title).toBe('The Matrix');
    expect(movies[0].description).toBe('Great sci-fi.\n  Keanu Reeves.');
  });

  test('multiple movies', () => {
    const input = '#m The Matrix\ngreat sci-fi\n#m Blade Runner\nalso great';
    const movies = extractMovies(input);
    expect(movies).toHaveLength(2);
    expect(movies[0].title).toBe('The Matrix');
    expect(movies[0].description).toBe('great sci-fi');
    expect(movies[1].title).toBe('Blade Runner');
    expect(movies[1].description).toBe('also great');
  });

  test('movie terminated by #t', () => {
    const input = '#m The Matrix\ngreat sci-fi\n#t Buy groceries';
    const movies = extractMovies(input);
    expect(movies).toHaveLength(1);
    expect(movies[0].title).toBe('The Matrix');
    expect(movies[0].description).toBe('great sci-fi');
  });

  test('movie terminated by #e', () => {
    const input = '#m The Matrix\ngreat sci-fi\n#e today Meeting';
    const movies = extractMovies(input);
    expect(movies).toHaveLength(1);
    expect(movies[0].title).toBe('The Matrix');
    expect(movies[0].description).toBe('great sci-fi');
  });

  test('movie terminated by #l', () => {
    const input = '#m The Matrix\ngreat sci-fi\n#l Some Place';
    const movies = extractMovies(input);
    expect(movies).toHaveLength(1);
    expect(movies[0].title).toBe('The Matrix');
    expect(movies[0].description).toBe('great sci-fi');
  });

  test('movie terminated by #b', () => {
    const input = '#m The Matrix\ngreat sci-fi\n#b Neuromancer';
    const movies = extractMovies(input);
    expect(movies).toHaveLength(1);
    expect(movies[0].title).toBe('The Matrix');
    expect(movies[0].description).toBe('great sci-fi');
  });

  test('no movies returns empty array', () => {
    const movies = extractMovies('just some plain text\nnothing here');
    expect(movies).toEqual([]);
  });

  test('case insensitivity', () => {
    const movies = extractMovies('#M The Matrix');
    expect(movies).toHaveLength(1);
    expect(movies[0].title).toBe('The Matrix');
  });
});

describe('MOVIE_RE', () => {
  test('matches valid #m lines', () => {
    expect('#m The Matrix').toMatch(MOVIE_RE);
    expect('#M The Matrix').toMatch(MOVIE_RE);
    expect('#m Blade Runner 2049').toMatch(MOVIE_RE);
  });

  test('rejects non-movie lines', () => {
    expect('not a movie').not.toMatch(MOVIE_RE);
    expect('#t a task').not.toMatch(MOVIE_RE);
    expect('#m').not.toMatch(MOVIE_RE);
    expect('hello #m The Matrix').not.toMatch(MOVIE_RE);
  });
});
