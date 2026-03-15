# Social Theorem Simulation: Findings

## What We Built

A Python simulation implementing the full mathematical framework from the Formal Companion (MC1–MC8), modeling N subjects as vectors in R^64 evolving under Want dynamics on a social graph. Each subject carries:

- A true-self projection **s_i** (fixed) and remainder norm **r_i** (representing the infinite-dimensional component lost to projection)
- A current form **f_i**(t) evolving under one of four strategy update rules
- A distortion operator **T_i** (n×n matrix) governing how they recognize others
- A 3-channel deficit accumulator tracking lossiness, distortion, and concealment violation

Subjects interact on an Erdos-Renyi graph with weighted edges (omega) representing attentional allocation. The simulation runs gradient-based Want dynamics, deficit accumulation with threshold discharge, graph rewiring based on recognition signal, and DBSCAN clustering to detect emergent fields.

### Key design choices

**Prototype T matrices.** We create K=10 prototype distortion operators, each with a controlled fixed-point subspace (Fix(T) of dimension 2–8). Each subject's T_i is a small perturbation of one prototype. This provides the raw material for field formation without pre-programming clusters — subjects sharing a prototype tend toward similar fixed points, but only if the graph dynamics bring them together.

**Remainder norm.** Since V_B is finite (n=64) but the Hilbert space is infinite-dimensional, each subject carries a scalar r_i_norm drawn from U(0.5, 2.0) representing ||s_i - P_{V_B}(s_i)||. The lossiness channel uses sqrt(||s_proj - f||^2 + r_norm^2), preserving the theorem's guarantee that the gap is always strictly positive.

**Sparse prior forms.** Prior forms are stored only for existing edges (~N*degree entries) using a dict keyed by (recognizer, subject) pairs, keeping memory manageable.

## What the Gradient Check Confirmed

The Want gradient (MC7) matches finite differences to machine precision (relative error ~10^-10). The formula:

∇W_i = (-1 / |N_i| ε²) Σ_j σ(f, T_j) · (T_j - I)^T (T_j f - f)

is correctly implemented. This is the mathematical heart of the simulation — every other phenomenon emerges from this gradient and its interaction with the concealment gradient and strategy rules.

## Theorems That Verify

### FS1 — Competition (PASS)

Mean satisfaction ratio consistently 0.33–0.72 across all runs, always strictly < 1.0. This is the most robust result: no subject in any run achieved full recognition. The theorem's prediction — that finite attentional capacity distributed across unbounded demands makes full satisfaction impossible for N ≥ 2 — holds without exception.

The ratio decreases with N (0.72 at N=50, 0.33 at N=300), confirming that larger populations dilute recognition further.

### FS5 — Field Formation (PASS)

Multiple clusters (4–17) form consistently from random initial conditions. Fields emerge without coordination — subjects converge toward similar regions of form-space because their neighborhoods' distortion operators share approximate fixed-point structure.

The clustering required a non-obvious approach: DBSCAN on raw 64-dimensional form vectors fails due to high-dimensional distance uniformity (curse of dimensionality). The working method clusters on a combined feature vector of [form position, mean distortion direction], which captures both where subjects are and where they're being pulled. This is arguably more faithful to the theory — fields are defined by shared distortion structure, not just spatial proximity.

### FS3a — Discharge Targeting (PASS)

Discharge events target the highest-omega neighbor 27–77% of the time, versus 1–9% expected by chance. This confirms FS3a and Corollary FS3a: the intimate is structurally the discharge target, not because of character but because the highest-omega neighbor contributes multiplicatively more to accumulated deficit.

The fix that made this work: the per-neighbor deficit contribution must be `omega * (distortion + displacement)`, not `omega * distortion + displacement`. The omega weight must multiplicatively scale the entire contribution, reflecting that the intimate's share of attentional allocation amplifies all deficit channels, not just distortion.

### FS4 — Strategy Collisions (PASS)

The discharge rate matrix shows strong off-diagonal structure, confirming that strategy pairings produce distinct harm signatures. Consistent patterns across runs:

