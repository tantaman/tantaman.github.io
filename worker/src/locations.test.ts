import { describe, test, expect, vi, afterEach } from 'vitest';
import { extractLocations, LOCATION_RE, geocodeLocation } from './locations';

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

describe('geocodeLocation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('successful geocode returns lat/lng/resolvedName', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [{
          geometry: { coordinates: [-75.1652, 39.9526] },
          properties: { full_address: 'Pizzeria Beddia, Philadelphia, PA, USA', name: 'Pizzeria Beddia' },
        }],
      }),
    }));

    const result = await geocodeLocation('Pizzeria Beddia, Philadelphia', 'test-token');
    expect(result).toEqual({
      lat: 39.9526,
      lng: -75.1652,
      resolvedName: 'Pizzeria Beddia, Philadelphia, PA, USA',
    });
  });

  test('uses name when full_address is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [{
          geometry: { coordinates: [-75.1652, 39.9526] },
          properties: { name: 'Pizzeria Beddia' },
        }],
      }),
    }));

    const result = await geocodeLocation('Pizzeria Beddia', 'test-token');
    expect(result?.resolvedName).toBe('Pizzeria Beddia');
  });

  test('empty features array returns null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    }));

    const result = await geocodeLocation('asdfghjkl', 'test-token');
    expect(result).toBeNull();
  });

  test('non-ok response returns null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
    }));

    const result = await geocodeLocation('anywhere', 'bad-token');
    expect(result).toBeNull();
  });

  test('fetch error returns null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const result = await geocodeLocation('anywhere', 'test-token');
    expect(result).toBeNull();
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
