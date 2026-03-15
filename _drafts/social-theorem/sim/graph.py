"""Social graph: adjacency, attentional budget, rewiring."""

import numpy as np
from .core import recognition_signal_batch


class SocialGraph:
    """Weighted directed graph for recognition transactions.

    adjacency[i, j] = 1 means i presents forms to j (edge i -> j).
    omega[i, j] = weight of edge i -> j (proportion of j's attention on i).
    Budget constraint: for each j, sum_i omega[i, j] <= 1.
    """

    def __init__(self, cfg, rng):
        N = cfg.N
        self.N = N

        # Erdos-Renyi adjacency (directed)
        self.adjacency = (rng.random((N, N)) < cfg.edge_prob).astype(np.float64)
        np.fill_diagonal(self.adjacency, 0)  # no self-edges

        # Initialize omega weights
        self.omega = np.zeros((N, N))
        for j in range(N):
            neighbors = np.where(self.adjacency[:, j] > 0)[0]
            if len(neighbors) > 0:
                weights = rng.uniform(cfg.omega_init_range[0],
                                      cfg.omega_init_range[1],
                                      size=len(neighbors))
                # Normalize so sum <= 1
                total = weights.sum()
                if total > 1.0:
                    weights /= total
                self.omega[neighbors, j] = weights

    def neighbors_of(self, j):
        """Return indices of subjects presenting forms to j (i -> j edges)."""
        return np.where(self.adjacency[:, j] > 0)[0]

    def presentees_of(self, i):
        """Return indices of subjects i presents forms to (i -> j edges)."""
        return np.where(self.adjacency[i, :] > 0)[0]

    def get_omega(self, i, j):
        """Get omega(i, j) — proportion of j's attention on i."""
        return self.omega[i, j]

    def reduce_omega(self, i, j, reduction):
        """Reduce omega(i, j) by reduction amount, clamped at 0."""
        self.omega[i, j] = max(0.0, self.omega[i, j] - reduction)

    def kill_subject(self, i):
        """Remove all edges involving subject i (zero out row and column)."""
        self.adjacency[i, :] = 0
        self.adjacency[:, i] = 0
        self.omega[i, :] = 0.0
        self.omega[:, i] = 0.0

    def birth_subject(self, i, cfg, rng):
        """Create random Erdos-Renyi edges for new subject at slot i."""
        N = self.N
        # Outgoing edges i -> j
        for j in range(N):
            if j == i:
                continue
            if rng.random() < cfg.edge_prob:
                self.adjacency[i, j] = 1
                self.omega[i, j] = rng.uniform(cfg.omega_init_range[0],
                                                cfg.omega_init_range[1])
        # Incoming edges j -> i
        for j in range(N):
            if j == i:
                continue
            if rng.random() < cfg.edge_prob:
                self.adjacency[j, i] = 1
                self.omega[j, i] = rng.uniform(cfg.omega_init_range[0],
                                                cfg.omega_init_range[1])
        # Normalize budgets for i and all affected columns
        for j in range(N):
            neighbors = self.neighbors_of(j)
            if len(neighbors) > 0:
                total = self.omega[neighbors, j].sum()
                if total > 1.0:
                    self.omega[neighbors, j] /= total

    def rewire(self, forms, T_matrices, cfg, rng):
        """Drop low-signal edges, add edges toward high-signal subjects.

        Drop edges where the recognition signal between connected subjects
        is below rewire_drop_threshold. Add edges toward subjects producing
        high signal for the rewiring subject.
        """
        N = self.N
        epsilon = cfg.epsilon

        # Drop low-signal edges
        for j in range(N):
            neighbors = self.neighbors_of(j)
            if len(neighbors) == 0:
                continue
            for i in neighbors:
                sigma = recognition_signal_batch(
                    forms[i], T_matrices[j:j+1], epsilon)
                if sigma[0] < cfg.rewire_drop_threshold:
                    self.adjacency[i, j] = 0
                    self.omega[i, j] = 0.0

        # Add edges toward high-signal subjects
        for j in range(N):
            current_neighbors = set(self.neighbors_of(j))
            non_neighbors = [i for i in range(N)
                             if i != j and i not in current_neighbors]
            if len(non_neighbors) == 0:
                continue

            # Compute signal for all non-neighbors
            non_arr = np.array(non_neighbors)
            signals = recognition_signal_batch(
                forms[non_arr[0]], T_matrices[j:j+1], epsilon)
            # Actually compute for all non-neighbors
            all_signals = np.array([
                recognition_signal_batch(forms[i], T_matrices[j:j+1], epsilon)[0]
                for i in non_neighbors
            ])

            # Add top-k
            k = min(cfg.rewire_add_count, len(non_neighbors))
            top_idx = np.argsort(all_signals)[-k:]
            for idx in top_idx:
                i = non_neighbors[idx]
                self.adjacency[i, j] = 1
                # Assign small initial omega
                self.omega[i, j] = 0.1

            # Re-normalize budget for j
            neighbors = self.neighbors_of(j)
            if len(neighbors) > 0:
                total = self.omega[neighbors, j].sum()
                if total > 1.0:
                    self.omega[neighbors, j] /= total
