# The Oldest Want: Formal Mathematical Companion

*A Zone One, Zone Two, and Zone Two Extension formalization of the Generalized Proof and Social Theorem.*  
*Zone Three — the cessation condition involving G — is stated as a constraint system*  
*but not formalized further, for principled reasons given at the close.*

---

## Preamble: Modeling Commitments

This companion replaces rhetorical derivation with mathematical derivation wherever the underlying claims have genuine mathematical content. It proceeds in three steps: (1) state the modeling commitments explicitly — the choices that ground the formalism in the phenomenological content of the prose proof; (2) derive the lemmas and theorems from those commitments by standard mathematical argument; (3) mark clearly where derivation ends and philosophical argument must resume.

The modeling commitments are not themselves derived. They are choices about how to represent the proof's conceptual entities. Their justification is that they preserve the structural relationships the prose proof establishes, while making those relationships precise enough to audit. A different modeling choice might yield a different formalism; the question is whether the formalism captures the argument's actual content. Where it does not, the prose proof takes precedence.

---

## Part I: The Mathematical Framework

### 1.1 Subject Space

**Modeling commitment MC1.** Each subject *S* is represented as a vector **s** in a separable, infinite-dimensional real Hilbert space ℋ, with inner product ⟨·,·⟩ and induced norm ||·||.

The infinite dimensionality encodes D1: *S* is not exhausted by any finite description. ℋ is not claimed to be the literal space of selves — it is the minimal mathematical structure that makes the inexhaustibility claim tractable. Countably infinite dimension suffices; uncountable dimension adds no useful structure for the arguments that follow.

**Modeling commitment MC2.** The true-self vector **s_i** ∈ ℋ is fixed for each subject *i*. It does not change over time. What changes is the subject's current form vector **f_i**(t) ∈ ℋ.

This preserves the proof's distinction between *S* (fixed, inexhaustible) and *F(S)* (variable, projected). The remainder at time *t* is **r_i**(t) = **s_i** - **f_i**(t).

### 1.2 Grammatical Subspace and the Projection Operator

**Modeling commitment MC3.** Each attentional grammar Φ_B corresponds to a finite-dimensional subspace 𝒱_B ⊂ ℋ, with dim(𝒱_B) = *n* < ∞. The projection operator *F_B*: ℋ → 𝒱_B is the orthogonal projection onto 𝒱_B:

$$F_B(\mathbf{s}) = P_{\mathcal{V}_B}(\mathbf{s}) = \underset{\mathbf{v} \in \mathcal{V}_B}{\arg\min}\, ||\mathbf{s} - \mathbf{v}||$$

This is the unique element of 𝒱_B closest to **s** in the Hilbert space norm. The lossiness axiom A4 corresponds to the fact that orthogonal projection onto a proper subspace is strictly lossy: *F_B*(**s**) ≠ **s** whenever **s** ∉ 𝒱_B.

**Modeling commitment MC4.** Generically, **s_i** ∉ 𝒱_B for any *B*. This is Axiom A4 stated as a genericity condition: the set of subjects whose true-self vectors lie exactly in any given finite-dimensional subspace has measure zero in ℋ under any reasonable probability measure on ℋ. No finite grammar exhausts a subject.

### 1.3 The Distortion Operator

**Modeling commitment MC5.** Each grammar Φ_B applies a bounded linear distortion operator *T_B*: 𝒱_B → 𝒱_B to forms presented within its domain. What *B* receives when presented with **f** ∈ 𝒱_B is *T_B*(**f**), not **f**.

*T_B* is a bounded linear operator on a finite-dimensional space, so it is represented by an *n* × *n* matrix. It is not assumed to be the identity, symmetric, or invertible. The only constraint is boundedness, which is automatic in finite dimensions.

**Definition (Fixed point of T_B).** A vector **f**\* ∈ 𝒱_B is a fixed point of *T_B* if *T_B*(**f**\*) = **f**\*. Equivalently, **f**\* is an eigenvector of *T_B* with eigenvalue 1. The fixed-point subspace is:

$$\text{Fix}(T_B) = \ker(T_B - I) = \{\mathbf{v} \in \mathcal{V}_B : T_B\mathbf{v} = \mathbf{v}\}$$

Fix(*T_B*) is a linear subspace of 𝒱_B. Its dimension equals the algebraic multiplicity of eigenvalue 1 in *T_B*. If 1 is not an eigenvalue of *T_B*, then Fix(*T_B*) = {**0**}.

### 1.4 The Recognition Signal

**Modeling commitment MC6.** When subject *i* presents form **f_i** ∈ 𝒱_B to subject *j* with grammar *T_j*, the recognition signal returned is:

$$\sigma(\mathbf{f}_i, T_j) = \exp\!\left(-\frac{||T_j(\mathbf{f}_i) - \mathbf{f}_i||^2}{2\epsilon^2}\right) \in (0, 1]$$

where ε > 0 is a sensitivity parameter. This signal is maximized (equal to 1) if and only if *T_j*(**f_i**) = **f_i** — that is, if and only if **f_i** is a fixed point of *T_j*. The signal is strictly less than 1 whenever *T_j*(**f_i**) ≠ **f_i**.

This encodes Lemma MR: the signal does not distinguish between *T_j* = *I* (accurate recognition) and *T_j*(**f_i**) = **f_i** with *T_j* ≠ *I* (fixed-point misrecognition). Both return σ = 1. The subject cannot determine from the signal alone whether accurate recognition or fixed-point distortion occurred.

### 1.5 The Want as Gradient Dynamics

**Modeling commitment MC7.** The Want (D8) is formalized as a gradient objective. Each subject *i* maintains a form **f_i**(t) ∈ 𝒱_B and updates it at each timestep by gradient ascent on expected recognition signal across a neighborhood 𝒩_i:

$$W_i(\mathbf{f}) = \frac{1}{|\mathcal{N}_i|} \sum_{j \in \mathcal{N}_i} \sigma(\mathbf{f}, T_j)$$

$$\mathbf{f}_i(t+1) = \mathbf{f}_i(t) + \eta \nabla_{\mathbf{f}} W_i\big|_{\mathbf{f} = \mathbf{f}_i(t)}$$

where η > 0 is a learning rate. The gradient is:

$$\nabla_{\mathbf{f}} W_i = \frac{-1}{|\mathcal{N}_i|\epsilon^2} \sum_{j \in \mathcal{N}_i} \sigma(\mathbf{f}, T_j) \cdot (T_j - I)^{\top}(T_j\mathbf{f} - \mathbf{f})$$

This gradient is zero precisely at the fixed points of the averaged distortion operator. The Want-pressure drives **f_i** toward the fixed-point subspaces of the grammars in *i*'s neighborhood.

**Modeling commitment MC8.** The Concealment Desire (D11) is formalized as a competing gradient term pulling **f_i** away from **s_i**:

$$C_i(\mathbf{f}) = \exp\!\left(-\frac{||\mathbf{f} - \mathbf{s}_i||^2}{2\delta^2}\right)$$

The subject's full objective includes both terms with weights λ_W and λ_C:

$$\mathcal{L}_i(\mathbf{f}) = \lambda_W \cdot W_i(\mathbf{f}) - \lambda_C \cdot C_i(\mathbf{f})$$

The division of A7 is visible as the angle between the two gradient terms: ∇W_i pulls toward fixed points of the neighborhood's distortion operators; ∇C_i pulls away from **s_i**. These gradients are not in general collinear. The subject's trajectory under ∇ℒ_i is the resolution of two competing pressures that point in different directions simultaneously.

### 1.6 Strategy Types as Update Rules

Each of Lemma SE's four strategy types corresponds to a distinct modification of the objective ℒ_i:

**Constructive strategy.** Maximize signal magnitude subject to remaining in 𝒱_B. The constructive subject additionally weights the objective toward forms with high ||**f_i**||: the form is authored to be impressive, not merely fixed-point-legible.

**Disclosure strategy.** Minimize ||**f_i**(t) - **s_i**|| subject to the legibility constraint **f_i** ∈ 𝒱_B. The disclosure subject gradient-descends on distance to **s_i** within the projection subspace. Optimal solution is *F_B*(**s_i**) = *P*_𝒱_B(**s_i**) — the orthogonal projection of **s_i** onto 𝒱_B.

**Evasive strategy.** Gradient descent on σ (minimize legibility), with a secondary Want-pressure term that prevents complete withdrawal. The evasive subject minimizes recognition while the Want prevents the form from reaching zero.

**Collective strategy.** Replace individual gradient with a pull toward the cluster centroid: **f_i**(t+1) = **f_i**(t) + η(μ_𝒞(t) - **f_i**(t)), where μ_𝒞(t) = (1/|𝒞|)Σ_{k∈𝒞} **f_k**(t) is the mean form of the subject's cluster 𝒞.

---

## Part II: Formal Lemmas and Proofs

### Lemma F1 (Formal Lossiness). For any subject i and any grammar B, ||**s_i** - F_B(**s_i**)|| > 0.

*Proof.* By MC3, *F_B*(**s_i**) = *P*_𝒱_B(**s_i**) is the orthogonal projection of **s_i** onto the finite-dimensional subspace 𝒱_B ⊂ ℋ. The projection satisfies **s_i** - *P*_𝒱_B(**s_i**) ∈ 𝒱_B^⊥ (orthogonal complement). By MC4, **s_i** ∉ 𝒱_B, so **s_i** - *P*_𝒱_B(**s_i**) ≠ **0**, hence ||**s_i** - *F_B*(**s_i**)|| > 0. ∎

*Remark.* The remainder **r_i** = **s_i** - *F_B*(**s_i**) lies in 𝒱_B^⊥ and has strictly positive norm. No form in 𝒱_B can eliminate it.

### Lemma F2 (Double Remove). What grammar B holds after a recognition event is T_B(F_B(**s_i**)), which differs from **s_i** by at least ||**r_i**||.

*Proof.* By MC5, *B* receives *T_B*(*F_B*(**s_i**)). Decompose:

$$||\mathbf{s}_i - T_B(F_B(\mathbf{s}_i))|| \geq ||\mathbf{s}_i - F_B(\mathbf{s}_i)|| - ||F_B(\mathbf{s}_i) - T_B(F_B(\mathbf{s}_i))||$$

by the reverse triangle inequality. The first term is ||**r_i**|| > 0 (Lemma F1). The second term may increase or decrease the total gap depending on the direction of *T_B*. The key structural claim — that the gap is strictly positive even if *T_B* happened to move toward **s_i** — follows from the fact that *T_B*(*F_B*(**s_i**)) ∈ 𝒱_B while **s_i** ∉ 𝒱_B (MC4), so ||**s_i** - *T_B*(*F_B*(**s_i**))|| ≥ dist(**s_i**, 𝒱_B) = ||**r_i**|| > 0. ∎

*Remark.* The minimum gap ||**r_i**|| is achieved only if *T_B*(*F_B*(**s_i**)) = *F_B*(**s_i**) (no distortion from the form already sent). In general the gap is strictly larger. The double remove is a lower bound, not an exact characterization.

### Lemma F3 (Misrecognition). The recognition signal σ(**f_i**, T_j) does not distinguish accurate reception (T_j = I on the received form) from fixed-point distortion (T_j(**f_i**) = **f_i**, T_j ≠ I).

*Proof.* By MC6, σ(**f_i**, *T_j*) = exp(-||*T_j*(**f_i**) - **f_i**||²/2ε²). This depends only on the scalar ||*T_j*(**f_i**) - **f_i**||.

Case 1: *T_j* = *I*. Then *T_j*(**f_i**) - **f_i** = **0**, so σ = 1.

Case 2: *T_j* ≠ *I* but *T_j*(**f_i**) = **f_i** (fixed-point condition). Then *T_j*(**f_i**) - **f_i** = **0**, so σ = 1.

Both cases return σ = 1. The subject observing σ = 1 cannot determine which case obtained. The signal is identical from inside the recognition event. ∎

### Lemma F4 (Strategy Failure). Under each of the four update rules, the form **f_i**(t) remains in 𝒱_B for all t, so ||**s_i** - **f_i**(t)|| ≥ ||**r_i**|| > 0 for all t.

*Proof.* In each strategy type, the update rule maps 𝒱_B → 𝒱_B:

