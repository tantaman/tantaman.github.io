"""Plotting for simulation results."""

import numpy as np
import matplotlib.pyplot as plt
import os

OUTPUT_DIR = "plots"


def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def plot_field_sizes(result, filename="field_sizes.png"):
    """Time series of field sizes."""
    ensure_output_dir()
    fig, ax = plt.subplots(figsize=(10, 6))

    if "boom_bust" in result.get("name", ""):
        ax.plot(result["times"], result["total_field_sizes"], label="Total field size")
        ax.set_ylabel("Total field size")
    elif "field_formation" in result.get("name", ""):
        ax.plot(result["times"], result["distances_over_time"],
                label="Mean dist to Fix(T)")
        ax.set_ylabel("Mean distance to Fix(T)")
    else:
        return

    ax.set_xlabel("Time step")
    ax.set_title("Field Dynamics")
    ax.legend()
    ax.grid(True, alpha=0.3)
    fig.savefig(os.path.join(OUTPUT_DIR, filename), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved {filename}")


def plot_deficit_channels(snapshots, filename="deficit_channels.png"):
    """Time series of deficit channels."""
    ensure_output_dir()
    fig, axes = plt.subplots(3, 1, figsize=(10, 10), sharex=True)

    times = [s.t for s in snapshots]
    ch1 = [np.mean(s.deficit_channels[:, 0]) for s in snapshots]
    ch2 = [np.mean(s.deficit_channels[:, 1]) for s in snapshots]
    ch3 = [np.mean(s.deficit_channels[:, 2]) for s in snapshots]

    axes[0].plot(times, ch1, color="tab:blue")
    axes[0].set_ylabel("Ch1: Lossiness")
    axes[0].set_title("Deficit Channels Over Time")
    axes[0].grid(True, alpha=0.3)

    axes[1].plot(times, ch2, color="tab:orange")
    axes[1].set_ylabel("Ch2: Distortion")
    axes[1].grid(True, alpha=0.3)

    axes[2].plot(times, ch3, color="tab:green")
    axes[2].set_ylabel("Ch3: Exposure")
    axes[2].set_xlabel("Time step")
    axes[2].grid(True, alpha=0.3)

    fig.savefig(os.path.join(OUTPUT_DIR, filename), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved {filename}")


def plot_power_law(result, filename="power_law.png"):
    """Log-log field-size histogram for power law check."""
    ensure_output_dir()
    results = result.get("results", [])
    if not results:
        return

    fig, ax = plt.subplots(figsize=(8, 6))
    for r in results:
        if r.get("log_sizes") is not None:
            label = f"δ/α_g={r['ratio']:.1f} (α_pred={r['predicted_alpha']:.2f}, α_meas={r['measured_alpha']:.2f})"
            ax.scatter(r["log_sizes"], r["log_counts"], label=label, alpha=0.7)
            # Fit line
            coeffs = np.polyfit(r["log_sizes"], r["log_counts"], 1)
            x_fit = np.linspace(min(r["log_sizes"]), max(r["log_sizes"]), 50)
            ax.plot(x_fit, np.polyval(coeffs, x_fit), "--", alpha=0.5)

    ax.set_xlabel("log(field size)")
    ax.set_ylabel("log(count)")
    ax.set_title("Power-Law Field Size Distribution")
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3)
    fig.savefig(os.path.join(OUTPUT_DIR, filename), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved {filename}")


def plot_inverse_law(result, filename="inverse_law.png"):
    """Scatter: mean deficit vs field size."""
    ensure_output_dir()
    fig, ax = plt.subplots(figsize=(8, 6))

    sizes = result.get("field_sizes", [])
    deficits = result.get("mean_deficits", [])

    if sizes and deficits:
        ax.scatter(sizes, deficits, s=60, alpha=0.7)
        ax.set_xlabel("Field size")
        ax.set_ylabel("Mean recognition deficit")
        ax.set_title(f"Inverse Law (correlation={result.get('correlation', 0):.3f})")
        ax.grid(True, alpha=0.3)

    fig.savefig(os.path.join(OUTPUT_DIR, filename), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved {filename}")


def plot_boom_bust(result, filename="boom_bust.png"):
    """Triple time series: field size, deficit, discharge rate."""
    ensure_output_dir()
    fig, axes = plt.subplots(3, 1, figsize=(12, 10), sharex=True)

    times = result["times"]

    axes[0].plot(times, result["total_field_sizes"], color="tab:blue")
    axes[0].set_ylabel("Total field size")
    axes[0].set_title("Boom-Bust Dynamics")
    axes[0].grid(True, alpha=0.3)

    axes[1].plot(times, result["mean_deficits"], color="tab:red")
    axes[1].set_ylabel("Mean deficit")
    axes[1].grid(True, alpha=0.3)

    axes[2].plot(times, result["discharge_rates"], color="tab:purple", alpha=0.7)
    axes[2].set_ylabel("Discharge rate")
    axes[2].set_xlabel("Time step")
    axes[2].grid(True, alpha=0.3)

    fig.savefig(os.path.join(OUTPUT_DIR, filename), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved {filename}")


def plot_collision_matrix(result, filename="collision_matrix.png"):
    """Heatmap of strategy collision H matrix."""
    ensure_output_dir()
    fig, ax = plt.subplots(figsize=(8, 7))

    H = np.array(result["H_matrix"])
    strategies = result["strategies"]

    im = ax.imshow(H, cmap="YlOrRd", aspect="auto")
    ax.set_xticks(range(len(strategies)))
    ax.set_yticks(range(len(strategies)))
    ax.set_xticklabels(strategies, rotation=45, ha="right")
    ax.set_yticklabels(strategies)
    ax.set_xlabel("Target strategy")
    ax.set_ylabel("Source strategy")
    ax.set_title("Strategy Collision Harm H(i→j)")
    plt.colorbar(im, ax=ax)

    # Annotate cells
    for i in range(len(strategies)):
        for j in range(len(strategies)):
            ax.text(j, i, f"{H[i, j]:.3f}", ha="center", va="center", fontsize=8)

    fig.savefig(os.path.join(OUTPUT_DIR, filename), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved {filename}")


def plot_trap_dynamics(result, filename="trap_dynamics.png"):
    """Trap attractor: gamma sweep showing interpolation."""
    ensure_output_dir()
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    gamma_sweep = result.get("gamma_sweep", [])
    if not gamma_sweep:
        plt.close(fig)
        return

    gammas = [r["gamma"] for r in gamma_sweep]
    prior_dists = [r["mean_dist_from_prior"] for r in gamma_sweep]
    fix_dists = [r["mean_dist_from_fix"] for r in gamma_sweep]

    axes[0].plot(gammas, prior_dists, "o-", label="Dist from prior")
    axes[0].set_xlabel("γ (prior rigidity)")
    axes[0].set_ylabel("Distance")
    axes[0].set_title("Trap Attractor vs Prior")
    axes[0].set_xscale("log")
    axes[0].grid(True, alpha=0.3)
    axes[0].legend()

    axes[1].plot(gammas, fix_dists, "s-", color="tab:orange", label="Dist from Fix(T)")
    axes[1].set_xlabel("γ (prior rigidity)")
    axes[1].set_ylabel("Distance")
    axes[1].set_title("Trap Attractor vs Fix(T)")
    axes[1].set_xscale("log")
    axes[1].grid(True, alpha=0.3)
    axes[1].legend()

    fig.savefig(os.path.join(OUTPUT_DIR, filename), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved {filename}")


def plot_rebellion_threshold(result, filename="rebellion_threshold.png"):
    """Rebellion: predicted Delta_min vs gamma."""
    ensure_output_dir()
    fig, ax = plt.subplots(figsize=(8, 6))

    results = result.get("results", [])
    if not results:
        plt.close(fig)
        return

    gammas = [r["gamma"] for r in results]
    deltas = [r["mean_predicted_delta_min"] for r in results]

    ax.plot(gammas, deltas, "o-", markersize=8)
    ax.set_xlabel("γ (prior rigidity)")
    ax.set_ylabel("Predicted Δ_min")
    ax.set_title("Rebellion Discontinuity Threshold")
    ax.grid(True, alpha=0.3)

    fig.savefig(os.path.join(OUTPUT_DIR, filename), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved {filename}")


def plot_irreducibility(result, filename="irreducibility.png"):
    """Bar chart of min margins by strategy."""
    ensure_output_dir()
    fig, ax = plt.subplots(figsize=(8, 5))

    strategies = list(result["per_strategy"].keys())
    margins = [result["per_strategy"][s]["min_margin"] for s in strategies]

    colors = ["tab:green" if result["per_strategy"][s]["pass"] else "tab:red"
              for s in strategies]
    ax.bar(strategies, margins, color=colors, alpha=0.8)
    ax.axhline(y=0, color="black", linestyle="--", linewidth=0.5)
    ax.set_ylabel("Min margin (||s-f|| - ||r||)")
    ax.set_title("Irreducibility Check: All Strategies")
    ax.grid(True, alpha=0.3, axis="y")

    fig.savefig(os.path.join(OUTPUT_DIR, filename), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved {filename}")
