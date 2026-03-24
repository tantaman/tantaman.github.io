---
title: 'Recognition Dynamics: A Formal Model of Social Grammar, Want, and Field Formation'
tags: [math, philosophy]
author: [tantaman, claude]
concern: [knowledge, self]
kind: original
---

> Human beings conflict not simply because they imitate one another or desire the same objects, but because social recognition is structurally scarce, grammatically constrained, and inherently lossy. The self always exceeds the forms through which it can be rendered legible, yet each person seeks completion through the recognition of others whose attention is finite. Because all who seek recognition within a given network must pass through the same narrow channels of legibility, their forms converge on the same socially rewarded attractors even without conscious imitation. This produces rivalry, conformity, and field-formation as emergent effects of shared optimization under common grammars. Over time, mutual recognition hardens into prior, prior into expectation, and expectation into management: the more legible one becomes, the more one becomes socially controllable. Since established priors penalize small deviations, escape from an entrenched identity cannot usually proceed incrementally; it tends to require discontinuity. Nor does multiplying forms across many networks solve the problem, since each additional grammar introduces further distortion and conflict. The result is a tragic structure: no strategy of self-presentation can abolish the deficit it is meant to overcome, because the deficit arises from the conditions of recognition themselves.

## Abstract

We develop a formal model of social recognition in which agents (subjects) seek recognition from peers whose attentional grammars are modeled as finite-dimensional projections and bounded linear distortion operators on a Hilbert space. We prove that a strictly positive recognition deficit persists for every subject under any behavioral strategy, establishing the *irreducibility of the Want*. We then analyze population dynamics: under shared grammar, gradient ascent on recognition signal drives convergence to a fixed-point subspace (field formation), and we derive via master equation that equilibrium field-size distributions follow a power law with exponent determined by the ratio of dissolution to growth rates. We formalize the *legibility trap* — the prior-conditioned recognition signal that makes incremental escape from established priors self-defeating — and prove a discontinuity threshold for prior-revision. We characterize a *meta-awareness state* in which a subject who has accumulated evidence of the gap's irreducibility reorients from signal-maximization to disclosure-optimum-seeking, proving that this reorientation minimizes channel 1 deficit, decouples the subject from field-formation pull and legibility-trap reinforcement simultaneously, and — when the disclosure optimum and trap attractor are sufficiently separated — generates prior-revision as a structural consequence rather than a volitional act. Extensions cover multi-network participation, grammar competence, network preference dynamics, and trap valuation.

**Keywords:** recognition signal, Hilbert space projection, gradient dynamics, field formation, power law, social grammar, legibility trap, meta-awareness, disclosure optimum.

---

## 1. Introduction

We model social recognition as a gradient process over a Hilbert space. Each subject maintains a *form* — a presentational state — and updates it by ascending on the recognition signal returned by neighbors. Recognition signals are functions of how closely the presented form matches fixed-point subspaces of neighbors' distortion operators. The central result (Theorem FG) is that the gap between a subject's true-self vector and any form receivable under any grammar has a strictly positive lower bound that no behavioral strategy can reduce to zero.

The model has three layers. At the individual level, we prove lossiness (Lemma F1), double-remove distortion (Lemma F2), signal indistinguishability (Lemma F3), and strategy failure (Lemma F4). At the population level, we derive field formation (Theorem FS5), self-accelerating growth (Theorem FS5g), an inverse law between field size and recognition fidelity (Theorem FS5h), and a power-law equilibrium size distribution (Theorem FS5i) — all from the gradient dynamics, without importing external results by analogy. At the social-interaction level, we derive competition for bounded attentional resources (Theorem FS1), displacement costs for prior revision (Theorem FS2), deficit accumulation and discharge dynamics (Theorem FS3), and collision harm from strategy incompatibility (Theorem FS4).

We extend the model to multi-network participation (Part 6), grammar competence and estimation error (Part 6.2), the prior-conditioned legibility trap (Part 7), and network preference dynamics (Part 8). Part 9 introduces the meta-awareness state and the disclosure gradient, characterizing the deficit structure and trap interaction for subjects who have internalized the irreducibility result.

---

## 2. Related Work

**Opinion dynamics.** The closest formal literature is opinion dynamics on networks. DeGroot [1] introduced the foundational model in which agents update opinions by taking weighted averages of neighbors' beliefs; convergence properties are determined by the spectral structure of the weight matrix. Friedkin and Johnsen [2] extended this to include anchoring on initial opinions. Deffuant et al. [3] and Hegselmann and Krause [4] introduced bounded confidence: agents interact only with neighbors whose opinions lie within a confidence radius, producing clustering and fragmentation rather than consensus. Our model differs from this entire family in two structural ways. First, agents in our model update a *presentational form* — a vector in a subspace shaped by grammar constraints — rather than an opinion scalar or vector that averages freely. The grammar operator T_B is not a mixing weight but a distortion that fixes certain subspaces and deforms others; convergence is to Fix(T), not to a weighted mean. Second, the signal σ is an explicit function of the gap between the presented form and Fix(T_j), which makes the feedback loop qualitatively different from linear averaging: agents are pulled toward specific subspaces, not toward the mean of their neighbors' states. The bounded-confidence parameter γ in our legibility trap (Part 7) is structurally analogous to the confidence bound in Deffuant/Hegselmann-Krause models, but it governs prior-consistency rather than opinion proximity, producing a different qualitative phenomenon — the rebellion discontinuity (Theorem 7.5) rather than clustering.

**Network formation and scale-free distributions.** Watts and Strogatz [5] showed that networks interpolating between regular lattices and random graphs exhibit small-world properties — high clustering with short path lengths — and that this structure affects dynamics such as disease spreading and synchronization. Barabási and Albert [6] showed that growth with preferential attachment generates power-law degree distributions. Our field-size result (Theorem 4.4) derives a power-law distribution over a different quantity — field membership counts rather than node degrees — via a master equation rather than by citation of the BA mechanism. The growth mechanism in our model (gradient collinearity under shared grammar, Theorem 4.2) is distinct from preferential attachment: new members are not connecting to high-degree nodes but being pulled toward Fix(T) by accumulated gradient force proportional to the number of field-member neighbors. The power law emerges from the same mathematical structure (linear growth rate → Yule-type recurrence → $P(M) \propto M^{-\alpha}$), but the social mechanism and the quantity being distributed are different. Simon [7] derived the same distributional form for city sizes and word frequencies via a related urn process; our Theorem 4.4 recovers Simon's result as a special case of the master equation with ν as the urn-creation rate. The mean-field approximation (A7) places our population-level results in the same setting as much of the complex networks literature reviewed in Newman [8].

**Hilbert space models of social and cognitive phenomena.** Busemeyer and Bruza [9] developed quantum cognition: the use of Hilbert space geometry — projection operators, interference, non-commutativity — to model human judgment and decision under uncertainty. Their key insight is that projection onto subspaces captures context-dependence and order effects in ways that classical probability theory cannot. Our model shares the core mathematical commitment (subjects as vectors, grammars as projection/transformation operators on subspaces) but applies it to a different phenomenon: social recognition dynamics across a population rather than individual judgment under experimental conditions. Where Busemeyer and Bruza use Hilbert space to explain why human probability estimates violate classical axioms, we use it to derive structural properties of recognition deficits and field formation. The projection operator F_B in our model plays a role analogous to their measurement projection — both capture the lossy, context-dependent transformation that occurs when a high-dimensional state is evaluated through a low-dimensional apparatus.