- **Collective targets** receive disproportionate discharge from all other strategies (collective subjects' forms encode group-average distortion, making them high-contribution neighbors)
- **Evasive subjects** produce extreme discharge rates toward specific targets (their negative-Want gradient pushes forms away from fixed points, maximizing distortion in neighbors' grammars)
- **Constructive subjects** produce near-zero discharge (their norm-boosted forms achieve high enough recognition signal that deficit stays below threshold)
- **Disclosure and collective** show moderate, balanced rates with each other

### FS5i — Power Law (MIXED)

At small N (50), the power law fits well (α=4.56, KS p=0.479). At large N (300), α>1 but the KS test rejects the fit (p≈0). The distribution has the right shape — many small clusters, few large ones — but deviates from a pure power law at the tails.

## Theorems That Don't Verify (and Why)

### FS5g — Self-Acceleration (WEAK)

The theory predicts dM/dt ∝ M(t): field growth rate proportional to current size. In the simulation, the largest cluster's growth rate has *negative* slope — larger clusters tend to shrink slightly over time.

**Root cause: closed population.** The theorem's proof assumes an effectively infinite reservoir of un-fielded subjects: "the expected number of non-members drawn toward the field per timestep is (N - M(t)) · p · M(t)." In a closed system with N=300, once ~100 subjects are clustered, the reservoir is depleted. Growth saturates and fluctuates. The total clustered count is flat after the first ~50 timesteps.

This is not a failure of the mathematics — it's a boundary condition. The theorem describes the *formation phase* growth rate, and indeed during the first few clustering intervals, total clustered subjects rises from 0 to ~100. But we can't measure the proportionality constant reliably because the formation phase is too brief relative to the measurement interval.

**What would fix it:** An open-population model where new subjects arrive at a constant rate (the Yule-Simon condition), or a much larger N (thousands) with sparser initial conditions to extend the formation phase.

### FS5h — Inverse Law (FAIL)

The theory predicts larger fields → more drift from s_i. We observe no significant correlation (Spearman ρ ≈ -0.03 to -0.33, p > 0.3).

**Root cause: the mechanism isn't operative.** The theorem's argument is that large fields require high-dimensional Fix(T) to accommodate diverse subjects, and high-dimensional Fix(T) means high-compression T, which means large ||s_i - f_i||. But in our simulation:

1. Cluster membership is determined by clustering on distortion-direction features, not by convergence to Fix(T). Subjects are "in a field" because they share similar distortion profiles, not because they've actually converged to a common fixed-point subspace.

2. The Want dynamics don't produce strong convergence to Fix(T). In 64 dimensions with heterogeneous neighbors (only ~10% share a prototype), the averaged gradient doesn't have a clean attractor. Forms drift under the competing pressures of Want, concealment, and strategy rules, but don't lock onto fixed-point subspaces.

3. The V_B drift (||s_proj - f||) varies from 1.9 to 8.4 across clusters regardless of size. Small clusters can have high drift (evasive subjects pushed far from s_i) and large clusters can have moderate drift.

**What this reveals:** The inverse law may require a different operationalization of "field." The theory defines fields by convergence to Fix(T), not by clustering in form-space. A faithful test would need to: (a) identify groups of subjects whose forms lie near a common eigenspace, and (b) measure the dimension of that eigenspace as a function of group size. This is a harder measurement that the current DBSCAN approach doesn't capture.

## Where the Simulation Diverges from Theory

### 1. Heterogeneous neighborhoods prevent clean convergence

Theorem FS5 assumes "all subjects in neighborhood N share a common distortion operator T." This gives a clean result: gradient ascent converges to Fix(T). In the simulation, each subject's neighborhood contains T matrices from ~10 different prototypes. The averaged Want gradient has no single fixed-point subspace — it points toward a compromise that may not be anyone's Fix(T).

This is realistic (real social grammars are diverse), but it weakens the convergence that the field theorems build on. FS5 is the foundation for FS5g, FS5h, and FS5i. When FS5's convergence is partial, the downstream theorems lose force.

### 2. Concealment gradient opposes field formation

The concealment gradient (MC8) pushes forms away from s_i, which in practice adds a random-direction perturbation that disrupts convergence toward Fix(T). With lambda_C = 0.3 and delta = 1.0, the concealment contribution is about 60% of the Want contribution. This isn't a bug — it's the "constitutive division" of A7 — but it means forms never settle into stable fixed points. They oscillate in the tension between Want and concealment, which is philosophically correct but makes clean field formation harder to measure.

### 3. The norm boost in constructive strategy creates an attractor-free regime

Constructive subjects' forms grow in norm over time (by design — they produce "impressive" forms). Combined with the norm clipping at 5× mean s_i norm, constructive subjects either hit the cap and stop evolving meaningfully, or oscillate near it. Their deficit stays below threshold, so they never discharge. They're effectively inert in the social dynamics — present as recognition targets but not participants in the discharge economy.

This might actually be correct: the constructive strategy's "success" is a local optimum that avoids the deficit-discharge cycle at the cost of drifting far from s_i in a high-norm direction. The form is impressive but no longer theirs.

### 4. Evasive subjects are maximally disruptive

The evasive update rule applies -0.99× the Want gradient, pushing forms strongly away from all neighbors' fixed points. This produces massive distortion contributions to neighbors' deficit, making evasive subjects the primary drivers of discharge events. In the FS4 matrix, evasive→constructive discharge rates are 3 orders of magnitude higher than other pairings.

This is theoretically predicted (the evasive strategy maximizes illegibility, which maximizes distortion in others' grammars) but the magnitude suggests the evasive gradient needs damping, or the deficit contribution formula needs to account for the fact that evasive subjects are *expected* to produce high distortion.

### 5. Clustering in high dimensions is a measurement problem, not a dynamics problem

The simulation may be producing genuine field formation that our measurement can't see. In 64 dimensions, meaningful structure (approximate convergence to shared low-dimensional subspaces) is invisible to distance-based clustering. The distortion-direction feature helps, but it's still a projection of a high-dimensional phenomenon.

## What the Simulation Predicts

### Predictions that hold robustly

1. **Recognition is always scarce.** Even with N=50, no subject achieves full recognition. Satisfaction ratio scales as ~1/sqrt(N). This is the deepest prediction and it holds without exception.

2. **Intimates bear the cost.** Discharge targets the highest-omega neighbor with overwhelming probability (5–50× chance). This is purely structural — the omega weighting multiplicatively amplifies deficit contribution. No personality parameter or intention variable is needed.

3. **Strategy pairings produce characteristic harm.** The collision matrix is not random. Collective targets absorb the most discharge from non-collective strategies. Evasive subjects produce the most discharge. Constructive subjects produce the least (they're optimized to avoid it). These patterns emerge from gradient geometry, not from assigned "personalities."

4. **Fields form without coordination.** Multiple distinct clusters emerge from uniformly random initial conditions. The only coordination mechanism is shared distortion structure (similar T matrices) and Want-driven convergence.

### Predictions that require open-population dynamics

5. **Self-accelerating growth** (FS5g) — should emerge with continuous subject arrival.

6. **Power-law size distribution** (FS5i) — the shape is right (many small, few large) but a clean power law requires the Yule-Simon conditions (continuous formation + preferential attachment).

7. **Inverse law between field size and fidelity** (FS5h) — requires measuring Fix(T) dimension rather than cluster size, and strong convergence to Fix(T) which the heterogeneous-neighborhood dynamics don't cleanly produce.

### Emergent predictions not in the theory

8. **Constructive strategy is a deficit-avoidance strategy.** By boosting form norms and achieving higher recognition signals, constructive subjects keep deficit below discharge threshold. They don't discharge — but they also drift furthest from s_i. The strategy "works" by a metric the subject can't see is the wrong one.

9. **Collective subjects absorb disproportionate discharge from all other strategies.** Their centroid-tracking forms carry the compressed signature of the entire cluster's distortion, making them high-contribution neighbors by construction. The collective strategy, designed to reduce individual exposure, increases the collective's visibility as a discharge target.

10. **The deficit economy has a steady state.** Total discharge events per timestep stabilizes quickly. The system doesn't produce runaway instability — it produces a constant hum of structural harm at a rate determined by the population's strategy mix and graph density.
