"""Meta-awareness state transitions."""

import numpy as np


class MetaAwareness:
    """Track meta-awareness state for all subjects."""

    def __init__(self, N, config):
        self.N = N
        self.config = config
        # M_i in {0, 1} for each subject
        self.states = np.zeros(N, dtype=int)
        # Deficit history for rolling window
        self.deficit_history = [[] for _ in range(N)]
        # Transition times
        self.transition_times = {}  # i -> t

    def record_deficit(self, i, deficit, t):
        """Record deficit observation for subject i at time t."""
        self.deficit_history[i].append((t, deficit))
        # Keep only within window
        cutoff = t - self.config.tau_window
        self.deficit_history[i] = [
            (tt, d) for tt, d in self.deficit_history[i] if tt >= cutoff
        ]

    def check_transition(self, i, t):
        """Check if subject i transitions to meta-awareness.

        Transition fires when empirical deficit floor >= theta_M over window tau.
        Returns True if transition just fired.
        """
        if self.states[i] == 1:
            return False  # Already meta-aware

        history = self.deficit_history[i]
        if len(history) < self.config.tau_window // self.config.snapshot_interval:
            return False  # Not enough observations

        # Compute empirical deficit floor over window
        deficits = [d for _, d in history]
        deficit_floor = min(deficits)

        if deficit_floor >= self.config.theta_M:
            self.states[i] = 1
            self.transition_times[i] = t
            return True

        return False

    def is_meta_aware(self, i):
        return self.states[i] == 1

    def get_meta_aware_count(self):
        return np.sum(self.states)

    def get_transition_times(self):
        return self.transition_times.copy()
