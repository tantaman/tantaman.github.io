"""CLI entry point for the Social Theorem simulation."""

import argparse
import os
import sys
import numpy as np

from .config import SimConfig
from .engine import Simulation
from .analysis import (
    measure_drift, measure_field_formation, measure_power_law,
    measure_inverse_law, measure_self_acceleration,
    measure_discharge_targeting, measure_strategy_collisions,
    measure_satisfaction_ratio,
)
from .viz import plot_dashboard


def print_theorem_results(sim):
    """Print theorem verification results."""
    history = sim.history

    print("\n" + "=" * 60)
    print("THEOREM VERIFICATION RESULTS")
    print("=" * 60)

    # FS1: Recognition received < demanded
    mean_ratio, _ = measure_satisfaction_ratio(
        history, sim.forms, sim.s_proj, sim.r_norms,
        sim.T_matrices, sim.graph, sim.cfg.epsilon)
    print(f"\nFS1 (Competition): mean satisfaction ratio = {mean_ratio:.4f}")
    print(f"  Prediction: < 1.0 for N >= 2")
    print(f"  {'PASS' if mean_ratio < 1.0 else 'FAIL'}: ratio {'<' if mean_ratio < 1.0 else '>='} 1.0")

    # FS5: Clusters form
    times, n_clusters, _ = measure_field_formation(history)
    if len(times) > 0:
        final_clusters = n_clusters[-1]
        print(f"\nFS5 (Field Formation): {final_clusters} clusters at final timestep")
        print(f"  Prediction: clusters > 1 from random init")
        print(f"  {'PASS' if final_clusters > 1 else 'FAIL'}")

    # FS5g: Self-acceleration
    r2, slope, _, _ = measure_self_acceleration(history)
    if r2 is not None:
        print(f"\nFS5g (Self-Acceleration): R² = {r2:.4f}, slope = {slope:.4f}")
        print(f"  Prediction: dM/dt ∝ M(t), expect positive R²")
        print(f"  {'PASS' if r2 > 0.05 and slope > 0 else 'WEAK' if r2 > 0 else 'FAIL'}")

    # FS5h: Inverse law
    r, p, sizes, drifts = measure_inverse_law(history, sim.s_proj, sim.forms)
    if r is not None:
        print(f"\nFS5h (Inverse Law): Spearman ρ = {r:.4f}, p = {p:.4f}")
        print(f"  Prediction: positive correlation (larger fields → more drift)")
        print(f"  {'PASS' if r > 0 and p < 0.05 else 'WEAK' if r > 0 else 'FAIL'}")

    # FS5i: Power law
    alpha, ks_stat, ks_p, pl_sizes = measure_power_law(history)
    if alpha is not None:
        print(f"\nFS5i (Power Law): α = {alpha:.4f}, KS stat = {ks_stat:.4f}, KS p = {ks_p:.3f}")
        print(f"  Prediction: P(M) ~ M^{{-α}}, α > 1")
        print(f"  {'PASS' if alpha > 1 and ks_p > 0.05 else 'WEAK' if alpha > 1 else 'FAIL'}")

    # FS3a: Discharge targeting
    ratio, chance, n_events = measure_discharge_targeting(history, sim.graph)
    if ratio is not None:
        print(f"\nFS3a (Discharge Targeting): {ratio:.4f} vs chance {chance:.4f} ({n_events} events)")
        print(f"  Prediction: proportion >> 1/degree")
        print(f"  {'PASS' if ratio > chance * 1.5 else 'WEAK' if ratio > chance else 'FAIL'}")

    # FS4: Strategy collisions
    collision_matrix, strategy_names = measure_strategy_collisions(
        history, sim.strategies, sim.graph)
    print(f"\nFS4 (Strategy Collisions): discharge rate matrix")
    print(f"  {'':>12s}", end="")
    for s in strategy_names:
        print(f"  {s[:6]:>6s}", end="")
    print()
    for i, s in enumerate(strategy_names):
        print(f"  {s[:12]:>12s}", end="")
        for j in range(4):
            print(f"  {collision_matrix[i, j]:6.3f}", end="")
        print()
    has_structure = np.std(collision_matrix) > 0.001
    print(f"  Prediction: off-diagonal structure (std = {np.std(collision_matrix):.4f})")
    print(f"  {'PASS' if has_structure else 'FAIL'}")

    print("\n" + "=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description='Social Theorem Simulation')
    parser.add_argument('--N', type=int, default=None,
                        help='Number of subjects')
    parser.add_argument('--T', type=int, default=None,
                        help='Number of timesteps')
    parser.add_argument('--n', type=int, default=None,
                        help='Dimension of grammatical subspace')
    parser.add_argument('--seed', type=int, default=None,
                        help='Random seed')
    parser.add_argument('--epsilon', type=float, default=None,
                        help='Recognition sensitivity')
    parser.add_argument('--eta', type=float, default=None,
                        help='Learning rate')
    parser.add_argument('--output', type=str, default=None,
                        help='Output directory for plots')
    parser.add_argument('--no-plot', action='store_true',
                        help='Skip plotting')
    parser.add_argument('--smoke', action='store_true',
                        help='Quick smoke test (N=50, T=100)')
    parser.add_argument('--quiet', action='store_true',
                        help='Suppress progress output')

    args = parser.parse_args()

    cfg = SimConfig()

    if args.smoke:
        cfg.N = 50
        cfg.T_steps = 100
        cfg.snapshot_interval = 5
        cfg.cluster_interval = 10
        cfg.rewire_interval = 25

    # Override from CLI args
    if args.N is not None:
        cfg.N = args.N
    if args.T is not None:
        cfg.T_steps = args.T
    if args.n is not None:
        cfg.n = args.n
    if args.seed is not None:
        cfg.seed = args.seed
    if args.epsilon is not None:
        cfg.epsilon = args.epsilon
    if args.eta is not None:
        cfg.eta = args.eta

    print(f"Running simulation: N={cfg.N}, n={cfg.n}, T={cfg.T_steps}, "
          f"seed={cfg.seed}")

    sim = Simulation(cfg)
    sim.run(verbose=not args.quiet)

    print_theorem_results(sim)

    if not args.no_plot:
        output_path = None
        if args.output:
            os.makedirs(args.output, exist_ok=True)
            output_path = os.path.join(args.output, 'dashboard.png')
        plot_dashboard(sim, output_path=output_path)


if __name__ == '__main__':
    main()
