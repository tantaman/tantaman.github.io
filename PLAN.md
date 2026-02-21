# Thought Graph Frontend — Design

## Current State

The **post graph** (`content/graph.js` → `docs/graph.html`) is a static page that:
- Embeds graph data as JSON at build time (from `.relationships.json`)
- Loads vis-network from CDN (`vis-network@latest/standalone/umd/vis-network.min.js`)
- Renders with `docs/graph.js` — ~890 lines of vanilla JS IIFE
- Styled by `docs/graph.css` — ~335 lines

The **thoughts app** (`packages/thoughts/`) is a Vite/React 19 SPA that:
- Routes via `location.hash` (`#tasks`, `#events`, `#thought-{id}`)
- Fetches from the Cloudflare Worker API
- Builds to `docs/thoughts/`

## What to Share

The post graph's vis-network code has several reusable pieces:

| Feature | Shared? | Notes |
|---------|---------|-------|
| vis-network init (options, physics) | Yes | Same `forceAtlas2Based` solver, stabilization settings |
| Cluster boundary drawing (canvas) | Yes | `beforeDrawing`/`afterDrawing` hooks, same circle+dashed style |
| Cluster label drawing + click detection | Yes | Same golden-angle hue, same hit-test logic |
| Edge color from score | Yes | Same `scoreToColor()` green→blue→red gradient |
| Cross-cluster edge curving/dimming | Yes | Same logic |
| Click → filter to neighbors | Yes | Same adjacency-map approach |
| Threshold slider filtering | Yes | Same edge hiding by score |
| Preview pane (iframe, resize handle) | No | Post graph loads HTML pages; thoughts would show ThoughtCard inline |
| Breadcrumb trail | No | Post graph specific |
| TF-IDF search | No | Post graph uses local `/search.json`; thoughts uses API vector search |
| Node colors | Different | Post graph: per-node sentiment. Thoughts: cluster-based |

## Architecture: `packages/graph-core/`

Create a new workspace package that extracts the shared graph logic:

```
packages/graph-core/
├── package.json          # @tantaman/graph-core
├── tsconfig.json
├── vite.config.ts        # Library mode → ESM + IIFE
├── src/
│   ├── index.ts          # Public API
│   ├── graph.ts          # initGraph(container, data, callbacks) → GraphController
│   ├── clusters.ts       # Cluster drawing, label rendering, hit-testing
│   ├── colors.ts         # scoreToColor, clusterColor
│   ├── types.ts          # GraphNode, GraphEdge, ClusterInfo, GraphOptions
│   └── graph.css         # Shared graph CSS (container, controls, slider, tooltip)
```

### Public API

```ts
interface GraphNode {
  id: string;
  label: string;
  title?: string;      // Tooltip text
  cluster?: number;
  x?: number;
  y?: number;
  color?: string;       // Optional override (e.g., sentiment)
}

interface GraphEdge {
  from: string;
  to: string;
  score: number;
  title?: string;
  edgeType?: 'explicit' | 'semantic' | 'inferred';
}

interface ClusterInfo {
  id: number;
  name?: string;
  nodeCount: number;
}

interface GraphCallbacks {
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onClusterClick?: (clusterId: number) => void;
  onBackgroundClick?: () => void;
}

interface GraphController {
  setThreshold(value: number): void;   // 0-1
  filterToNode(nodeId: string): void;
  filterToCluster(clusterId: number): void;
  showAll(): void;
  filterNodes(visibleIds: Set<string>): void;  // For external search
  destroy(): void;
}

function initGraph(
  container: HTMLElement,
  data: { nodes: GraphNode[]; edges: GraphEdge[]; clusters: ClusterInfo[] },
  callbacks?: GraphCallbacks,
): GraphController;
```

### Dual Build Output

Vite library mode produces:
- **ESM** (`dist/graph-core.js`) — imported by `packages/thoughts/`
- **IIFE** (`dist/graph-core.iife.js`) — loaded as `<script>` by the post graph page, exposes `window.GraphCore`

### CSS

The shared CSS covers:
- `#graph-container` styling (dark bg, flex, overflow)
- `.graph-header`, `.graph-controls`, `.graph-slider` (bottom overlay bar)
- `.graph-search` (search input)
- vis-network overrides (`.vis-tooltip`)
- Mobile responsive breakpoints

Page-specific CSS stays separate:
- Post graph keeps its preview pane + breadcrumb CSS in `docs/graph.css`
- Thoughts graph has its own CSS for whatever UI it wraps around the graph

## Thoughts Graph Integration

### Route

Add `#graph` to the thoughts app hash router:

```ts
// App.tsx parseHash()
if (hash === '#graph') return { view: 'graph' };
```

### Sidebar

Add a "Graph" nav link in `Sidebar.tsx`.

### React Component: `GraphView.tsx`

```tsx
function GraphView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<GraphController | null>(null);

  // Fetch graph data from API
  const { data } = useSWR('/thoughts/graph', () =>
    fetch(`${API}/thoughts/graph`).then(r => r.json())
  );

  // Initialize vis-network when data arrives
  useEffect(() => {
    if (!data || !containerRef.current) return;

    const nodes = data.nodes.map(n => ({
      id: String(n.id),
      label: n.body.slice(0, 40),
      title: n.body,
      cluster: n.cluster,
    }));

    const edges = data.edges.map(e => ({
      from: String(e.source),
      to: String(e.target),
      score: e.score,
    }));

    controllerRef.current = initGraph(
      containerRef.current,
      { nodes, edges, clusters: data.clusters },
      {
        onNodeClick: (id) => { /* show thought detail */ },
        onNodeDoubleClick: (id) => {
          location.hash = `#thought-${id}`;
        },
      }
    );

    return () => controllerRef.current?.destroy();
  }, [data]);

  return (
    <div className="graph-page">
      <div ref={containerRef} id="graph-container" />
      <div className="graph-header">
        <div className="graph-controls">
          <SearchBar onSearch={(ids) => controllerRef.current?.filterNodes(ids)} />
          <ThresholdSlider onChange={(v) => controllerRef.current?.setThreshold(v)} />
        </div>
      </div>
    </div>
  );
}
```

The search bar reuses the existing `SearchBar` component from the thoughts app (which already does debounced vector search via the API). When results come back, it calls `controller.filterNodes()` with the matching IDs.

### vis-network Dependency

Add `vis-network` as a dependency of `packages/graph-core/`. Vite will bundle it into the IIFE build (for the post graph page, removing the CDN dependency) and tree-shake it in the ESM build for the thoughts app.

## Migration of Post Graph

After `graph-core` is built:

1. **`content/graph.js`**: Change the `<script>` tags to load `graph-core.iife.js` instead of vis-network CDN + `graph.js`
2. **`docs/graph.js`**: Replace with a thin wrapper that calls `GraphCore.initGraph()` with post-graph-specific callbacks (preview pane, breadcrumbs, search)
3. **`docs/graph.css`**: Keep only the post-graph-specific CSS (preview pane, breadcrumbs); shared CSS comes from graph-core

## Implementation Order

1. Create `packages/graph-core/` with types and the `initGraph()` function (extracting from `docs/graph.js`)
2. Extract shared CSS into `packages/graph-core/src/graph.css`
3. Build with Vite library mode (ESM + IIFE)
4. Add `GraphView` route + component to `packages/thoughts/`
5. Add `getGraph()` to `packages/thoughts/src/api.ts`
6. Migrate `content/graph.js` and `docs/graph.js` to use the shared core
7. Test both post graph and thoughts graph
