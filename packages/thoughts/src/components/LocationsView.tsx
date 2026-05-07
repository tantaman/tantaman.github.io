import { useContext, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import type { Location } from '../types';
import { useLocations } from '../hooks/useCache';
import { geocodeLocation, patchLocation } from '../api';
import { AuthContext } from '../App';
import { useSWRConfig } from 'swr';

// Fix Leaflet default marker icons with bundlers
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function LocationsView() {
  const { data } = useLocations();
  const { mutate } = useSWRConfig();
  const { secret } = useContext(AuthContext);
  const locations: Location[] = data?.locations ?? [];
  const loading = !data;
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [geocoding, setGeocoding] = useState<number | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit(loc: Location) {
    setEditingId(loc.id);
    setEditValue(loc.title);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
  }

  async function submitEdit(loc: Location) {
    if (!secret || !editValue.trim()) return;
    setSaving(true);
    try {
      const updated = await patchLocation(loc.id, { title: editValue.trim() }, secret);
      mutate('locations', (prev: { locations: Location[] } | undefined) => {
        if (!prev) return prev;
        return { locations: prev.locations.map((l) => l.id === loc.id ? { ...l, ...updated } : l) };
      }, { revalidate: false });
      setEditingId(null);
      setEditValue('');
    } catch {
      mutate('locations');
    } finally {
      setSaving(false);
    }
  }

  const geoLocations = locations.filter(
    (loc): loc is Location & { lat: number; lng: number } =>
      loc.lat != null && loc.lng != null,
  );

  async function handleGeocode(loc: Location) {
    if (!secret || geocoding != null) return;
    setGeocoding(loc.id);
    setGeocodeError(null);
    try {
      await geocodeLocation(loc.id, secret);
      mutate('locations');
    } catch (e) {
      console.error('Geocode failed:', e);
      setGeocodeError(`Geocode failed for "${loc.title}"`);
    } finally {
      setGeocoding(null);
    }
  }

  useEffect(() => {
    if (!mapRef.current || geoLocations.length === 0) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const markers: L.Marker[] = [];
    for (const loc of geoLocations) {
      const marker = L.marker([loc.lat, loc.lng]).addTo(map);
      const popup = loc.description
        ? `<strong>${loc.title}</strong><br/>${loc.description.replace(/\n/g, '<br/>')}`
        : `<strong>${loc.title}</strong>`;
      marker.bindPopup(popup);
      markers.push(marker);
    }

    if (markers.length === 1) {
      map.setView([geoLocations[0].lat, geoLocations[0].lng], 12);
    } else {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds(), { padding: [40, 40] });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [geoLocations.map((l) => l.id).join(',')]);

  return (
    <div className="events-view">
      <div className="events-header">
        <h2 className="events-title">Locations</h2>
      </div>
      {loading ? (
        <div className="thought-loading">Loading...</div>
      ) : locations.length === 0 ? (
        <div className="thought-loading">No locations yet.</div>
      ) : (
        <>
          {geoLocations.length > 0 && (
            <div
              ref={mapRef}
              className="locations-map"
            />
          )}
          <ul className="events-list">
            {locations.map((loc) => (
              <li key={loc.id} className="event-item">
                <span className="event-title">{loc.title}</span>
                {loc.resolved_name && (
                  <span className="location-resolved">{loc.resolved_name}</span>
                )}
                {loc.description && (
                  <span className="event-description">{loc.description}</span>
                )}
                <span className="location-meta">
                  {loc.lat != null && loc.lng != null ? (
                    <span className="location-coords">
                      {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                    </span>
                  ) : (
                    <span className="location-unresolved">Not resolved</span>
                  )}
                  {secret && editingId !== loc.id && (
                    <>
                      <button
                        className="location-geocode-btn"
                        onClick={() => handleGeocode(loc)}
                        disabled={geocoding != null}
                      >
                        {geocoding === loc.id ? 'Geocoding...' : 'Re-geocode'}
                      </button>
                      <button
                        className="location-geocode-btn"
                        onClick={() => startEdit(loc)}
                        disabled={geocoding != null}
                      >
                        Edit
                      </button>
                    </>
                  )}
                  {loc.created_at > 0 && (
                    <>
                      <span className="location-meta-sep">&middot;</span>
                      <span className="location-date">{formatDate(loc.created_at)}</span>
                    </>
                  )}
                  {geocodeError && geocoding == null && (
                    <span className="location-geocode-error">{geocodeError}</span>
                  )}
                </span>
                {editingId === loc.id && (
                  <form
                    className="movie-edit-form"
                    onSubmit={(e) => { e.preventDefault(); submitEdit(loc); }}
                  >
                    <input
                      className="movie-edit-input"
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="Location name..."
                      disabled={saving}
                      autoFocus
                    />
                    <div className="movie-edit-actions">
                      <button type="submit" className="movie-edit-save" disabled={saving || !editValue.trim()}>
                        {saving ? '...' : 'Save & geocode'}
                      </button>
                      <button type="button" className="movie-edit-cancel" onClick={cancelEdit} disabled={saving}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
