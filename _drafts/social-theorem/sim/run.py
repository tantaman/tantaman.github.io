"""CLI entry point for the recognition dynamics simulation."""

import sys
import os
import argparse
import time
import numpy as np

# Ensure the sim directory is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import SimConfig
from engine import calibrate, run_simulation
import analysis
import viz
import experiments as exp


def run_calibrate():
    print("Running calibration...")
    config = SimConfig()
    calibrate(config)


def run_experiment(name):
    print(f"\n{'='*60}")
    print(f"  Experiment: {name}")
    print(f"{'='*60}\n")

    t0 = time.time()

    if name == "irreducibility":
        config = exp.irreducibility_config()
        result = analysis.check_irreducibility(config)
        _print_result(result)
        viz.plot_irreducibility(result)

    elif name == "signal_indistinguishability":
        result = analysis.check_signal_indistinguishability()
        _print_result(result)

    elif name == "field_formation":
        config = exp.field_formation_config()
        result = analysis.check_field_formation(config)
        _print_result(result)
        viz.plot_field_sizes(result)

    elif name == "self_acceleration":
        config = exp.self_acceleration_config()
        result = analysis.check_self_acceleration(config)
        _print_result(result)

    elif name == "inverse_law":
        config = exp.inverse_law_config()
        result = analysis.check_inverse_law(config)
        _print_result(result)
        viz.plot_inverse_law(result)

    elif name == "power_law":
        config = exp.power_law_config()
        result = analysis.check_power_law(config)
        _print_result(result)
        viz.plot_power_law(result)

    elif name == "scarcity":
        config = exp.scarcity_config()
        result = analysis.check_scarcity(config)
        _print_result(result)

    elif name == "discharge_targeting":
        result = analysis.check_discharge_targeting()
        _print_result(result)

    elif name == "strategy_collision":
        config = exp.collision_config()
        result = analysis.check_strategy_collision(config)
        _print_result(result)
        viz.plot_collision_matrix(result)

    elif name == "competing_attractors":
        config = exp.competing_attractors_config()
        result = analysis.check_competing_attractors(config)
        _print_result(result)

    elif name == "confidently_wrong":
        config = exp.confidently_wrong_config()
        result = analysis.check_confidently_wrong(config)
        _print_result(result)

    elif name == "trap_enclosure":
        config = exp.trap_enclosure_config()
        result = analysis.check_trap_enclosure(config)
        _print_result(result)
        viz.plot_trap_dynamics(result)

    elif name == "rebellion":
        config = exp.rebellion_config()
        result = analysis.check_rebellion_discontinuity(config)
        _print_result(result)
        viz.plot_rebellion_threshold(result)

    elif name == "preferential_convergence":
        config = exp.preferential_convergence_config()
        result = analysis.check_preferential_convergence(config)
        _print_result(result)

    elif name == "meta_awareness":
        config = exp.meta_awareness_config()
        result = analysis.check_meta_awareness(config)
        _print_result(result)

    elif name == "boom_bust":
        config = exp.boom_bust_config()
        result = analysis.check_boom_bust(config)
        _print_result(result)
        viz.plot_boom_bust(result)

    elif name == "topology":
        configs = exp.topology_configs()
        for topo, config in configs.items():
            print(f"\n--- Topology: {topo} ---")
            result = analysis.check_field_formation(config)
            _print_result(result)
            viz.plot_field_sizes(result, filename=f"field_formation_{topo}.png")

    elif name == "all":
        experiments = [
            "irreducibility", "signal_indistinguishability", "field_formation",
            "self_acceleration", "inverse_law", "power_law", "scarcity",
            "discharge_targeting", "strategy_collision", "competing_attractors",
            "confidently_wrong", "trap_enclosure", "rebellion",
            "preferential_convergence", "meta_awareness", "boom_bust",
        ]
        passed = 0
        failed = 0
        for exp_name in experiments:
            try:
                run_experiment(exp_name)
                passed += 1
            except Exception as e:
                print(f"  FAILED: {e}")
                failed += 1

        print(f"\n{'='*60}")
        print(f"  Summary: {passed} passed, {failed} failed out of {len(experiments)}")
        print(f"{'='*60}")
        return

    else:
        print(f"Unknown experiment: {name}")
        print(f"Available: irreducibility, signal_indistinguishability, field_formation,")
        print(f"  self_acceleration, inverse_law, power_law, scarcity,")
        print(f"  discharge_targeting, strategy_collision, competing_attractors,")
        print(f"  confidently_wrong, trap_enclosure, rebellion,")
        print(f"  preferential_convergence, meta_awareness, boom_bust,")
        print(f"  topology, all")
        return

    elapsed = time.time() - t0
    print(f"\n  Completed in {elapsed:.1f}s")


def _print_result(result):
    """Pretty-print a result dict."""
    name = result.get("name", "?")
    passed = result.get("pass", None)
    theorems = result.get("theorems", [])

    status = "PASS" if passed else "FAIL" if passed is not None else "?"
    print(f"  [{status}] {name} (Theorems: {', '.join(theorems)})")

    # Print key metrics
    for key, val in result.items():
        if key in ("name", "pass", "theorems", "per_strategy", "results",
                    "times", "distances_over_time", "total_field_sizes",
                    "mean_deficits", "discharge_rates", "H_matrix",
                    "gamma_sweep", "log_sizes", "log_counts",
                    "field_sizes", "mean_deficits_list",
                    "transition_times"):
            continue
        if isinstance(val, float):
            print(f"    {key}: {val:.4f}")
        elif isinstance(val, dict):
            for k2, v2 in val.items():
                if isinstance(v2, float):
                    print(f"    {key}.{k2}: {v2:.4f}")
                else:
                    print(f"    {key}.{k2}: {v2}")
        elif isinstance(val, list) and len(val) <= 5:
            print(f"    {key}: {val}")
        else:
            print(f"    {key}: {val}")

    # Print per-strategy details for irreducibility
    if "per_strategy" in result:
        for strat, data in result["per_strategy"].items():
            status_s = "PASS" if data["pass"] else "FAIL"
            print(f"    {strat}: [{status_s}] min_margin={data['min_margin']:.6f}, "
                  f"violations={data['violations']}/{data['total_checks']}")

    # Print sub-results
    if "results" in result and isinstance(result["results"], list):
        for r in result["results"]:
            parts = []
            for k, v in r.items():
                if isinstance(v, float):
                    parts.append(f"{k}={v:.4f}")
                elif isinstance(v, list):
                    continue
                else:
                    parts.append(f"{k}={v}")
            print(f"    {', '.join(parts)}")


def main():
    parser = argparse.ArgumentParser(description="Recognition Dynamics Simulation")
    parser.add_argument("--calibrate", action="store_true", help="Run calibration diagnostics")
    parser.add_argument("--experiment", "-e", type=str, help="Run named experiment")
    parser.add_argument("--seed", type=int, default=None, help="Override random seed")

    args = parser.parse_args()

    if args.calibrate:
        run_calibrate()
    elif args.experiment:
        run_experiment(args.experiment)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