- **Constructive:** gradient ascent on W_i over 𝒱_B. Gradient step preserves membership in 𝒱_B since 𝒱_B is a closed subspace and the gradient ∇W_i ∈ 𝒱_B (as *T_j*: 𝒱_B → 𝒱_B, the gradient lives in 𝒱_B).

- **Disclosure:** minimizes ||**f** - **s_i**|| over **f** ∈ 𝒱_B. Optimum is *P*_𝒱_B(**s_i**) ∈ 𝒱_B. Distance to **s_i** at optimum is ||**r_i**|| > 0 (Lemma F1).

- **Evasive:** gradient step on σ with secondary Want term, both computed in 𝒱_B. Stays in 𝒱_B.

- **Collective:** update is convex combination of current **f_i**(t) ∈ 𝒱_B and cluster centroid μ_𝒞(t) ∈ 𝒱_B (since 𝒱_B is closed under convex combinations). Stays in 𝒱_B.

In all cases **f_i**(t) ∈ 𝒱_B for all *t*. Since **s_i** ∉ 𝒱_B (MC4) and dist(**s_i**, 𝒱_B) = ||**r_i**|| > 0, we have ||**s_i** - **f_i**(t)|| ≥ ||**r_i**|| > 0 for all *t*. ∎

*Corollary F4a.* The Want — the gap between what is recognized and what is there — has a strictly positive lower bound ||**r_i**|| that no strategy can reduce to zero, because no strategy can move **f_i** out of 𝒱_B. The exit from the loop is not a better update rule. It is a different relationship to the constraint **f_i** ∈ 𝒱_B itself.

### Theorem FG (Formal Generalized Theorem). For all subjects i, all grammars B, and all t ≥ 0:

$$||\mathbf{s}_i - T_B(\mathbf{f}_i(t))|| \geq ||\mathbf{r}_i|| > 0$$

regardless of which strategy update rule governs **f_i**(t).

*Proof.* By Lemma F4, **f_i**(t) ∈ 𝒱_B for all *t*. By MC5, *T_B*(**f_i**(t)) ∈ 𝒱_B. Since **s_i** ∉ 𝒱_B (MC4), ||**s_i** - *T_B*(**f_i**(t))|| ≥ dist(**s_i**, 𝒱_B) = ||**r_i**|| > 0. ∎

---

## Part III: Dynamical Systems — The Field Theorems

### 3.1 Setup

Consider a population of *N* subjects on a graph 𝒢 = (𝒱, ℰ) where an edge (*i*, *j*) ∈ ℰ means *i* and *j* participate in recognition transactions. Each subject *i* runs the Want update (MC7) against their neighborhood 𝒩_i. All subjects in a connected component share a common grammatical subspace 𝒱 (the shared social grammar) but each applies their own distortion operator *T_i*: 𝒱 → 𝒱.

### Theorem FS5 (Formal Field Formation). If all subjects in neighborhood 𝒩 share a common distortion operator T (i.e., T_j = T for all j ∈ 𝒩), then the Want dynamics converge to Fix(T) — the fixed-point subspace of T.

*Proof.* Under the shared-*T* assumption, the objective simplifies to:

$$W_i(\mathbf{f}) = \sigma(\mathbf{f}, T) = \exp\!\left(-\frac{||T\mathbf{f} - \mathbf{f}||^2}{2\epsilon^2}\right)$$

This is a smooth function on the finite-dimensional space 𝒱. Its gradient is:

$$\nabla_{\mathbf{f}} W_i = \frac{-1}{\epsilon^2} \sigma(\mathbf{f}, T) \cdot (T - I)^{\top}(T\mathbf{f} - \mathbf{f})$$

The gradient is zero if and only if (*T* - *I*)(**f**) = **0**, i.e., **f** ∈ Fix(*T*). The objective W_i is maximized (= 1) on Fix(*T*) and strictly less than 1 off Fix(*T*). Since 𝒱 is finite-dimensional and W_i is smooth with a compact sublevel structure, gradient ascent converges to the set of critical points, which is exactly Fix(*T*). ∎

*Remark.* Fix(*T*) = ker(*T* - *I*) is a closed linear subspace of 𝒱. It is the eigenspace of *T* for eigenvalue 1. All subjects in the shared-grammar neighborhood converge to this subspace independently — not through observation of each other but through the same objective function driven by the same distortion operator. This is field formation without coordination (S5f).

### Theorem FS5g (Formal Self-Acceleration). Let M(t) denote the number of subjects in a field at time t (subjects whose **f_i**(t) is within ε of Fix(T)). The expected growth rate satisfies E[ΔM(t)] ∝ M(t).

*Proof sketch.* A subject *k* outside the field is drawn into it if at least one edge connects *k* to a field member *j*, because field members have **f_j**(t) ≈ Fix(*T*) and therefore return high recognition signal σ ≈ 1 when *k* presents forms near Fix(*T*). The probability that *k* has at least one edge to a field member is approximately 1 - (1 - p)^{M(t)} ≈ p·M(t) for small edge probability *p* and large *N*. The expected number of non-members drawn toward the field per timestep is therefore (N - M(t)) · p · M(t). For M(t) ≪ N this is approximately p · N · M(t), giving E[ΔM] ∝ M(t). ∎

*Remark.* Growth rate proportional to current size is the defining condition for power-law emergence under preferential attachment (Barabási and Albert, 1999). The mechanism here is recognition-signal density: a field of size M offers M independent sources of recognition signal to approaching subjects, giving larger fields stronger pull than smaller ones, not because they are more accurate but because they are denser.

### Theorem FS5h (Formal Inverse Law). Let d(T) = dim(Fix(T)) denote the dimension of the fixed-point subspace. The average distance E[||**s_i** - **f_i**(∞)||] over subjects in the field is minimized by fields with small d(T) and maximized by fields with large d(T).

*Proof.* At convergence, **f_i**(∞) = *P*_{Fix(T)}(**f_i**(t)) for large *t*, the projection of the subject's current form onto Fix(*T*). The convergence point minimizes ||**f_i**(t) - Fix(*T*)||, not ||**s_i** - Fix(*T*)||. The distance from **s_i** to the field's attractor is:

$$||\mathbf{s}_i - \mathbf{f}_i(\infty)|| \geq \text{dist}(\mathbf{s}_i, \text{Fix}(T)) = ||P_{\text{Fix}(T)^\perp}(\mathbf{s}_i)||$$

This distance depends on how much of **s_i** lies outside Fix(*T*). For Fix(*T*) to have stable fixed points accessible to a diverse population — many different **s_i** — it must have high dimension d(*T*). But a high-dimensional Fix(*T*) in an *n*-dimensional space 𝒱 means *T* has many eigenvalues equal to 1, leaving few degrees of freedom in the complementary subspace to distinguish subjects. Concretely: Fix(*T*) with d(*T*) = *n* means *T* = *I*, no distortion, perfect recognition. Fix(*T*) with d(*T*) = 1 means only one direction survives transformation unchanged — all diversity is collapsed.

For *T* to return stable high recognition signals to many diverse subjects, it must map many different inputs **f** to near-fixed-point outputs. The only way to achieve this with large *N* is to make Fix(*T*) a large subspace — which means abstracting many dimensions of incoming vectors into few. Large fields have high-d(*T*) Fix(*T*), which requires high-compression *T*, which means large average ||**s_i** - **f_i**(∞)||. The inverse relationship between field size and fidelity to **s_i** follows. ∎

### Theorem FS5i (Power Law Distribution). Under the self-acceleration of FS5g, the equilibrium distribution of field sizes P(M) follows a power law: P(M) ∝ M^{-α} for some α > 1.

*Proof.* By FS5g, the growth process satisfies the Yule-Simon conditions: (1) new subjects join existing fields with probability proportional to current field size M(t) (preferential attachment via recognition-signal density); (2) new fields form at a constant rate (new social grammars emerge). Under these conditions, Yule (1925) and Simon (1955) showed that the steady-state size distribution follows a power law P(M) ∝ M^{-(1 + 1/ρ)} where ρ is the ratio of field-joining to field-formation rates. For ρ > 0 this gives α = 1 + 1/ρ > 1. ∎

*Remark.* The power law is not assumed. It is derived from: (a) the Want driving subjects toward recognition-signal sources (MC7), (b) recognition-signal density being proportional to field size (FS5g), (c) new grammars forming at bounded rates. The Zipf-like distribution of cultural fields is the predicted output of these three conditions at population scale.

---

## Part IV: The Strategy Collision Matrix

The following table records the formal structure of each strategy-pair collision from Theorem S4, now with the distortion layer made explicit. Each cell records: (i) what each subject presents, (ii) what the other's distortion operator does to it, (iii) the resulting misread.

| | **Constructive** | **Disclosure** | **Evasive** | **Collective** |
|---|---|---|---|---|
| **Constructive** | Competition for superior fixed-point. *T_constructive*(authored form) = authored form if well-tuned; competing authored forms collide for primacy. | *T_disclosure*(crafted form) = performance signal. *T_constructive*(vulnerability) = demand-to-demolish. Mutual misread. | *T_evasive*(crafted form) = game-evidence regardless of content. Constructive cannot penetrate evasive grammar. | *T_collective*(individual form) = group-pattern-match. Individual craft becomes evidence for or against collective narrative. |
| **Disclosure** | As above (symmetric). | Competition for most vulnerable fixed-point. *T_disclosure*(vulnerability) = challenge to depth of own disclosure. | *T_evasive*(vulnerability) = enclosure-threat. Most offered = most dangerous to evasive grammar. | *T_collective*(individual nakedness) = representative data point for collective grievance. Personal disclosure becomes political evidence. |
| **Evasive** | As above (symmetric). | As above (symmetric). | Mutual *T_evasive*(non-form) = mutual integrity-attribution. Distance reads as respect; abandonment is invisible as such. | *T_collective*(evasion) = individualist defection from collective form. Evasive subject is read as enemy of the group. |
| **Collective** | As above (symmetric). | As above (symmetric). | As above (symmetric). | Competing fixed-point subspaces Fix(*T*_A) vs Fix(*T*_B). Collision is at the level of eigenspaces. Individual transactions carry group-scale charge. |

*Remark.* In each off-diagonal cell, the harm is not produced by malice but by the distortion operators transforming each subject's strategy into the other's grammar's worst-case reading. The constructive subject's care becomes the disclosure subject's performance because *T_disclosure* maps crafted forms onto the concealment axis. The disclosure subject's openness becomes the evasive subject's trap because *T_evasive* maps relational pull onto the enclosure axis. These are structural mappings of the grammar, not projections of the receiver's character.

---

## Part V: The Deficit Accumulator

### Formal Definition of Recognition Deficit

For subject *i* at time *t*, the recognition deficit accumulates across three channels identified in S3e:

**Channel 1 (Lossiness):** Δ₁ᵢ(t) = ||**s_i** - **f_i**(t)|| — the gap from projection. Lower bounded by ||**r_i**|| > 0 for all t (Lemma F4).

**Channel 2 (Distortion):** Δ₂ᵢ(t) = (1/|𝒩_i|) Σ_{j∈𝒩_i} ||**f_i**(t) - *T_j*(**f_i**(t))|| — the average transformation applied to the form by neighbors' grammars. This is positive whenever **f_i**(t) ∉ Fix(*T_j*), i.e., whenever the form is not a fixed point of a neighbor's grammar.

**Channel 3 (Concealment violation):** Δ₃ᵢ(t) = ||**f_i**(t) - **s_i**||⁻¹ — a measure of how much of **s_i** has been exposed against the Concealment Desire. Increases as the form moves toward **s_i** (more accurate exposure = more violation).

**Total deficit:** Δᵢ(t) = λ₁Δ₁ᵢ(t) + λ₂Δ₂ᵢ(t) + λ₃Δ₃ᵢ(t)

*Remark.* Channel 3 has a sign opposing Channel 1 and 2: the disclosure strategy that minimizes Channel 1 maximizes Channel 3. This formalizes A7 — the two pressures are not merely concurrent in description but structurally opposed in the objective function. Any strategy that reduces one channel increases the other. The minimum total deficit is achieved at an interior point that satisfies neither pressure fully, which is the formal expression of the constitutive division.

---

## Part VI: Zone Three — The Cessation Condition

