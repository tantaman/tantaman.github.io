"""Field detection, tracking, and dissolution."""

import numpy as np
from core import recognition_signal


def assign_to_fields(forms, T_prototypes, epsilon):
    """Assign each subject to the prototype T with highest recognition signal.

    forms: (N, n) array of forms in grammar coordinates
    T_prototypes: list of K (n, n) distortion operators
    epsilon: signal sensitivity

    Returns: (N,) array of field indices (0..K-1)
    """
    N = forms.shape[0]
    K = len(T_prototypes)
    signals = np.zeros((N, K))

    for k, T in enumerate(T_prototypes):
        diff = forms @ T.T - forms  # (N, n)
        sq_norms = np.sum(diff ** 2, axis=1)
        signals[:, k] = np.exp(-sq_norms / (2.0 * epsilon ** 2))

    return np.argmax(signals, axis=1)


def field_sizes(assignments, K):
    """Count members per field.

    Returns: (K,) array of field sizes.
    """
    sizes = np.zeros(K, dtype=int)
    for k in range(K):
        sizes[k] = np.sum(assignments == k)
    return sizes


def dissolve_fields(assignments, dissolution_rate, rng):
    """Randomly dissolve field memberships at rate delta per step.

    Dissolved subjects get assignment = -1 (unaffiliated).
    """
    mask = rng.random(len(assignments)) < dissolution_rate
    new_assignments = assignments.copy()
    new_assignments[mask] = -1
    return new_assignments


def seed_new_fields(T_prototypes, n, config, rng):
    """Seed a new field prototype at rate nu.

    Returns new T prototype or None.
    """
    if rng.random() < config.field_formation_rate:
        from core import make_distortion
        T_new, Q_new, eigs_new = make_distortion(n, config.fix_dim, rng)
        return T_new, Q_new, eigs_new
    return None


class FieldTracker:
    """Track field membership counts over time."""

    def __init__(self, K):
        self.K = K
        self.history = []  # list of (K,) arrays

    def record(self, assignments):
        sizes = field_sizes(assignments, self.K)
        self.history.append(sizes.copy())

    def get_history(self):
        """Return (T, K) array of field sizes over time."""
        return np.array(self.history)
