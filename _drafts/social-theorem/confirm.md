Good question to sit with, because the answer distinguishes between three different things a simulation could be doing — and conflating them would waste the build.

**1. Sanity checks (the math already proves these; simulation just verifies they survive finite populations and noise)**

The individual-level results — irreducibility, strategy invariance, lossiness — are proven analytically and don't need simulation to confirm. What simulation checks is whether these hold under the approximations: finite *N*, discrete time steps, noisy grammar estimation. If they don't, there's a bug either in the math or in the implementation.

**2. Quantitative predictions (the model makes specific, falsifiable numerical claims)**

These are the real targets:

- **Power-law exponent**: The model predicts α = 1 + δ/α_g. Simulation should produce field-size distributions matching this exponent, and varying δ and α_g should shift the exponent predictably. If the empirical exponent diverges from the formula, the master equation or mean-field approximation (A7) is doing more work than it admits.

- **Inverse law (Theorem 4.3)**: Average recognition deficit should be strictly increasing in field size past M_native. You'd want to measure this directly — plot ⟨‖**r**_i‖⟩ against M across many fields at equilibrium.

- **Rebellion discontinuity threshold (Δ_min)**: The predicted formula involves γ and σ_1(t*). Simulation lets you probe whether the discontinuity is actually sharp at the predicted value, or whether finite-population noise smears it into a crossover.

**3. Genuinely open questions the math doesn't settle (the most interesting targets)**

- **Mean-field breakdown**: A7 is explicitly flagged as an approximation for sparse or clustered graphs. Simulation on different graph topologies — lattice, scale-free, small-world — should reveal whether the power law survives, and if not, what replaces it. The math punts this; simulation delivers.

- **Meta-awareness propagation**: The model treats M_i transitions as individual. But meta-aware subjects are converging to F_B(**s**_i) rather than Fix(T_B) — they're presenting differently. Does this produce a detectable signal in the network? Can M_i = 1 spread socially, or does each subject arrive independently? The math has nothing to say here.

- **What happens when multiple meta-aware subjects interact**: Theorem 9.5 says M_i = 1 decouples both field pull and trap reinforcement simultaneously. But if a critical mass of subjects in a network have made this transition, the network's Fix(T_B) is being populated by fewer gradient-followers. Does this destabilize the field? Does it create a second attractor? This is a genuine emergence question.

- **The "confidently wrong" equilibrium (Corollary 6.8)**: The math says it exists and is phenomenologically indistinguishable from correct convergence. Simulation could measure prevalence — under what grammar-estimation-error distributions does the population mostly land there versus Find the real Fix(T)?

- **Discharge dynamics and the inverse law tension**: Theorem 4.3 says average deficit increases with field size; Theorem 4.2 says fields grow self-acceleratingly. These forces are in tension — bigger fields produce more dischargeable deficit among members. Does this produce a natural field-size ceiling, a fragmentation event, or just background noise? The math doesn't close this loop.

**The single most diagnostic test** would be the interaction between Theorems 4.2 and 4.3 across time: watch field size, average deficit, and discharge events simultaneously. If deficit accumulation eventually overwhelms the gradient-collinearity pull and produces fragmentation, you'd have evidence that the model contains a natural boom-bust cycle the analytic proofs don't capture — which would be the most interesting result the simulation could return.