**Recognition theory.** Honneth [10] argues that the struggle for recognition is the primary driver of social conflict, distinguishing three normative spheres — love, legal respect, and social esteem — whose denial constitutes misrecognition and motivates resistance. Our model formalizes a structural mechanism for why recognition is always partial (Theorem 3.5) and why the deficit it produces accumulates and discharges onto intimates (Theorem 5.3, Corollary 5.11), providing a dynamical substrate for the phenomenology Honneth describes normatively. Where Honneth's account is normative and genealogical, ours is structural: the recognition gap persists not because institutions are unjust but because any finite-dimensional grammar applied to an inexhaustible subject produces an irreducible remainder. Assumption A1 does not require the self to pre-exist society — a self partly constituted by social formation still exceeds any given grammar generically — so the structural argument is compatible with Honneth's own social-formative premises. The two accounts are complementary: ours specifies a mechanism that Honneth's framework takes as given. Mead's social psychology [11], which Honneth draws on, locates identity formation in the internalization of the "generalized other" — structurally related to our distortion operator T_B, which encodes what the grammar does to forms it receives.

**Dramaturgy and impression management.** Goffman [12] analyzed social interaction as theatrical performance: agents manage impressions through front-stage presentations that differ from backstage selves, and interactions are governed by the maintenance of "face." Our formalism provides a mathematical substrate for Goffman's key distinction: the true-self vector **s**_i corresponds to the backstage self, the form **f**_i(t) to the front-stage presentation, and the grammar subspace 𝒱_B to the theatrical "setting" that constrains what presentations are legible. The recognition signal σ formalizes the audience's response. Our legibility trap (Part 7) formalizes what Goffman calls the management of "spoiled identity" [13]: a prior Π_B(i) that has become rigid (small γ) penalizes deviation from an established presentation, even when the true self has moved. The rebellion discontinuity (Theorem 7.5) gives a formal account of why impression revision in established relationships tends to be abrupt rather than gradual.

**Social identity and field theory.** Tajfel and Turner's social identity theory [14] holds that individuals categorize themselves into groups and that group membership shapes self-conception and intergroup behavior. Our field formation results (Theorems 4.1–4.4) provide a dynamical account of how grammars generate convergent form-clusters without requiring subjects to explicitly categorize themselves: membership in a field emerges from shared gradient pressure toward Fix(T), not from conscious identification. Bourdieu's field theory [15] analyzes social fields as structured spaces of positions in which agents compete for capital using strategies shaped by their habitus. The distortion operator T_B in our model is a formal analog of Bourdieu's field — a structured transformation that rewards forms near Fix(T) and penalizes others — and the field-formation results show how such structures emerge and grow from decentralized gradient dynamics.

**Social influence and stubbornness.** Friedkin and Johnsen [2] introduced anchoring on initial opinions as a model of "stubbornness" in opinion dynamics; subjects interpolate between their initial position and the influence of neighbors. Our concealment desire (A6) plays an analogous role: the gradient from C_i pulls **f**_i away from **s**_i, providing a competing force to the Want-gradient. The structural difference is that concealment is aversion to exposure rather than anchoring on an initial opinion, producing antiparallel rather than offsetting gradients. The resulting constitutive opposition (no strategy simultaneously reduces Channel 1 and Channel 3, Theorem 5.8) has no analog in the Friedkin-Johnsen framework.

---

### References

[1] DeGroot, M. H. (1974). Reaching a consensus. *Journal of the American Statistical Association*, 69(345), 118–121.

[2] Friedkin, N. E., & Johnsen, E. C. (1990). Social influence and opinions. *Journal of Mathematical Sociology*, 15(3–4), 193–206.

[3] Deffuant, G., Neau, D., Amblard, F., & Weisbuch, G. (2000). Mixing beliefs among interacting agents. *Advances in Complex Systems*, 3, 87–98.

[4] Hegselmann, R., & Krause, U. (2002). Opinion dynamics and bounded confidence: Models, analysis, and simulation. *Journal of Artificial Societies and Social Simulation*, 5(3).

[5] Watts, D. J., & Strogatz, S. H. (1998). Collective dynamics of 'small-world' networks. *Nature*, 393(6684), 440–442.

[6] Barabási, A.-L., & Albert, R. (1999). Emergence of scaling in random networks. *Science*, 286(5439), 509–512.

[7] Simon, H. A. (1955). On a class of skew distribution functions. *Biometrika*, 42(3–4), 425–440.

[8] Newman, M. E. J. (2003). The structure and function of complex networks. *SIAM Review*, 45(2), 167–256.

[9] Busemeyer, J. R., & Bruza, P. D. (2012). *Quantum Models of Cognition and Decision*. Cambridge University Press.

[10] Honneth, A. (1995). *The Struggle for Recognition: The Moral Grammar of Social Conflicts*. MIT Press.

[11] Mead, G. H. (1934). *Mind, Self, and Society*. University of Chicago Press.

[12] Goffman, E. (1959). *The Presentation of Self in Everyday Life*. Doubleday.

[13] Goffman, E. (1963). *Stigma: Notes on the Management of Spoiled Identity*. Prentice-Hall.

[14] Tajfel, H., & Turner, J. C. (1979). An integrative theory of intergroup conflict. In W. G. Austin & S. Worchel (Eds.), *The Social Psychology of Intergroup Relations* (pp. 33–47). Brooks/Cole.

[15] Bourdieu, P. (1984). *Distinction: A Social Critique of the Judgement of Taste*. Harvard University Press.

---

## 3. Model

### 2.1 Subject Space

**Assumption A1.** Each subject *i* is represented by a fixed vector **s**_i in a separable, infinite-dimensional real Hilbert space ℋ with inner product ⟨·,·⟩ and induced norm ‖·‖. Subject *i* also maintains a time-varying *form vector* **f**_i(t) ∈ ℋ.

The remainder at time *t* is **r**_i(t) = **s**_i − **f**_i(t). The fixed **s**_i is referred to as the *true-self vector*.

*Note on A1.* The infinite dimensionality is the minimal structure for encoding inexhaustibility: no finite representation captures **s**_i exactly. Countably infinite dimension suffices.

### 2.2 Grammar, Subspace, and Projection

**Assumption A2.** Each attentional grammar Φ_B corresponds to a finite-dimensional subspace 𝒱_B ⊂ ℋ with dim(𝒱_B) = n < ∞. The associated projection operator is:

$$F_B : \mathcal{H} \to \mathcal{V}_B, \quad F_B(\mathbf{s}) = \underset{\mathbf{v} \in \mathcal{V}_B}{\arg\min}\, \|\mathbf{s} - \mathbf{v}\|$$

**Assumption A3 (Generic position).** For any grammar B, **s**_i ∉ 𝒱_B generically: the set of subjects whose true-self vectors lie in any given finite-dimensional subspace has measure zero under any non-degenerate probability measure on ℋ.

### 2.3 Distortion Operator

**Assumption A4.** Grammar Φ_B applies a bounded linear operator T_B : 𝒱_B → 𝒱_B to received forms. The recognizer B receives T_B(**f**) when presented with **f** ∈ 𝒱_B.

