import { describe, test, expect } from 'vitest';
import { extractAlbums, ALBUM_RE, normalizeAlbumTitle } from './albums';

describe('extractAlbums', () => {
  test('single album, no description', () => {
    const albums = extractAlbums('#a Kid A');
    expect(albums).toHaveLength(1);
    expect(albums[0].title).toBe('Kid A');
    expect(albums[0].description).toBeNull();
  });

  test('album with multi-line description', () => {
    const input = '#a Kid A\n  Radiohead.\n  Holds up.';
    const albums = extractAlbums(input);
    expect(albums).toHaveLength(1);
    expect(albums[0].title).toBe('Kid A');
    expect(albums[0].description).toBe('Radiohead.\n  Holds up.');
  });

  test('multiple albums', () => {
    const input = '#a Kid A\nRadiohead\n#a OK Computer\nalso Radiohead';
    const albums = extractAlbums(input);
    expect(albums).toHaveLength(2);
    expect(albums[0].title).toBe('Kid A');
    expect(albums[0].description).toBe('Radiohead');
    expect(albums[1].title).toBe('OK Computer');
    expect(albums[1].description).toBe('also Radiohead');
  });

  test('album terminated by #t', () => {
    const albums = extractAlbums('#a Kid A\nRadiohead\n#t Buy vinyl');
    expect(albums).toHaveLength(1);
    expect(albums[0].description).toBe('Radiohead');
  });

  test('album terminated by #b', () => {
    const albums = extractAlbums('#a Kid A\nRadiohead\n#b Neuromancer');
    expect(albums).toHaveLength(1);
    expect(albums[0].description).toBe('Radiohead');
  });

  test('album terminated by #m', () => {
    const albums = extractAlbums('#a Kid A\nRadiohead\n#m The Matrix');
    expect(albums).toHaveLength(1);
    expect(albums[0].description).toBe('Radiohead');
  });

  test('album terminated by #e', () => {
    const albums = extractAlbums('#a Kid A\nRadiohead\n#e today Meeting');
    expect(albums).toHaveLength(1);
    expect(albums[0].description).toBe('Radiohead');
  });

  test('no albums returns empty array', () => {
    expect(extractAlbums('just some plain text')).toEqual([]);
  });

  test('case insensitivity', () => {
    const albums = extractAlbums('#A Kid A');
    expect(albums).toHaveLength(1);
    expect(albums[0].title).toBe('Kid A');
  });
});

describe('ALBUM_RE', () => {
  test('matches valid #a lines', () => {
    expect('#a Kid A').toMatch(ALBUM_RE);
    expect('#A Kid A').toMatch(ALBUM_RE);
    expect('#a To Pimp a Butterfly').toMatch(ALBUM_RE);
  });

  test('rejects non-album lines', () => {
    expect('not an album').not.toMatch(ALBUM_RE);
    expect('#t a task').not.toMatch(ALBUM_RE);
    expect('#a').not.toMatch(ALBUM_RE);
    expect('hello #a Kid A').not.toMatch(ALBUM_RE);
  });
});

describe('normalizeAlbumTitle', () => {
  test('lowercases and trims', () => {
    expect(normalizeAlbumTitle('  Kid A  ')).toBe('kid a');
    expect(normalizeAlbumTitle('OK COMPUTER')).toBe('ok computer');
  });
});
