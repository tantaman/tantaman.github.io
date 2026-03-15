"""Want/Concealment gradients and 4 strategy update rules (MC7, MC8)."""

import numpy as np


def want_gradient(f_i, T_neighbors, epsilon):
    """Compute the Want gradient for subject i (MC7).

    grad W_i = (-1 / (|N_i| * eps^2)) * sum_j sigma(f, T_j) * (T_j - I)^T @ (T_j @ f - f)

    Args:
        f_i: form vector, shape (n,)
        T_neighbors: neighbor T matrices, shape (k, n, n)
        epsilon: sensitivity parameter

    Returns:
        gradient vector, shape (n,)
    """
    if len(T_neighbors) == 0:
        return np.zeros_like(f_i)

    k, n, _ = T_neighbors.shape
    I = np.eye(n)

    # T_j @ f_i for all j
    Tf = np.einsum('kij,j->ki', T_neighbors, f_i)  # (k, n)
    diff = Tf - f_i[np.newaxis, :]  # (k, n)

    # sigma for each neighbor
    sq_norms = np.sum(diff ** 2, axis=1)  # (k,)
    sigma = np.exp(-sq_norms / (2 * epsilon ** 2))  # (k,)

    # (T_j - I)^T @ (T_j @ f - f) for each j
    TmI = T_neighbors - I[np.newaxis, :, :]  # (k, n, n)
    # (T_j - I)^T @ diff_j
    grad_terms = np.einsum('kji,kj->ki', TmI, diff)  # (k, n)

    # Weight by sigma and average
    weighted = sigma[:, np.newaxis] * grad_terms  # (k, n)
    grad = -np.sum(weighted, axis=0) / (k * epsilon ** 2)

    return grad


def concealment_gradient(f_i, s_i_proj, delta):
    """Compute the Concealment Desire gradient (MC8).

    C_i(f) = exp(-||f - s_i||^2 / (2*delta^2))
    grad C_i = -(1/delta^2) * C_i * (f - s_i)

    This pulls f_i away from s_i (we subtract lambda_C * grad C_i in the objective).

    Returns:
        gradient of C_i w.r.t. f, shape (n,)
    """
    diff = f_i - s_i_proj
    sq_norm = np.dot(diff, diff)
    C = np.exp(-sq_norm / (2 * delta ** 2))
    return -(C / (delta ** 2)) * diff


def update_constructive(f_i, s_i_proj, T_neighbors, epsilon, delta,
                        lambda_W, lambda_C, eta, norm_boost):
    """Constructive strategy: Want gradient + norm boost.

    Maximize recognition signal magnitude, additionally boosting ||f_i||
    to produce impressive (high-magnitude) forms.
    """
    grad_W = want_gradient(f_i, T_neighbors, epsilon)
    grad_C = concealment_gradient(f_i, s_i_proj, delta)

    # Full gradient: lambda_W * grad_W - lambda_C * grad_C
    grad = lambda_W * grad_W - lambda_C * grad_C
    f_new = f_i + eta * grad

    # Norm boost: scale up slightly
    norm = np.linalg.norm(f_new)
    if norm > 0:
        f_new *= (1.0 + norm_boost)

    return f_new


def update_disclosure(f_i, s_i_proj, T_neighbors, epsilon, delta,
                      lambda_W, lambda_C, eta, disclosure_pull):
    """Disclosure strategy: Want gradient + pull toward s_i.

    Minimize ||f_i - s_i|| while maintaining some legibility.
    """
    grad_W = want_gradient(f_i, T_neighbors, epsilon)
    grad_C = concealment_gradient(f_i, s_i_proj, delta)

    grad = lambda_W * grad_W - lambda_C * grad_C
    f_new = f_i + eta * grad

    # Pull toward s_i_proj (the best we can do in V_B)
    f_new += disclosure_pull * (s_i_proj - f_new)

    return f_new


def update_evasive(f_i, s_i_proj, T_neighbors, epsilon, delta,
                   lambda_W, lambda_C, eta, evasive_residual):
    """Evasive strategy: negative Want gradient (minimize legibility).

    Gradient descent on sigma with small residual Want to prevent collapse.
    """
    grad_W = want_gradient(f_i, T_neighbors, epsilon)
    grad_C = concealment_gradient(f_i, s_i_proj, delta)

    # Negative Want (minimize recognition) + small residual
    grad = -lambda_W * grad_W + evasive_residual * grad_W - lambda_C * grad_C
    f_new = f_i + eta * grad

    return f_new


def update_collective(f_i, s_i_proj, T_neighbors, epsilon, delta,
                      lambda_W, lambda_C, eta, collective_pull, centroid):
    """Collective strategy: pull toward cluster centroid.

    f_i(t+1) = f_i(t) + collective_pull * (mu_C(t) - f_i(t))
    Plus a small Want gradient component.
    """
    if centroid is None:
        # No cluster assigned yet; fall back to Want gradient
        return update_constructive(f_i, s_i_proj, T_neighbors, epsilon, delta,
                                   lambda_W, lambda_C, eta, 0.0)

    grad_W = want_gradient(f_i, T_neighbors, epsilon)

    # Small Want gradient + strong pull toward centroid
    f_new = f_i + eta * 0.3 * grad_W
    f_new += collective_pull * (centroid - f_new)

    return f_new


def apply_update(strategy, f_i, s_i_proj, T_neighbors, cfg, centroid=None):
    """Dispatch to the appropriate update rule based on strategy type."""
    if strategy == "constructive":
        return update_constructive(
            f_i, s_i_proj, T_neighbors, cfg.epsilon, cfg.delta,
            cfg.lambda_W, cfg.lambda_C, cfg.eta, cfg.constructive_norm_boost)
    elif strategy == "disclosure":
        return update_disclosure(
            f_i, s_i_proj, T_neighbors, cfg.epsilon, cfg.delta,
            cfg.lambda_W, cfg.lambda_C, cfg.eta, cfg.disclosure_pull)
    elif strategy == "evasive":
        return update_evasive(
            f_i, s_i_proj, T_neighbors, cfg.epsilon, cfg.delta,
            cfg.lambda_W, cfg.lambda_C, cfg.eta, cfg.evasive_residual)
    elif strategy == "collective":
        return update_collective(
            f_i, s_i_proj, T_neighbors, cfg.epsilon, cfg.delta,
            cfg.lambda_W, cfg.lambda_C, cfg.eta, cfg.collective_pull, centroid)
    else:
        raise ValueError(f"Unknown strategy: {strategy}")