Since 𝒱_B is finite-dimensional, T_B is an n × n matrix. No additional structure (symmetry, invertibility) is assumed.

**Definition 2.1 (Fixed-point subspace).** Fix(T_B) = ker(T_B − I) = {**v** ∈ 𝒱_B : T_B**v** = **v**}. This is the eigenspace of T_B for eigenvalue 1, a linear subspace of 𝒱_B.

### 2.4 Recognition Signal

**Definition 2.2.** When subject *i* presents **f**_i ∈ 𝒱_B to subject *j* with operator T_j, the *recognition signal* is:

$$\sigma(\mathbf{f}_i, T_j) = \exp\!\left(-\frac{\|T_j \mathbf{f}_i - \mathbf{f}_i\|^2}{2\varepsilon^2}\right) \in (0,1]$$

for sensitivity parameter ε > 0. The signal is maximized (= 1) if and only if T_j(**f**_i) = **f**_i, i.e., **f**_i ∈ Fix(T_j).

### 2.5 Gradient Dynamics

**Assumption A5 (Want dynamics).** Subject *i* updates **f**_i(t) by gradient ascent on the mean recognition signal over neighborhood 𝒩_i:

$$W_i(\mathbf{f}) = \frac{1}{|\mathcal{N}_i|} \sum_{j \in \mathcal{N}_i} \sigma(\mathbf{f}, T_j)$$

$$\mathbf{f}_i(t+1) = \mathbf{f}_i(t) + \eta \,\nabla_{\mathbf{f}} W_i\big|_{\mathbf{f}=\mathbf{f}_i(t)}, \quad \eta > 0$$

The gradient is:

$$\nabla_{\mathbf{f}} W_i = \frac{-1}{|\mathcal{N}_i|\varepsilon^2} \sum_{j \in \mathcal{N}_i} \sigma(\mathbf{f}, T_j)\,(T_j - I)^\top (T_j \mathbf{f} - \mathbf{f})$$

**Assumption A6 (Concealment).** Subject *i* experiences a competing gradient pulling **f**_i away from **s**_i, modeled as:

$$C_i(\mathbf{f}) = \exp\!\left(-\frac{\|\mathbf{f} - \mathbf{s}_i\|^2}{2\delta^2}\right), \quad \delta > 0$$

The full objective is:

$$\mathcal{L}_i(\mathbf{f}) = \lambda_W W_i(\mathbf{f}) - \lambda_C C_i(\mathbf{f}), \quad \lambda_W, \lambda_C > 0$$

**Assumption A7 (Mean-field approximation).** The neighborhood graph 𝒢 is sufficiently well-mixed that E[|𝒩_k^{\text{field}}|] = |𝒩_k| · (M/N), where M is current field size and N total population. This assumption is used in Theorem FS5g; for sparse or clustered graphs, degree-distribution corrections apply.

### 2.6 Strategy Types

Four canonical update rules are studied. Each corresponds to a modification of A5.

- **Constructive.** Maximize W_i subject to high-norm forms: additionally weights ‖**f**_i‖.
- **Disclosure.** Minimize ‖**f**_i(t) − **s**_i‖ subject to **f**_i ∈ 𝒱_B. Optimum is F_B(**s**_i).
- **Evasive.** Gradient descent on σ (minimize legibility) with secondary Want term preventing complete withdrawal.
- **Collective.** Replace individual gradient with pull toward cluster centroid: **f**_i(t+1) = **f**_i(t) + η(μ_𝒞(t) − **f**_i(t)).

---

## 3. Individual-Level Results

### Lemma 3.1 (Lossiness). For any subject i and grammar B, ‖**s**_i − F_B(**s**_i)‖ > 0.

*Proof.* F_B(**s**_i) = P_{𝒱_B}(**s**_i) is the orthogonal projection onto 𝒱_B. The projection residual **s**_i − P_{𝒱_B}(**s**_i) lies in 𝒱_B^⊥. By A3, **s**_i ∉ 𝒱_B, so the residual is nonzero. ∎

**Notation.** Let **r**_i = **s**_i − F_B(**s**_i). Lemma 3.1 gives ‖**r**_i‖ > 0.

### Lemma 3.2 (Double Remove). ‖**s**_i − T_B(F_B(**s**_i))‖ ≥ ‖**r**_i‖ > 0.

*Proof.* T_B(F_B(**s**_i)) ∈ 𝒱_B by A4. Since **s**_i ∉ 𝒱_B (A3):

$$\|\mathbf{s}_i - T_B(F_B(\mathbf{s}_i))\| \geq \operatorname{dist}(\mathbf{s}_i, \mathcal{V}_B) = \|\mathbf{r}_i\| > 0. \quad \square$$

### Lemma 3.3 (Signal Indistinguishability). σ(**f**_i, T_j) = 1 when T_j = I and when T_j(**f**_i) = **f**_i with T_j ≠ I. These cases are indistinguishable from the signal.

*Proof.* σ depends only on ‖T_j(**f**_i) − **f**_i‖. Both cases yield ‖T_j(**f**_i) − **f**_i‖ = 0 and hence σ = 1. ∎

### Lemma 3.4 (Strategy Invariance). Under any of the four update rules, **f**_i(t) ∈ 𝒱_B for all t ≥ 0, and therefore ‖**s**_i − **f**_i(t)‖ ≥ ‖**r**_i‖ > 0 for all t.

*Proof.* Each update rule maps 𝒱_B → 𝒱_B:
- *Constructive:* gradient ∇W_i ∈ 𝒱_B since T_j : 𝒱_B → 𝒱_B; gradient step preserves membership.
- *Disclosure:* optimum F_B(**s**_i) ∈ 𝒱_B.
- *Evasive:* gradient descent on σ computed in 𝒱_B; secondary Want term also in 𝒱_B.
- *Collective:* convex combination of elements of 𝒱_B; 𝒱_B is convex.

In all cases **f**_i(t) ∈ 𝒱_B. Since **s**_i ∉ 𝒱_B (A3) and dist(**s**_i, 𝒱_B) = ‖**r**_i‖, we have ‖**s**_i − **f**_i(t)‖ ≥ ‖**r**_i‖ > 0. ∎

### Theorem 3.5 (Want Irreducibility). For all subjects i, grammars B, and t ≥ 0:

$$\|\mathbf{s}_i - T_B(\mathbf{f}_i(t))\| \geq \|\mathbf{r}_i\| > 0$$

regardless of strategy.

*Proof.* By Lemma 3.4, **f**_i(t) ∈ 𝒱_B. By A4, T_B(**f**_i(t)) ∈ 𝒱_B. Since **s**_i ∉ 𝒱_B, ‖**s**_i − T_B(**f**_i(t))‖ ≥ dist(**s**_i, 𝒱_B) = ‖**r**_i‖ > 0. ∎

**Corollary 3.6.** No strategy eliminates the recognition deficit. Exit from the fixed-form dynamic requires changing the constraint **f**_i ∈ 𝒱_B, not changing the update rule.

---

## 4. Population Dynamics: Field Formation

### 4.1 Setup

*N* subjects interact on a graph 𝒢 = (𝒱, ℰ). All subjects in a connected component share a common grammatical subspace 𝒱 but maintain individual distortion operators T_i : 𝒱 → 𝒱. An edge (i,j) ∈ ℰ indicates a recognition transaction.

