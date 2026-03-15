"""Matplotlib plotting: dashboard and individual plots."""

import numpy as np
import matplotlib.pyplot as plt
from sklearn.decomposition import PCA

from .analysis import (
    measure_drift, measure_field_formation, measure_power_law,
    measure_inverse_law, measure_self_acceleration,
)


def plot_drift_timeseries(history, ax=None):
    """Plot mean ||s_i - f_i|| over time."""
    times, means = measure_drift(history)
    if ax is None:
        fig, ax = plt.subplots()
    ax.plot(times, means, 'b-', linewidth=0.8)
    ax.set_xlabel('Timestep')
    ax.set_ylabel('Mean drift ||s - f||')
    ax.set_title('Drift from True Self')
    return ax


def plot_pca_forms(history, proto_assignments=None, t_index=-1, ax=None):
    """PCA projection of form vectors at a given snapshot."""
    if not history.form_snapshots:
        return None
    t, forms = history.form_snapshots[t_index]

    pca = PCA(n_components=2)
    projected = pca.fit_transform(forms)

    if ax is None:
        fig, ax = plt.subplots()

    if proto_assignments is not None:
        scatter = ax.scatter(projected[:, 0], projected[:, 1],
                             c=proto_assignments, cmap='tab10',
                             s=8, alpha=0.6)
    else:
        ax.scatter(projected[:, 0], projected[:, 1], s=8, alpha=0.6)

    ax.set_xlabel('PC1')
    ax.set_ylabel('PC2')
    ax.set_title(f'Forms (PCA) at t={t}')
    return ax


def plot_power_law(history, ax=None):
    """Log-log plot of cluster size distribution."""
    alpha, ks_stat, ks_p, sizes = measure_power_law(history)

    if len(sizes) < 3:
        return None

    if ax is None:
        fig, ax = plt.subplots()

    # Rank-size plot
    sorted_sizes = np.sort(sizes)[::-1]
    ranks = np.arange(1, len(sorted_sizes) + 1)

    ax.loglog(ranks, sorted_sizes, 'ko', markersize=5)

    # Fit line
    if alpha is not None:
        fit_y = sorted_sizes[0] * (ranks / ranks[0]) ** (-1.0 / (alpha - 1))
        ax.loglog(ranks, fit_y, 'r--', linewidth=1,
                  label=f'α={alpha:.2f}, KS p={ks_p:.3f}')
        ax.legend(fontsize=8)

    ax.set_xlabel('Rank')
    ax.set_ylabel('Cluster size')
    ax.set_title('Power Law (FS5i)')
    return ax


def plot_inverse_law(history, s_proj=None, forms=None, ax=None):
    """Scatter: cluster size vs mean drift."""
    r, p, sizes, drifts = measure_inverse_law(history, s_proj, forms)

    if len(sizes) < 3:
        return None

    if ax is None:
        fig, ax = plt.subplots()

    ax.scatter(sizes, drifts, c='steelblue', s=30, alpha=0.7)

    if r is not None:
        ax.set_title(f'Inverse Law (FS5h): ρ={r:.3f}, p={p:.4f}')
    else:
        ax.set_title('Inverse Law (FS5h)')

    ax.set_xlabel('Cluster size')
    ax.set_ylabel('Mean drift ||s - f||')
    return ax


def plot_self_acceleration(history, ax=None):
    """Scatter: dM/dt vs M(t) for largest cluster."""
    r2, slope, sizes_t, growth = measure_self_acceleration(history)

    if len(sizes_t) < 5:
        return None

    if ax is None:
        fig, ax = plt.subplots()

    x = sizes_t[:-1]
    y = growth
    mask = x > 0
    ax.scatter(x[mask], y[mask], c='coral', s=15, alpha=0.5)

    if r2 is not None:
        ax.set_title(f'Self-Acceleration (FS5g): R²={r2:.3f}')
    else:
        ax.set_title('Self-Acceleration (FS5g)')

    ax.set_xlabel('Cluster size M(t)')
    ax.set_ylabel('Growth rate ΔM')
    return ax


def plot_discharge_heatmap(collision_matrix, strategy_names, ax=None):
    """Heatmap of discharge rates by strategy pair."""
    if ax is None:
        fig, ax = plt.subplots()

    im = ax.imshow(collision_matrix, cmap='YlOrRd', aspect='auto')
    ax.set_xticks(range(4))
    ax.set_xticklabels([s[:4] for s in strategy_names], fontsize=8)
    ax.set_yticks(range(4))
    ax.set_yticklabels([s[:4] for s in strategy_names], fontsize=8)
    ax.set_xlabel('Target strategy')
    ax.set_ylabel('Subject strategy')
    ax.set_title('Strategy Collision (FS4)')
    plt.colorbar(im, ax=ax, shrink=0.8)
    return ax


def plot_deficit_channels(history, ax=None):
    """Plot mean deficit channels over time."""
    if not history.channel_series:
        return None

    times = [t for t, _, _, _ in history.channel_series]
    ch1 = [c1 for _, c1, _, _ in history.channel_series]
    ch2 = [c2 for _, _, c2, _ in history.channel_series]
    ch3 = [c3 for _, _, _, c3 in history.channel_series]

    if ax is None:
        fig, ax = plt.subplots()

    ax.plot(times, ch1, label='Lossiness', linewidth=0.8)
    ax.plot(times, ch2, label='Distortion', linewidth=0.8)
    ax.plot(times, ch3, label='Concealment', linewidth=0.8)
    ax.legend(fontsize=8)
    ax.set_xlabel('Timestep')
    ax.set_ylabel('Mean channel value')
    ax.set_title('Deficit Channels')
    return ax


def plot_cluster_evolution(history, ax=None):
    """Plot number of clusters over time."""
    times, n_clusters, _ = measure_field_formation(history)
    if len(times) == 0:
        return None

    if ax is None:
        fig, ax = plt.subplots()

    ax.plot(times, n_clusters, 'g-', linewidth=0.8)
    ax.set_xlabel('Timestep')
    ax.set_ylabel('Number of clusters')
    ax.set_title('Field Formation (FS5)')
    return ax


def plot_dashboard(sim, output_path=None):
    """Combined 3x3 dashboard figure."""
    from .analysis import measure_strategy_collisions

    history = sim.history
    fig, axes = plt.subplots(3, 3, figsize=(16, 14))
    fig.suptitle('Social Theorem Simulation Dashboard', fontsize=14)

    # Row 1
    plot_drift_timeseries(history, ax=axes[0, 0])
    plot_pca_forms(history, sim.proto_assignments, t_index=0, ax=axes[0, 1])
    axes[0, 1].set_title(f'Forms (PCA) t=0')
    plot_pca_forms(history, sim.proto_assignments, t_index=-1, ax=axes[0, 2])

    # Row 2
    plot_cluster_evolution(history, ax=axes[1, 0])
    plot_power_law(history, ax=axes[1, 1])
    plot_inverse_law(history, sim.s_proj, sim.forms, ax=axes[1, 2])

    # Row 3
    plot_self_acceleration(history, ax=axes[1 + 1, 0])
    collision_matrix, strategy_names = measure_strategy_collisions(
        history, sim.strategies, sim.graph)
    plot_discharge_heatmap(collision_matrix, strategy_names, ax=axes[2, 1])
    plot_deficit_channels(history, ax=axes[2, 2])

    plt.tight_layout()

    if output_path:
        fig.savefig(output_path, dpi=150, bbox_inches='tight')
        print(f"Dashboard saved to {output_path}")
    else:
        plt.show()

    return fig
