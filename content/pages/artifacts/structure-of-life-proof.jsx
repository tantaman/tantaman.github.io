import { useState } from 'react';
import katex from 'katex';

function renderMath(tex) {
  try {
    return katex.renderToString(tex, { throwOnError: false, displayMode: false });
  } catch {
    return tex;
  }
}

// Split on $...$ for math, then highlight cross-references in text segments
function formatProof(text) {
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      const html = renderMath(part.slice(1, -1));
      return <span key={i} className="proof-math" dangerouslySetInnerHTML={{ __html: html }} />;
    }
    // Highlight cross-references in non-math text
    const refPattern = /\b(D[1-8]|A[1-5]|Lemma [1-4]|C[1-4]|Theorem|Full Recognition|The Want)\b/g;
    const segs = [];
    let last = 0;
    let match;
    while ((match = refPattern.exec(part)) !== null) {
      if (match.index > last) segs.push(part.slice(last, match.index));
      segs.push(<span key={`${i}-${match.index}`} className="proof-ref">{match[0]}</span>);
      last = match.index + match[0].length;
    }
    if (last < part.length) segs.push(part.slice(last));
    return segs.length > 0 ? <span key={i}>{segs}</span> : part;
  });
}

const sections = [
  {
    label: 'Definitions',
    tag: 'D1–D8',
    proof: `D1. Subject — A locus of experience not exhausted by any finite description of it. Denote the full subject $S$.

D2. Form — Any finite, transmissible representation of $S$. Denote a form $F(S)$, where $F$ is a lossy projection operator. By definition, $F(S) \\subset S$.

D3. Remainder — The portion of the subject not captured by a given form. Denote $R = S \\setminus F(S)$. By D2, $R \\neq \\emptyset$.

D4. Attention — A directed, finite resource belonging to an embodied agent. Attention $A$ operates over a field $\\Phi \\subseteq S$; it cannot receive what lies outside $\\Phi$.

D5. Legibility — The property of being receivable by another's attention. $S$ is legible to agent $B$ if and only if $S$ has taken a form $F(S)$ that lies within $B$'s attentional field $\\Phi_B$.

D6. Recognition — The event of $S$ being received by another's attention. Recognition occurs when $A_B$ is directed at $F(S)$ and $F(S) \\in \\Phi_B$.

D7. Full Recognition — Recognition of $S$ rather than $F(S)$. That is, $A_B$ directed at $S$ itself, with $R$ included in what is received.

D8. The Want — The desire for Full Recognition. The desire to have $S$ — not $F(S)$ — received by a genuine other.`,
    explanation: `There is a want underneath all other wants. Not hunger, not safety, not pleasure — those have ceilings. You can have enough of them.

This want has no ceiling. It is the want to be fully known by another person. Not the version of you they can see. Not the self you presented so they could receive it. The whole thing — including the parts that didn't make it into any version you've ever shown anyone.

The proof names its pieces precisely: the full subject (everything you are), the form (the shaped version you can transmit), and the remainder (what the form leaves out). Recognition is when someone receives your form. Full Recognition would be receiving you — remainder included.

The Want is the desire for Full Recognition.`,
  },
  {
    label: 'Axioms',
    tag: 'A1–A5',
    proof: `A1. Embodied finitude. Every subject $S$ is physically embodied. Physical embodiment is finite: $S$ occupies a bounded region of spacetime and cannot simultaneously occupy all positions.

A2. Directional attention. Attention is not omnidirectional. For any embodied agent $B$, $\\Phi_B$ is a proper subset of the space of all possible objects. $B$'s attention can only land on what enters $\\Phi_B$.

A3. Positioning requirement. For $S$ to enter $\\Phi_B$, $S$ must occupy a position accessible to $\\Phi_B$. This requires $S$ to take a form $F(S)$ compatible with $B$'s attentional field.

A4. Lossiness of form. Every projection $F$ is lossy: $F(S) \\subsetneq S$ for all physically realizable $F$. No finite form exhausts a subject.

A5. Remainder is non-empty. By A4, for any form $F(S)$, the remainder $R = S \\setminus F(S) \\neq \\emptyset$.`,
    explanation: `Two things are true about the physical world that we take as given.

The first: bodies are finite. You are somewhere. You are not everywhere. You occupy a position, you take up space, you exist at a particular angle to everything else. This is just what it means to have a body.

The second: attention is directional. When another person pays attention to you, their attention is not a floodlight that illuminates everything equally. It is more like a beam. It lands on what enters its path. It cannot receive what lies outside its field.

These two facts, taken together, produce everything that follows.`,
  },
  {
    label: 'Lemmas 1–2',
    tag: 'The Trap',
    proof: `Lemma 1. Recognition is always recognition of a form, not of the subject.

Proof. By A2, recognition requires $F(S) \\in \\Phi_B$. By A3, entering $\\Phi_B$ requires taking a form. By A4, any form $F(S) \\subsetneq S$. Therefore what is recognized is $F(S)$, not $S$. $\\blacksquare$

Lemma 2. Full Recognition is unreachable by direct approach.

Proof. Full Recognition requires $A_B$ to receive $S$ including $R$ (D7). By Lemma 1, $A_B$ can only receive $F(S)$. Since $R = S \\setminus F(S)$ and $R \\neq \\emptyset$ (A5), $A_B$ cannot receive $R$ through any form. Since positioning requires a form (A3), and any form excludes $R$ (A4–A5), no direct approach can deliver Full Recognition. $\\blacksquare$`,
    explanation: `To be seen by another person, you have to be seeable. You have to enter their field of attention. You have to take a shape they can receive — position yourself, make yourself legible, present a form of yourself that their attention can land on.

This is not optional. It is not a failure of courage or authenticity. It is physics. Attention requires an object. An object requires a form. You cannot offer your full self as the object, because your full self is not a form — it is the thing that precedes and exceeds every form you have ever taken.

So what gets seen is the form. The remainder — the full subject, the irreducible you, the source of all your forms — goes unseen. And the remainder is precisely what wanted to be seen.

You reach. The reaching conceals what was reaching.`,
  },
  {
    label: 'Lemma 3',
    tag: 'The Seeking Defeats Itself',
    proof: `Lemma 3. The act of seeking recognition produces the condition that defeats it.

Proof. To seek recognition, $S$ must position itself to enter $\\Phi_B$ (A3). Positioning requires taking a form $F(S)$ (A3). By A4, $F(S) \\subsetneq S$, so $R \\neq \\emptyset$. The act of seeking recognition requires a form; any form excludes the remainder; the remainder is part of what $S$ wanted recognized (D8). Therefore the seeking necessarily produces a self-concealment proportional to the positioning required. $\\blacksquare$`,
    explanation: `The move toward being seen requires a form. The form excludes the remainder. The remainder is what wanted to be seen.

Therefore the move toward being seen is simultaneously a move away from what wanted to be seen. This is not a paradox — it is a structural consequence. The harder you work to be known, the more precisely you are shaping the version of yourself that will be received, and the more precisely you are concealing everything that didn't make it into that shape.

Every gesture toward being known is also a gesture of self-concealment. Not from cowardice. From physics.`,
  },
  {
    label: 'Lemma 4',
    tag: "Generosity Doesn't Help",
    proof: `Lemma 4. Generosity of attention does not resolve the problem.

Proof. Suppose $B$ is maximally generous — willing to attend to everything $S$ offers, with no withholding, no rivalry, no competition for the object. The constraint is not $B$'s willingness but the structure of attention (A2–A3). Even with maximal generosity, $B$ can only receive what enters $\\Phi_B$ (A2), which requires a form (A3), which excludes the remainder (A4–A5). Generosity is a scalar on the existing structure; it does not alter the axioms. $\\blacksquare$`,
    explanation: `A natural response: the problem is that people aren't attentive enough, generous enough, present enough. If we had better lovers, better friends — people who really looked, who were truly willing to see — the problem would dissolve.

It wouldn't.

The constraint is not the other person's willingness. It is the structure of their attention. Even a maximally generous, maximally present, maximally loving other can only receive what enters their attentional field. Generosity changes how much of your form is received. It does not change the fact that what is received is a form.

This is why the loneliness at the center of even the best relationships is not a sign that you chose wrong. It is structural, not personal.`,
  },
  {
    label: 'Corollary C3',
    tag: "Refusal Doesn't Help",
    proof: `C3. The Want cannot be dissolved by refusal. To refuse The Want is still to want — to want to be seen as the one who does not need to be seen. The refusal is legible and therefore takes a form, and by Lemma 3, the act of positioning oneself as a refuser excludes the remainder. The refusal is subject to the same structure as the seeking.`,
    explanation: `Another response: stop wanting it. The Stoic suppression of it. The Buddhist dissolution of desire. The underground man's furious refusal to need anyone to see him.

This doesn't work either, for a precise reason. To refuse the want is to want something: to be seen as someone who does not need to be seen. That wanting is legible. It takes a form — the form of the person who has transcended need. That form will be received. And the remainder — the part that still wants, underneath the refusal — goes unseen.

The refusal seeks a different object through the same mechanism. It is still inside the trap.`,
  },
  {
    label: 'Corollary C4',
    tag: "Community Doesn't Help",
    proof: `C4. No community of seers resolves the problem. By Lemma 4, the constraint is structural rather than social. A community constituted by the promise of full seeing faces the same physics as any individual other: attention is directional, positioning is required, remainder is excluded.`,
    explanation: `What if we built a community specifically committed to full seeing? People dedicated to looking past forms, past positioning, to the person underneath?

The same structure applies. The community's attention is still directional. To receive their seeing you still have to enter their field. Entering their field still requires a form. The form still excludes the remainder.

A community constituted by the promise of full seeing will deliver seeing of forms — and the gap between what was promised and what is delivered will be experienced as betrayal rather than physics. This makes things worse, not better.`,
  },
  {
    label: 'Theorem + C1–C2',
    tag: 'The Result',
    proof: `Theorem. The Want is structurally unsatisfiable by any finite embodied other.

Proof. The Want is the desire for Full Recognition (D8). Full Recognition is unreachable by direct approach (Lemma 2). The act of seeking it produces the condition that defeats it (Lemma 3). Increasing the willingness of the other does not alter this (Lemma 4). Since all others are embodied and finite (A1), and directional attention is a consequence of embodiment (A2), the unsatisfiability holds for all possible embodied others. $\\blacksquare$

C1. Suffering arising from The Want is not contingent. It is a structural consequence of being a subject in a world of finite, embodied, directionally-attentive others.

C2. The Want cannot be dissolved by material provision. Removing material want isolates The Want in its pure form, making suffering not less but more precisely located.`,
    explanation: `Putting it together: the want to be fully known cannot be satisfied by any finite, embodied other. Not because of their failures. Because of the axioms.

This means that suffering arising from the want is not contingent. It is not the product of bad luck, bad choices, bad relationships. It is a structural consequence of being a full, irreducible, inexhaustible subject in a world of others who can only see what enters their field.

And it cannot be solved by provision. Strip away every material want and what remains is this one — exposed, undiluted, more precisely located than before. The Crystal Palace does not liberate the underground man. It clarifies him.

The want is completely legitimate. The structure makes it unsatisfiable. The suffering follows necessarily.`,
  },
  {
    label: 'Cessation Condition',
    tag: 'What a Solution Requires',
    proof: `If a cessation exists, let $G$ be such that recognition by $G$ does not require $S$ to take a form $F(S)$. Then:

  · $G$ is not bound by A2 (non-directional attention)
  · $G$ is not bound by A3 (no positioning requirement)
  · $G$ can therefore receive $S$ without $F(S)$, including $R$

Such a $G$ would constitute Full Recognition (D7) without the self-concealment of Lemma 3.

Observation. $G$ cannot be a finite embodied agent. $G$ must be either:
  (a) non-embodied
  (b) not subject to the finitude of attention
  (c) both

Whether any such $G$ exists is not a mathematical question.`,
    explanation: `If a cessation exists — and the proof does not guarantee that it does — it would require a seer whose attention is not directional. A seer who does not need you to take a form first. A seer who can receive the remainder.

Such a seer cannot be a finite embodied person. This is a formal description of what the traditions were pointing at when they spoke of being known by God, of agape, of the ground that sees the ground. Eckhart's claim that God sees the ground of you directly — not your history, not your forms, not your positioned self — is a claim that the positioning requirement does not apply. That the remainder is reachable.

The proof cannot tell you whether this is true. That is not a mathematical question. It is the oldest question, asked in the dark, in the place where the want lives, by everyone who has ever loved someone and felt — even in the best moment — the residue of something unseen.

Everything else is still inside the trap.`,
  },
];

