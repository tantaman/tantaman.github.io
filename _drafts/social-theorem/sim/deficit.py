"""3-channel deficit computation and discharge logic."""

import numpy as np
from core import recognition_signal


def compute_deficit(f_i, s_i_ambient, V_B, T_neighbors, config):
    """Compute 3-channel deficit for subject i.

    f_i: (n,) form in grammar coordinates
    s_i_ambient: (D,) true-self vector in ambient space
    V_B: (D, n) grammar basis
    T_neighbors: list of (n, n) distortion operators of neighbors

    Returns: (total_deficit, ch1, ch2, ch3)
    """
    # Channel 1: lossiness — ||s_i - f_i(t)|| where f_i is lifted to ambient
    f_ambient = V_B @ f_i
    ch1 = np.linalg.norm(s_i_ambient - f_ambient)

    # Channel 2: distortion — mean ||T_j(f_i) - f_i|| over neighbors
    if len(T_neighbors) > 0:
        ch2 = 0.0
        for T_j in T_neighbors:
            diff = T_j @ f_i - f_i
            ch2 += np.linalg.norm(diff)
        ch2 /= len(T_neighbors)
    else:
        ch2 = 0.0

    # Channel 3: exposure cost — exp(-||f_i - s_i_proj||^2 / (2 kappa^2))
    s_i_proj = V_B.T @ s_i_ambient
    diff_fs = f_i - s_i_proj
    ch3 = np.exp(-np.dot(diff_fs, diff_fs) / (2.0 * config.kappa ** 2))

    total = config.lambda_1 * ch1 + config.lambda_2 * ch2 + config.lambda_3 * ch3
    return total, ch1, ch2, ch3


def compute_per_neighbor_contribution(f_i, f_j, T_i, omega_ji, prior_i_j, config):
    """Compute per-neighbor deficit contribution delta_i^(j).

    delta_i^(j) = omega(j,i) * ||T_i(f_j) - f_j|| + Cost(j,i,t)

    f_i, f_j: (n,) forms in grammar coords
    T_i: (n, n) distortion operator of subject i
    omega_ji: attention weight j gives to i
    prior_i_j: (n,) prior form of j as held by i (or None)
    """
    distortion = np.linalg.norm(T_i @ f_j - f_j)
    contribution = omega_ji * distortion

    # Displacement cost
    if prior_i_j is not None:
        cost = np.linalg.norm(T_i @ f_j - prior_i_j)
        contribution += cost

    return contribution


def process_discharges(deficits, forms, T_operators, adj, omega, priors, config):
    """Process discharge events for all subjects.

    When deficit_i > theta_discharge, target j* = argmax delta_i^(j),
    reduce omega(j*, i).

    Returns:
        discharge_events: list of (subject_i, target_j, deficit_value)
        omega: updated attention weights
    """
    N = len(deficits)
    discharge_events = []

    for i in range(N):
        if deficits[i] < config.theta_discharge:
            continue

        neighbors = np.where(adj[i])[0]
        if len(neighbors) == 0:
            continue

        # Find highest-contribution neighbor
        contributions = []
        for j in neighbors:
            prior_i_j = priors[i].get(j) if priors is not None else None
            delta = compute_per_neighbor_contribution(
                forms[i], forms[j], T_operators[i], omega[j, i],
                prior_i_j, config
            )
            contributions.append(delta)

        j_star_idx = np.argmax(contributions)
        j_star = neighbors[j_star_idx]

        # Reduce attention to discharge target
        reduction = 0.1 * omega[j_star, i]
        omega[j_star, i] = max(0.0, omega[j_star, i] - reduction)

        # Redistribute reduced weight to other neighbors
        other_neighbors = [j for j in neighbors if j != j_star]
        if other_neighbors:
            bonus = reduction / len(other_neighbors)
            for j in other_neighbors:
                omega[j, i] += bonus

        discharge_events.append((i, j_star, deficits[i]))

    return discharge_events, omega
