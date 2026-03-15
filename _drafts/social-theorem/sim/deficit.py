"""3-channel deficit accumulator, discharge mechanics, prior form register."""

import numpy as np


class DeficitAccumulator:
    """Tracks per-subject deficit across 3 channels and handles discharge.

    Channel 1 (Lossiness): ||s_i - f_i|| (uses r_i_norm for V_B^perp component)
    Channel 2 (Distortion): mean ||T_j(f_i) - f_i|| over neighbors
    Channel 3 (Concealment violation): 1 / max(||f_i - s_i||, floor)
    """

    def __init__(self, N):
        self.N = N
        self.deficit = np.zeros(N)
        self.channel_1 = np.zeros(N)
        self.channel_2 = np.zeros(N)
        self.channel_3 = np.zeros(N)
        self.discharge_events = []  # list of (timestep, subject, target)

    def reset_subject(self, i):
        """Zero deficit and all channels for subject i."""
        self.deficit[i] = 0.0
        self.channel_1[i] = 0.0
        self.channel_2[i] = 0.0
        self.channel_3[i] = 0.0

    def compute_channels(self, forms, s_proj, r_norms, T_matrices, graph):
        """Compute per-subject 3-channel deficit values."""
        N = self.N
        n = forms.shape[1]

        for i in range(N):
            # Channel 1: lossiness = sqrt(||s_proj - f||^2 + r_norm^2)
            proj_dist_sq = np.sum((s_proj[i] - forms[i]) ** 2)
            self.channel_1[i] = np.sqrt(proj_dist_sq + r_norms[i] ** 2)

            # Channel 2: mean distortion by neighbors
            neighbors = graph.neighbors_of(i)
            if len(neighbors) > 0:
                # f_i as seen by each neighbor j (they apply T_j)
                # We want ||T_j(f_i) - f_i|| for each j in neighbors
                Tf = np.einsum('kij,j->ki', T_matrices[neighbors], forms[i])
                dists = np.linalg.norm(Tf - forms[i], axis=1)
                self.channel_2[i] = np.mean(dists)
            else:
                self.channel_2[i] = 0.0

            # Channel 3: concealment violation = 1 / max(||f - s||, 0.01)
            f_s_dist = np.sqrt(proj_dist_sq)
            self.channel_3[i] = 1.0 / max(f_s_dist, 0.01)

    def accumulate(self, cfg):
        """Accumulate total deficit from 3 channels."""
        self.deficit += (cfg.lambda_1 * self.channel_1 +
                         cfg.lambda_2 * self.channel_2 +
                         cfg.lambda_3 * self.channel_3)

    def check_discharge(self, t, forms, T_matrices, graph, prior_forms, cfg):
        """Check for discharge events and execute them.

        When deficit > theta, discharge toward the neighbor contributing
        most to accumulated deficit. Reduce omega toward that neighbor.
        """
        events = []
        for i in range(self.N):
            if self.deficit[i] < cfg.discharge_theta:
                continue

            neighbors = graph.neighbors_of(i)
            if len(neighbors) == 0:
                continue

            # Compute per-neighbor deficit contribution
            # delta_i^(j) = omega(j,i) * (||T_i(f_j) - f_j|| + Cost_S2(j,i,t))
            # omega multiplicatively weights the whole contribution so the
            # intimate (highest omega) structurally accumulates the most.
            contributions = np.zeros(len(neighbors))
            for k, j in enumerate(neighbors):
                omega_ji = graph.get_omega(j, i)
                # Distortion of j's form by i's grammar
                Tf = T_matrices[i] @ forms[j]
                distortion = np.linalg.norm(Tf - forms[j])

                # Displacement cost: ||T_i(f_j) - prior_i(j)||
                prior_key = (i, j)
                if prior_key in prior_forms:
                    displacement = np.linalg.norm(Tf - prior_forms[prior_key])
                else:
                    displacement = np.linalg.norm(Tf)

                contributions[k] = omega_ji * (distortion + displacement)

            # Target = argmax contributor
            target_idx = np.argmax(contributions)
            target = neighbors[target_idx]

            # Discharge: reduce omega toward target
            graph.reduce_omega(target, i, cfg.discharge_reduction)

            # Reset deficit (partial — keeps a floor)
            self.deficit[i] *= 0.3

            events.append((t, i, target))

        self.discharge_events.extend(events)
        return events


class PriorFormRegister:
    """Sparse storage of prior forms: what recognizer i holds for subject j.

    prior_forms[(i, j)] = T_i(f_j) at the time i last updated their model of j.
    Only stored for existing edges.
    """

    def __init__(self):
        self.forms = {}

    def remove_subject(self, i):
        """Delete all prior-form entries involving subject i."""
        to_delete = [k for k in self.forms if k[0] == i or k[1] == i]
        for k in to_delete:
            del self.forms[k]

    def update(self, i, j, T_i, f_j):
        """Update i's prior form for j."""
        self.forms[(i, j)] = T_i @ f_j

    def get(self, i, j):
        """Get i's prior form for j, or None if not stored."""
        return self.forms.get((i, j))

    def update_all(self, graph, T_matrices, forms):
        """Update prior forms for all existing edges."""
        for j in range(graph.N):
            neighbors = graph.neighbors_of(j)
            for i in neighbors:
                self.forms[(j, i)] = T_matrices[j] @ forms[i]

    def as_dict(self):
        """Return the raw dict for deficit calculations."""
        return self.forms
