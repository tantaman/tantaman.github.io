"""Subject initialization, T_i construction, recognition signal (MC1-MC6)."""

import numpy as np
from .config import SimConfig


def init_subjects(cfg: SimConfig, rng: np.random.Generator):
    """Initialize N subjects with s_i_proj, f_i, r_i_norm, strategy labels."""
    N, n = cfg.N, cfg.n

    # True-self projections onto V_B (random unit-ish vectors)
    s_proj = rng.standard_normal((N, n))
    s_proj /= np.linalg.norm(s_proj, axis=1, keepdims=True)
    s_proj *= rng.uniform(1.0, 3.0, size=(N, 1))  # varying magnitudes

    # Remainder norms (from V_B^perp)
    r_norms = rng.uniform(cfg.r_norm_range[0], cfg.r_norm_range[1], size=N)

    # Initial forms: perturbed projections of s_i onto V_B
    f = s_proj + rng.standard_normal((N, n)) * 0.1

    # Assign strategies
    strategies = []
    for name, frac in cfg.strategy_fractions.items():
        strategies.extend([name] * int(frac * N))
    # Fill remainder due to rounding
    while len(strategies) < N:
        strategies.append("constructive")
    strategies = strategies[:N]
    rng.shuffle(strategies)

    return s_proj, f, r_norms, strategies


def make_prototypes(cfg: SimConfig, rng: np.random.Generator):
    """Create K prototype T matrices with controlled Fix(T) dimensions.

    Each prototype: pick random orthonormal basis, set T as identity on
    first fix_dim basis vectors, eigenvalues in (0.3, 0.9) on the rest.
    """
    n = cfg.n
    prototypes = []
    fix_dims = []

    for _ in range(cfg.K):
        # Random orthonormal basis via QR decomposition
        Q, _ = np.linalg.qr(rng.standard_normal((n, n)))

        # Random fix_dim for this prototype
        fd = rng.integers(cfg.fix_dim_range[0], cfg.fix_dim_range[1] + 1)
        fix_dims.append(fd)

        # Eigenvalues: 1.0 for first fd, random in (0.3, 0.9) for rest
        eigs = np.ones(n)
        eigs[fd:] = rng.uniform(0.3, 0.9, size=n - fd)

        # T = Q @ diag(eigs) @ Q^T
        T = Q @ np.diag(eigs) @ Q.T
        prototypes.append(T)

    return prototypes, fix_dims


def assign_T_matrices(cfg: SimConfig, prototypes, rng: np.random.Generator):
    """Assign each subject a T_i as a small perturbation of one prototype."""
    N, n = cfg.N, cfg.n

    # Assign subjects to prototypes (roughly equal groups)
    assignments = np.arange(N) % cfg.K
    rng.shuffle(assignments)

    T_matrices = np.zeros((N, n, n))
    for i in range(N):
        proto = prototypes[assignments[i]]
        # Small random rotation perturbation
        skew = rng.standard_normal((n, n)) * cfg.perturb_scale
        skew = (skew - skew.T) / 2  # antisymmetric
        rotation = np.eye(n) + skew  # approximate rotation for small perturb
        # Re-orthogonalize via QR
        rotation, _ = np.linalg.qr(rotation)
        T_matrices[i] = rotation @ proto @ rotation.T

    return T_matrices, assignments


def recognition_signal(f, T_j, epsilon):
    """Compute sigma(f, T_j) = exp(-||T_j @ f - f||^2 / (2 * epsilon^2)).

    Args:
        f: form vector(s), shape (n,) or (M, n)
        T_j: distortion operator, shape (n, n)
        epsilon: sensitivity parameter

    Returns:
        scalar or (M,) array of recognition signals in (0, 1]
    """
    diff = T_j @ f.T - f.T  # (n,) or (n, M)
    sq_norm = np.sum(diff ** 2, axis=0)
    return np.exp(-sq_norm / (2 * epsilon ** 2))


def recognition_signal_batch(f_i, T_neighbors, epsilon):
    """Compute recognition signals from f_i against multiple neighbor T matrices.

    Args:
        f_i: single form vector, shape (n,)
        T_neighbors: array of T matrices, shape (k, n, n)
        epsilon: sensitivity parameter

    Returns:
        (k,) array of recognition signals
    """
    # T_neighbors @ f_i -> (k, n), then subtract f_i
    transformed = np.einsum('kij,j->ki', T_neighbors, f_i)  # (k, n)
    diff = transformed - f_i[np.newaxis, :]  # (k, n)
    sq_norms = np.sum(diff ** 2, axis=1)  # (k,)
    return np.exp(-sq_norms / (2 * epsilon ** 2))
