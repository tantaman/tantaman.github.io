import { describe, test, expect } from 'vitest';
import { extractLocations, LOCATION_RE } from './locations';

describe('extractLocations', () => {
  test('single location, no description', () => {
    const locations = extractLocations('#l Pizzeria Beddia, Philadelphia');
    expect(locations).toHaveLength(1);
    expect(locations[0].title).toBe('Pizzeria Beddia, Philadelphia');
    expect(locations[0].description).toBeNull();
  });

  test('location with multi-line description', () => {
    const input = '#l Pizzeria Beddia, Philadelphia\n  Best pizza in Philly.\n  Get the hoagie too.';
    const locations = extractLocations(input);
    expect(locations).toHaveLength(1);
    expect(locations[0].title).toBe('Pizzeria Beddia, Philadelphia');
    expect(locations[0].description).toBe('Best pizza in Philly.\n  Get the hoagie too.');
  });

  test('multiple locations', () => {
    const input = '#l Place One\ngreat spot\n#l Place Two\nalso good';
    const locations = extractLocations(input);
    expect(locations).toHaveLength(2);
    expect(locations[0].title).toBe('Place One');
    expect(locations[0].description).toBe('great spot');
    expect(locations[1].title).toBe('Place Two');
    expect(locations[1].description).toBe('also good');
  });

  test('location terminated by #t', () => {
    const input = '#l Some Cafe\nnice vibes\n#t Buy groceries';
    const locations = extractLocations(input);
    expect(locations).toHaveLength(1);
    expect(locations[0].title).toBe('Some Cafe');
    expect(locations[0].description).toBe('nice vibes');
  });

  test('location terminated by #e', () => {
    const input = '#l Some Cafe\nnice vibes\n#e today Meeting';
    const locations = extractLocations(input);
    expect(locations).toHaveLength(1);
    expect(locations[0].title).toBe('Some Cafe');
    expect(locations[0].description).toBe('nice vibes');
  });

  test('no locations returns empty array', () => {
    const locations = extractLocations('just some plain text\nnothing here');
    expect(locations).toEqual([]);
  });

  test('case insensitivity', () => {
    const locations = extractLocations('#L Central Park, NYC');
    expect(locations).toHaveLength(1);
    expect(locations[0].title).toBe('Central Park, NYC');
  });
});

describe('LOCATION_RE', () => {
  test('matches valid #l lines', () => {
    expect('#l Some Place').toMatch(LOCATION_RE);
    expect('#L Some Place').toMatch(LOCATION_RE);
    expect('#l Pizzeria Beddia, Philadelphia').toMatch(LOCATION_RE);
  });

  test('rejects non-location lines', () => {
    expect('not a location').not.toMatch(LOCATION_RE);
    expect('#t a task').not.toMatch(LOCATION_RE);
    expect('#l').not.toMatch(LOCATION_RE);
    expect('hello #l Some Place').not.toMatch(LOCATION_RE);
  });
});
