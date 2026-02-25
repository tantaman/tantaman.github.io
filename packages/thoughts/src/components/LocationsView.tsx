import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import type { Location } from '../types';
import { useLocations } from '../hooks/useCache';

// Fix Leaflet default marker icons with bundlers
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export function LocationsView() {
  const { data } = useLocations();
  const locations: Location[] = data?.locations ?? [];
  const loading = !data;
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const geoLocations = locations.filter(
    (loc): loc is Location & { lat: number; lng: number } =>
      loc.lat != null && loc.lng != null,
  );

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
                {loc.description && (
                  <span className="event-description">{loc.description}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
