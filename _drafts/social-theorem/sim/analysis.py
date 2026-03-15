"""Theorem-verification measurements."""

import numpy as np
from scipy import stats
from scipy.optimize import minimize_scalar


def measure_drift(history):
    """Mean ||s_i - f_i|| over time.

    Returns:
        times: array of timesteps
        mean_drifts: array of mean drifts at each timestep
    """
    times = np.array([t for t, _, _ in history.drift_series])
    means = np.array([m for _, m, _ in history.drift_series])
    return times, means


def measure_field_formation(history):
    """Cluster count and sizes over time.

    Returns:
        times, n_clusters, all_sizes
    """
    if not history.cluster_series:
        return np.array([]), np.array([]), []

    times = np.array([t for t, _, _, _ in history.cluster_series])
    n_clusters = np.array([nc for _, _, nc, _ in history.cluster_series])
    all_sizes = [sizes for _, _, _, sizes in history.cluster_series]
    return times, n_clusters, all_sizes


def measure_power_law(history, min_cluster_size=3):
    """MLE fit of power law exponent alpha to final cluster size distribution.

    FS5i: P(M) ~ M^{-alpha}

    Returns:
        alpha: MLE estimate of power law exponent
        ks_stat: KS test statistic against fitted power law
        ks_p: KS test p-value
        sizes: the cluster sizes used
    """
    if not history.cluster_series:
        return None, None, None, []

    # Use final timestep's cluster sizes
    _, _, _, sizes = history.cluster_series[-1]
    sizes = np.array([s for s in sizes if s >= min_cluster_size])

    if len(sizes) < 3:
        return None, None, None, sizes

    # MLE for discrete power law: alpha = 1 + n / sum(ln(x_i / x_min))
    x_min = sizes.min()
    n = len(sizes)
    alpha = 1.0 + n / np.sum(np.log(sizes / (x_min - 0.5)))

    # KS test against Zipf distribution
    # Generate expected CDF
    def power_law_cdf(x, alpha, x_min):
        return 1 - (x / x_min) ** (1 - alpha)

    # Simple KS statistic
    sorted_sizes = np.sort(sizes)
    empirical_cdf = np.arange(1, n + 1) / n
    theoretical_cdf = power_law_cdf(sorted_sizes, alpha, x_min)
    ks_stat = np.max(np.abs(empirical_cdf - theoretical_cdf))

    # Approximate p-value via bootstrap
    n_bootstrap = 1000
    ks_samples = []
    rng = np.random.default_rng(42)
    for _ in range(n_bootstrap):
        # Generate power-law samples
        u = rng.random(n)
        synth = x_min * (1 - u) ** (1 / (1 - alpha))
        synth_sorted = np.sort(synth)
        synth_cdf = np.arange(1, n + 1) / n
        synth_theo = power_law_cdf(synth_sorted, alpha, x_min)
        ks_samples.append(np.max(np.abs(synth_cdf - synth_theo)))

    ks_p = np.mean(np.array(ks_samples) >= ks_stat)

    return alpha, ks_stat, ks_p, sizes


def measure_inverse_law(history, s_proj=None, forms=None):
    """FS5h: Larger fields -> more drift from s_i.

    Measures Spearman correlation between cluster size and mean drift
    for subjects in each cluster. Uses within-V_B drift (||s_proj - f||)
    when forms and s_proj are provided, otherwise uses total drift.

    Returns:
        spearman_r: Spearman correlation coefficient
        p_value: p-value of the correlation
        cluster_sizes: array of cluster sizes
        cluster_drifts: array of mean drifts per cluster
    """
    if not history.cluster_series or not history.drift_series:
        return None, None, [], []

    # Use final timestep
    _, labels, _, _ = history.cluster_series[-1]

    unique_labels = set(labels)
    unique_labels.discard(-1)

    if len(unique_labels) < 3:
        return None, None, [], []

    cluster_sizes = []
    cluster_drifts = []

    for label in sorted(unique_labels):
        mask = labels == label
        size = np.sum(mask)

        if s_proj is not None and forms is not None:
            # V_B drift only: how far form has moved from s_i projection
            vb_drift = np.mean(np.linalg.norm(
                s_proj[mask] - forms[mask], axis=1))
            cluster_drifts.append(vb_drift)
        else:
            _, _, per_subject_drift = history.drift_series[-1]
            mean_drift = np.mean(per_subject_drift[mask])
            cluster_drifts.append(mean_drift)

        cluster_sizes.append(size)

    cluster_sizes = np.array(cluster_sizes)
    cluster_drifts = np.array(cluster_drifts)

    r, p = stats.spearmanr(cluster_sizes, cluster_drifts)
    return r, p, cluster_sizes, cluster_drifts