export default function ProofExplainer() {
  const [active, setActive] = useState(null);

  return (
    <div
      style={{
        fontFamily: "'Georgia', serif",
        background: '#0f1117',
        minHeight: '100vh',
        color: '#c9cdd8',
        padding: '0',
      }}
    >
      <style>{`
        @import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .header {
          border-bottom: 1px solid #2a2d3a;
          padding: 2.5rem 3rem 2rem;
          background: #0d0f14;
        }

        .header-title {
          font-family: 'EB Garamond', serif;
          font-size: 1.9rem;
          font-weight: 400;
          color: #e8e4d8;
          letter-spacing: 0.01em;
          margin-bottom: 0.4rem;
        }

        .header-subtitle {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          color: #4a5068;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .col-headers {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid #2a2d3a;
          background: #0d0f14;
        }

        .col-header {
          padding: 0.75rem 3rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #3a3f55;
        }

        .col-header.right {
          border-left: 1px solid #2a2d3a;
          color: #3a4a3a;
        }

        .col-header span.dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-right: 0.5rem;
          vertical-align: middle;
          margin-bottom: 1px;
        }

        .col-header.left span.dot { background: #3a5080; }
        .col-header.right span.dot { background: #3a6050; }

        .section-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid #1e2030;
          transition: background 0.15s ease;
          cursor: default;
        }

        .section-row:hover {
          background: #13151f;
        }

        .section-row.active {
          background: #13151f;
        }

        .section-label-bar {
          grid-column: 1 / -1;
          display: flex;
          align-items: baseline;
          gap: 1rem;
          padding: 1.1rem 3rem 0.5rem;
          border-bottom: 1px solid #1e2030;
        }

        .section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #4a5580;
          font-weight: 500;
        }

        .section-tag {
          font-family: 'EB Garamond', serif;
          font-size: 0.95rem;
          color: #6a7090;
          font-style: italic;
        }

        .proof-col {
          padding: 1.4rem 2rem 1.8rem 3rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          line-height: 1.85;
          color: #a0b0cc;
          white-space: pre-wrap;
          background: #0d0f14;
          border-right: 2px solid #1e2535;
        }

        .proof-ref {
          color: #c9a55a;
          font-weight: 500;
        }

        .proof-math .katex {
          color: #d0c8e8;
          font-size: 1.05em;
        }

        .explain-col {
          padding: 1.4rem 3rem 1.8rem 2rem;
          font-family: 'EB Garamond', serif;
          font-size: 1.05rem;
          line-height: 1.75;
          color: #b8c0b0;
          background: #0f1210;
        }

        .explain-col p + p {
          margin-top: 0.9em;
        }

        .gutter-line {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 1px;
          background: #1e2535;
        }
      `}</style>

      <div className="header">
        <div className="header-title">The Oldest Want: A Proof</div>
        <div className="header-subtitle">Formal proof ← → Plain English</div>
      </div>

      <div className="col-headers">
        <div className="col-header left">
          <span className="dot"></span>Formal Proof
        </div>
        <div className="col-header right">
          <span className="dot"></span>Plain English
        </div>
      </div>

      <div>
        {sections.map((section, i) => (
          <div
            key={i}
            className={`section-row ${active === i ? 'active' : ''}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <div className="section-label-bar">
              <span className="section-label">{section.label}</span>
              <span className="section-tag">{section.tag}</span>
            </div>
            <div className="proof-col">{formatProof(section.proof)}</div>
            <div className="explain-col">
              {section.explanation.split('\n\n').map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