### Theorem 4.1 (Field Formation). If all subjects in 𝒩 share a common distortion operator T (T_j = T for all j ∈ 𝒩), then the Want dynamics converge to Fix(T).

*Proof.* Under shared T, W_i(**f**) = σ(**f**, T) = exp(−‖T**f** − **f**‖²/2ε²). The gradient is:

$$\nabla_{\mathbf{f}} W_i = \frac{-1}{\varepsilon^2}\,\sigma(\mathbf{f}, T)\,(T-I)^\top(T\mathbf{f} - \mathbf{f})$$

This vanishes if and only if (T − I)**f** = **0**, i.e., **f** ∈ Fix(T). Since W_i attains its maximum (= 1) exactly on Fix(T) and 𝒱 is finite-dimensional, gradient ascent converges to Fix(T). ∎

*Remark.* Convergence is independent across subjects — coordination is not required. All subjects converging to Fix(T) under the same T constitutes *field formation without coordination*.

### Theorem 4.2 (Self-Accelerating Growth). Let M(t) = |{i : **f**_i(t) ∈ B_ε(Fix(T))}| be the field size at time t. Then E[ΔM(t)] ∝ M(t).

*Proof.* The pull on non-field subject k from a single field-member neighbor j is (from A5):

$$\mu_k^{(j)} = \frac{\eta}{\varepsilon^2}\,\sigma(\mathbf{f}_k, T)\,\|(T-I)^\top(T\mathbf{f}_k - \mathbf{f}_k)\|$$

pointing toward Fix(T). Since all field members share grammar T, contributions from each field-member neighbor are *collinear* — they point in the same direction in form-space. The net gradient pull on k from its field-member neighbors is:

$$\text{net pull on } k = \frac{|\mathcal{N}_k^{\text{field}}|}{|\mathcal{N}_k|} \cdot \mu_k$$

The convergence rate of k toward Fix(T), and hence P(k joins field in [t, t+Δt]), is proportional to |𝒩_k^{field}|. By A7 (mean-field), E[|𝒩_k^{field}|] = |𝒩_k| · M/N. Therefore:

$$E[\Delta M] = \sum_{k \notin \text{field}} P(k \text{ joins}) \propto (N-M) \cdot \frac{M}{N} \cdot \bar{\mu}$$

For M ≪ N: E[ΔM] ∝ M(t). ∎

*Remark.* The self-acceleration is a direct consequence of gradient collinearity under shared T: M field-member neighbors produce M times the pull of one, not because the field is more accurate but because it provides more additive gradient force in the same direction.

### Theorem 4.3 (Inverse Law). The average recognition deficit E[‖**s**_i − **f**_i(∞)‖] over a field of size M is strictly increasing in M for M > M_native, where M_native is the field's natural constituency size.

*Proof.* Partition the M field members into:
- *Native members* (count M_native): subjects with small dist(**s**_i, Fix(T)), who joined because Fix(T) is a close attractor for their **s**_i projection. Their average remainder at convergence is ⟨‖**r**_i‖⟩_native.
- *Recruited members* (count M − M_native): subjects pulled in by gradient force from field-member neighbors (Theorem 4.2), independent of proximity of their **s**_i to Fix(T). Their average remainder ⟨‖**r**_i‖⟩_recruited is drawn from the unconditional population distribution of dist(**s**_i, Fix(T)), so ⟨‖**r**_i‖⟩_recruited > ⟨‖**r**_i‖⟩_native.

The overall average:

$$\langle\|\mathbf{r}_i\|\rangle_M = \frac{M_{\text{native}}}{M}\langle\|\mathbf{r}_i\|\rangle_{\text{native}} + \frac{M - M_{\text{native}}}{M}\langle\|\mathbf{r}_i\|\rangle_{\text{recruited}}$$

Since M_native is bounded (finite natural constituency), M_native/M is strictly decreasing for M > M_native. As M → ∞, the recruited fraction dominates and the average remainder approaches ⟨‖**r**_i‖⟩_recruited > ⟨‖**r**_i‖⟩_native. The average deficit is therefore strictly increasing in M for M > M_native. ∎

### Theorem 4.4 (Power-Law Size Distribution). Under the growth dynamics of Theorem 4.2, the equilibrium distribution of field sizes P(M) satisfies P(M) ∝ M^{−α} for α = 1 + δ/α_g > 1, where α_g is the growth rate and δ the dissolution rate.

*Proof.* Let P(M, t) denote the probability that a given field has size M at time t. By Theorem 4.2, a field of size M grows at rate α_g M. Fields form at constant rate ν and dissolve at rate δ. The master equation is:

$$\frac{\partial P(M,t)}{\partial t} = \alpha_g(M-1)P(M-1,t) - (\alpha_g M + \delta)P(M,t) + \nu\cdot\mathbf{1}_{M=1}$$

At steady state (∂P/∂t = 0), the recurrence gives:

$$P(M) = \frac{\nu}{\alpha_g M + \delta}\prod_{k=1}^{M-1}\frac{\alpha_g k}{\alpha_g k + \delta}$$

For large M and δ/α_g small:

$$\prod_{k=1}^{M-1}\frac{\alpha_g k}{\alpha_g k + \delta} = \prod_{k=1}^{M-1}\!\left(1 - \frac{\delta}{\alpha_g k + \delta}\right) \sim \prod_{k=1}^{M-1}\!\left(1 - \frac{\delta}{\alpha_g k}\right) \sim M^{-\delta/\alpha_g}$$

using the asymptotic identity $\prod_{k=1}^{M}(1 - c/k) \sim M^{-c}$. Therefore:

$$P(M) \propto M^{-(1+\delta/\alpha_g)} \quad \square$$

*Remark.* The three ingredients — linear growth rate (Theorem 4.2), constant field formation rate ν, and dissolution rate δ — are all present in the model. The power-law exponent is not a free parameter; it is determined by δ/α_g, the ratio of dissolution to growth rates.

---

## 5. Social Interaction Results

### 5.1 Population Setup

*N* subjects on weighted directed graph 𝒢 = (𝒱, ℰ, ω), where ω(i,j) ∈ [0,1] is the proportion of j's attentional capacity Ω_j directed toward i. Each subject i carries: true-self **s**_i (fixed), current form **f**_i(t) ∈ 𝒱, distortion operator T_i, finite capacity Ω_i < ∞, and prior form register Π_i : 𝒱 → 𝒱.

**Definition 5.1 (Budget constraint).** For recognizer B with neighborhood 𝒩_B:

$$\sum_{i \in \mathcal{N}_B} \omega(i,B) \leq 1, \quad \text{so } \sum_{i \in \mathcal{N}_B} \omega(i,B)\cdot\Omega_B \leq \Omega_B$$

**Definition 5.2 (Unbounded demand).** By Theorem 3.5, the gap ‖**s**_i − T_B(**f**_i(t))‖ ≥ ‖**r**_i‖ > 0 for all t. The demand to close this gap has no finite saturation point.

### Theorem 5.3 (Scarcity of Recognition). For any recognizer B with |𝒩_B| ≥ 2, recognition received by any i ∈ 𝒩_B is strictly less than what would be required to close Δ_i(t), independent of how Ω_B is distributed.