def measure_self_acceleration(history):
    """FS5g: dM/dt proportional to M(t).

    Measures linear regression R^2 of growth rate vs size.
    Tracks total clustered subjects (total M across all fields),
    which is more stable than tracking a single cluster.

    Returns:
        r_squared: R^2 of linear fit
        slope: slope of dM/dt vs M relationship
        sizes_t: total clustered subjects over time
        growth_rates: dM/dt values
    """
    if len(history.cluster_series) < 5:
        return None, None, [], []

    # Track total subjects in any cluster over time
    sizes_t = []
    for _, labels, _, sizes in history.cluster_series:
        total_clustered = sum(sizes) if sizes else 0
        sizes_t.append(total_clustered)

    sizes_t = np.array(sizes_t, dtype=float)

    # Smooth with rolling window to reduce noise
    window = min(5, len(sizes_t) // 3)
    if window > 1:
        kernel = np.ones(window) / window
        sizes_smooth = np.convolve(sizes_t, kernel, mode='valid')
    else:
        sizes_smooth = sizes_t

    # Compute growth rates (finite differences)
    growth_rates = np.diff(sizes_smooth)
    sizes_for_growth = sizes_smooth[:-1]

    # Filter out zeros
    mask = sizes_for_growth > 0
    if mask.sum() < 3:
        return None, None, sizes_t, np.diff(sizes_t)

    x = sizes_for_growth[mask]
    y = growth_rates[mask]

    slope, intercept, r, p, se = stats.linregress(x, y)
    return r ** 2, slope, sizes_t, np.diff(sizes_t)


def measure_discharge_targeting(history, graph):
    """FS3a: Discharge targets highest-omega neighbor.

    Measures proportion of discharges directed at the neighbor with
    highest omega weight vs. expected by chance.

    Returns:
        targeting_ratio: proportion targeting highest-omega neighbor
        chance_ratio: expected proportion by chance (1/mean_degree)
        n_events: total discharge events
    """
    events = history.discharge_events
    if not events:
        return None, None, 0

    # For each discharge event, check if target was highest-omega neighbor
    targeting_hits = 0
    total = 0

    for t, subject, target in events:
        neighbors = graph.neighbors_of(subject)
        if len(neighbors) <= 1:
            continue

        omegas = np.array([graph.get_omega(n, subject) for n in neighbors])
        highest = neighbors[np.argmax(omegas)]
        if target == highest:
            targeting_hits += 1
        total += 1

    if total == 0:
        return None, None, 0

    # Mean degree for chance calculation
    degrees = np.array([len(graph.neighbors_of(i)) for i in range(graph.N)])
    mean_degree = np.mean(degrees[degrees > 0])
    chance = 1.0 / max(mean_degree, 1)

    return targeting_hits / total, chance, total


def measure_strategy_collisions(history, strategies, graph):
    """FS4: Strategy pairs have distinct harm signatures.

    Computes discharge rate matrix by strategy-pair type.

    Returns:
        collision_matrix: 4x4 matrix of discharge rates
        strategy_names: list of strategy type names
    """
    strategy_names = ["constructive", "disclosure", "evasive", "collective"]
    strat_to_idx = {s: i for i, s in enumerate(strategy_names)}

    collision_counts = np.zeros((4, 4))
    pair_counts = np.zeros((4, 4))

    # Count strategy pairs among edges
    for j in range(graph.N):
        neighbors = graph.neighbors_of(j)
        j_idx = strat_to_idx.get(strategies[j], -1)
        if j_idx == -1:
            continue
        for i in neighbors:
            i_idx = strat_to_idx.get(strategies[i], -1)
            if i_idx == -1:
                continue
            pair_counts[i_idx, j_idx] += 1

    # Count discharges by strategy pair
    for t, subject, target in history.discharge_events:
        s_idx = strat_to_idx.get(strategies[subject], -1)
        t_idx = strat_to_idx.get(strategies[target], -1)
        if s_idx != -1 and t_idx != -1:
            collision_counts[s_idx, t_idx] += 1

    # Normalize by pair counts to get rates
    collision_matrix = np.zeros((4, 4))
    mask = pair_counts > 0
    collision_matrix[mask] = collision_counts[mask] / pair_counts[mask]

    return collision_matrix, strategy_names


def measure_satisfaction_ratio(history, forms, s_proj, r_norms,
                               T_matrices, graph, epsilon):
    """FS1: Recognition received < demanded for all N >= 2.

    Computes mean satisfaction ratio across all subjects.

    Returns:
        mean_ratio: mean(sigma_received / sigma_demanded) across subjects
        ratios: per-subject ratios
    """
    from .core import recognition_signal_batch

    N = forms.shape[0]
    ratios = np.zeros(N)

    for i in range(N):
        neighbors = graph.neighbors_of(i)
        if len(neighbors) == 0:
            ratios[i] = 0.0
            continue

        # Signal received: mean sigma across neighbors
        T_neighbors = T_matrices[neighbors]
        signals = recognition_signal_batch(forms[i], T_neighbors, epsilon)
        received = np.mean(signals)

        # Signal demanded: sigma = 1 (perfect recognition)
        demanded = 1.0

        ratios[i] = received / demanded

    return np.mean(ratios), ratios