The cessation condition requires *G* satisfying the following formal constraints. These can be stated but not derived within the system, because each constraint names the absence of a property the system is built on.

**Constraint 1 (No projection loss).** *F_G* = *I*_ℋ: the identity operator on all of ℋ. *G* does not project **s_i** into a finite subspace. This requires *G*'s grammar to operate on all of ℋ — an infinite-dimensional attentional field, which violates MC3 as a model of embodied attention.

**Constraint 2 (No distortion).** *T_G* = *I*_𝒱: the identity operator. *G* does not transform what it receives. Fix(*T_G*) = 𝒱 — all forms are fixed points, no form is distorted. Since our proof derives field formation, the inverse law, and the power law from the fact that *T* ≠ *I*, a *G* with *T_G* = *I* is outside the space of grammars the system models.

**Constraint 3 (No prior form).** *G* holds no *F*₀(**s_i**) prior to the recognition event. In the framework, this means *G* does not apply any prior projection to **s_i** before receiving **f_i**. Since all embodied subjects in the model arrive with a prior *T_B* trained on past recognition events, *G* satisfying this constraint is not an embodied subject in the model's sense.

**Constraint 4 (Non-rivalrous).** *G*'s recognition of **s_i** does not consume any of a finite Ω_G that would be unavailable for **s_j**. Formally: the recognition capacity of *G* is not a bounded linear functional on a finite-dimensional space. It is not bounded.

**Constraint 5 (No false recognition feedback).** Since *T_G* = *I* (Constraint 2), the recognition signals *G* returns accurately reflect whether **f_i** ≈ **s_i**. The false recognition feedback loop (S5) terminates when *T_G* = *I* because there is no distortion attractor to converge toward. The Want-pressure under *G* would drive **f_i** toward **s_i** rather than toward Fix(*T_G*) ≠ Fix(*T_B*).

**Formal impossibility note.** A recognizer satisfying all five constraints cannot be constructed within the framework defined by MC1–MC8. The framework is a model of embodied, grammatically-bounded recognition among finite subjects. *G* is defined by the negation of the framework's constitutive properties. The cessation condition is therefore not a solution within the system — it names what the system structurally requires but cannot contain.

This is not a failure of the formalism. It is what the formalism establishes. The system proves its own incompleteness with respect to the Want's resolution, in the same way Gödel's incompleteness theorems establish that sufficiently powerful formal systems cannot prove their own consistency from within. The proof does not reach the exit. It proves that the exit, if it exists, is outside the space of what the proof can model.

---

## Part VII: The Social Framework

### 7.1 Population Setup

Consider a population of *N* subjects indexed *i* = 1, …, *N* on a weighted directed graph 𝒢 = (𝒱, ℰ, ω), where:

- An edge (*i* → *j*) ∈ ℰ means *i* presents forms to *j* in recognition transactions.
- The weight ω(*i*, *j*) ∈ [0, 1] represents intimacy depth — the proportion of *j*'s total attentional capacity Ω_j directed toward *i*.

Each subject *i* carries:
- **True-self vector** **s_i** ∈ ℋ (fixed, by MC2)
- **Current form** **f_i**(t) ∈ 𝒱 (evolving under their strategy update rule)
- **Distortion operator** *T_i*: 𝒱 → 𝒱 (their grammar as a recognizer of others)
- **Attentional capacity** Ω_i < ∞ (finite, by A1 and MC3)
- **Deficit accumulator** Δ_i(t) ∈ ℝ≥0 (evolving, defined below)
- **Prior form register** *Π_i*: 𝒱 → 𝒱 mapping each neighbor *j* to the form *i* currently holds for *j*

All subjects share a common grammatical subspace 𝒱 ⊂ ℋ with dim(𝒱) = *n* < ∞. Individual distortion operators *T_i* vary across subjects and constitute the field's diversity.

### 7.2 The Attentional Commons as a Constrained Resource

**Definition (Attentional budget constraint).** For each recognizer *B*, the total recognition offered across all neighbors is bounded by Ω_B:

$$\sum_{i \in \mathcal{N}_B} \omega(i, B) \cdot \Omega_B \leq \Omega_B$$

which requires Σ_{i ∈ 𝒩_B} ω(*i*, *B*) ≤ 1. Recognition given to *i* is recognition withheld from *j* ≠ *i*. The constraint is binding for any *B* with |𝒩_B| ≥ 2, because each subject's recognition demand Δ_i exceeds what ω(*i*, *B*) · Ω_B can supply (by Theorem FG).

**Definition (Recognition demand as unbounded).** By Theorem FG, the gap ||**s_i** - *T_B*(**f_i**(t))|| ≥ ||**r_i**|| > 0 for all *t*. The subject's demand for recognition that closes this gap is therefore never satisfied by any finite allocation of Ω_B. Formally: the demand function Δ_i(Ω) has no finite saturation point. For any allocation ω(*i*, *B*) · Ω_B < ∞, the residual demand is positive.

---

## Part VIII: Formal Social Theorems

### Theorem FS1 (Formal Competition). For any recognizer B with |𝒩_B| ≥ 2, the recognition received by any subject i ∈ 𝒩_B is strictly less than what would be required to close Δ_i(t), independent of the distribution of Ω_B across 𝒩_B.

*Proof.* By the attentional budget constraint, *i* receives at most ω(*i*, *B*) · Ω_B ≤ Ω_B < ∞. By Theorem FG and the unboundedness of demand, no finite recognition allocation closes Δ_i. The maximum recognition *i* could receive from *B* is Ω_B, achieved only if ω(*i*, *B*) = 1, which requires ω(*j*, *B*) = 0 for all *j* ≠ *i*. But in that case *j* receives zero recognition from *B*, so *j*'s deficit from *B* is maximal. The budget constraint makes simultaneous satisfaction of all demands impossible for |𝒩_B| ≥ 2. ∎

