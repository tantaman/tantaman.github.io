"""Main simulation loop, state snapshots, clustering."""

import numpy as np
from sklearn.cluster import DBSCAN

from .config import SimConfig
from .core import (init_subjects, make_prototypes, assign_T_matrices,
                    init_single_subject, assign_single_T)
from .dynamics import apply_update, update_T
from .graph import SocialGraph
from .deficit import DeficitAccumulator, PriorFormRegister


class SimHistory:
    """Stores simulation history for analysis."""

    def __init__(self):
        self.form_snapshots = []     # list of (t, forms_copy)
        self.drift_series = []       # list of (t, mean_drift, per_subject_drift)
        self.cluster_series = []     # list of (t, labels, n_clusters, sizes)
        self.discharge_events = []   # from deficit accumulator
        self.mean_sigma_series = []  # list of (t, mean_sigma)
        self.channel_series = []     # list of (t, ch1, ch2, ch3) means


class Simulation:
    """Main simulation implementing the full Want dynamics."""

    def __init__(self, cfg: SimConfig = None):
        self.cfg = cfg or SimConfig()
        self.rng = np.random.default_rng(self.cfg.seed)

        # Initialize subjects
        self.s_proj, self.forms, self.r_norms, self.strategies = \
            init_subjects(self.cfg, self.rng)

        # Initialize T matrices with prototype structure
        self.prototypes, self.fix_dims = make_prototypes(self.cfg, self.rng)
        self.T_matrices, self.proto_assignments = \
            assign_T_matrices(self.cfg, self.prototypes, self.rng)

        # Initialize graph
        self.graph = SocialGraph(self.cfg, self.rng)

        # Initialize deficit tracking
        self.deficit_acc = DeficitAccumulator(self.cfg.N)
        self.prior_forms = PriorFormRegister()

        # Initialize prior forms for all existing edges
        self.prior_forms.update_all(self.graph, self.T_matrices, self.forms)

        # Cluster labels (initially none)
        self.cluster_labels = np.full(self.cfg.N, -1, dtype=int)
        self.cluster_id_counter = 0
        self.prev_cluster_labels = None

        # History
        self.history = SimHistory()
        self.t = 0

    def _compute_centroids(self):
        """Compute cluster centroids for collective strategy."""
        centroids = {}
        unique_labels = set(self.cluster_labels)
        for label in unique_labels:
            if label == -1:
                continue
            mask = self.cluster_labels == label
            centroids[label] = np.mean(self.forms[mask], axis=0)
        return centroids

    def _get_centroid_for(self, i, centroids):
        """Get the cluster centroid for subject i, or None."""
        label = self.cluster_labels[i]
        if label == -1:
            return None
        return centroids.get(label)

    def _compute_mean_sigma(self):
        """Compute mean recognition signal across all edges."""
        from .core import recognition_signal_batch
        total_sigma = 0.0
        edge_count = 0
        for j in range(self.cfg.N):
            neighbors = self.graph.neighbors_of(j)
            if len(neighbors) == 0:
                continue
            for i in neighbors:
                sigma = recognition_signal_batch(
                    self.forms[i], self.T_matrices[j:j+1], self.cfg.epsilon)
                total_sigma += sigma[0]
                edge_count += 1
        return total_sigma / max(edge_count, 1)

    def _update_clusters(self):
        """Run DBSCAN clustering on current forms.

        Uses the distortion-weighted form representation: for each subject,
        compute the mean distortion vector applied to their form by their
        neighborhood, then cluster in that space. This captures which
        subjects are being pulled toward similar fixed points (field formation).
        """
        from sklearn.neighbors import NearestNeighbors

        N, n = self.cfg.N, self.cfg.n

        # Build feature vectors combining form position and distortion direction
        features = np.zeros((N, 2 * n))
        for i in range(N):
            neighbors = self.graph.neighbors_of(i)
            features[i, :n] = self.forms[i]
            if len(neighbors) > 0:
                # Mean T_j(f_i) - direction each subject is being pulled
                Tf = np.einsum('kij,j->ki', self.T_matrices[neighbors],
                               self.forms[i])
                features[i, n:] = np.mean(Tf, axis=0) - self.forms[i]

        # Normalize features
        norms = np.linalg.norm(features, axis=1, keepdims=True)
        norms = np.maximum(norms, 1e-8)
        features_norm = features / norms

        eps = self.cfg.cluster_eps
        if eps <= 0:
            k = self.cfg.cluster_min_samples
            nn = NearestNeighbors(n_neighbors=min(k, N - 1))
            nn.fit(features_norm)
            dists, _ = nn.kneighbors(features_norm)
            eps = np.percentile(dists[:, -1], 40)

        dbscan = DBSCAN(eps=eps, min_samples=self.cfg.cluster_min_samples)
        raw_labels = dbscan.fit_predict(features_norm)

        if self.prev_cluster_labels is not None:
            # Match clusters across timesteps via maximum overlap
            new_labels = np.full_like(raw_labels, -1)
            old_unique = set(self.prev_cluster_labels)
            old_unique.discard(-1)
            new_unique = set(raw_labels)
            new_unique.discard(-1)

            used_old = set()
            # For each new cluster, find best-matching old cluster
            for new_id in new_unique:
                new_mask = raw_labels == new_id
                best_overlap = 0
                best_old = None
                for old_id in old_unique:
                    if old_id in used_old:
                        continue
                    old_mask = self.prev_cluster_labels == old_id
                    overlap = np.sum(new_mask & old_mask)
                    if overlap > best_overlap:
                        best_overlap = overlap
                        best_old = old_id

                if best_old is not None and best_overlap > 0:
                    new_labels[new_mask] = best_old
                    used_old.add(best_old)
                else:
                    new_labels[new_mask] = self.cluster_id_counter
                    self.cluster_id_counter += 1

            self.cluster_labels = new_labels
        else:
            # First clustering — assign sequential IDs
            unique = set(raw_labels)
            unique.discard(-1)
            label_map = {}
            for uid in unique:
                label_map[uid] = self.cluster_id_counter
                self.cluster_id_counter += 1
            self.cluster_labels = np.array([
                label_map.get(l, -1) for l in raw_labels
            ])

        self.prev_cluster_labels = self.cluster_labels.copy()

        # Compute cluster sizes
        unique_labels = set(self.cluster_labels)
        unique_labels.discard(-1)
        sizes = []
        for label in sorted(unique_labels):
            sizes.append(np.sum(self.cluster_labels == label))

        return len(unique_labels), sizes

    def _do_turnover(self):
        """Replace a fraction of the population with fresh subjects."""
        cfg = self.cfg
        if cfg.turnover_rate <= 0 or self.t < cfg.turnover_warmup:
            return

        N = cfg.N
        n_deaths = self.rng.poisson(cfg.turnover_rate * N)
        if n_deaths == 0:
            return
        n_deaths = min(n_deaths, N)

        if cfg.turnover_bias == "disconnected":
            # Bias toward subjects with fewer edges
            degrees = self.graph.adjacency.sum(axis=0) + self.graph.adjacency.sum(axis=1)
            inv_degree = 1.0 / (degrees + 1.0)
            probs = inv_degree / inv_degree.sum()
            victims = self.rng.choice(N, size=n_deaths, replace=False, p=probs)
        else:
            victims = self.rng.choice(N, size=n_deaths, replace=False)

        for i in victims:
            # Death
            self.graph.kill_subject(i)
            self.deficit_acc.reset_subject(i)
            self.prior_forms.remove_subject(i)
            self.cluster_labels[i] = -1

            # Birth
            s_proj_i, f_i, r_norm_i, strategy_i = init_single_subject(cfg, self.rng)
            self.s_proj[i] = s_proj_i
            self.forms[i] = f_i
            self.r_norms[i] = r_norm_i
            self.strategies[i] = strategy_i

            T_i, proto_idx = assign_single_T(cfg, self.prototypes, self.rng)
            self.T_matrices[i] = T_i
            self.proto_assignments[i] = proto_idx

            self.graph.birth_subject(i, cfg, self.rng)

        # Update prior forms for edges involving newborns
        for i in victims:
            # i as recognizer
            for j in self.graph.presentees_of(i):
                self.prior_forms.update(i, j, self.T_matrices[i], self.forms[j])
            # i as presentee
            for j in self.graph.neighbors_of(i):
                self.prior_forms.update(j, i, self.T_matrices[j], self.forms[i])

    def step(self):
        """Execute one timestep of the simulation."""
        t = self.t
        cfg = self.cfg
        N = cfg.N

        # 0. Turnover (open-population dynamics)
        self._do_turnover()

        # 1. Compute centroids for collective strategy
        centroids = self._compute_centroids()

        # 2. Compute gradients and update forms
        new_forms = np.copy(self.forms)
        for i in range(N):
            neighbors = self.graph.neighbors_of(i)
            if len(neighbors) == 0:
                continue

            T_neighbors = self.T_matrices[neighbors]
            centroid = self._get_centroid_for(i, centroids)

            new_forms[i] = apply_update(
                self.strategies[i], self.forms[i], self.s_proj[i],
                T_neighbors, cfg, centroid)

        self.forms = new_forms

        # Clip form norms to prevent unbounded growth
        # (forms live in V_B which is bounded in practice)
        norms = np.linalg.norm(self.forms, axis=1, keepdims=True)
        max_norm = 5.0 * np.mean(np.linalg.norm(self.s_proj, axis=1))
        mask = norms[:, 0] > max_norm
        if np.any(mask):
            self.forms[mask] *= max_norm / norms[mask]

        # 2b. Co-evolve T matrices (grammar adaptation)
        if cfg.eta_T > 0 and t % cfg.T_update_interval == 0:
            from .core import recognition_signal_batch
            for i in range(N):
                # i is a recognizer; update T_i based on forms of subjects
                # presenting to i (neighbors_of(i) = subjects j where j->i)
                neighbors = self.graph.neighbors_of(i)
                if len(neighbors) == 0:
                    continue
                f_neighbors = self.forms[neighbors]
                omega_weights = np.array([
                    self.graph.get_omega(j, i) for j in neighbors])
                signals = recognition_signal_batch(
                    self.forms[neighbors[0]], self.T_matrices[i:i+1],
                    cfg.epsilon)
                # Actually compute signals for all neighbors
                signals = np.array([
                    recognition_signal_batch(
                        self.forms[j], self.T_matrices[i:i+1], cfg.epsilon)[0]
                    for j in neighbors])
                self.T_matrices[i] = update_T(
                    self.T_matrices[i], f_neighbors, omega_weights,
                    signals, cfg.eta_T, cfg.T_eigenvalue_range)

        # 3. Update deficit
        self.deficit_acc.compute_channels(
            self.forms, self.s_proj, self.r_norms,
            self.T_matrices, self.graph)
        self.deficit_acc.accumulate(cfg)

        # 4. Check discharge
        events = self.deficit_acc.check_discharge(
            t, self.forms, self.T_matrices, self.graph,
            self.prior_forms.as_dict(), cfg)

        # 5. Update prior forms
        self.prior_forms.update_all(self.graph, self.T_matrices, self.forms)

        # 6. Periodic clustering
        if t % cfg.cluster_interval == 0:
            n_clusters, sizes = self._update_clusters()
            self.history.cluster_series.append(
                (t, self.cluster_labels.copy(), n_clusters, sizes))

        # 7. Periodic rewiring
        if t > 0 and t % cfg.rewire_interval == 0:
            self.graph.rewire(self.forms, self.T_matrices, cfg, self.rng)

        # 8. Record history
        # Drift
        drifts = np.sqrt(
            np.sum((self.s_proj - self.forms) ** 2, axis=1) +
            self.r_norms ** 2)
        self.history.drift_series.append((t, np.mean(drifts), drifts.copy()))

        # Channels
        self.history.channel_series.append((
            t,
            np.mean(self.deficit_acc.channel_1),
            np.mean(self.deficit_acc.channel_2),
            np.mean(self.deficit_acc.channel_3),
        ))

        # Form snapshots (periodic)
        if t % cfg.snapshot_interval == 0:
            self.history.form_snapshots.append((t, self.forms.copy()))

        # Mean sigma (periodic, expensive)
        if t % cfg.snapshot_interval == 0:
            mean_sig = self._compute_mean_sigma()
            self.history.mean_sigma_series.append((t, mean_sig))

        # Discharge events
        self.history.discharge_events.extend(events)

        self.t += 1

    def run(self, verbose=True):
        """Run the full simulation."""
        for t in range(self.cfg.T_steps):
            self.step()
            if verbose and t % 100 == 0:
                drift = self.history.drift_series[-1][1]
                n_clusters = 0
                if self.history.cluster_series:
                    n_clusters = self.history.cluster_series[-1][2]
                n_discharges = len(self.history.discharge_events)
                print(f"t={t:5d}  drift={drift:.4f}  "
                      f"clusters={n_clusters}  "
                      f"discharges={n_discharges}")

        return self.history
