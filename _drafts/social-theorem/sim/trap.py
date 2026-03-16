"""Legibility trap: sigma_trap, prior dynamics, rebellion."""

import numpy as np
from core import recognition_signal


def sigma_trap(f_i, T_j, prior, epsilon, gamma):
    """Compute prior-conditioned recognition signal.

    sigma_trap = sigma_grammar * exp(-||f - prior||^2 / (2 gamma^2))

    f_i: (n,) form in grammar coords
    T_j: (n, n) distortion operator
    prior: (n,) prior form
    epsilon: signal sensitivity
    gamma: prior rigidity
    """
    # Grammar legibility term
    diff_grammar = T_j @ f_i - f_i
    sigma_grammar = np.exp(-np.dot(diff_grammar, diff_grammar) / (2.0 * epsilon ** 2))

    # Prior consistency term
    diff_prior = f_i - prior
    prior_term = np.exp(-np.dot(diff_prior, diff_prior) / (2.0 * gamma ** 2))

    return sigma_grammar * prior_term


def trap_attractor(T_j, prior, epsilon, gamma):
    """Compute trap attractor f* by solving first-order condition.

    (T-I)^T(T-I) f + (eps^2/gamma^2) f = (T-I)^T(T-I) · 0 + (eps^2/gamma^2) prior
    => A f = b where A = (T-I)^T(T-I) + (eps^2/gamma^2) I, b = (eps^2/gamma^2) prior

    Actually the FOC is:
    (1/eps^2)(T-I)^T(Tf - f) + (1/gamma^2)(f - prior) = 0
    => [(T-I)^T(T-I)/eps^2 + I/gamma^2] f = (1/gamma^2) prior
    """
    n = len(prior)
    TmI = T_j - np.eye(n)
    A = (TmI.T @ TmI) / epsilon ** 2 + np.eye(n) / gamma ** 2
    b = prior / gamma ** 2
    return np.linalg.solve(A, b)


def check_membership(f_i, T_j, prior, epsilon, gamma, theta):
    """Check if subject retains field membership: sigma_trap >= theta."""
    return sigma_trap(f_i, T_j, prior, epsilon, gamma) >= theta


def rebellion_threshold(gamma, theta_B, sigma_1):
    """Compute minimum displacement for prior revision (Theorem 7.5).

    Delta_min = gamma * sqrt(-2 * ln(theta_B / sigma_1))

    sigma_1: grammar legibility at moment of displacement
    """
    ratio = theta_B / sigma_1
    if ratio >= 1.0:
        return float('inf')  # Can never trigger
    if ratio <= 0.0:
        return 0.0
    return gamma * np.sqrt(-2.0 * np.log(ratio))


def detect_rebellion(f_i, prior, delta_min):
    """Check if displacement exceeds rebellion threshold."""
    displacement = np.linalg.norm(f_i - prior)
    return displacement > delta_min, displacement


class PriorTracker:
    """Manage priors for all subjects."""

    def __init__(self, N):
        self.N = N
        # priors[i] = current prior form for subject i (n-dim)
        self.priors = [None] * N
        # per-neighbor priors: priors_by_neighbor[i][j] = prior i holds for j
        self.priors_by_neighbor = [{} for _ in range(N)]

    def initialize(self, forms):
        """Set initial priors to current forms."""
        for i in range(self.N):
            self.priors[i] = forms[i].copy()

    def update_prior(self, i, new_prior, decay=0.01):
        """Slowly update prior toward new form (slow timescale)."""
        if self.priors[i] is not None:
            self.priors[i] = (1 - decay) * self.priors[i] + decay * new_prior
        else:
            self.priors[i] = new_prior.copy()

    def get_prior(self, i):
        return self.priors[i]