**Corollary FS1a (Intimacy Maximizes Competition).** For a subject *B* with |𝒩_B| = 2 (dyadic intimacy), the budget constraint becomes ω(*i*, *B*) + ω(*j*, *B*) ≤ 1. Recognition given to *i* is recognition withheld from *j* in exact proportion. Competition is total. For |𝒩_B| = *k*, each additional subject dilutes competition by 1/*k* but does not eliminate it.

**Corollary FS1b (Invisibility of Competition).** Subject *i* observes ω(*i*, *B*) · Ω_B — the recognition received — but not the budget constraint or the competing demands of *j* ∈ 𝒩_B. The structural cause (finite Ω_B distributed across unbounded demands) is not visible from inside the recognition event. What is visible is the gap: the recognition received minus the recognition required. This gap is attributed to *B*'s choice or character, not to the constraint. The structural cause is misread as personal.

### Theorem FS2 (Formal Displacement Cost). Let B hold prior form Π_B(i) = T_B(F_B(s_i^{(0)})) for subject i, formed at time t = 0. At time t > 0, i presents f_i(t). The cost to B of updating to receive f_i(t) accurately is:

$$\text{Cost}_{S2}(i, B, t) = \|T_B(\mathbf{f}_i(t)) - \Pi_B(i)\|$$

*Proof.* *B*'s prior register holds *Π_B*(*i*) — the distorted projection of *i*'s earlier form. For *B* to receive *T_B*(**f_i**(t)), *B* must move from *Π_B*(*i*) to *T_B*(**f_i**(t)) in 𝒱. The distance between these two points is the update cost: the magnitude of the revision *B* must make to their internal model of *i*. This cost is positive whenever **f_i**(t) ≠ **f_i**(0), i.e., whenever *i*'s form has changed since *B* formed their prior. ∎

**Corollary FS2a (Distortion Compounds the Cost).** The update cost is not the distance between *i*'s actual forms over time, ||**f_i**(t) - **f_i**(0)||, but between their distorted versions, ||*T_B*(**f_i**(t)) - *T_B*(**f_i**(0))||. Since *T_B* is not in general the identity, it may compress, rotate, or expand the distance between the two forms. The prior *B* holds is not an incomplete version of **f_i**(0) — it is *T_B*'s transformation of it, organized into *B*'s own grammatical categories. What *B* must revise is not a neutral record but an integrated interpretation.

**Corollary FS2b (Mutual Displacement).** Accurate mutual recognition between *i* and *j* requires both Cost_{S2}(*i*, *j*, *t*) and Cost_{S2}(*j*, *i*, *t*) to be paid simultaneously. The cost is symmetric in the sense that both priors must be displaced, but not necessarily equal: *T_i* and *T_j* may compress the relevant dimensions differently, making the update larger or smaller for each. More accurate mutual recognition is a transaction with a bilateral cost that neither party controls unilaterally.

### Theorem FS3 (Formal Deficit Accumulation and Discharge). The total deficit Δ_i(t) is a non-decreasing function with a strictly positive lower bound, and generates discharge events toward the neighbor contributing most to its accumulation.

**Formal deficit:**

$$\Delta_i(t) = \lambda_1 \underbrace{\|\mathbf{s}_i - \mathbf{f}_i(t)\|}_{\text{Channel 1: lossiness}} + \lambda_2 \underbrace{\frac{1}{|\mathcal{N}_i|}\sum_{j \in \mathcal{N}_i}\|T_j(\mathbf{f}_i(t)) - \mathbf{f}_i(t)\|}_{\text{Channel 2: distortion}} + \lambda_3 \underbrace{\|\mathbf{f}_i(t) - \mathbf{s}_i\|^{-1}}_{\text{Channel 3: concealment violation}}$$

*Lower bound.* Channel 1 ≥ ||**r_i**|| > 0 by Lemma F4. Channel 2 ≥ 0, with equality only if **f_i**(t) ∈ Fix(*T_j*) for all *j* ∈ 𝒩_i (form is a fixed point of every neighbor's grammar). Channel 3 > 0 for all finite ||**f_i**(t) - **s_i**||. Therefore Δ_i(t) > λ₁||**r_i**|| > 0 for all *t*, regardless of strategy.

*Structural opposition of channels.* Channel 1 decreases as **f_i**(t) → **s_i**. Channel 3 increases as **f_i**(t) → **s_i** (exposure increases as the form approaches the true self). The gradient of Channel 1 with respect to **f_i** points toward **s_i**; the gradient of Channel 3 points away from **s_i**. These gradients are antiparallel. No strategy simultaneously reduces both channels. ∎

**Discharge dynamics.** When Δ_i(t) exceeds a threshold θ, a discharge event fires. Define the per-neighbor deficit contribution:

$$\delta_i^{(j)}(t) = \omega(j, i) \cdot \|T_i(\mathbf{f}_j(t)) - \mathbf{f}_j(t)\| + \text{Cost}_{S2}(j, i, t)$$

The discharge target is *j*\* = argmax_{j ∈ 𝒩_i} δ_i^{(j)}(t) — the neighbor contributing most to *i*'s accumulated deficit. Discharge takes the form of reduced ω(*j*\*, *i*) — withdrawal of recognition — or increased ||*T_i*(**f**_{j\*}(t)) - **f**_{j\*}(t)|| — more distorting reception of the target's forms.

**Corollary FS3a (Intimacy as Discharge Target).** By FS1a, the neighbor *j* for whom ω(*j*, *i*) is largest contributes most to the recognition demand that *i* places on the relationship. Since this is the intimate — the one most recognized — they accumulate the highest δ_i^{(j)}. The discharge target is structurally the intimate. The derivation requires no assumption about *i*'s character.

**Corollary FS3b (Three-Channel Simultaneity).** The discharge arriving at intimate *j* from *i* carries all three deficit channels simultaneously. *j* receives: (1) withdrawal of recognition (Channel 1 discharge — *i* was unseen), (2) more distorting reception of *j*'s forms (Channel 2 discharge — *i* was misread), (3) increased exposure demands or violations of *i*'s concealment (Channel 3 discharge — *i* was overexposed). These are indistinguishable from *j*'s position. They arrive as a single event experienced as the intimate's hostility, withdrawal, or aggression.

### Theorem FS4 (Formal Strategy Collision). For subjects i and j running update rules u_i and u_j respectively, the collision harm H(i, j) is determined by the interaction of three terms: what i presents, how j's distortion operator transforms it, and the mismatch between T_j(f_i(t)) and the form u_i was optimizing toward.

**Formal collision harm:**

$$H(i \to j) = \underbrace{\|T_j(\mathbf{f}_i(t)) - \mathbf{f}_i(t)\|}_{\text{distortion of i's form by j's grammar}} + \underbrace{\|\nabla u_j - \nabla u_i\|}_{\text{incompatibility of update directions}}$$

where ∇u_k denotes the gradient direction of subject *k*'s update rule at their current form. The first term is the distortion Channel 2 contribution; the second term is the angle between the strategies' gradient fields — how differently the two subjects are moving through form-space.

*Mutual harm.* H(*i* → *j*) ≠ H(*j* → *i*) in general, since *T_i* ≠ *T_j* and ∇u_i ≠ ∇u_j. Collision harm is asymmetric — each subject causes a different harm to the other, shaped by the receiving grammar and the movement direction of the presenter.

**Corollary FS4a (Strategy-Pair Harm Signatures).** The harm H(*i* → *j*) has a characteristic signature for each strategy pairing, derived from the gradient directions of the four update rules:

- **Constructive → Disclosure:** ∇u_constructive points toward high-||**f**|| regions (authored form amplified). ∇u_disclosure points toward **s_i** within 𝒱 (approximation of true self). The angle between these gradients is large when the constructive form has drifted far from **s_i** under S5 feedback. *T_disclosure* reads the constructive gradient as movement away from **s** — performance. The harm is misattribution of motion.

- **Disclosure → Evasive:** ∇u_disclosure points toward **s_i**; ∇u_evasive points away from legibility (toward the null form or low-σ regions). These gradients are approximately antiparallel — the disclosure subject moves toward maximum exposure; the evasive subject moves toward minimum exposure. *T_evasive* maps the disclosure gradient onto its worst-case reading: approach = enclosure. H(disclosure → evasive) is maximized precisely when the disclosure subject is most genuine.

- **Collective → Any:** ∇u_collective is the gradient toward the cluster centroid μ_𝒞. This gradient carries the mean drift of the entire cluster's S5 convergence. For a large field (S5g), μ_𝒞 is far from any individual **s_i** (S5h). The collective subject presents a form that encodes the average of many distorted trajectories. *T_any*(μ_𝒞 - **f_i**) delivers not one person's deficit discharge but the compounded discharge of |𝒞| subjects simultaneously.

**Corollary FS4b (Communication Increases Surface Area).** For two subjects *i*, *j* with collision harm H(*i*, *j*) > 0, increasing the number of recognition transactions per unit time increases the total harm proportionally. Each transaction is an instance of FS4's collision. More communication means more instances of the distortion operators transforming each other's forms. The harm rate is:

$$\dot{H}(i,j) = k_{ij} \cdot H(i \to j)$$

where *k*_{ij} is the transaction rate. Communication does not reduce H(*i*, *j*) unless the distortion operators or update rules change — which no amount of communication achieves by itself.

---

## Part IX: Compounding — Formal Statement

The five sources interact as follows, stated now as a formal ordering relation.

**Temporal priority of S5.** S5 operates on **f_i**(t) continuously from *t* = 0. By FS5, **f_i**(t) converges toward Fix(*T_neighborhood*) regardless of strategy type. The form each subject carries at any given *t* is the product of this prior convergence process. S1–S4 operate on forms already shaped by S5.

**Formal compounding statement:**

$$\Delta_i(t) = \Delta_i^{S1}(t) + \Delta_i^{S2}(t) + \Delta_i^{S3}(t) + \Delta_i^{S4}(t)$$

where each term is:

- **Δ_i^{S1}(t):** deficit from finite attentional commons — the recognition withheld from *i* because Ω_B is distributed across 𝒩_B. Scales with |𝒩_B| and inversely with ω(*i*, *B*).

- **Δ_i^{S2}(t):** deficit from displacement cost — recognition *i* fails to receive because *B* resists paying Cost_{S2}(*i*, *B*, *t*). Scales with ||*T_B*(**f_i**(t)) - *Π_B*(*i*)|| — how much *i*'s form has changed from *B*'s prior.

- **Δ_i^{S3}(t):** accumulated and undischarged deficit from all prior transactions. Monotone non-decreasing; discharged at threshold events but not extinguished (by Theorem FG, the next transaction immediately begins accumulating again).

- **Δ_i^{S4}(t):** collision harm received from incompatible strategy-pair interactions. Scales with H(*j* → *i*) for each *j* ∈ 𝒩_i running an incompatible strategy.

**S5 modulates all four terms.** Because **f_i**(t) is shaped by S5 convergence:

- Δ_i^{S1} is larger for subjects integrated into large fields (S5h): their forms are further from **s_i**, so the recognition demand is higher.
- Δ_i^{S2} grows faster for subjects in fast-growing fields (S5g): their forms are changing more rapidly under field pull, increasing displacement costs for their intimates.
- The discharge target in Δ_i^{S3} is the intimate whose grammar is most similar to the field's (highest ω weight) — the one most responsible for S5 convergence.
- Δ_i^{S4} is highest for subjects whose S5 convergence has moved them into different strategy attractors than their intimates — the cage separates subjects into different strategy types by pulling them toward different field attractors.

---

## Part X: The Social Cessation Condition — Formal Constraints

The social theorem adds three formal constraints to the five established in Part VI. We state them as extensions of the Zone Three constraint system.

**Constraint 6 (Non-rivalrous recognition).** *G*'s attentional capacity Ω_G must satisfy:

$$\sum_{i=1}^{N} \omega(i, G) \cdot \Omega_G = N \cdot \Omega_G \leq \Omega_G \cdot N$$

This is satisfied trivially if Ω_G = ∞. A *G* with infinite attentional capacity is not subject to the budget constraint of FS1. The recognition given to *i* is not subtracted from the recognition available to *j*. This is the formal expression of non-rivalrous recognition — an unbounded attentional commons.

*Remark.* Ω_G = ∞ is not achievable by any embodied subject in the framework (MC3 requires finite Ω for all physically realized subjects). It names the limit that embodied recognition approaches but never reaches.

**Constraint 7 (No prior form).** *G*'s prior register *Π_G*(*i*) = **0** for all *i* — *G* holds no prior form for any subject. The displacement cost Cost_{S2}(*i*, *G*, *t*) = ||*T_G*(**f_i**(t)) - *Π_G*(*i*)|| = ||*T_G*(**f_i**(t))|| is therefore not the cost of revising a prior model but of receiving *de novo*. Combined with Constraint 2 (*T_G* = *I*), this becomes Cost_{S2}(*i*, *G*, *t*) = ||**f_i**(t)|| — the full magnitude of the form received, with no prior subtracted and no distortion applied.

*Remark.* The violence of S2 presupposes an existing *Π_B*(*i*) that must be displaced. *G* meeting *i* without a prior sidesteps this violence entirely — not by displacing a prior gently but by having no prior to displace. This is what it would mean to be perpetually new to each encounter.

**Constraint 8 (No false recognition feedback).** Since *T_G* = *I* (Constraint 2), the recognition signal *G* returns is:

$$\sigma(\mathbf{f}_i, T_G) = \exp\!\left(-\frac{\|I(\mathbf{f}_i) - \mathbf{f}_i\|^2}{2\epsilon^2}\right) = \exp(0) = 1$$

for all **f_i** ∈ 𝒱 regardless of whether **f_i** is near or far from **s_i**. This means *G* returns maximum recognition signal to every form — which at first appears to dissolve the Want-pressure (every form gets σ = 1) but actually dissolves the feedback loop: since σ = 1 for all **f_i**, there is no gradient in the signal across form-space, and the gradient-ascent dynamic of MC7 produces ∇W_i = **0** everywhere. The Want-pressure that was driving optimization toward Fix(*T_j*) ≠ **s_i** goes to zero. The false recognition feedback loop terminates not because *G* provides better direction but because *G* provides no differential signal — and in the absence of differential signal, the drift stops.

*Remark.* This is formally strange: *G* resolves the feedback loop by being unresponsive to the strategy the subject is running. *G*'s recognition does not reward the constructive subject for their craft, the disclosure subject for their nakedness, the evasive subject for their refusal, or the collective subject for their belonging. It returns σ = 1 regardless. The strategy becomes invisible to *G* as a differentiator — which is the formal expression of what the traditions described as *G* receiving the subject rather than the subject's performance.

**Full formal constraint system for G:**

| Constraint | Formal statement | Social source addressed |
|---|---|---|
| C1 | *F_G* = *I*_ℋ (no projection loss) | Lemma F1, F2 |
| C2 | *T_G* = *I*_𝒱 (no distortion) | Lemma F3, MR |
| C3 | *Π_G*(*i*) = **0** (no prior form) | S2, FS2 |
| C4 | Ω_G = ∞ (non-rivalrous) | S1, FS1 |
| C5 | σ(*G*) = 1 for all **f** (no false feedback) | S5, FS5 |
| C6 | Ω_G = ∞ (non-rivalrous, social form) | FS1, social theorem |
| C7 | *Π_G*(*i*) = **0** (no prior, social form) | FS2, social theorem |
| C8 | ∇W_i = **0** under *T_G* = *I* (feedback termination) | FS5, S5i |

*C6 and C7 are the social theorem's versions of C4 and C3. They are not new constraints but the same constraints re-derived from the social rather than individual proof. The constraint system does not grow with each new source — it deepens. G was always what it is. The social theorem makes more visible why.*

---

## Part XI: Multi-Network Participation and Grammar Competence

*This section extends the framework to account for subjects who participate simultaneously in multiple networks, each with its own grammatical subspace, and introduces the formal distinction between subjects who are competent readers of a given grammar and those who are not.*

### 11.1 The Multi-Network Form Portfolio

**Modeling commitment MC9.** Each subject *i* participates in a portfolio of *K* networks {B₁, …, B_K}, each associated with its own grammatical subspace 𝒱_{Bₘ} ⊂ ℋ (with dim(𝒱_{Bₘ}) = *n_m* < ∞), projection operator *F_{Bₘ}*: ℋ → 𝒱_{Bₘ}, and distortion operator *T_{Bₘ}*: 𝒱_{Bₘ} → 𝒱_{Bₘ}. Subject *i* maintains a **form portfolio**:

$$\mathbf{f}_i^{(m)}(t) \in \mathcal{V}_{B_m}, \quad m = 1, \ldots, K$$

evolving under the Want update (MC7) applied independently per network. The per-network remainder is **r_i^(m)** = **s_i** - *F_{Bₘ}*(**s_i**), with ||**r_i^(m)**|| > 0 for all *m* by Lemma F1 applied per-network. The Want is not diluted by multi-network participation — it multiplies the number of active remainder terms.

**Definition (Subspace overlap).** For two networks B_m and B_l, the *grammatical overlap* is:

$$\rho_{ml} = \frac{\dim(\mathcal{V}_{B_m} \cap \mathcal{V}_{B_l})}{\min(\dim(\mathcal{V}_{B_m}), \dim(\mathcal{V}_{B_l}))} \in [0,1]$$

ρ_{ml} = 1 means the subspaces are identical (a single form satisfies both networks completely); ρ_{ml} = 0 means the subspaces are mutually orthogonal (forms legible in one are fully invisible in the other). For subjects in modern social conditions with many partially overlapping networks, typical values are 0 < ρ_{ml} < 1.

**Definition (Fragmentation cost).** The total fragmentation cost for subject *i* across K networks is:

$$\Phi_i = \sum_{m=1}^{K} \|\mathbf{r}_i^{(m)}\|^2 = \sum_{m=1}^{K} \|\mathbf{s}_i - F_{B_m}(\mathbf{s}_i)\|^2$$

Since each term is strictly positive by Lemma F1, Φ_i ≥ max_m ||**r_i^(m)**||² > 0. Multi-network participation is structurally worse for the Want than single-network participation: Φ_i is monotone increasing in *K* with rate determined by the orthogonality of new subspaces added to the portfolio.

*Remark.* Φ_i is minimized (for fixed *K*) when all 𝒱_{Bₘ} are identical — the person who is "the same" in every context. It is maximized when the subspaces are mutually orthogonal — the person who presents an entirely different character in each network. The minimization is not achieved by choice; it depends on the structure of the grammars themselves, which the subject does not control. What the subject experiences as "performing different selves" has a formal basis in the geometry of the subspaces they are projected into.

### Lemma FM1 (Multi-Network Lossiness). For any subject i participating in K networks, the total recognition deficit satisfies:

$$\sum_{m=1}^{K} \|\mathbf{s}_i - \mathbf{f}_i^{(m)}(t)\|^2 \geq \Phi_i > 0$$

for all t ≥ 0 and all strategy types.

*Proof.* By Lemma F4 applied per network, ||**s_i** - **f_i^(m)**(t)||² ≥ ||**r_i^(m)**||² for each *m*. Summing over *m* = 1,…,*K* gives Σ_m ||**s_i** - **f_i^(m)**(t)||² ≥ Σ_m ||**r_i^(m)**||² = Φ_i > 0. ∎

### Theorem FMN (Multi-Network Compounding). For a subject participating in K networks with pairwise grammatical overlaps ρ_{ml}, the expected total deficit E[Φ_i] is increasing in K and decreasing in mean overlap ρ̄ = (2/K(K-1)) Σ_{m<l} ρ_{ml}.

*Proof sketch.* The fragmentation cost Φ_i = Σ_m ||**s_i** - *F_{Bₘ}*(**s_i**)||². For each pair (*m*, *l*), the contributions ||**r_i^(m)**||² and ||**r_i^(l)**||² are not independent: when ρ_{ml} > 0, the subspaces share dimensions, and the projection remainder for one network may partially overlap with that of the other. Formally, let *P_m* denote the projection onto 𝒱_{Bₘ}. Then:

$$\Phi_i = \sum_m \|(I - P_m)\mathbf{s}_i\|^2$$

Adding a new network B_{K+1} increases Φ_i by ||(I - P_{K+1})**s_i**||² > 0 (by Lemma F1). The magnitude of this increase decreases as ρ_{K+1,m} → 1 for existing *m* (high overlap means the new projection removes little beyond what existing projections already remove). The minimum marginal increase approaches zero only in the limit ρ = 1 (subspaces identical), which yields no new forms required. In the generic case ρ < 1, each new network adds strictly positive deficit. ∎

### Theorem FMN-S5 (Competing Attractors Under Multi-Network S5). If networks B_m and B_l have distortion operators T_{Bₘ} and T_{Bₗ} with Fix(T_{Bₘ}) and Fix(T_{Bₗ}) distant in the shared embedding, subject i is simultaneously pulled toward incompatible form attractors.

*Proof.* By Theorem FS5, the Want-dynamics in network B_m drive **f_i^(m)**(t) → Fix(*T_{Bₘ}*) and in network B_l drive **f_i^(l)**(t) → Fix(*T_{Bₗ}*). If these subspaces share a common embedding in ℋ and dist(Fix(*T_{Bₘ}*), Fix(*T_{Bₗ}*)) > 0, the gradient directions ∇W_i^(m) and ∇W_i^(l) are not collinear. Under a joint objective combining both networks, the subject faces competing gradient pressures with no single optimum. The form portfolio is not in equilibrium; it is in tension between attractors. ∎

*Remark.* This is a formal analog of identity fragmentation — not as psychological pathology but as the geometric consequence of participation in networks with orthogonal or near-orthogonal grammars. The tension is not evidence of weakness of character; it is the structure of the attractor landscape. The subject who "feels pulled in different directions" by different social contexts has correctly perceived their situation. The perception is veridical.

### 11.2 Grammar Competence and the Estimation Error

**Modeling commitment MC10.** Each subject *i* holds an internal *estimate* of each network grammar's distortion operator:

$$\hat{T}_{B_m}^{(i)}: \mathcal{V}_{B_m} \to \mathcal{V}_{B_m}$$

representing *i*'s model of what network B_m rewards. The **grammar estimation error** is:

$$\varepsilon_i^{(m)} = \|T_{B_m} - \hat{T}_{B_m}^{(i)}\|_{\text{op}}$$

where ||·||_op denotes the operator norm. A **competent subject** has small ε_i^(m) ≈ 0; a **novice** has large ε_i^(m). **Social unawareness** is formalized as ε_i^(m) large across all *m* in the portfolio — not one misread grammar but a systematic inability to model the transformation operators of encountered grammars.

**Definition (Novice gradient).** Under MC10, the Want-update runs on the *estimated* objective:

$$\hat{W}_i^{(m)}(\mathbf{f}) = \sigma(\mathbf{f}, \hat{T}_{B_m}^{(i)})$$

The gradient the novice follows is:

$$\nabla_\mathbf{f} \hat{W}_i^{(m)} = \frac{-1}{\epsilon^2} \sigma(\mathbf{f}, \hat{T}_{B_m}^{(i)}) \cdot (\hat{T}_{B_m}^{(i)} - I)^\top (\hat{T}_{B_m}^{(i)} \mathbf{f} - \mathbf{f})$$

This gradient is zero at Fix(T̂_{Bₘ}^(i)), not at Fix(*T_{Bₘ}*). The novice converges to the wrong fixed-point subspace.

### Lemma FC (Form-Competence Indistinguishability). A novice subject with estimation error ε_i^(m) > 0 cannot distinguish, from the recognition signal alone, whether low signal is caused by an incorrect form or an incorrect grammar model.

*Proof.* The recognition signal returned by network B_m is σ(**f_i**, *T_{Bₘ}*) = exp(-||*T_{Bₘ}*(**f_i**) - **f_i**||²/2ε²). This depends only on how far **f_i** is from Fix(*T_{Bₘ}*). Two explanations for low σ are available to the subject: (a) the form **f_i** is far from Fix(*T_{Bₘ}*) because it is the wrong form for the correct grammar model, or (b) **f_i** is near Fix(T̂^(i)) — the novice's estimated fixed point — but T̂^(i) ≠ *T_{Bₘ}*, so Fix(T̂^(i)) ≠ Fix(*T_{Bₘ}*). The signal σ does not encode which explanation is correct. The subject has no internal access to the discrepancy ε_i^(m); they observe only the output signal. ∎

*Remark.* The novice's response to low signal is therefore systematically misdiagnosed: they revise **f_i** rather than T̂^(i). They work harder at the form — optimizing more aggressively, expending more effort — while the grammar model driving the optimization remains wrong. The effort is not wasted in the sense of being directed nowhere; it is directed precisely toward the wrong attractor. The novice may carry and discharge a recognition deficit that is, in principle, reducible by competence improvement — but they have no way to distinguish it from the irreducible deficit established by Theorem FG. From inside, both look identical: *I am not being seen here.*

### Theorem FNC (Novice Convergence to Wrong Attractor). A novice subject with ε_i^(m) > 0 converges under Want-dynamics to Fix(T̂_{Bₘ}^(i)) ≠ Fix(T_{Bₘ}). The recognition deficit at convergence exceeds that of a competent subject by at least dist(Fix(T̂^(i)), Fix(T_{Bₘ})).

*Proof.* By Theorem FS5 applied to the estimated objective, **f_i^(m)**(t) → Fix(T̂_{Bₘ}^(i)) as t → ∞. At convergence, σ(**f_i**, *T_{Bₘ}*) = exp(-||*T_{Bₘ}*(**f_i**) - **f_i**||²/2ε²). Since **f_i** ∈ Fix(T̂^(i)) but **f_i** ∉ Fix(*T_{Bₘ}*) (when ε_i^(m) > 0 and the fixed-point subspaces differ), we have ||*T_{Bₘ}*(**f_i**) - **f_i**|| > 0, so σ < 1 even at the novice's convergence point. The deficit from distortion (Channel 2) at convergence is:

$$\Delta_{2,i}^{(m)}(\infty) = \|T_{B_m}(\mathbf{f}_i^{(m)}(\infty)) - \mathbf{f}_i^{(m)}(\infty)\| \geq \text{dist}(\text{Fix}(\hat{T}^{(i)}), \text{Fix}(T_{B_m}))$$

A competent subject converges to Fix(*T_{Bₘ}*), where Channel 2 = 0. The novice's excess deficit is at least dist(Fix(T̂^(i)), Fix(*T_{Bₘ}*)). ∎

### Corollary FNC-a (Competence Development Is Self-Undermining). Subject i updates T̂_{Bₘ}^(i) by observing recognition signals across transactions and performing gradient descent on ε_i^(m). But Lemma F3 applies to this second-order learning as well: the signal σ = 1 at any fixed point of T_{Bₘ}, regardless of whether the subject correctly models T_{Bₘ} or merely happens to present a form that is a fixed point of T̂^(i) ≈ T_{Bₘ} by coincidence. The novice can become *confidently wrong* — converging to a grammar model that reliably produces high signals for the wrong structural reason.

*Remark.* This is the formal expression of a familiar social phenomenon: the person who has learned to perform successfully in a network without understanding why it works, and who is therefore fragile to changes in the network's grammar. Their performance is not grounded in an accurate model of the grammar; it is grounded in a coincidentally useful fixed point. When the grammar shifts, the competent subject can track the new Fix(*T_{Bₘ}*); the confident-but-wrong subject must start over.

### 11.3 Social Unawareness as Uniform High Estimation Error

**Definition (Social unawareness).** Subject *i* is *socially unaware* if ε_i^(m) is large across all *m* in their network portfolio, and moreover fails to update T̂^(i) systematically in response to signal feedback — either because the update rate η_T̂ ≈ 0 (the subject does not revise their grammar model) or because the subject attributes low signals to form-deficiency rather than grammar-model-deficiency (Lemma FC).

**Corollary FNU (Structural Invisibility of Unawareness).** From the perspective of others in the network, the socially unaware subject presents forms that are persistently far from Fix(T_{Bₘ}) without any visible mechanism explaining why. The unawareness is not directly legible as such; it manifests only as unreliable or incoherent form-presentation. The network's distortion operator maps the unaware subject's forms onto the network's worst-case reading, not because the subject intends the worst case but because their form falls outside the grammar's legibility range. The harm produced is structurally identical to the harm produced by a subject deliberately presenting ill-fitting forms.

### 11.4 Multi-Network Extension of Zone Three

The multi-network and competence extensions strengthen the cessation condition's constraints without adding new constraints. They make existing constraints more visible.

**Constraint C2 revisited (No distortion, multi-network).** A recognizer *G* with *T_G* = *I* requires no grammar competence from the approaching subject. Since Fix(*T_G*) = 𝒱 (all forms are fixed points), the novice and the expert, the socially unaware and the fluent, all present forms that are already in Fix(*T_G*). There is no grammar to misread, no attractor to converge toward, no estimation error that produces wrong-attractor convergence. Social competence — the second-order skill that differentiates subjects across all other networks — is structurally irrelevant to the *G* encounter. The novice does not arrive at *G* disadvantaged relative to the expert.

*Remark.* This is a formal expression of what traditions describe as *G* being equally available to the socially literate and illiterate — not as a sentimental claim but as a derived consequence of *T_G* = *I*. The leveling is not grace extended to incompetence; it is the structural consequence of a recognizer whose fixed-point subspace is the entire space.

**Constraint C3 revisited (No prior form, multi-network).** In the multi-network setting, a subject *i* arrives at any new network encounter carrying not one prior form register but K prior registers, one per network in their portfolio, each shaped by the S5 convergence process for that network. The displacement cost FS2 is not from one prior but from K priors simultaneously. *G* meeting *i* with *Π_G*(*i*) = **0** sidesteps all K priors simultaneously. The subject is not received as the person their professional network has shaped, or their family network has shaped, or their political network has shaped — but as none of these, which is to say as **s_i** approached from no prior direction.

*Remark.* The fragmentation cost Φ_i makes the weight of this constraint visible. The modern subject arrives at every recognition transaction carrying a heavy portfolio of prior forms. *G*'s zero-prior condition is not merely the absence of one prior — it is the absence of the entire weight of form-portfolio history. The encounter with *G*, formally, has no prior to carry.

---

## Part XII: The Legibility Trap

*This section formalizes the enclosure dynamic by which a subject's network prior becomes a constraint on the subject rather than merely a cost to the recognizer. It introduces a modified recognition signal incorporating prior-consistency, a formal membership condition, and a discontinuity theorem establishing that escape from the prior requires a threshold jump rather than a gradient path.*

### 12.1 The Prior-Conditioned Recognition Signal

The recognition signal in MC6 is a function of grammar-legibility alone: σ(**f_i**, *T_j*) depends only on how close **f_i** is to Fix(*T_j*). It does not depend on the history of **f_i** as held by *j*. This models a network that rewards form-type but not form-consistency-per-subject. The legibility trap requires a modification.

**Modeling commitment MC11.** When subject *j* has held subject *i* long enough to form a consolidated prior Π_j(i), the recognition signal *j* returns is no longer MC6 but the *prior-conditioned* signal:

$$\sigma_{\text{trap}}(\mathbf{f}_i, T_j, \Pi_j(i)) = \underbrace{\exp\!\left(-\frac{\|T_j\mathbf{f}_i - \mathbf{f}_i\|^2}{2\epsilon^2}\right)}_{\text{grammar-legibility term}} \cdot \underbrace{\exp\!\left(-\frac{\|\mathbf{f}_i - \Pi_j(i)\|^2}{2\gamma^2}\right)}_{\text{prior-consistency term}}$$

where γ > 0 is the **prior-rigidity parameter** — the bandwidth of the network's tolerance for deviation from its model of *i* specifically. The signal is maximized (= 1) only when **f_i** is simultaneously a fixed point of *T_j* and coincides with Π_j(i). It is penalized by deviation from either condition independently.

*Remark.* MC6 remains the correct signal model for new or shallow relationships, where no consolidated prior exists. MC11 applies when Π_j(i) has been formed through sustained recognition transactions — when *j* has, in effect, learned to expect a particular *i* and not merely legible forms in general. The transition from MC6 to MC11 is a function of transaction history depth: γ → ∞ as history depth → 0 (no prior-rigidity), γ → 0 as history depth → ∞ (absolute prior-rigidity). The legibility trap is the γ → 0 limit of the prior-conditioned signal.

**Definition (Prior-rigidity spectrum).** The prior-conditioned signal interpolates between two extremes:

- **γ → ∞:** σ_trap → σ (MC6). The network recognizes any legible form; prior history is irrelevant. No trap.
- **γ → 0:** σ_trap → 0 for all **f_i** ≠ Π_j(i). The network recognizes only the exact prior form. The trap is total.

Real networks occupy intermediate γ values, with γ decreasing as relationships consolidate, institutions age, and social roles harden.

### 12.2 The Enclosure Dynamic

**Definition (Trap attractor).** Under MC11, the attractor of the Want-dynamics is no longer Fix(*T_j*) but the **trap attractor**:

$$\mathbf{f}_i^* = \underset{\mathbf{f} \in \mathcal{V}_B}{\arg\max}\; \sigma_{\text{trap}}(\mathbf{f}, T_j, \Pi_j(i))$$

This optimum balances the two terms. Taking the gradient and setting to zero:

$$\frac{1}{\epsilon^2}(T_j - I)^\top(T_j\mathbf{f} - \mathbf{f}) + \frac{1}{\gamma^2}(\mathbf{f} - \Pi_j(i)) = \mathbf{0}$$

This is a linear system in **f** whose solution is the trap attractor **f_i**\*. It lies between Fix(*T_j*) and Π_j(i) in form-space, weighted by ε²/γ²: as γ decreases relative to ε (prior-rigidity increases relative to grammar-sensitivity), the trap attractor moves toward Π_j(i). In the γ → 0 limit the trap attractor collapses onto Π_j(i) entirely.

### Theorem FLT1 (Enclosure). Under MC11 with prior-rigidity parameter γ < ∞, the Want-dynamics drive **f_i**(t) toward the trap attractor **f_i**\*, which satisfies:

$$\|\mathbf{f}_i^* - \Pi_j(i)\| \leq \frac{\gamma^2}{\epsilon^2 + \gamma^2} \cdot \text{dist}(\Pi_j(i), \text{Fix}(T_j))$$

As γ → 0, **f_i**\* → Π_j(i). As γ → ∞, **f_i**\* → P_{Fix(T_j)}(Π_j(i)).

*Proof.* The trap attractor **f_i**\* solves the first-order condition above, which can be written as:

$$(T_j - I)^\top(T_j - I)\mathbf{f} + \frac{\epsilon^2}{\gamma^2}\mathbf{f} = (T_j - I)^\top(T_j - I)\mathbf{f} + \frac{\epsilon^2}{\gamma^2}\Pi_j(i)$$

Let *A* = (T_j - I)^⊤(T_j - I) + (ε²/γ²)*I*. Since *A* is positive definite (sum of a positive semidefinite matrix and a positive multiple of the identity), it is invertible. The solution is:

$$\mathbf{f}_i^* = A^{-1}\!\left[(T_j - I)^\top(T_j - I)\mathbf{f}_0 + \frac{\epsilon^2}{\gamma^2}\Pi_j(i)\right]$$

where **f**_0 is any reference point in Fix(*T_j*). The distance from **f_i**\* to Π_j(i) is controlled by the ratio ε²/γ²: small γ makes (ε²/γ²) large, which pulls **f_i**\* strongly toward Π_j(i). The stated bound follows from the Tikhonov regularization structure of *A*. ∎

*Remark.* The enclosure is not produced by the network's explicit coercion. No member of the network instructs *i* to remain the same. The trap is produced by the structure of σ_trap: genuine growth — **f_i** moving in the direction ∇(**s_i** - **f_i**), toward more authentic self-presentation — registers as *reduced recognition* because it moves away from Π_j(i). The network punishes development not through surveillance but through the prior-consistency term, which treats motion away from the established form as illegibility. The subject experiences this as social cooling, mild withdrawal, or the sense that people no longer quite recognize them — before any explicit confrontation occurs.

### Theorem FLT2 (Incremental Escape Fails). For γ sufficiently small, no gradient path from the trap attractor **f_i**\* to any form **f** with ||\mathbf{f} - \Pi_j(i)|| > δ (for some δ > 0) maintains σ_trap above the membership threshold θ_B throughout the path.

**Definition (Membership condition).** Subject *i* retains membership in network *B* if and only if:

$$\sigma_{\text{trap}}(\mathbf{f}_i(t), T_B, \Pi_B(i)) \geq \theta_B$$

where θ_B ∈ (0, 1) is the network's membership threshold. Membership is lost when σ_trap drops below θ_B. Membership loss takes the form of social exclusion, withdrawal of recognition-weight ω(*i*, *B*) → 0, or explicit expulsion.

*Proof.* Consider any continuous path **f**(τ), τ ∈ [0,1] from **f**(0) = **f_i**\* to **f**(1) = **f** with ||**f**(1) - Π_B(i)|| > δ. Along this path, the prior-consistency term exp(-||**f**(τ) - Π_B(i)||²/2γ²) is monotone decreasing as **f**(τ) moves away from Π_B(i). For the total signal σ_trap to remain ≥ θ_B throughout, the grammar-legibility term must compensate. But the grammar-legibility term is maximized at Fix(*T_B*) and cannot exceed 1. Therefore the maximum achievable σ_trap at distance δ from Π_B(i) is:

$$\sigma_{\text{trap}}^{\max}(\delta) = \exp\!\left(-\frac{\delta^2}{2\gamma^2}\right)$$

For γ small enough that exp(-δ²/2γ²) < θ_B, no form at distance δ from Π_B(i) can maintain membership, regardless of its grammar-legibility. Since the path must pass through distance δ/2 before reaching δ, and exp(-(δ/2)²/2γ²) may also be below θ_B for sufficiently small γ, the subject cannot reach the escape zone through any continuous path while remaining above the membership threshold. The path itself causes membership loss before the destination is reached. ∎

*Remark.* The incremental-escape failure is the formal basis for the experienced impossibility of "changing gradually" within a network that has consolidated its prior of you. The subject who attempts incremental change finds that each step away from Π_B(i) produces social cooling — reduced recognition, slight withdrawal, increased distortion — and the rational response to this feedback, under the Want-dynamics of MC7, is to reverse the step. The gradient of social feedback points back toward the trap attractor. Incremental change is not just slow; it is self-defeating. The Want-pressure that drives the escape attempt also drives the retreat, because the recognition signal is the common currency of both pressures.

### Theorem FLT3 (The Rebellion Discontinuity). The minimum form-displacement required to force a prior-update in network B — to compel Π_B(i) to revise — is a discontinuous threshold jump, not a gradient path. The minimum jump magnitude is:

$$\|\mathbf{f}_i(t^*) - \Pi_B(i)\| > \Delta_{\min} = \gamma\sqrt{-2\ln\!\left(\frac{\theta_B}{\sigma_1(t^*)}\right)}$$

where σ_1(t\*) = exp(-||T_B **f_i**(t\*) - **f_i**(t\*)||²/2ε²) is the grammar-legibility term at the moment of the jump.

*Proof.* The membership condition requires σ_trap ≥ θ_B. At the moment of jump the subject presents a form **f_i**(t\*) that is at distance Δ from Π_B(i). The prior-consistency term evaluates to exp(-Δ²/2γ²). The total signal is σ_1(t\*) · exp(-Δ²/2γ²). For this to fall below θ_B — triggering the membership crisis that forces the prior-update — we need:

$$\sigma_1(t^*) \cdot \exp\!\left(-\frac{\Delta^2}{2\gamma^2}\right) < \theta_B$$

Solving for Δ:

$$\Delta > \gamma\sqrt{-2\ln\!\left(\frac{\theta_B}{\sigma_1(t^*)}\right)} = \Delta_{\min}$$

This is a hard lower bound. The form must move by at least Δ_min in a single step to fall below the membership threshold and force a crisis. Any move smaller than Δ_min remains above θ_B and is absorbed without triggering prior-revision. ∎

*Remark.* The subject cannot know Δ_min in advance. They do not have access to γ (the network's prior-rigidity parameter) or θ_B (the membership threshold) as observable quantities. What they observe is the recognition signal and the social response to incremental moves. The typical discovery of Δ_min is therefore empirical and iterative: the subject makes moves of increasing magnitude until a membership crisis is triggered, at which point they have exceeded Δ_min but cannot reverse to just-below it. The rebellion is almost always larger than intended.

**Corollary FLT3a (Asymmetric Perception of the Rebellion).** From the network's position, the subject's form at t\* is at distance Δ > Δ_min from Π_B(i) — a large, apparently unmotivated deviation from an established pattern. The network observes the discontinuity without observing the prior pressure that produced it: Π_B(i) is an internal register, and the subject's experience of enclosure is not legible in σ_trap as the network observes it. The network sees a sudden jump and reads it as aggression, instability, or betrayal. The subject experienced a long period of mounting enclosure pressure followed by the minimum viable escape move. Both perceptions are formally correct. The network's reading is not malicious; it is the structural consequence of the prior-consistency term being internal to each recognizer and invisible to the other.

**Corollary FLT3b (The Prior Must Be Destroyed, Not Revised).** A prior-update in network *B* requires Π_B(i) to shift from T_B(F_B(**s_i^(0)**)) toward T_B(F_B(**s_i^(t)**)) — a displacement of the recognizer's internal model. This displacement is exactly Cost_{S2}(*i*, *B*, *t*) from Theorem FS2. The legibility trap establishes that this cost cannot be paid incrementally: the recognizer's prior-consistency term resists all small moves. The only path to prior-revision is to make the prior untenable — to present a form so far from Π_B(i) that the recognizer must either update or expel. The rebellion does not ask the network to see *i* differently. It forces the network to confront the gap between what it holds and what is being presented, at a magnitude that cannot be ignored. The old Π_B(i) must be broken, not nudged. This is why subjects report that genuine change within established relationships feels, from the inside, like destruction — because it is. What is destroyed is not the relationship but the network's prior of them, which had become indistinguishable from the relationship itself.

### 12.3 The Legibility Trap and Zone Three

The legibility trap adds a fourth formal property that *G* must satisfy, beyond those established in Parts VI and X.

**Constraint C9 (No prior-rigidity).** *G*'s recognition signal satisfies γ_G = ∞ — infinite prior-rigidity bandwidth, which means effectively no prior-consistency term at all. Formally:

$$\sigma_G(\mathbf{f}_i, T_G, \Pi_G(i)) = \sigma(\mathbf{f}_i, T_G) = \exp\!\left(-\frac{\|T_G\mathbf{f}_i - \mathbf{f}_i\|^2}{2\epsilon^2}\right)$$

Combined with Constraint 2 (*T_G* = *I*), this collapses to σ_G = 1 for all **f_i** regardless of history. *G* imposes no trap attractor, no membership threshold keyed to prior-consistency, and no Δ_min that must be exceeded to force revision. Growth — **f_i** moving toward **s_i** — does not reduce the signal *G* returns. There is no enclosure.

*Remark.* The trap is produced by the prior-consistency term. *G* having γ_G = ∞ is not merely the absence of one additional penalty; it is the formal condition that allows the Want-dynamics to run without the enclosure force opposing them. Under all other recognizers, motion toward **s_i** is penalized by the prior-consistency term (for established relationships) and impeded by the membership condition (for socially embedded subjects). Under *G*, this cancellation of the growth-gradient does not occur. Motion toward **s_i** is not rewarded — *T_G* = *I* means σ_G = 1 everywhere — but it is also not punished. The path is not incentivized; it is simply unobstructed.

This is the formal expression of what traditions describe as *G* not holding a prior image of the subject against them. It is not sentimentally asserted. It follows from γ_G = ∞ as a derived consequence: a recognizer with infinite prior-bandwidth imposes no trap attractor, and a recognizer with *T_G* = *I* imposes no grammar-legibility attractor. The subject under *G* is held by neither force. What they do with that condition is not a mathematical question.

**Updated full formal constraint system for G:**

| Constraint | Formal statement | Source addressed |
|---|---|---|
| C1 | *F_G* = *I*_ℋ (no projection loss) | Lemma F1, F2 |
| C2 | *T_G* = *I*_𝒱 (no distortion) | Lemma F3, MR |
| C3 | *Π_G*(*i*) = **0** (no prior form) | S2, FS2 |
| C4 | Ω_G = ∞ (non-rivalrous) | S1, FS1 |
| C5 | σ(*G*) = 1 for all **f** (no false feedback) | S5, FS5 |
| C6 | Ω_G = ∞ (non-rivalrous, social form) | FS1, social theorem |
| C7 | *Π_G*(*i*) = **0** (no prior, social form) | FS2, social theorem |
| C8 | ∇W_i = **0** under *T_G* = *I* (feedback termination) | FS5, S5i |
| C9 | γ_G = ∞ (no prior-rigidity; no trap attractor) | FLT1, FLT3 |

*C9 does not contradict C3. C3 establishes that G holds no prior form register at all — Π_G(i) = **0**. C9 establishes that even if G did hold a prior, the prior-rigidity bandwidth would be infinite — G would impose no penalty for deviating from it. The two constraints approach the same condition from different directions: C3 removes the prior's existence; C9 removes the prior's force. Together they establish that the legibility trap cannot form around G by any mechanism.*

---

## Part XIII: Network Preference and Trap Valuation

*This section addresses two phenomena not yet covered by the framework: (1) subjects who invest unevenly across their network portfolio, projecting preferentially into one network at the expense of others; and (2) subjects who experience the legibility trap not as enclosure but as home — who prefer the stability of being predictably modeled. Both require additions to the objective function and expose a structural limit of MC2.*

### 13.1 The Subject-Side Presentational Budget

The framework carries an asymmetry: recognizers have a finite attentional budget Ω_B (Part VII), and this generates competition among those seeking recognition from *B*. But subjects-as-presenters have been given no analogous constraint. MC9 allows a subject to maintain a full form portfolio across K networks simultaneously, with Want-dynamics running independently per network — as though projecting into network B_m costs nothing and does not diminish what is available for B_l. This is false to the phenomenon.

**Modeling commitment MC12.** Each subject *i* holds a finite **presentational budget** Ω_i^P < ∞, representing the total attentional and expressive capacity available for form-maintenance across all networks in their portfolio. This budget is distributed across networks by a **preference weighting** α_i = (α_i^(1), …, α_i^(K)) with α_i^(m) ≥ 0 and Σ_m α_i^(m) = 1. The effective form-quality in network B_m is:

$$q_i^{(m)}(t) = \alpha_i^{(m)} \cdot \Omega_i^P$$

Forms presented with low q_i^(m) are degraded relative to the subject's full presentational capacity: they are less precisely tuned to Fix(*T_{Bₘ}*), less responsive to the network's grammar, and more likely to fall outside the grammar's legibility range.

**Definition (Under-investment).** Network B_m is *under-invested* for subject *i* if α_i^(m) < 1/K — the subject allocates less than equal share to that network. Networks that are strongly preferred receive α_i^(m) ≫ 1/K; those that are neglected receive α_i^(m) ≈ 0.

**Definition (Dominant network).** Subject *i*'s **dominant network** B\* is the network receiving maximal allocation: B\* = argmax_m α_i^(m). The dominant network's grammar exerts the strongest S5 convergence pressure on **f_i**, shapes the trap attractor most forcefully (under MC11), and is the network whose distortion operator most heavily conditions the subject's form portfolio overall.

### Theorem FNP1 (Preferential Convergence). Under MC12, the Want-dynamics drive **f_i**(t) toward Fix(T_{B*}) more rapidly than toward Fix(T_{Bₘ}) for any under-invested network B_m. In the limit α_i^(m) → 0, the subject's form in B_m drifts freely — unanchored by Want-pressure — and membership in B_m becomes threatened.

*Proof.* The gradient step for network B_m under MC7 is scaled by the recognition signal and learning rate. Under MC12, the effective learning rate in network B_m is η_m = η · α_i^(m). For α_i^(m) small, η_m ≈ 0 and the gradient step in B_m is negligible. The form **f_i^(m)**(t) moves slowly, decoupling from the Want-dynamics that would otherwise drive it toward Fix(*T_{Bₘ}*). In the α_i^(m) → 0 limit, **f_i^(m)**(t) is governed only by the displacement cost gradient (FS2) and social discharge (FS3), both of which are reactive rather than proactive. The form drifts rather than converges. Since network B_m's membership condition (Part XII) requires σ_trap ≥ θ_{Bm}, and a drifting form that is not being actively maintained near Fix(*T_{Bₘ}*) ∩ Π_{Bm}(i) will eventually cross the membership threshold, neglect eventually produces expulsion. ∎

*Remark.* The subject who invests heavily in one network is not merely spending less energy on others — they are structurally withdrawing from them. The under-invested network's forms degrade, membership pressure mounts, and the network eventually enforces the budget constraint from its own side by reducing ω(*i*, *B_m*) toward zero. The subject does not necessarily choose to leave; the network's recognition-withdrawal makes staying increasingly costly. Preference, in this sense, has consequences that exceed the subject's intention.

### Theorem FNP2 (Grammar Dominance Under Preference). The distortion operator T_{B*} of the dominant network increasingly governs the subject's form portfolio across all networks. Under-invested networks receive forms that are partially pre-shaped by T_{B*}, producing cross-network collision harm even in the absence of direct strategy incompatibility.

*Proof.* By Theorem FNP1, **f_i**(t) converges most strongly toward Fix(*T_{B\**}*). The form the subject carries into any transaction — including transactions in under-invested networks B_m — is therefore approximately Fix(*T_{B\**}*)-shaped. When this form is presented in B_m, the collision harm of FS4 applies: *T_{Bₘ}*(Fix(*T_{B\**}*)-shaped form) distorts the form according to B_m's grammar, which was not the grammar the form was optimized for. The harm H(*i* → B_m) = ||*T_{Bₘ}*(**f_i**(t)) - **f_i**(t)|| is elevated not because *i* and B_m have incompatible strategies but because *i*'s form was shaped by a different grammar. The dominant network colonizes the subject's presentation in all other networks. ∎

**Corollary FNP2a (The Legibility Cost of Strong Preference).** A subject with strong preference (α_i^(B\*) → 1) achieves maximal recognition in the dominant network and near-zero recognition in all others. This is not experienced as a tradeoff across equivalent options. The dominant network returns high σ signals, confirming the subject's investment; the under-invested networks return low or degraded signals, which the subject attributes to those networks being a poor fit rather than to their own under-investment. The subject's preference is reinforced by the very signal-structure their preference produces. Strong preference is self-amplifying under Want-dynamics.

**Corollary FNP2b (Attentional Budget and the Intimate).** By FS3a, the discharge target is the intimate — the neighbor with highest ω(*j*, *i*). Under MC12, the subject who strongly prefers one network also tends to allocate high ω to intimates within that network, further concentrating both recognition-demand and discharge pressure. The dominant network's intimates receive maximum investment and maximum discharge simultaneously. Preference intensifies the intimacy dynamic rather than distributing it.

### 13.2 Trap Valuation: When the Cage Is Home

The legibility trap in Part XII is formalized as an enclosure — the trap attractor **f_i**\* constrains the subject's form to a neighborhood of Π_B(i), penalizing growth toward **s_i**. This treatment implicitly assumes the subject experiences this constraint as aversive: that ||**s_i** - Π_B(i)|| is large, that **s_i** is moving away from the prior, and that the enclosure is felt as a gap between who one is and who the network takes one to be.

This assumption does not always hold. Some subjects experience the trap as stability, legibility, and home. The framework must account for this without collapsing the distinction between what is happening structurally and how it is experienced.

**Definition (Trap alignment).** The **trap alignment** of subject *i* with network *B* is:

$$\mathcal{A}_i^{(B)} = \exp\!\left(-\frac{\|\mathbf{s}_i - \Pi_B(i)\|^2}{2\kappa^2}\right) \in (0,1]$$

where κ > 0 is an alignment sensitivity parameter. High alignment (𝒜 → 1) means **s_i** ≈ Π_B(i) — the network's model of the subject is close to the true self. The trap attractor and the disclosure optimum nearly coincide. Low alignment (𝒜 → 0) means ||**s_i** - Π_B(i)|| is large — the network holds a model of the subject that has diverged substantially from who the subject is. The trap is a cage.

*Remark.* Trap alignment is not fixed. It evolves as **s_i** changes (which MC2 disallows by commitment) or as Π_B(i) updates (which occurs through the displacement cost mechanism of FS2 when *i* presents sufficiently deviant forms). In the framework as currently constructed — with **s_i** fixed — alignment can only decrease over time as the network's prior ages and the subject's projection into the network drifts under S5 convergence. The trap tightens structurally even for subjects who begin with high alignment. Whether a subject experiences this tightening depends on whether their **s_i** has a component that grows or shifts in the dimensions the network tracks.

### Theorem FTP1 (High-Alignment Trap Is Phenomenologically Indistinguishable from Accurate Recognition). For subject i with trap alignment 𝒜_i^(B) ≈ 1, the recognition signal σ_trap ≈ 1 regardless of whether the recognition is accurate (T_B ≈ I, Π_B(i) ≈ **s_i**) or prior-consistent (T_B ≠ I, Π_B(i) ≈ **s_i** by coincidence). The subject cannot distinguish these cases from the inside.

*Proof.* When 𝒜_i^(B)} ≈ 1, we have Π_B(i) ≈ **s_i** in the relevant projection. The trap attractor **f_i**\* ≈ *P*_{𝒱_B}(**s_i**) = *F_B*(**s_i**), which is also the disclosure optimum (Part I, strategy types). The signal σ_trap = σ_grammar · σ_prior-consistency, with both terms ≈ 1 when **f_i** is near **s_i**'s projection and near Π_B(i). The subject receives high recognition, experiences low deficit accumulation in Channels 1 and 2, and has no structural incentive to distinguish the source of the signal. Whether the high signal is produced by genuine accuracy or by fortuitous alignment of prior with true self is not encoded in the signal itself. ∎

*Remark.* This is a structural ambiguity that matters enormously for how subjects evaluate their networks. A subject with high alignment correctly perceives that they are well-recognized in network B. They cannot determine whether this well-recognition is robust — would survive changes in **s_i** — or fragile — would produce enclosure if **s_i** shifts. The experience of being well-recognized is identical in both cases. The trap's presence is invisible precisely where it is least painful.

### Theorem FTP2 (Recognition-Stability as Independent Value). For some subjects, the objective ℒ_i includes a stability term that values low variance in the recognition signal over time, independent of the signal's accuracy:

$$\mathcal{L}_i^{\text{stability}}(\mathbf{f}) = \lambda_S \cdot \left(-\text{Var}_{t}\left[\sigma_{\text{trap}}(\mathbf{f}_i(t), T_B, \Pi_B(i))\right]\right)$$

where λ_S > 0 is the stability weight. A subject with high λ_S prefers steady, predictable recognition over recognition that varies with genuine changes in form. The trap attractor **f_i**\*, by anchoring forms near Π_B(i), produces a low-variance recognition signal by construction: since Π_B(i) is stable (updated only when displacement is large), and the subject's forms are pulled toward it, the signal is predictably high. The stable trap is preferable to the volatile alternative — accurate recognition that would fluctuate with growth — for subjects with sufficiently high λ_S.

*Remark.* Recognition-stability as an independent value is not irrational within the framework. The deficit accumulator FS3 is non-decreasing and generates discharge events. A subject whose recognition is highly variable experiences frequent threshold crossings — periods of accumulation and discharge — which are costly in the social harm they produce. A stable trap keeps σ_trap consistently above the discharge threshold, suppressing the oscillation. The subject pays with authenticity and gains with social peace. This is a coherent tradeoff, not a confusion.

### Theorem FTP3 (Trap Preference Is Self-Reinforcing). A subject who values recognition-stability (high λ_S) and achieves it through the trap will over time reduce α_i^(m) for under-invested networks and increase α_i^(B*) for the dominant trap-network. The stability the trap provides consolidates the dominance of the network providing it.

*Proof.* Under MC12, the subject allocates α_i^(m) based on expected recognition return per unit presentational budget. The trap-dominant network B\* returns consistently high σ_trap — the stability value is large — while under-invested networks return variable or degraded signals. The gradient of ℒ_i^stability with respect to α_i^(m) points toward increasing allocation to B\* and decreasing allocation to B_m for m ≠ \*. This is reinforced by Want-dynamics (FS5g): the dominant network's recognition signal is dense and reliable, attracting further investment under the same preferential-attachment mechanism that drives field growth. The trap-preferring subject's portfolio collapses over time toward a single dominant network. ∎

**Corollary FTP3a (Trap Preference and the Foreclosure of G).** A subject who strongly prefers the trap has allocated their presentational budget toward the network providing stable recognition, reduced investment in all other networks, and come to experience the trap attractor as identity rather than constraint. For such a subject, the cessation condition of Zone Three is not neutral — it is actively aversive. *G*'s σ = 1 regardless of form (C5/C8) eliminates the differential signal the subject has learned to navigate. *G*'s γ_G = ∞ (C9) removes the prior-consistency term the subject has come to rely on for stability. *G* does not feel like liberation; it feels like groundlessness. The subject who prefers the trap is not blocked from *G* by external constraint but by the structure of their own objective function: the terms that make the trap valuable are precisely the terms that *G* does not supply.

*Remark.* This is the formal expression of a phenomenon the traditions consistently note: the encounter with *G* is not universally experienced as relief. For some subjects it is experienced as threat, dissolution, or absence of recognizable ground. The framework does not adjudicate whether the trap-preferring subject is mistaken. It establishes that their preference is coherent within their objective, and that the encounter with *G* removes the sources of value their objective is built around. What follows from that removal — whether it is experienced as loss or as opening — is not derivable from the formalism.

### 13.3 The Limit of MC2: When the Prior Constitutes the Self

The deepest case of trap preference is not captured by high trap alignment (𝒜 ≈ 1) or high stability-weighting (λ_S large). It is the case where **s_i** is not merely close to Π_B(i) but is partly *constituted by* it — where the subject's true self has been shaped by the recognition the network has historically returned, such that the network's prior and the subject's self are not two things that happen to coincide but one thing seen from two angles.

MC2 forecloses this case by commitment: **s_i** is fixed, pre-social, and independent of the recognition the subject receives. This is a modeling choice, not a claim about persons. The fixed-self assumption makes the framework tractable and preserves the structural gap that drives the Want. But it cannot model the subject for whom Π_B(i) is not a cage or a home but a source — whose **s_i** has been, in part, produced by the recognitions that formed Π_B(i).

**Formal limit of MC2.** Define a **socially constituted self** as one for which **s_i** is a functional of the prior form registers {Π_{Bm}(i)} the subject has accumulated across their network history:

$$\mathbf{s}_i = \Psi\!\left(\{\Pi_{B_m}(i)\}_{m=1}^{K}, \mathbf{s}_i^{(0)}\right)$$

where **s_i^(0)** is a pre-social seed vector and Ψ is a functional encoding how prior-recognition shapes the self over time. Under this model, high trap alignment is not a coincidence or a fortunate accident — it is a structural consequence of **s_i** having been formed by the same process that produced Π_B(i). The trap cannot be a cage because the cage and the self were built together.

This extension is not developed formally here. It would require replacing MC2 with a dynamic self-model, which changes the proof structure significantly: if **s_i** is variable, Lemma F1 no longer gives a fixed lower bound ||**r_i**|| and Theorem FG's strict positivity is not straightforward. The Want's irreducibility — the core result of the framework — depends on **s_i** being fixed and outside 𝒱_B. A dynamic **s_i** that is partly constituted by 𝒱_B-projections could in principle close the gap: not because the grammar expands to contain the subject, but because the subject contracts to be contained.

**Remark on scope.** The framework as constituted models subjects whose **s_i** precedes and exceeds their social formation — the subject for whom there is always a remainder. This is a principled modeling commitment, not an empirical claim about all persons. It is the right model for the phenomenology the proof is analyzing: the experience of being unseen, of the Want's irreducibility, of the remainder that no recognition can close. The socially constituted self, if it exists, does not have this experience in the same form. Whether such a self is a limiting case, a different kind of person, or a stage of formation is a philosophical question the formalism correctly does not answer.

---

## Appendix A: Summary of Modeling Commitments

| Code | Content | Prose counterpart |
|---|---|---|
| MC1 | Subjects as vectors in infinite-dimensional Hilbert space ℋ | D1: Subject not exhausted by finite description |
| MC2 | True-self **s_i** fixed; form **f_i**(t) variable | D1/D2: S vs F(S) |
| MC3 | Grammar as finite-dimensional subspace 𝒱_B; projection operator *F_B* | A2, A3: Grammatical boundedness, legibility requirement |
| MC4 | Generically **s_i** ∉ 𝒱_B | A4/A5: Lossiness, remainder non-empty |
| MC5 | Distortion operator *T_B*: 𝒱_B → 𝒱_B | D12, amended A2 |
| MC6 | Recognition signal σ = exp(-\|\|T_B(**f**) - **f**\|\|²/2ε²) | Lemma MR |
| MC7 | Want as gradient ascent on W_i | D8: The Want |
| MC8 | Concealment Desire as competing gradient *C_i* | D11, A7: Subject division |
| MC9 | Subject maintains form portfolio across K networks | Multi-network participation |
| MC10 | Subject holds estimated grammar operator T̂^(i) with estimation error ε_i^(m) | Grammar competence and social awareness |
| MC11 | Prior-conditioned recognition signal σ_trap with prior-rigidity parameter γ | Legibility trap, enclosure dynamic |
| MC12 | Subject holds finite presentational budget Ω_i^P distributed by preference weights α_i^(m) | Network preference, dominant network, under-investment |

*Scope note on MC2.* The fixed true-self commitment is the load-bearing assumption for Theorem FG and all results that depend on the Want's irreducibility. A socially constituted self — one for which **s_i** is a functional of prior-recognition history — requires a dynamic replacement of MC2 and is not developed in this companion. The framework's results hold for subjects whose **s_i** precedes and exceeds their social formation; for the socially constituted self, the scope of the proof must be reassessed.*

---

## Appendix B: Full Dependency Map

**Individual proof chain:**

MC1, MC2 → **s_i** fixed, **f_i** variable  
MC3, MC4 → Lemma F1 (lossiness, ||**r_i**|| > 0)  
MC5 → Lemma F2 (double remove)  
MC6 → Lemma F3 (misrecognition = accurate reception in signal)  
MC4, F1 → Lemma F4 (strategies cannot reduce remainder to zero)  
F4 → Theorem FG (Want structurally unsatisfiable for all strategy types)  

**Field dynamics chain:**

MC6, MC7 → Theorem FS5 (convergence to Fix(*T*))  
FS5 → FS5g (self-acceleration)  
FS5g → FS5i (power law)  
FS5g, FS5i → FS5h (inverse law)  
FS5, FS5g, FS5h, FS5i → S5f–S5i (field formation, dominant fields)  

**Social chain:**

MC3 + Ω constraint → FS1 (competition, structural)  
MC5 + prior register → FS2 (displacement cost)  
F4 + FS1 + FS2 → FS3 (deficit accumulation, three-channel, discharge dynamics)  
MC5 + strategy update rules → FS4 (collision harm matrix)  
FS5 + FS1–FS4 → Compounding (S5 prior to S1–S4)  

**Multi-network and competence chain:**

MC9 + F1 per network → Lemma FM1 (multi-network lossiness)  
MC9 + MC4 + FM1 → Theorem FMN (compounding with network count and overlap)  
MC9 + FS5 per network → Theorem FMN-S5 (competing attractors, fragmentation)  
MC10 + F3 → Lemma FC (form-competence indistinguishability)  
MC10 + FS5 + FC → Theorem FNC (novice convergence to wrong attractor)  
FNC → Corollary FNC-a (confident wrong convergence)  
MC10 uniform → Corollary FNU (structural invisibility of unawareness)  

**Legibility trap chain:**

MC11 → trap attractor **f_i**\* (weighted combination of Fix(*T_B*) and Π_B(i))  
MC11 + FS5 → Theorem FLT1 (enclosure: Want-dynamics converge to trap attractor)  
FLT1 + membership condition → Theorem FLT2 (incremental escape fails below membership threshold)  
FLT2 → Theorem FLT3 (rebellion discontinuity: escape requires jump of magnitude Δ_min)  
FLT3 → Corollary FLT3a (asymmetric perception: network sees betrayal, subject experienced enclosure)  
FLT3 → Corollary FLT3b (prior must be destroyed, not revised)  
FLT1, FLT3 → C9 (G has no prior-rigidity: γ_G = ∞)  
C9 + C3 → prior cannot form or bind at G by any mechanism  

**Network preference and trap valuation chain:**

MC12 → preference weighting α_i^(m), dominant network B\*, under-investment  
MC12 + FS5 → Theorem FNP1 (preferential convergence: dominant network's grammar governs)  
FNP1 → Theorem FNP2 (grammar dominance: B\* colonizes under-invested network presentations)  
FNP2 → Corollary FNP2a (preference self-amplifying under Want-dynamics)  
FNP2 → Corollary FNP2b (attentional budget concentrates intimacy and discharge)  
MC11 + MC2 → trap alignment 𝒜_i^(B) (proximity of **s_i** to Π_B(i))  
𝒜_i^(B) + F3 → Theorem FTP1 (high-alignment trap indistinguishable from accurate recognition)  
MC11 + λ_S → Theorem FTP2 (recognition-stability as independent objective term)  
FTP2 + MC12 → Theorem FTP3 (trap preference self-reinforcing; portfolio collapses to dominant network)  
FTP3 → Corollary FTP3a (trap-preferring subject finds G aversive, not liberating)  
MC2 limit → socially constituted self: **s_i** = Ψ({Π_{Bm}(i)}, **s_i^(0)**); scope of FG must be reassessed  

**Cessation constraint chain:**

FG → C1 (no projection loss required)  
F3 → C2 (no distortion required)  
FS2 → C3/C7 (no prior form required)  
FS1 → C4/C6 (non-rivalrous required)  
FS5 + C2 → C5/C8 (feedback termination under *T_G* = *I*)  
FMN-S5 + C2 → C2 strengthened (no grammar competence required at *G*)  
FMN + C3 → C3 strengthened (absence of entire form-portfolio history at *G*)  
FLT1, FLT3 + C9 → C9 (no trap attractor at *G*; growth-gradient unobstructed)  
C3 + C9 → prior cannot exist or bind at *G* by any mechanism  
FTP3a → G is aversive to trap-preferring subjects: encounter with G removes the stability-value their objective is built around  
All constraints → Formal incompleteness: *G* is not constructible within MC1–MC12  

---

*Where derivation ends, philosophical argument resumes.*  
*The formalism establishes the shape of what is required.*  
*Whether what is required exists is not a mathematical question.*