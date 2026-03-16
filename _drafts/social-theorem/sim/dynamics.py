"""Update rules: 4 strategies + meta-aware disclosure."""

import numpy as np
from core import recognition_signal


def want_gradient(f_i, T_neighbors, epsilon):
    """Compute Want gradient: nabla_f W_i.

    f_i: (n,) current form in grammar coords
    T_neighbors: list of (n, n) distortion operators of neighbors
    epsilon: signal sensitivity

    Returns gradient (n,) pointing toward higher recognition signal.
    """
    grad = np.zeros_like(f_i)
    n_neighbors = len(T_neighbors)
    if n_neighbors == 0:
        return grad

    for T_j in T_neighbors:
        sigma = recognition_signal(f_i, T_j, epsilon)
        diff = T_j @ f_i - f_i
        # grad_f sigma = (-1/eps^2) * sigma * (T_j - I)^T @ (T_j f - f)
        TmI = T_j - np.eye(len(f_i))
        grad += sigma * (TmI.T @ diff)

    grad *= -1.0 / (n_neighbors * epsilon ** 2)
    return grad


def concealment_gradient(f_i, s_i_proj, delta_concealment):
    """Compute concealment gradient: pushes f away from s_i_proj.

    C_i(f) = exp(-||f - s_i_proj||^2 / (2 delta^2))
    grad_f C_i = (-1/delta^2) * C_i * (f - s_i_proj)

    We return the gradient of C_i (which points away from s_i_proj when
    the objective subtracts C_i).
    """
    diff = f_i - s_i_proj
    dist_sq = np.dot(diff, diff)
    C_i = np.exp(-dist_sq / (2.0 * delta_concealment ** 2))
    grad = (-1.0 / delta_concealment ** 2) * C_i * diff
    return grad


def update_constructive(f_i, s_i_proj, T_neighbors, config):
    """Constructive strategy: full gradient + norm bonus.

    L = lambda_W * W - lambda_C * C + bonus for ||f||
    """
    grad_W = want_gradient(f_i, T_neighbors, config.epsilon)
    grad_C = concealment_gradient(f_i, s_i_proj, config.delta_concealment)

    # Full gradient: lambda_W * grad_W - lambda_C * grad_C
    # (minus on C because objective is lambda_W * W - lambda_C * C)
    grad = config.lambda_W * grad_W - config.lambda_C * grad_C

    # Norm bonus: gradient of ||f|| = f / ||f||
    f_norm = np.linalg.norm(f_i)
    if f_norm > 1e-10:
        grad += f_i / f_norm

    f_new = f_i + config.eta * grad
    return f_new


def update_disclosure(f_i, s_i_proj, config):
    """Disclosure strategy: f -> f - eta * (f - F_B(s_i)).

    Converges to projection of true self onto grammar subspace.
    """
    f_new = f_i - config.eta * (f_i - s_i_proj)
    return f_new


def update_evasive(f_i, s_i_proj, T_neighbors, config):
    """Evasive strategy: gradient descent on sigma (minimize legibility)
    with secondary want term preventing complete withdrawal.
    """
    grad_W = want_gradient(f_i, T_neighbors, config.epsilon)

    # Evasive: descend on sigma (negate want gradient), but add weak pull back
    grad = -0.5 * grad_W + 0.2 * want_gradient(f_i, T_neighbors, config.epsilon)

    # Actually: descent on sigma = -grad_W, plus secondary want = 0.3 * grad_W
    grad = -config.lambda_W * grad_W + 0.3 * config.lambda_W * grad_W
    # Net: -0.7 * lambda_W * grad_W
    # Plus concealment
    grad_C = concealment_gradient(f_i, s_i_proj, config.delta_concealment)
    grad -= config.lambda_C * grad_C

    f_new = f_i + config.eta * grad
    return f_new


def update_collective(f_i, cluster_centroid, config):
    """Collective strategy: pull toward cluster centroid.

    f -> f + eta * (mu_cluster - f)
    """
    f_new = f_i + config.eta * (cluster_centroid - f_i)
    return f_new


def update_want(f_i, s_i_proj, T_neighbors, config):
    """Base want gradient update (the default strategy).

    L = lambda_W * W - lambda_C * C
    """
    grad_W = want_gradient(f_i, T_neighbors, config.epsilon)
    grad_C = concealment_gradient(f_i, s_i_proj, config.delta_concealment)
    grad = config.lambda_W * grad_W - config.lambda_C * grad_C
    f_new = f_i + config.eta * grad
    return f_new


def update_meta_disclosure(f_i, s_i_proj, eta_prime):
    """Meta-aware disclosure: f -> f - 2*eta'*(f - F_B(s_i)).

    Converges geometrically to F_B(s_i) at rate (1 - 2*eta').
    """
    f_new = f_i - 2.0 * eta_prime * (f_i - s_i_proj)
    return f_new
