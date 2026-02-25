import type { Location } from '../types';
import { useLocations } from '../hooks/useCache';

export function LocationsView() {
  const { data } = useLocations();
  const locations: Location[] = data?.locations ?? [];
  const loading = !data;

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
      )}
    </div>
  );
}
