"""Parameter sweep: grid search over key parameters, parallel execution, CSV output."""

import csv
import itertools
import os
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import asdict

from .config import SimConfig


# Default sweep grid
DEFAULT_GRID = {
    'epsilon': [0.5, 1.0, 2.0],
    'eta': [0.005, 0.01, 0.05],
    'eta_T': [0.0, 0.001, 0.005],
    'lambda_C': [0.1, 0.3, 0.5],
    'N': [100, 300],
    'turnover_rate': [0.0, 0.01, 0.02],
}


def _run_single(params):
    """Run a single simulation with given params. Designed for multiprocessing.

    Args:
        params: dict of parameter overrides

    Returns:
        dict with params + theorem results
    """
    # Import here to avoid pickling issues
    from .config import SimConfig
    from .engine import Simulation
    from .analysis import verify_all_theorems

    cfg = SimConfig()

    # Apply overrides
    for key, val in params.items():
        setattr(cfg, key, val)

    # Reduce steps for sweep efficiency
    if cfg.N <= 100:
        cfg.T_steps = min(cfg.T_steps, 500)
    else:
        cfg.T_steps = min(cfg.T_steps, 800)

    cfg.snapshot_interval = max(cfg.T_steps // 50, 5)
    cfg.cluster_interval = max(cfg.T_steps // 75, 5)

    sim = Simulation(cfg)
    sim.run(verbose=False)

    results = verify_all_theorems(sim)

    # Flatten into a single row
    row = dict(params)
    row['T_steps'] = cfg.T_steps
    theorems = ['FS1', 'FS5', 'FS5g', 'FS5h', 'FS5i', 'FS3a', 'FS4']
    for th in theorems:
        r = results.get(th, {})
        row[f'{th}_verdict'] = r.get('verdict', 'SKIP')
        for mk, mv in r.get('metrics', {}).items():
            row[f'{th}_{mk}'] = mv

    # Count passes
    row['n_pass'] = sum(1 for th in theorems
                        if results.get(th, {}).get('verdict') == 'PASS')
    row['n_weak'] = sum(1 for th in theorems
                        if results.get(th, {}).get('verdict') == 'WEAK')

    return row


def build_grid(grid=None):
    """Build list of param dicts from grid specification."""
    grid = grid or DEFAULT_GRID
    keys = sorted(grid.keys())
    combos = list(itertools.product(*(grid[k] for k in keys)))
    return [dict(zip(keys, combo)) for combo in combos]


def run_sweep(grid=None, output_path=None, max_workers=None, seed=42):
    """Run parameter sweep over grid.

    Args:
        grid: dict of param_name -> list of values
        output_path: path for CSV output (default: sweep_results.csv)
        max_workers: max parallel processes (default: cpu_count)
        seed: base seed (each run gets seed + run_index)

    Returns:
        list of result dicts
    """
    param_list = build_grid(grid)
    total = len(param_list)

    # Add unique seeds
    for i, params in enumerate(param_list):
        params['seed'] = seed + i

    output_path = output_path or 'sweep_results.csv'

    print(f"Parameter sweep: {total} configurations")
    print(f"Output: {output_path}")

    results = []
    start = time.time()

    if max_workers == 1:
        # Sequential (useful for debugging)
        for i, params in enumerate(param_list):
            row = _run_single(params)
            results.append(row)
            elapsed = time.time() - start
            print(f"  [{i+1}/{total}] {row['n_pass']}/7 PASS, "
                  f"{row['n_weak']}/7 WEAK  ({elapsed:.0f}s)")
    else:
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(_run_single, p): i
                       for i, p in enumerate(param_list)}
            for future in as_completed(futures):
                idx = futures[future]
                try:
                    row = future.result()
                    results.append(row)
                    elapsed = time.time() - start
                    done = len(results)
                    print(f"  [{done}/{total}] run {idx}: "
                          f"{row['n_pass']}/7 PASS, {row['n_weak']}/7 WEAK  "
                          f"({elapsed:.0f}s)")
                except Exception as e:
                    print(f"  [{len(results)+1}/{total}] run {idx} FAILED: {e}")
                    results.append({'error': str(e), **param_list[idx]})

    # Sort by number of passes (descending)
    results.sort(key=lambda r: (r.get('n_pass', 0), r.get('n_weak', 0)),
                 reverse=True)

    # Write CSV
    if results:
        fieldnames = list(results[0].keys())
        # Ensure all keys are present
        all_keys = set()
        for r in results:
            all_keys.update(r.keys())
        fieldnames = sorted(all_keys)

        with open(output_path, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames,
                                    extrasaction='ignore')
            writer.writeheader()
            for row in results:
                writer.writerow(row)

    elapsed = time.time() - start
    print(f"\nSweep complete: {elapsed:.0f}s total")
    print(f"Results written to {output_path}")

    # Summary
    _print_summary(results)

    return results


def _print_summary(results):
    """Print sweep summary statistics."""
    theorems = ['FS1', 'FS5', 'FS5g', 'FS5h', 'FS5i', 'FS3a', 'FS4']

    print("\n" + "=" * 60)
    print("SWEEP SUMMARY")
    print("=" * 60)

    # Best result
    best = results[0] if results else None
    if best:
        print(f"\nBest configuration ({best.get('n_pass', 0)}/7 PASS, "
              f"{best.get('n_weak', 0)}/7 WEAK):")
        for key in ['N', 'epsilon', 'eta', 'eta_T', 'lambda_C', 'turnover_rate']:
            if key in best:
                print(f"  {key} = {best[key]}")
        for th in theorems:
            v = best.get(f'{th}_verdict', 'SKIP')
            print(f"  {th}: {v}")

    # Per-theorem pass rates
    print("\nPer-theorem pass rates:")
    for th in theorems:
        n_pass = sum(1 for r in results
                     if r.get(f'{th}_verdict') == 'PASS')
        n_weak = sum(1 for r in results
                     if r.get(f'{th}_verdict') == 'WEAK')
        n_total = len(results)
        print(f"  {th}: {n_pass}/{n_total} PASS, {n_weak}/{n_total} WEAK")

    # Co-verification
    all_pass = [r for r in results if r.get('n_pass', 0) == 7]
    print(f"\nFull co-verification (7/7 PASS): {len(all_pass)}/{len(results)} configs")

    six_plus = [r for r in results if r.get('n_pass', 0) >= 6]
    print(f"6+/7 PASS: {len(six_plus)}/{len(results)} configs")

    # Parameter sensitivity: for each param, which values produce most passes
    print("\nParameter sensitivity (mean passes per value):")
    for key in ['epsilon', 'eta', 'eta_T', 'lambda_C', 'N', 'turnover_rate']:
        vals = sorted(set(r.get(key) for r in results if key in r))
        if not vals:
            continue
        print(f"  {key}:")
        for v in vals:
            subset = [r for r in results if r.get(key) == v]
            mean_pass = sum(r.get('n_pass', 0) for r in subset) / max(len(subset), 1)
            print(f"    {v}: {mean_pass:.2f} mean passes ({len(subset)} runs)")

    print("=" * 60)