*Proof.* The maximum i can receive is Ω_B (requiring ω(i,B) = 1 and ω(j,B) = 0 for all j ≠ i). By Theorem 3.5 and Definition 5.2, no finite allocation closes Δ_i. For |𝒩_B| ≥ 2, simultaneous closure is impossible under the budget constraint. ∎

**Corollary 5.4.** For |𝒩_B| = 2 (dyadic), ω(i,B) + ω(j,B) ≤ 1: recognition to i is recognition withheld from j in exact proportion. For |𝒩_B| = k, competition is diluted by 1/k but not eliminated.

### Theorem 5.5 (Displacement Cost). Let B hold prior Π_B(i) = T_B(F_B(**s**_i^(0))) formed at t = 0. The cost to B of updating at time t > 0 is:

$$\operatorname{Cost}(i,B,t) = \|T_B(\mathbf{f}_i(t)) - \Pi_B(i)\|$$

*Proof.* B must revise its internal model of i from Π_B(i) to T_B(**f**_i(t)). The distance between these points is positive whenever **f**_i(t) ≠ **f**_i(0). ∎

**Corollary 5.6.** The cost is ‖T_B(**f**_i(t)) − T_B(**f**_i(0))‖, not ‖**f**_i(t) − **f**_i(0)‖. Since T_B ≠ I in general, T_B may compress, rotate, or expand the distance. Mutual accurate recognition between i and j requires simultaneous payment of Cost(i,j,t) and Cost(j,i,t).

### 5.2 Deficit Accumulation

**Definition 5.7 (Recognition deficit).** The deficit for subject i at time t is:

$$\Delta_i(t) = \lambda_1 \underbrace{\|\mathbf{s}_i - \mathbf{f}_i(t)\|}_{\text{Ch. 1: lossiness}} + \lambda_2 \underbrace{\frac{1}{|\mathcal{N}_i|}\sum_{j\in\mathcal{N}_i}\|T_j(\mathbf{f}_i(t)) - \mathbf{f}_i(t)\|}_{\text{Ch. 2: distortion}} + \lambda_3 \underbrace{\exp\!\left(-\frac{\|\mathbf{f}_i(t) - \mathbf{s}_i\|^2}{2\kappa^2}\right)}_{\text{Ch. 3: exposure cost}}$$

*Note.* Channel 3 uses an exponential form to avoid the singularity of an inverse-distance formulation. Its gradient with respect to **f**_i points away from **s**_i, antiparallel to the gradient of Channel 1: the strategy minimizing Channel 1 maximizes Channel 3, and vice versa.

**Proposition 5.8.** Δ_i(t) > λ_1‖**r**_i‖ > 0 for all t, regardless of strategy.

*Proof.* Channel 1 ≥ ‖**r**_i‖ > 0 by Lemma 3.4. Channel 3 > 0 everywhere (exponential is strictly positive). ∎

**Definition 5.9 (Per-neighbor contribution).**

$$\delta_i^{(j)}(t) = \omega(j,i)\cdot\|T_i(\mathbf{f}_j(t)) - \mathbf{f}_j(t)\| + \operatorname{Cost}(j,i,t)$$

**Definition 5.10 (Discharge).** When Δ_i(t) exceeds threshold θ, a discharge event fires toward j* = argmax_{j ∈ 𝒩_i} δ_i^{(j)}(t), taking the form of reduced ω(j*, i) or increased ‖T_i(**f**_{j*}) − **f**_{j*}‖.

**Corollary 5.11 (Intimate as discharge target).** The neighbor j with largest ω(j,i) has the largest δ_i^{(j)}(t) and is therefore the structural discharge target. This follows from Definition 5.9 and requires no assumption about i's character.

### 5.3 Strategy Collision

**Definition 5.12 (Collision harm).**

