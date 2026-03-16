"""Social graph: multiple topologies, attention weights, neighborhood lookup."""

import numpy as np


def make_graph(N, topology, rng, edge_prob=0.05, k_neighbors=6, rewire_prob=0.3):
    """Create adjacency matrix and attention weights.

    Returns:
        adj: (N, N) bool adjacency matrix (symmetric, no self-loops)
        omega: (N, N) attention weights, omega[i,j] = weight j gives to i
               (sum over i for each j <= 1)
    """
    if topology == "erdos_renyi":
        adj = _erdos_renyi(N, edge_prob, rng)
    elif topology == "watts_strogatz":
        adj = _watts_strogatz(N, k_neighbors, rewire_prob, rng)
    elif topology == "barabasi_albert":
        adj = _barabasi_albert(N, m=3, rng=rng)
    elif topology == "lattice":
        adj = _lattice(N)
    else:
        raise ValueError(f"Unknown topology: {topology}")

    # Initialize attention weights proportional to 1/degree
    omega = np.zeros((N, N))
    for j in range(N):
        neighbors = np.where(adj[:, j])[0]
        if len(neighbors) > 0:
            omega[neighbors, j] = 1.0 / len(neighbors)

    return adj, omega


def get_neighbors(adj, i):
    """Return indices of neighbors of node i."""
    return np.where(adj[i])[0]


def _erdos_renyi(N, p, rng):
    """Erdos-Renyi random graph."""
    adj = np.zeros((N, N), dtype=bool)
    for i in range(N):
        for j in range(i + 1, N):
            if rng.random() < p:
                adj[i, j] = True
                adj[j, i] = True
    return adj


def _watts_strogatz(N, k, beta, rng):
    """Watts-Strogatz small-world graph."""
    adj = np.zeros((N, N), dtype=bool)
    # Start with ring lattice
    for i in range(N):
        for offset in range(1, k // 2 + 1):
            j = (i + offset) % N
            adj[i, j] = True
            adj[j, i] = True

    # Rewire with probability beta
    for i in range(N):
        for offset in range(1, k // 2 + 1):
            if rng.random() < beta:
                j_old = (i + offset) % N
                # Pick new target (not self, not already connected)
                candidates = [c for c in range(N) if c != i and not adj[i, c]]
                if candidates:
                    j_new = rng.choice(candidates)
                    adj[i, j_old] = False
                    adj[j_old, i] = False
                    adj[i, j_new] = True
                    adj[j_new, i] = True
    return adj


def _barabasi_albert(N, m, rng):
    """Barabasi-Albert preferential attachment graph."""
    adj = np.zeros((N, N), dtype=bool)
    # Start with complete graph on m+1 nodes
    for i in range(m + 1):
        for j in range(i + 1, m + 1):
            adj[i, j] = True
            adj[j, i] = True

    degrees = np.sum(adj, axis=1).astype(float)

    for new_node in range(m + 1, N):
        # Preferential attachment: probability proportional to degree
        probs = degrees[:new_node].copy()
        total = probs.sum()
        if total > 0:
            probs /= total
        else:
            probs[:] = 1.0 / new_node

        targets = rng.choice(new_node, size=min(m, new_node), replace=False, p=probs)
        for t in targets:
            adj[new_node, t] = True
            adj[t, new_node] = True
            degrees[t] += 1
        degrees[new_node] = len(targets)

    return adj


def _lattice(N):
    """2D square lattice (approximate sqrt(N) x sqrt(N))."""
    side = int(np.ceil(np.sqrt(N)))
    adj = np.zeros((N, N), dtype=bool)
    for i in range(N):
        row, col = divmod(i, side)
        # Right neighbor
        if col + 1 < side and i + 1 < N:
            adj[i, i + 1] = True
            adj[i + 1, i] = True
        # Down neighbor
        j = i + side
        if j < N:
            adj[i, j] = True
            adj[j, i] = True
    return adj