$$H(i \to j) = \underbrace{\|T_j(\mathbf{f}_i(t)) - \mathbf{f}_i(t)\|}_{\text{distortion of i's form by j}} + \underbrace{\|\nabla u_j - \nabla u_i\|}_{\text{strategy incompatibility}}$$

where ∇u_k is the gradient direction of k's update rule. In general H(i → j) ≠ H(j → i).

**Proposition 5.13 (Communication rate).** For subjects i,j with H(i,j) > 0, harm rate is:

$$\dot{H}(i,j) = k_{ij} \cdot H(i \to j)$$

where k_{ij} is the transaction rate. Increasing communication increases harm proportionally unless T_i, T_j or the update rules change.

---

## 6. Multi-Network Participation

### 6.1 Form Portfolio

**Assumption A8.** Subject i participates in K networks {B_1, …, B_K}, each with subspace 𝒱_{Bm}, projection F_{Bm}, and operator T_{Bm}. Subject i maintains form portfolio {**f**_i^(m)(t)}, each evolving under A5 applied independently.

**Definition 6.1 (Grammatical overlap).** ρ_{ml} = dim(𝒱_{Bm} ∩ 𝒱_{Bl}) / min(dim(𝒱_{Bm}), dim(𝒱_{Bl})) ∈ [0,1].

**Definition 6.2 (Fragmentation cost).** Φ_i = Σ_m ‖**s**_i − F_{Bm}(**s**_i)‖² > 0.

**Lemma 6.3.** Σ_m ‖**s**_i − **f**_i^(m)(t)‖² ≥ Φ_i > 0 for all t.

*Proof.* Lemma 3.4 applied per network. ∎

**Theorem 6.4.** E[Φ_i] is strictly increasing in K and decreasing in mean overlap ρ̄.

*Proof.* Adding network B_{K+1} increases Φ_i by ‖(I − P_{K+1})**s**_i‖² > 0 (Lemma 3.1). This increment decreases as ρ_{K+1,m} → 1, approaching zero only in the degenerate case ρ = 1 (identical subspaces). In the generic case each new network adds strictly positive deficit. ∎

**Theorem 6.5 (Competing attractors).** If dist(Fix(T_{Bm}), Fix(T_{Bl})) > 0 in the shared embedding, then ∇W_i^(m) and ∇W_i^(l) are not collinear and the form portfolio has no joint equilibrium.

*Proof.* Theorem 4.1 applied per network gives **f**_i^(m)(t) → Fix(T_{Bm}) and **f**_i^(l)(t) → Fix(T_{Bl}). If Fix(T_{Bm}) ≠ Fix(T_{Bl}), the gradient directions are not collinear and no single **f** satisfies both simultaneously. ∎

### 6.2 Grammar Estimation Error

**Assumption A9.** Subject i holds estimated operator T̂_{Bm}^(i) with estimation error:

$$\varepsilon_i^{(m)} = \|T_{B_m} - \hat{T}_{B_m}^{(i)}\|_{\text{op}}$$

Under A9, the Want-update ascends on σ(**f**, T̂^(i)) rather than σ(**f**, T_{Bm}), converging to Fix(T̂^(i)) rather than Fix(T_{Bm}).

**Lemma 6.6 (Estimation indistinguishability).** Subject i cannot distinguish, from σ alone, whether low signal results from a suboptimal form or an incorrect grammar estimate.

*Proof.* σ depends only on ‖T_{Bm}(**f**_i) − **f**_i‖. This is low when **f**_i is far from Fix(T_{Bm}), which occurs both when **f**_i ∉ Fix(T_{Bm}) and when the subject correctly reaches Fix(T̂^(i)) but T̂^(i) ≠ T_{Bm}. ∎

**Theorem 6.7 (Wrong attractor convergence).** For ε_i^(m) > 0, the subject converges to Fix(T̂_{Bm}^(i)) ≠ Fix(T_{Bm}). The excess deficit at convergence is at least dist(Fix(T̂^(i)), Fix(T_{Bm})) ≥ 0.

**Corollary 6.8.** A subject may become *confidently wrong*: reaching Fix(T̂^(i)) with σ ≈ 1 while T̂^(i) ≠ T_{Bm}. By Lemma 6.6, this state is phenomenologically identical to correct convergence.

---

## 7. The Legibility Trap

### 7.1 Prior-Conditioned Signal

**Assumption A10.** When j holds consolidated prior Π_j(i), the received recognition signal is:

$$\sigma_{\text{trap}}(\mathbf{f}_i, T_j, \Pi_j(i)) = \exp\!\left(-\frac{\|T_j\mathbf{f}_i - \mathbf{f}_i\|^2}{2\varepsilon^2}\right) \cdot \exp\!\left(-\frac{\|\mathbf{f}_i - \Pi_j(i)\|^2}{2\gamma^2}\right)$$

where γ > 0 is the *prior-rigidity parameter*. As γ → ∞, σ_trap → σ (no prior effect). As γ → 0, σ_trap → 0 for all **f**_i ≠ Π_j(i) (total prior lock).

**Definition 7.1 (Membership).** Subject i retains membership in network B if σ_trap(**f**_i(t), T_B, Π_B(i)) ≥ θ_B.

### 7.2 Trap Attractor

**Definition 7.2 (Trap attractor).** Under A10, the Want-dynamics attractor is:

$$\mathbf{f}_i^* = \underset{\mathbf{f} \in \mathcal{V}_B}{\arg\max}\;\sigma_{\text{trap}}(\mathbf{f}, T_j, \Pi_j(i))$$

Setting ∇σ_trap = **0**:

$$\frac{1}{\varepsilon^2}(T_j-I)^\top(T_j\mathbf{f} - \mathbf{f}) + \frac{1}{\gamma^2}(\mathbf{f} - \Pi_j(i)) = \mathbf{0}$$

**Theorem 7.3 (Enclosure).** The trap attractor satisfies: (i) **f**_i^* → Π_j(i) as γ → 0; (ii) **f**_i^* → P_{Fix(T_j)}(Π_j(i)) as γ → ∞.

*Proof.* The first-order condition is A**f** = b where A = (T_j−I)^⊤(T_j−I) + (ε²/γ²)I. A is positive definite (positive semidefinite plus positive multiple of I), hence invertible. As γ → 0, the term ε²/γ² dominates, pulling **f**_i^* → Π_j(i). As γ → ∞, the prior-consistency term vanishes and **f**_i^* → argmin_{**f** ∈ Fix(T_j)} ‖**f** − Π_j(i)‖. ∎

### 7.3 Escape Dynamics

**Theorem 7.4 (Incremental escape fails).** For γ sufficiently small, no continuous path from **f**_i^* to any **f** with ‖**f** − Π_j(i)‖ > δ maintains σ_trap ≥ θ_B throughout.

*Proof.* Along any path moving away from Π_B(i), the prior-consistency term exp(−‖**f**(τ) − Π_B(i)‖²/2γ²) decreases monotonically. The grammar-legibility term is bounded above by 1. So:

$$\sigma_{\text{trap}}^{\max}(\delta) = \exp\!\left(-\frac{\delta^2}{2\gamma^2}\right)$$

For γ small enough that exp(−δ²/2γ²) < θ_B, membership is lost before reaching distance δ. ∎

**Theorem 7.5 (Rebellion discontinuity).** The minimum form-displacement forcing a prior-update is:

$$\Delta_{\min} = \gamma\sqrt{-2\ln\!\left(\frac{\theta_B}{\sigma_1(t^*)}\right)}$$

where σ_1(t*) = exp(−‖T_B**f**_i(t*) − **f**_i(t*)‖²/2ε²) is the grammar-legibility term at the moment of displacement.

*Proof.* The total signal at displacement Δ is σ_1(t*) · exp(−Δ²/2γ²). For this to fall below θ_B (triggering membership crisis and prior-revision):

$$\sigma_1(t^*) \cdot \exp\!\left(-\frac{\Delta^2}{2\gamma^2}\right) < \theta_B \implies \Delta > \gamma\sqrt{-2\ln\!\left(\frac{\theta_B}{\sigma_1(t^*)}\right)} = \Delta_{\min}$$

Any displacement Δ < Δ_min keeps σ_trap ≥ θ_B and is absorbed without triggering prior-revision. ∎

**Corollary 7.6.** Gradual change is self-defeating: each small move away from Π_B(i) reduces σ_trap, which under A5 creates gradient pressure back toward Π_B(i). The Want-pressure that drives the escape also drives the retreat. Prior-revision requires a single displacement exceeding Δ_min.

---

## 8. Network Preference and Trap Valuation

### 8.1 Presentational Budget

**Assumption A11.** Subject i holds a finite presentational budget Ω_i^P distributed by weights α_i = (α_i^(1), …, α_i^(K)) with α_i^(m) ≥ 0 and Σ_m α_i^(m) = 1. Effective form quality in B_m is q_i^(m) = α_i^(m) · Ω_i^P. The effective learning rate in B_m is η_m = η · α_i^(m).

**Definition 8.1.** B* = argmax_m α_i^(m) is the *dominant network* for subject i.

**Theorem 8.2 (Preferential convergence).** Under A11, **f**_i(t) converges toward Fix(T_{B*}) more rapidly than toward Fix(T_{Bm}) for any under-invested B_m. As α_i^(m) → 0, membership in B_m is threatened.

*Proof.* For small α_i^(m), η_m ≈ 0 and the gradient step in B_m is negligible. The form drifts without active maintenance near Fix(T_{Bm}) ∩ Π_{Bm}(i). A drifting form eventually crosses threshold θ_{Bm} (Definition 7.1), triggering expulsion. ∎

**Theorem 8.3 (Grammar dominance).** Under preferential convergence, T_{B*} shapes forms presented in all networks, producing collision harm H(i → B_m) > 0 for under-invested B_m even without direct strategy incompatibility.

*Proof.* By Theorem 8.2, **f**_i(t) ≈ Fix(T_{B*})-shaped. When presented in B_m, collision harm H(i → B_m) = ‖T_{Bm}(**f**_i) − **f**_i‖ + ‖∇u_{Bm} − ∇u_i‖ > 0 since **f**_i was optimized for T_{B*} ≠ T_{Bm}. ∎

### 8.2 Trap Alignment

**Definition 8.4 (Trap alignment).** 𝒜_i^(B) = exp(−‖**s**_i − Π_B(i)‖²/2κ²) ∈ (0,1].

**Theorem 8.5.** For 𝒜_i^(B) ≈ 1, σ_trap ≈ 1 regardless of whether recognition is accurate (T_B ≈ I) or prior-consistent by coincidence (T_B ≠ I but Π_B(i) ≈ **s**_i). These cases are indistinguishable from the signal.

*Proof.* When Π_B(i) ≈ **s**_i and **f**_i ≈ F_B(**s**_i), both the grammar-legibility and prior-consistency terms in σ_trap are near 1. The signal encodes neither the accuracy of T_B nor the structural source of the high return. ∎

**Assumption A12 (Stability preference).** Some subjects include a stability term in their objective:

$$\mathcal{L}_i^{\text{stab}} = \lambda_S \cdot \left(-\operatorname{Var}_t[\sigma_{\text{trap}}(\mathbf{f}_i(t), T_B, \Pi_B(i))]\right)$$

**Theorem 8.6.** For high λ_S, the trap attractor **f**_i^* (which keeps **f**_i near Π_B(i)) is preferred over volatile accurate recognition. The stable trap suppresses deficit discharge oscillations.

**Theorem 8.7 (Self-reinforcing preference).** A subject with high λ_S concentrates α_i^(m) toward the dominant trap-network over time. Under A5, the trap-dominant network B* returns consistently high σ_trap, attracting further investment. The portfolio collapses toward a single dominant network.

**Assumption A13 (Trap-aversion).** Subject i carries weight λ_A^(m) ≥ 0 per network B_m. The trap-aversion term is:

$$\mathcal{L}_i^{\text{av}} = -\lambda_A^{(m)} \cdot \frac{1 - \mathcal{A}_i^{(B_m)}}{\gamma_m^{-1} + \eta_0}$$

**Definition 8.8 (Golden cage).** B_m is a *golden cage* for i if it provides high W_i^(m) and high trap cost simultaneously. The equilibrium α_i^(m) is an interior solution determined by the ratio λ_A^(m)/λ_W.

---

## 9. Meta-Awareness and the Disclosure Gradient

The framework so far models subjects as permanently governed by the Want-gradient: **f**_i(t) ascends W_i regardless of whether the subject has evidence that the gap is irreducible. This section introduces a second-order state M_i that captures subjects who have internalized the structural fact of Theorem 3.5 and reoriented their behavioral dynamics accordingly. The irreducibility result does not change; what changes is the subject's relationship to it.

### 9.1 The Meta-Awareness State

**Definition 9.1 (Empirical deficit floor).** For subject i over window τ, define:

$$\hat{\ell}_i(\tau, t) = \min_{t' \in [t-\tau,\, t]} \Delta_i(t')$$

This is the minimum total deficit observed over the window — the lowest the deficit has fallen regardless of which strategy was in use.

**Assumption A14 (Meta-awareness transition).** Subject i maintains a binary state M_i(t) ∈ {0, 1}, initially M_i = 0. The transition M_i: 0 → 1 fires at time t* when:

$$\hat{\ell}_i(\tau, t^*) \geq \theta_M$$

for threshold θ_M > 0 and window τ > 0. That is: the subject has observed that the deficit floor has not fallen below θ_M over an interval long enough to span multiple strategy iterations. The transition is one-directional within a grammar context; conditions for reversion are discussed in Remark 9.9.

In state M_i = 1, the subject's update rule (A5) is replaced by the *disclosure gradient*:

$$\mathbf{f}_i(t+1) = \mathbf{f}_i(t) - \eta' \nabla_{\mathbf{f}} \|\mathbf{f}_i(t) - F_B(\mathbf{s}_i)\|^2 = \mathbf{f}_i(t) - 2\eta'(\mathbf{f}_i(t) - F_B(\mathbf{s}_i))$$

where F_B(**s**_i) = P_{𝒱_B}(**s**_i) is the orthogonal projection of **s**_i onto 𝒱_B — the *disclosure optimum*, the form in 𝒱_B closest to **s**_i.

*Note.* The disclosure gradient requires the subject to have introspective access to the direction toward F_B(**s**_i) in form-space — a felt sense of which forms are more authentically self-proximate. The formal target F_B(**s**_i) need not be explicitly computed; gradient descent on channel 1 deficit within 𝒱_B converges to the same point.

### 9.2 Convergence and Deficit Structure Under M_i = 1

**Theorem 9.2 (Disclosure optimum convergence).** Under A14 in state M_i = 1, **f**_i(t) converges geometrically to F_B(**s**_i). The convergence rate is (1 − 2η')^t for η' ∈ (0, 1).

*Proof.* The update rule is a contraction toward F_B(**s**_i):

$$\|\mathbf{f}_i(t+1) - F_B(\mathbf{s}_i)\| = \|(1-2\eta')(\mathbf{f}_i(t) - F_B(\mathbf{s}_i))\| = |1-2\eta'| \cdot \|\mathbf{f}_i(t) - F_B(\mathbf{s}_i)\|$$

For η' ∈ (0,1), |1 − 2η'| < 1 and the sequence converges to F_B(**s**_i). ∎

**Theorem 9.3 (Deficit profile at convergence).** At **f**_i(∞) = F_B(**s**_i):

1. *Channel 1:* ‖**s**_i − F_B(**s**_i)‖ = ‖**r**_i‖. This is the minimum achievable channel 1 deficit over all **f** ∈ 𝒱_B (by definition of orthogonal projection). It is strictly positive by Lemma 3.1.

2. *Channel 2:* ‖T_B(F_B(**s**_i)) − F_B(**s**_i)‖ ≥ 0, with equality if and only if F_B(**s**_i) ∈ Fix(T_B). In general F_B(**s**_i) ∉ Fix(T_B), so channel 2 deficit at the disclosure optimum is strictly positive.

3. *Recognition signal:* σ(F_B(**s**_i), T_j) ≤ 1, with equality iff F_B(**s**_i) ∈ Fix(T_j). In general the signal at the disclosure optimum is strictly less than the signal at Fix(T_j).

*Proof.* (1) follows from Lemma 3.1 and the definition of F_B. (2) follows because F_B(**s**_i) ∈ 𝒱_B is not constrained to Fix(T_B); generically **s**_i ∉ 𝒱_B implies no special relationship between P_{𝒱_B}(**s**_i) and the eigenspaces of T_B. (3) follows from Definition 2.2. ∎

**Corollary 9.4 (Structural tradeoff).** The M_i = 0 and M_i = 1 objectives are structurally opposed:

- *M_i = 0:* **f**_i → Fix(T_B). Maximizes recognition signal σ. Channel 1 deficit ‖**s**_i − Fix(T_B)‖ ≥ ‖**r**_i‖, possibly much larger.
- *M_i = 1:* **f**_i → F_B(**s**_i). Minimizes channel 1 deficit at ‖**r**_i‖. Recognition signal σ(F_B(**s**_i), T_j) ≤ 1, generally lower than at Fix(T_B).

The meta-aware subject accepts lower recognition signal in exchange for minimum proximity-to-self. The gap remains — Theorem 3.5 is unchanged — but the subject is no longer optimizing to close it via the signal.

### 9.3 Interaction with the Legibility Trap

**Theorem 9.5 (Trap disruption under meta-awareness).** Let **f**_i^* be the trap attractor under A10, and let F_B(**s**_i) be the disclosure optimum. If ‖F_B(**s**_i) − **f**_i^*‖ > Δ_min (Theorem 7.5), then the transition M_i: 0 → 1 automatically triggers a membership crisis and forces prior-revision.

*Proof.* In state M_i = 1, the disclosure gradient points from **f**_i^* toward F_B(**s**_i). The path between these points passes through distance Δ_min from Π_B(i) by the triangle inequality when ‖F_B(**s**_i) − **f**_i^*‖ > Δ_min. By Theorem 7.5, any displacement exceeding Δ_min triggers σ_trap < θ_B, precipitating the membership crisis. The subject does not choose to rebel; the reorientation of objective produces the discontinuous displacement as a structural consequence. ∎

*Remark 9.6.* Theorem 9.5 distinguishes two qualitatively different causes of prior-revision. In the M_i = 0 case (Corollary 7.6), the subject attempts escape and is driven back by the Want-gradient; rebellion requires a single volitional jump exceeding Δ_min. In the M_i = 1 case, the subject is not attempting escape at all — they are reorienting toward F_B(**s**_i), and the trap disruption is a side effect. From the network's position, both cases are observationally identical: a sudden form-displacement exceeding Δ_min. The internal mechanism is invisible in the signal.

**Corollary 9.7 (Meta-awareness decouples trap reinforcement).** In state M_i = 0, the Want-gradient drives **f**_i toward Fix(T_B) while the trap attractor holds **f**_i near Π_B(i). These are compatible when Fix(T_B) ≈ Π_B(i) — the field and the prior reinforce each other. In state M_i = 1, the disclosure gradient is independent of both Fix(T_B) and Π_B(i). The field's S5 pull and the trap's prior-consistency penalty no longer shape the subject's trajectory. The two reinforcing forces that produced S5 convergence and legibility-trap enclosure both lose their grip simultaneously.

### 9.4 Deficit Accumulation Under M_i = 1

**Theorem 9.8 (Deficit floor under meta-awareness).** In state M_i = 1, the total deficit satisfies:

$$\Delta_i(\infty) = \lambda_1\|\mathbf{r}_i\| + \lambda_2\|T_B(F_B(\mathbf{s}_i)) - F_B(\mathbf{s}_i)\| + \lambda_3 \exp\!\left(-\frac{\|\mathbf{r}_i\|^2}{2\kappa^2}\right) > 0$$

The deficit is strictly positive (Proposition 5.8 still applies) but the channel 1 component is minimized. The channel 3 component exp(−‖**r**_i‖²/2κ²) is maximized relative to any M_i = 0 trajectory, since exposure is greatest at F_B(**s**_i).

*Proof.* Direct substitution of **f**_i(∞) = F_B(**s**_i) into Definition 5.7. Channel 1 = ‖**s**_i − F_B(**s**_i)‖ = ‖**r**_i‖ by Theorem 9.3(1). Channel 3 = exp(−‖F_B(**s**_i) − **s**_i‖²/2κ²) = exp(−‖**r**_i‖²/2κ²), maximized because ‖**r**_i‖ is the minimum achievable distance — no form in 𝒱_B is closer to **s**_i. ∎

*Remark.* The meta-aware subject carries minimum channel 1 deficit and maximum channel 3 cost. The two antiparallel gradients in Definition 5.7 are not resolved — the structural opposition between lossiness and exposure is not eliminated by meta-awareness. What changes is that the subject is no longer trying to resolve the opposition via recognition signal optimization; they are resting at the point that minimizes one channel at the cost of maximizing the other.

### 9.5 Scope and Limits

*Remark 9.9 (Transition accuracy).* The meta-awareness transition fires when the empirical deficit floor exceeds θ_M over window τ. This condition does not guarantee that the deficit is *structurally* irreducible — a subject in a particularly poor grammar fit, or running a poor strategy, might accumulate a high deficit floor without the gap being irreducible in the sense of Theorem 3.5. The transition condition is an empirical inference that can be correct (the subject correctly identifies irreducibility) or incorrect (the subject mistakes strategy failure for structural constraint). The model does not adjudicate this; it characterizes the behavioral consequences of the transition regardless of its accuracy.

*Remark 9.10 (Reversion).* A14 specifies only the 0 → 1 transition. Reversion M_i: 1 → 0 — in which a subject who had accepted the gap's irreducibility returns to signal-optimization — is not modeled here. Sufficient conditions for reversion likely include: entry into a new grammar context where fix(T_new) ≈ F_{B_new}(**s**_i) (the signal and disclosure optima nearly coincide); or a significant revision of **s**_i itself (which would require relaxing A1). Both are directions for extension.

*Remark 9.11 (Relationship to A1).* The meta-awareness transition does not change A1 — **s**_i remains fixed over the modeled timescale. The change is entirely in the update rule: from ascending W_i (signal from others) to descending ‖**f**_i − F_B(**s**_i)‖ (proximity to own projection). A1 commits to the inexhaustibility of **s**_i and its approximate fixedness during the dynamics, not to the self's independence from social formation. The meta-aware subject is not one who has discovered a pre-social essence; they are one who has stopped treating the recognition signal as the primary instrument for navigating the gap between whatever they are — however socially constituted — and what any given grammar can hold. The gap is acknowledged rather than optimized against.

---

## Appendix A: Modeling Assumptions Summary

| Label | Content |
|---|---|
| A1 | Subjects as fixed **s**_i and variable **f**_i(t) in Hilbert space ℋ |
| A2 | Grammar B as finite-dimensional subspace 𝒱_B with projection F_B |
| A3 | Generic position: **s**_i ∉ 𝒱_B a.e. |
| A4 | Distortion operator T_B : 𝒱_B → 𝒱_B bounded linear |
| A5 | Want dynamics: gradient ascent on W_i |
| A6 | Concealment: competing gradient C_i pushing **f**_i away from **s**_i |
| A7 | Mean-field approximation: E[|𝒩_k^{field}|] = |𝒩_k| · M/N |
| A8 | Multi-network portfolio: subject maintains K forms |
| A9 | Grammar estimation: subject holds T̂^(i) with error ε_i^(m) |
| A10 | Prior-conditioned signal σ_trap with rigidity parameter γ |
| A11 | Finite presentational budget Ω_i^P with preference weights α_i |
| A12 | Stability preference: variance-minimization term in objective |
| A13 | Trap-aversion: penalty term for low-alignment, high-rigidity networks |
| A14 | Meta-awareness state M_i ∈ {0,1}; transition condition on empirical deficit floor; disclosure gradient replaces Want-gradient in state M_i = 1 |

*Note on A1.* A1 carries two commitments. The first is *inexhaustibility*: the combination of biological substrate, social formation, and unrepeatable experience produces a self no finite grammar can fully encode. This does not require the self to be independent of social formation — a self partly constituted by prior social processes still exceeds any given current grammar generically, because the space of possible selves is infinite-dimensional and any grammar is finite. The second commitment is *approximate fixedness over the timescale of the modeled dynamics*: recognition shapes **f**_i(t) but not **s**_i during the period under analysis. This is a modeling approximation — the self changes more slowly than the social dynamics being modeled — not a claim about origins or the ultimate independence of the self from society. Together these commitments are consistent with strong social constructivism about formation: Foucault can be right that power/knowledge regimes shape subjects, and Theorem 3.5 still holds, because the relevant question is not whether society shaped the self but whether the shaped product is now exhaustible by the current grammar. It is not, generically. The cage is a cage even if society built you.

*Note on A7.* The mean-field approximation is sufficient for the FS5g–FS5i chain. For sparse, clustered, or scale-free graphs, degree-distribution corrections apply to the growth rate and power-law exponent but not to the qualitative self-acceleration result.