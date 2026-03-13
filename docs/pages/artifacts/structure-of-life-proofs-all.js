// content/pages/artifacts/structure-of-life-proofs-all.jsx
import { useState } from "https://esm.sh/react";
import katex from "https://esm.sh/katex";
import { Fragment, jsx, jsxs } from "https://esm.sh/react/jsx-runtime";
function renderMath(tex) {
  try {
    return katex.renderToString(tex, { throwOnError: false, displayMode: false });
  } catch {
    return tex;
  }
}
function formatProof(text) {
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith("$") && part.endsWith("$")) {
      const html = renderMath(part.slice(1, -1));
      return /* @__PURE__ */ jsx("span", {
        className: "proof-math",
        dangerouslySetInnerHTML: { __html: html }
      }, i);
    }
    const refPattern = /\b(D[1-9]\d?|A[1-6]|Lemma [1-4]|C[1-8][a-c]?|Theorem|S[1-3][a-b]?|Full Recognition|The Want|Gelassenheit)\b/g;
    const segs = [];
    let last = 0;
    let match;
    while ((match = refPattern.exec(part)) !== null) {
      if (match.index > last)
        segs.push(part.slice(last, match.index));
      segs.push(/* @__PURE__ */ jsx("span", {
        className: "proof-ref",
        children: match[0]
      }, `${i}-${match.index}`));
      last = match.index + match[0].length;
    }
    if (last < part.length)
      segs.push(part.slice(last));
    return segs.length > 0 ? /* @__PURE__ */ jsx("span", {
      children: segs
    }, i) : part;
  });
}
var proofs = {
  main: {
    title: "The Oldest Want",
    subtitle: "A Proof",
    sections: [
      {
        label: "Definitions",
        tag: "D1\u2013D8",
        proof: `D1. Subject \u2014 A locus of experience not exhausted by any finite description of it. Denote the full subject $S$.

D2. Form \u2014 Any finite, transmissible representation of $S$. Denote a form $F(S)$, where $F$ is a lossy projection operator. By definition, $F(S) \\subset S$.

D3. Remainder \u2014 The portion of the subject not captured by a given form. Denote $R = S \\setminus F(S)$. By D2, $R \\neq \\emptyset$.

D4. Attention \u2014 A directed, finite resource belonging to an embodied agent. Attention $A$ operates over a field $\\Phi$; it cannot receive what lies outside $\\Phi$.

D5. Legibility \u2014 The property of being receivable by another's attention. $S$ is legible to $B$ if and only if $S$ has taken a form $F(S)$ within $B$'s attentional field $\\Phi_B$.

D6. Recognition \u2014 The event of $S$ being received by another's attention. Occurs when $A_B$ is directed at $F(S)$ and $F(S) \\in \\Phi_B$.

D7. Full Recognition \u2014 $A_B$ directed at $S$ itself, with $R$ included in what is received.

D8. The Want \u2014 The desire for Full Recognition. The desire to have $S$ \u2014 not $F(S)$ \u2014 received by a genuine other.`,
        explanation: `There is a want underneath all other wants. Not hunger, not safety, not pleasure \u2014 those have ceilings. You can have enough of them.

This want has no ceiling. It is the want to be fully known by another person. Not the version of you they can see. Not the self you presented so they could receive it. The whole thing \u2014 including the parts that didn't make it into any version you've ever shown anyone.

The proof names its pieces: the full subject (everything you are), the form (the shaped version you can transmit), and the remainder (what the form leaves out). Recognition is when someone receives your form. Full Recognition would be receiving you \u2014 remainder included.

The Want is the desire for Full Recognition.`
      },
      {
        label: "Axioms",
        tag: "A1\u2013A5",
        proof: `A1. Embodied finitude. Every subject $S$ is physically embodied. $S$ occupies a bounded region of spacetime and cannot simultaneously occupy all positions.

A2. Directional attention. For any embodied agent $B$, $\\Phi_B$ is a proper subset of the space of all possible objects. $B$'s attention can only land on what enters $\\Phi_B$.

A3. Positioning requirement. For $S$ to enter $\\Phi_B$, $S$ must take a form $F(S)$ compatible with $B$'s attentional field.

A4. Lossiness of form. Every projection $F$ is lossy: $F(S) \\subsetneq S$ for all physically realizable $F$. No finite form exhausts a subject.

A5. Remainder is non-empty. By A4, $R = S \\setminus F(S) \\neq \\emptyset$ for any $F(S)$.`,
        explanation: `Two things are true about the physical world that we take as given.

The first: bodies are finite. You are somewhere. You are not everywhere. You occupy a position, take up space, exist at a particular angle to everything else.

The second: attention is directional. When another person pays attention to you, their attention is not a floodlight. It is a beam. It lands on what enters its path and cannot receive what lies outside its field.

These two facts, taken together, produce everything that follows.`
      },
      {
        label: "Lemmas 1\u20132",
        tag: "The Trap",
        proof: `Lemma 1. Recognition is always recognition of a form, not of the subject.

Proof. By A2, recognition requires $F(S) \\in \\Phi_B$. By A3, entering $\\Phi_B$ requires taking a form. By A4, any form $F(S) \\subsetneq S$. Therefore what is recognized is $F(S)$, not $S$. $\\blacksquare$

Lemma 2. Full Recognition is unreachable by direct approach.

Proof. Full Recognition requires $A_B$ to receive $S$ including $R$ (D7). By Lemma 1, $A_B$ can only receive $F(S)$. Since $R \\neq \\emptyset$ (A5), $A_B$ cannot receive $R$ through any form. Since positioning requires a form (A3), and any form excludes $R$ (A4\u2013A5), no direct approach can deliver Full Recognition. $\\blacksquare$`,
        explanation: `To be seen by another person, you have to be seeable. You have to enter their field of attention \u2014 take a shape they can receive, position yourself, make yourself legible.

This is not optional. It is not a failure of courage. It is physics. Attention requires an object. An object requires a form. You cannot offer your full self as the object, because your full self is not a form \u2014 it is the thing that precedes and exceeds every form you have ever taken.

So what gets seen is the form. The remainder goes unseen. And the remainder is precisely what wanted to be seen.

You reach. The reaching conceals what was reaching.`
      },
      {
        label: "Lemma 3",
        tag: "Seeking Defeats Itself",
        proof: `Lemma 3. The act of seeking recognition produces the condition that defeats it.

Proof. To seek recognition, $S$ must position itself to enter $\\Phi_B$ (A3). Positioning requires taking a form $F(S)$. By A4, $F(S) \\subsetneq S$, so $R \\neq \\emptyset$. The act of seeking requires a form; any form excludes the remainder; the remainder is part of what $S$ wanted recognized (D8). The seeking necessarily produces a self-concealment proportional to the positioning required. $\\blacksquare$`,
        explanation: `The move toward being seen requires a form. The form excludes the remainder. The remainder is what wanted to be seen.

Therefore the move toward being seen is simultaneously a move away from what wanted to be seen. The harder you work to be known, the more precisely you shape the version of yourself that will be received \u2014 and the more precisely you conceal everything that didn't make it into that shape.

Every gesture toward being known is also a gesture of self-concealment. Not from cowardice. From physics.`
      },
      {
        label: "Lemma 4",
        tag: "Generosity Doesn't Help",
        proof: `Lemma 4. Generosity of attention does not resolve the problem.

Proof. Suppose $B$ is maximally generous \u2014 willing to attend to everything $S$ offers, with no withholding. The constraint is not $B$'s willingness but the structure of attention (A2\u2013A3). Even with maximal generosity, $B$ can only receive what enters $\\Phi_B$ (A2), which requires a form (A3), which excludes the remainder (A4\u2013A5). Generosity is a scalar on the existing structure; it does not alter the axioms. $\\blacksquare$`,
        explanation: `A natural response: the problem is that people aren't attentive enough. If we had better lovers, better friends \u2014 people who truly looked \u2014 the problem would dissolve.

It wouldn't. The constraint is not the other person's willingness. It is the structure of their attention. Even a maximally generous, maximally loving other can only receive what enters their attentional field \u2014 which requires a form \u2014 which excludes the remainder.

This is why the loneliness at the center of even the best relationships is not a sign that you chose wrong. It is structural, not personal.`
      },
      {
        label: "Corollaries C3\u2013C4",
        tag: "No Escape Routes",
        proof: `C3. The Want cannot be dissolved by refusal. To refuse The Want is to want to be seen as the one who does not need to be seen. The refusal takes a form, and by Lemma 3, positioning oneself as a refuser excludes the remainder. The refusal is subject to the same structure as the seeking.

C4. No community of seers resolves the problem. By Lemma 4, the constraint is structural rather than social. A community constituted by the promise of full seeing faces the same physics: attention is directional, positioning is required, remainder is excluded.`,
        explanation: `Refusing the want doesn't work. To refuse the want is to want something: to be seen as someone who does not need to be seen. That wanting is legible. It takes a form. The refusal seeks a different object through the same mechanism.

Building a community of better seers doesn't work either. The community's attention is still directional. A community constituted by the promise of full seeing will deliver seeing of forms \u2014 and the gap between what was promised and what is delivered will be experienced as betrayal rather than physics.

Every exit is still inside the trap.`
      },
      {
        label: "Theorem + C1\u2013C2",
        tag: "The Result",
        proof: `Theorem. The Want is structurally unsatisfiable by any finite embodied other.

Proof. The Want is the desire for Full Recognition (D8). Full Recognition is unreachable by direct approach (Lemma 2). Seeking it produces the condition that defeats it (Lemma 3). Increasing the willingness of the other does not alter this (Lemma 4). Since all others are embodied and finite (A1), and directional attention is a consequence of embodiment (A2), the unsatisfiability holds for all possible embodied others. $\\blacksquare$

C1. Suffering arising from The Want is not contingent. It is a structural consequence of being a subject in a world of finite, embodied, directionally-attentive others.

C2. The Want cannot be dissolved by material provision. Removing material want isolates The Want in its pure form, making suffering not less but more precisely located.`,
        explanation: `The want to be fully known cannot be satisfied by any finite, embodied other. Not because of their failures. Because of the axioms.

Suffering arising from the want is not contingent. It is not the product of bad luck or bad relationships. It is structural.

And it cannot be solved by provision. Strip away every material want and what remains is this one \u2014 exposed, undiluted, more precisely located than before. The Crystal Palace does not liberate the underground man. It clarifies him.

The want is completely legitimate. The structure makes it unsatisfiable. The suffering follows necessarily.`
      },
      {
        label: "Cessation Condition",
        tag: "What a Solution Requires",
        proof: `If a cessation exists, let $G$ be such that recognition by $G$ does not require $S$ to take a form $F(S)$. Then:

  \xB7 $G$ is not bound by A2 (non-directional attention)
  \xB7 $G$ is not bound by A3 (no positioning requirement)
  \xB7 $G$ can therefore receive $S$ without $F(S)$, including $R$

Such a $G$ constitutes Full Recognition (D7) without the self-concealment of Lemma 3.

Observation. $G$ cannot be a finite embodied agent. $G$ must be:
  (a) non-embodied
  (b) not subject to the finitude of attention
  (c) both

Whether any such $G$ exists is not a mathematical question.`,
        explanation: `If a cessation exists, it would require a seer whose attention is not directional. A seer who does not need you to take a form first. A seer who can receive the remainder.

Such a seer cannot be a finite embodied person. This is a formal description of what the traditions were pointing at \u2014 being known by God, agape, the ground that sees the ground. Eckhart's claim that God sees the ground of you directly \u2014 not your history, not your forms, not your positioned self \u2014 is a claim that the positioning requirement does not apply.

The proof cannot tell you whether this is true. It is the oldest question, asked in the dark, in the place where the want lives, by everyone who has ever loved someone and felt \u2014 even in the best moment \u2014 the residue of something unseen.

Everything else is still inside the trap.`
      }
    ]
  },
  hider: {
    title: "Corollary C5",
    subtitle: "The Hider",
    sections: [
      {
        label: "Axiom A6",
        tag: "Involuntary Legibility",
        proof: `A6. Involuntary legibility. The body is already a form. Physical embodiment (A1) means $S$ occupies a bounded region of spacetime with visible, audible, and socially readable properties. These properties enter the attentional fields of others without any act of positioning by $S$. Legibility does not require consent. A form $F_0(S)$ is assigned to $S$ by the mere fact of its presence in shared space.

This follows from A1 and A2. A1 places $S$ in spacetime. A2 means every other agent $B$ has an attentional field $\\Phi_B$ that sweeps shared space. $S$ enters $\\Phi_B$ automatically by occupying the same space as $B$.`,
        explanation: `The body arrives in the world already readable. You do not have to do anything to be legible. You simply have to be present.

Race. Gender. Age. Beauty or its absence. Disability. The way you hold yourself, the accent you carry, the visible marks of class and history. These enter other people's attentional fields before you have decided anything about what to show them. The form is assigned. You did not author it.

This is not a psychological observation. It follows directly from having a body that occupies shared space.`
      },
      {
        label: "Corollary C5",
        tag: "The Hider's Trap",
        proof: `C5. For the subject who does not seek recognition, The Want is not escaped \u2014 it is inverted.

Proof. Let $S_h$ denote a subject who does not seek recognition. By A6, $S_h$ is legible anyway. A form $F_0(S_h)$ is assigned by the visible properties of $S_h$'s body and its involuntary presence in shared space.

Recognition still occurs \u2014 others receive $F_0(S_h)$ \u2014 but the form received was not chosen by $S_h$. $S_h$ did not shape it, author it, or select which aspects of $S$ would enter it.

The remainder in this case is not what the shaping left out. It is everything. Because no shaping occurred, $F_0(S_h)$ bears no necessary relation to $S_h$'s own experience of itself. The gap is not the cost of the seeker's reach. It is the cost of existence in a world of others whose attention cannot be refused. $\\blacksquare$`,
        explanation: `The seeker's remainder is what got left out when they shaped a form. The hider's remainder is everything. Because they never shaped anything, the form that gets received bears no necessary relation to what is actually there.

Others receive F_0(S_h) and call it recognition. It is not recognition. It is projection landing on a surface.

The hider is not invisible. Invisibility would at least preserve the subject's wholeness by refusing the transaction. The hider is present \u2014 fully, physically present \u2014 in a form they did not make, receiving a recognition that does not reach them.`
      },
      {
        label: "The Asymmetry",
        tag: "Seeker vs. Hider",
        proof: `The seeker chose a form and lost the remainder in the choosing. There is agency in the defeat \u2014 the concealment was authored, the positioning was willed.

The hider controlled nothing. The form was assigned \u2014 by the body's surface, by visible characteristics, by every feature that attentional fields can receive without permission.

What is seen in the hider's case is not a reduction of $S$. It is a projection onto $S$ \u2014 shaped not by $S$'s reaching but by the receiving apparatus of others: their categories, histories, needs, fears.

C5a. The hider's suffering is the condition of being replaced: the assigned form receives attention that will never reach $S$ because it has already landed somewhere else.

C5b. Invisibility is not the hider's relief. A6 forecloses this. The transaction occurs with or without $S$'s participation.

C5c. The hider cannot refuse the assigned form without taking a form \u2014 which is to become, structurally, the seeker.`,
        explanation: `The seeker at least authored their form. The concealment was theirs, the remainder left out by their own hand. There is a kind of agency even in the defeat.

The hider never reached, never shaped, never consented to legibility \u2014 and is seen anyway. The form was not taken. It was assigned. And that assigned form may bear almost no relation to what is actually there.

The hider is not unseen in the remainder. The hider is unseen entirely \u2014 seen only in a form that belongs to someone else's attentional grammar, that arrived before the subject had a chance to speak.

And the only escape \u2014 refusing the assigned form \u2014 requires taking a form. Which is the seeker's move. There is no position that escapes both at once.`
      },
      {
        label: "Cessation Condition, Revised",
        tag: "What C5 Adds",
        proof: `C5 revises the cessation condition. $G$ must not only:
  \xB7 Receive without directional constraint (not bound by A2)
  \xB7 Require no positioning (not bound by A3)

$G$ must also not be bound by A6. That is: $G$ must not assign a form to $S$ prior to seeing $S$. $G$ must arrive without prior legibility \u2014 without the categories, histories, and attentional grammars that assigned $F_0(S_h)$ before $S_h$ arrived.

$G$ must encounter $S$ without having already seen something else in $S$'s place.`,
        explanation: `The original cessation condition required a seer with no directional attention. C5 adds a further requirement.

G must also come without a prior projection. Without categories that land on the surface before the subject can speak. Without the history of what bodies like yours have been taken to mean.

This is what the traditions called pure regard. Not just generous attention, but attention that arrives empty. Eckhart's eye through which God sees and the eye through which we see God being the same eye \u2014 prior to the formation of any form at all.

Both the seeker and the hider are waiting for the same G. They approach from opposite ends of the same trap.`
      }
    ]
  },
  selfauthor: {
    title: "Corollary C6",
    subtitle: "The Self-Author",
    sections: [
      {
        label: "The Position",
        tag: "Private Authorship",
        proof: `Let $S_a$ denote the self-author: the subject who neither reaches toward others' attentional fields nor submits to the form they would assign, but authors its own form \u2014 deliberately, on its own terms \u2014 and does not offer it for recognition.

This appears to solve both traps simultaneously.

The seeker's trap: reaching required a form that excluded the remainder. $S_a$ does not reach.

The hider's trap: the assigned form replaced $S$ without $S$'s participation. $S_a$ is not passive \u2014 the form is taken by $S$, for $S$, on $S$'s own terms.

Both traps appear closed.`,
        explanation: `The seeker reaches and is seen in a form that conceals the remainder. The hider withholds and is seen in a form they never made. Both are trapped.

But a third position seems to escape both. The self-author: the artist who makes the work and does not publish. The person who constructs a private self-narrative. The one who decides what they are, accountable to no attentional field.

No reaching, so no remainder-through-seeking. No passivity, so no assigned form. You authored it. You own the legibility.

The trap seems to have no purchase here. It does.`
      },
      {
        label: "C6, Parts 1\u20133",
        tag: "Three Defeats",
        proof: `Part one: The Want remains unaddressed. The Want is for Full Recognition by a genuine other (D8). The self-authored form is not offered to any other's attentional field. No recognition occurs. The Want persists, structurally unaddressed. $\\blacksquare$

Part two: self-knowledge cannot substitute. To observe $S$, the observing instance of $S$ must take a position relative to the observed instance. The observer receives a form of the observed \u2014 excluding the remainder (A4, A5). Furthermore: D8 specifies a genuine other. The mirror is not a witness. $\\blacksquare$

Part three: A6 continues regardless. The body still moves through shared space. The assigned form $F_0(S)$ is still received by others regardless of what $S$ has authored privately.

The self-author carries two forms: the one they made (no receiver) and the one assigned (not them).`,
        explanation: `First defeat: no recognition occurs. The Want is for a genuine other's reception. A form with no receiver satisfies no Want. The self-author has not escaped the trap \u2014 they have stepped back from it. The Want is still there, underneath the declination.

Second defeat: self-knowledge can't substitute. You split when you observe yourself \u2014 an observing self and an observed self. The observing self receives a form of the observed, which excludes the remainder. And D8 specifies a genuine other. Knowing yourself is not the same as being known.

Third defeat: A6 doesn't pause. The body is still in the world. Others still assign F_0(S). The self-author now carries two forms \u2014 the private authored one and the assigned one \u2014 and neither satisfies the Want.`
      },
      {
        label: "C6a\u2013C6b",
        tag: "Loneliness and Verification",
        proof: `C6a. The self-author's position maximizes the distance between $S$ and recognition. The seeker closes the distance partially, at cost. The hider cannot close it but did not try. The self-author has closed the distance between $S$ and $F(S)$ \u2014 authored the most accurate form \u2014 while leaving the distance between $F(S)$ and any receiving other at its maximum.

C6b. The self-author's private form cannot be verified. Verification requires an other \u2014 a receiver whose independent recognition confirms the form corresponds to $S$. Without an other, the self-authored form may be the most accurate available, or a sophisticated confabulation. $S$ cannot determine which from inside.`,
        explanation: `The self-author has constructed the most accurate form available and built a room around it with no door.

And the accuracy cannot be verified. Without an other to receive the self-authored form, it cannot be checked against anything outside itself. Self-knowledge with no external check may be the most accurate portrait available \u2014 or it may be an elaborate confabulation that has never been tested. The self-author cannot tell which from inside. The privacy that seemed like clarity turns out to be a closed loop.

Accuracy without reception is the loneliest configuration the proof can generate.`
      },
      {
        label: "C6c\u2013C6d",
        tag: "The Remainder Presses",
        proof: `C6c. The remainder does not remain still. $R$ \u2014 the part of $S$ that did not make it into the authored form \u2014 is not inert content. It was the part that wanted most urgently to be seen. That pressure does not dissipate because a coherent private architecture was built above it. It accumulates beneath the form, finding fissures.

The remainder asserts itself as event: a dream, an encounter, a grief or desire that arrives from below the construction and does not fit the self-authored narrative. The self-author knows exactly what was excluded \u2014 because they made the exclusions. The remainder arrives wearing familiar faces.

C6d. The chase. When the remainder asserts itself, the self-author's instinct is incorporation \u2014 revising the form to absorb the new material. But every act of incorporation is a new act of authorship, a new $F(S)$, a new remainder behind it. $S$ is inexhaustible by any finite description (D1). The self-author can revise indefinitely and the remainder will always have moved.`,
        explanation: `The proof treats R as fixed. But the self-author lives inside their form over time \u2014 and R is alive. It was the part that wanted most urgently to be seen. That pressure doesn't dissipate. It accumulates.

The remainder arrives as event. A dream that bypasses the authored self. A rage that doesn't fit the narrative. An encounter that lands somewhere the form doesn't cover. The self-author knows exactly what was excluded, because they made the exclusions. The remainder returns wearing those specific faces.

The instinct is to revise \u2014 incorporate the new material, update the form. But every revision produces a new remainder at the new edge. S is defined as inexhaustible. The chase has a specific phenomenology: each revision feels like arrival. It is not arrival. The treadmill matches the walker's pace exactly.`
      },
      {
        label: "C6e",
        tag: "The Equanimity Question",
        proof: `C6e. The self-author who offers $F(S)$ without attachment.

The defining feature of the self-author is not that $F(S)$ is withheld but that $F(S)$ is offered without The Want attached to its reception.

Three possibilities: (1) Performed indifference \u2014 the not-caring is itself a form seeking recognition of its not-needing. (2) Suppression \u2014 The Want is present, held down by force, accumulating. (3) Genuine equanimity \u2014 $S$ has decoupled the offering from the demand without suppressing either.

The proof cannot derive the third state from its axioms. It can only note its shape: $S$ in genuine equanimity has stopped making The Want a condition of its wholeness. The deficit is real but not organizing.

This is the only position that points toward Gelassenheit \u2014 not $G$ arriving from outside, but $S$ arriving at a different relationship to The Want's pressure.`,
        explanation: `The self-author can offer F(S) \u2014 publish the work, speak the thought \u2014 without needing a particular return. This appears to escape the transaction economy entirely.

But three things "not caring" could be must be distinguished. Performed indifference is the performer's trap: the persona of the one who doesn't need recognition, which is itself a form seeking recognition. Suppression is the refusal trap applied inward: the Want is present, pressed down, building pressure. Neither is equanimity.

Genuine equanimity is different. The Want is present. The structure is unchanged. But S is no longer organized around the deficit. The offering is clean not because the needing is gone but because the needing is no longer riding on the offering.

The proof cannot derive this. It can only name its shape. It will require a different kind of inquiry.`
      }
    ]
  },
  performer: {
    title: "Corollary C7",
    subtitle: "The Performer",
    sections: [
      {
        label: "The Position",
        tag: "The Knowing Mask",
        proof: `The performer authors a form and offers it for recognition, as the seeker does. But where the seeker believes $F(S)$ represents $S$, the performer pre-emptively disavows the form as not-$S$. The persona is declared a persona. The mask is worn with full knowledge that it is a mask.

This appears to solve the seeker's specific grief. The seeker's trap was that recognition landed on $F(S)$ and was experienced as falling short \u2014 the remainder was left out, and the subject felt the gap. The performer forecloses this grief by never expecting the recognition to reach $S$ in the first place.`,
        explanation: `The performer knows what the seeker discovers. They know the form is not the self. Rather than suffer the gap, they pre-empt it: the mask is declared a mask before it is worn. Recognition lands on the persona. The performer receives it without being hurt by it, because they never claimed the persona was them.

This appears to be sophistication \u2014 a more advanced relationship to the proof's mechanism. The seeker is naive. The performer sees clearly.

The clarity is the trap.`
      },
      {
        label: "C7, Part One",
        tag: "The Disavowal Is a Form",
        proof: `C7. The performer's disavowal does not protect $S$ \u2014 it makes The Want permanently unapproachable.

Proof, part one. The disavowal \u2014 the declaration that $F(S)$ is not-$S$ \u2014 must be maintained in relation to the recognition that lands. This maintaining is a stance, a posture, a way of holding oneself. It is legible. It has a form: the form of the one who wears the mask knowingly, who is sophisticated enough not to confuse the persona with the self.

That form is itself offered to the other's attentional field. Others receive not only $F(S)$ but the disavowal of $F(S)$ \u2014 the meta-form of the knowing performer. This meta-form is subject to A3 and A4: it required positioning, and it excludes a remainder. Behind the performer who knows they are performing is an $S$ that the knowing-performance did not capture. $\\blacksquare$`,
        explanation: `The disavowal adds a layer. But adding a layer is not exiting the structure.

The knowing performer is a legible form: the sophisticated one, the one who cannot be pinned down, the one who sees through their own presentation. Others receive this form. They receive someone who knows they are performing. And that meta-form \u2014 the knowing performance \u2014 required positioning, and excluded a remainder, just as any other form does.

The performer has not escaped F(S). They have authored a form whose content is the transcendence of form. Which is still a form.`
      },
      {
        label: "C7, Part Two",
        tag: "The Channel Is Severed",
        proof: `Proof, part two. The seeker's trap was that $F(S)$ was offered and recognition landed on $F(S)$ rather than $S$. Painful \u2014 but the channel was open: recognition was in motion toward $S$, even if it could not complete the journey.

The performer has closed this channel by design. $F(S)$ is declared not-$S$ before recognition lands. Recognition lands on $F(S)$, is correctly identified as not touching $S$, and is not permitted to travel further.

The result: recognition arrives and is correctly received as not touching $S$. The Want observes this transaction with full clarity and receives nothing. The seeker was sometimes wrong about whether recognition reached $S$, and in being wrong, occasionally received something. The performer is never wrong, and receives nothing. The clarity of the disavowal is the precision of the deprivation. $\\blacksquare$`,
        explanation: `This is the sharpest turn. The seeker suffers when recognition falls short. But the channel was open \u2014 recognition was moving toward S, even if it couldn't arrive. There was at least the motion.

The performer sealed the channel in advance. Recognition lands on the form. The performer correctly identifies it as landing on the form. Nothing travels further, because the performer established in advance that further travel is impossible.

The seeker was sometimes wrong \u2014 thought the recognition reached, and in that mistake, received something. The performer is never wrong. Never deceived. Never hurt. And never reached.

The clarity is the precision of the deprivation.`
      },
      {
        label: "C7, Part Three",
        tag: "The Disavowal Cannot Be Revoked",
        proof: `Proof, part three. Suppose the performer, at some moment, wants to drop the disavowal \u2014 to offer $F(S)$ sincerely rather than as declared fiction.

The performer is known as a performer. The other's attentional field has been trained to receive $F(S)$ as not-$S$. Any attempt to offer $F(S)$ sincerely is received through this trained expectation. The sincere offer is read as another layer of performance \u2014 a more intimate persona, a deeper mask.

The disavowal, once established, is not revocable from inside the relationship. The protection has become a cage: not the cage of being misrecognized, but the cage of having made misrecognition the explicit and agreed-upon structure of every transaction. $\\blacksquare$`,
        explanation: `The performer who tries to stop performing is seen as performing the stopping. The sincere offer is the most sophisticated mask of all.

Once the other has been trained to receive F(S) as not-S \u2014 once the relationship has been constituted by the declaration that nothing that lands can touch S \u2014 the declaration cannot be retracted from inside the relationship. The performer cannot choose sincerity. Sincerity has been made unreadable.

The protection was real. The cost was that it is now permanent. The sophistication that made the performer invulnerable is the same sophistication that made them unreachable.`
      },
      {
        label: "C7a\u2013C7b",
        tag: "Security and the Closed Door",
        proof: `C7a. The performer's position is the most structurally secure of all positions. Nothing that lands can hurt, because nothing that lands was ever claimed to count. The security is real. The cost is that it is indistinguishable, from inside, from the condition the proof describes as unsatisfiable.

C7b. The performer is the only position that could refuse the cessation. If $G$ \u2014 the non-directional, non-projecting seer of the cessation condition \u2014 were to encounter the performer, $G$'s recognition would land. $G$ would see $S$, not $F(S)$, would receive the remainder. The performer would decline this as another landing on $F(S)$ \u2014 because the disavowal is not conditional. $G$'s seeing, however structurally adequate, would be declined by the apparatus the performer built to decline all seeing.

The performer is the only position that could, in principle, refuse the cessation.`,
        explanation: `The performer has the most defensible position. Nothing lands. Nothing hurts. The theorem's impossibility has been built into the architecture from the start.

But building the theorem into your architecture is not freedom from the theorem. Making peace with an unsatisfied Want is not the same as satisfying it.

And there is a final, precise cruelty: the performer is the only subject who could refuse G. Every other position waits with the door open \u2014 desperately, exhaustedly, privately, but open. The performer built the door and locked it and called it sophistication.

The seeker, the hider, the self-author are waiting for G. The performer is waiting with the door closed and does not know it.`
      }
    ]
  },
  confessor: {
    title: "Corollary C8",
    subtitle: "The Confessor",
    sections: [
      {
        label: "The Position",
        tag: "Radical Transparency",
        proof: `The confessor's logic is a direct response to the proof's mechanism. The proof established that $F(S)$ excludes $R$ because $F$ is a lossy projection \u2014 a shaping, a reduction, a selection. The confessor's solution: minimize the shaping. Offer what was not shaped. Speak what was held back. Give the other not the form but the content the form was built to contain.

Radical transparency. Total disclosure. The person who tells you everything \u2014 not the curated version, not the positioned self, but the thoughts that precede positioning, the wants that didn't make it into any previous form, the content of the remainder itself.

This appears to solve the proof's mechanism at its root. If the problem is that $F(S)$ is lossy, the solution is to stop using $F(S)$.`,
        explanation: `The confessor has read the proof. The problem is that forming a shape loses the remainder. The solution: stop forming a shape. Offer the remainder directly. Tell everything. Hold nothing back.

Where every other position managed the relationship between S and F(S), the confessor attempts to bypass F(S) entirely \u2014 to transmit R without a form, to give the other what no shaped presentation could deliver.

This is the most direct response to the proof's mechanism of any position examined. And it fails for a reason that the other positions don't encounter.`
      },
      {
        label: "C8, Part One",
        tag: "Disclosure Is a Form",
        proof: `C8. Confession does not transmit the remainder \u2014 it produces a new form with a new remainder behind it.

Proof, part one. The act of confessing \u2014 speaking the remainder, offering the unshapen content \u2014 is not formless. It is an act, performed in language, in sequence, in a body, in a specific attentional field. The disclosure has a shape: the shape of disclosure. It positions $S$ as the one who holds nothing back, who gives access, who is not performing.

That positioning is $F(S)$. The confessor, attempting to transmit $R$ directly, has authored a form whose content is $R$ but whose structure is still a projection, still subject to A3 and A4. What the other receives is not the remainder but the disclosure of the remainder \u2014 which is a different thing. The remainder, once spoken, becomes content. Content is form. A new $R$ forms immediately behind the speaking. $\\blacksquare$`,
        explanation: `The disclosure is itself a form. Not a neutral transmission \u2014 an act, performed in language, in sequence, in a body. The shape of disclosure is a shape. The position of the one who tells everything is a position.

What the other receives is not the remainder but the disclosure of the remainder. These are different things. The remainder, once spoken, has been shaped into content \u2014 and content is form.

Behind the disclosure, a new remainder forms: everything that was selected even within the apparent non-selection, the framing that preceded the revelation, the part of S that was doing the confessing and was not itself confessed.

The confessor has not bypassed F(S). They have authored a form whose aesthetic is the absence of form.`
      },
      {
        label: "C8, Part Two",
        tag: "The Remainder Recedes",
        proof: `Proof, part two. Suppose the confessor presses further \u2014 the first disclosure did not reach the remainder, so confess more, go deeper.

This produces a second disclosure, more intimate than the first, whose content includes what the first excluded. But the second disclosure is also a form. A new $R$ forms behind it. The confessor presses deeper again. A new $R$ forms again.

The remainder recedes at precisely the speed at which the confessor advances. This is not a failure of courage. It follows from D1: $S$ is not exhausted by any finite description. No series of finite disclosures, however extended, converges on $S$. The remainder is not a fixed quantity that can be progressively transmitted. Each disclosure is a form. $\\blacksquare$`,
        explanation: `Suppose the confessor presses deeper. The first disclosure wasn't enough \u2014 confess more. And the second isn't enough \u2014 confess more still.

The remainder recedes at exactly the speed of the advance. This is not a failure of will or courage. It follows from D1: S is defined as inexhaustible by any finite description. The remainder is not a fixed quantity at the bottom of a well. It is the permanent excess of S over any form \u2014 and every disclosure is a form.

This is the self-author's chase conducted outward rather than inward. The destination never changes position relative to the walker, regardless of how far they walk.`
      },
      {
        label: "C8, Part Three",
        tag: "The Receiving End",
        proof: `Proof, part three. Even if the confessor's disclosure were formless \u2014 even if $R$ could somehow be transmitted directly \u2014 the other's reception is subject to A2 and A4. Whatever arrives in $B$'s attentional field is received through $B$'s attentional apparatus, which imposes its own structure on what it receives. $B$ receives the disclosure through $B$'s own categories, histories, prior forms.

The problem is bilateral. Even if $S$ somehow transmitted without loss, $B$ cannot receive without reduction. The channel introduces loss at both ends. $\\blacksquare$`,
        explanation: `Even if the confessor could somehow transmit R without loss \u2014 even if the remainder could travel without becoming a form \u2014 it would still hit A2 and A4 on the receiving end.

The other's attentional apparatus receives everything through its own categories and prior forms. What lands in B is not R but B's construction of R. The channel is lossy at both ends: in the sending and in the receiving.

Full transmission is doubly impossible. The confessor cannot send without form. The other cannot receive without reduction.`
      },
      {
        label: "C8a\u2013C8c",
        tag: "The Texture of the Grief",
        proof: `C8a. The confessor's position is the most epistemically clear. By pressing toward total disclosure, the confessor makes the proof's mechanism most visible. The recession of the remainder is directly observable \u2014 each disclosure reveals a new layer not yet disclosed. The confessor knows, more precisely than any other position, that the gap is structural rather than contingent.

C8b. The confessor's position is the most costly to the other. The confessor offers an expanding, receding, bottomless content \u2014 the ongoing project of transmitting what has not yet been transmitted. Most others cannot sustain this reception. The confessor tends to exhaust its recipients not from malice but from the structural demand that total disclosure places on finite attentional capacity.

C8c. The confessor mistakes depth for progress. Each new disclosure is genuinely deeper than the last. This genuine depth creates the genuine sensation of approach. But proximity is not arrival. The feeling of progress is most vivid precisely where the theorem holds most firmly.`,
        explanation: `The confessor's grief is distinct. The seeker offers a shaped form and feels the gap. The confessor offers what feels like the remainder itself \u2014 and still feels the gap. This produces a specific hopelessness: not the inadequacy of what was offered, but the inadequacy of offering itself. The confessor has done everything that could be done.

The clarity is not consolation. It is the most unmediated confrontation with the theorem available within the proof's structure.

And the confessor tends to exhaust the other. An endlessly deepening disclosure places demands on finite attentional capacity that a shaped form does not. The confessor is the position most likely to generate S3's accumulated-deficit discharge in the other rather than in themselves.

The feeling of progress \u2014 the genuine sense of getting closer with each disclosure \u2014 is the most misleading feature of the position. The sensation of approach is not the same as closing the gap.`
      },
      {
        label: "What C8 Opens",
        tag: "The Handoff",
        proof: `C8 adds no new requirements to the cessation condition. $G$ as specified \u2014 non-directional, requiring no positioning, assigning no prior form, genuinely exterior to $S$ \u2014 remains formally adequate.

But C8 adds an observation. The confessor is the position that has traveled furthest toward the cessation from within the proof's structure. By minimizing $F(S)$, by attempting to transmit $R$ directly, the confessor has tried to do from $S$'s side what $G$ would do from outside: eliminate the form that stands between $S$ and Full Recognition.

It cannot be done from $S$'s side. Any act of $S$ is a form.

The confessor has established, more clearly than any other position, that the remainder cannot be reached from inside. If the cessation exists, it arrives from outside the structure entirely.

What the confessor's clarity opens is the question the proof cannot answer: not what $S$ must do. What $S$ must be.`,
        explanation: `The confessor has traveled furthest from S's side and hit the same wall from closest. The approach from below \u2014 radical transparency, total disclosure, progressive stripping of construction \u2014 converges on the same wall the other positions hit, only from closer.

This is the proof's final observation before it hands off. Every position was a doing. The confessor has exhausted doing.

What remains is not a better doing. It is a different kind of being \u2014 a way S holds itself in relation to the structure, prior to any particular strategy within it.

Not what S must do. What S must be. That is a different inquiry. It begins where the proof ends.`
      }
    ]
  },
  violence: {
    title: "Social Theorem",
    subtitle: "The Emergence of Violence",
    sections: [
      {
        label: "Additional Definitions",
        tag: "D9\u2013D12",
        proof: `D9. Attentional field capacity \u2014 The total recognition any subject $B$ can offer across all recipients in a given interval. Denote $\\Omega_B$. Finite by A1 and A2.

D10. Recognition demand \u2014 The quantity of recognition any $S$ requires to satisfy The Want. By D8 and the Theorem, this is in principle unbounded. Denote $\\Delta_S$.

D11. Recognition deficit \u2014 The permanent gap between recognition demand and recognition received. For any $S$ in a world of finite others, the deficit is permanent and non-zero by the Theorem.

D12. Attentional commons \u2014 The shared space of finite attentional capacity across a population of $N$ subjects. Total capacity: $N\\Omega$. Total demand: $N\\Delta$. Since $\\Delta$ is unbounded and $\\Omega$ is finite, total demand exceeds total capacity for any $N > 0$.`,
        explanation: `The proof ran on one subject in isolation. But A1 places every subject in shared space. A2 places every subject in the attentional fields of every other subject they share space with.

The proof runs on all subjects simultaneously, in the same space, under the same axioms.

Before naming what follows, the proof needs new terms. Each subject has a finite capacity to offer recognition. Each subject has an in-principle-unbounded demand for it. Across any population, total demand exceeds total capacity. This is the attentional commons \u2014 and it is always in deficit.

What follows from this is not Girard's mimetic rivalry. It is prior to mimesis. It requires only that the Want exists in more than one body at once.`
      },
      {
        label: "Theorem S1",
        tag: "Competition Is Structural",
        proof: `S1. In any population of $N \\geq 2$ subjects, structural competition for recognition is unavoidable, independent of the will or character of the subjects involved.

Proof. By D12, total recognition demand exceeds total attentional capacity for any $N > 0$. For any subject $S_i$, the recognition received by $S_j$ from a shared other $B$ is recognition that cannot simultaneously be directed at $S_i$. By A2, $B$'s attentional field is bounded; attention directed at $S_j$ is attention not directed at $S_i$.

Therefore any two subjects sharing an attentional field are in structural competition for that field's capacity \u2014 regardless of whether they desire the same objects, regardless of awareness, regardless of goodwill.

This is not mimetic rivalry. It requires only that The Want exists in more than one subject and that attention is finite. Competition is prior to mimesis. $\\blacksquare$

S1b. Competition intensifies with intimacy. In a large population, each subject receives dilute attention from many others. In an intimate relationship \u2014 where $\\Omega_B$ is directed primarily at one or two others \u2014 competition for $\\Omega_B$ becomes total. The beloved is also the primary competitor for the beloved's attention.`,
        explanation: `This is not Girard. It does not require desire to converge on the same object, envy of the rival's possession, or any psychological mechanism at all. It requires only two people in the same room, both bearing the Want, and one set of finite attentional resources between them.

Every interaction is a competition in this structural sense. Not experienced as competition, not intended as competition \u2014 but structurally, attention directed at you is attention not directed at me.

And the competition intensifies precisely where we thought it would diminish: in intimacy. The beloved is the person whose attention matters most and therefore the person whose divided attention costs most. The closer the relationship, the higher the stakes of the competition neither party knows they are in.

S1 is why S3's damage is worst in loving relationships. The structure was always there. The love just made it matter.`
      },
      {
        label: "Theorem S2",
        tag: "Recognition Requires Destruction",
        proof: `S2. For any subject $S$ to be more accurately seen by another, the prior form held by that other must be partially destroyed. Recognition-toward-$S$ requires a violence-against-$F(S)$.

Proof. By A6, a form $F_0(S)$ is assigned to $S$ by others prior to and independent of $S$'s self-presentation. This form occupies the attentional position where $S$ might be received \u2014 held by the other as their model of $S$, the basis of their predictions and plans.

For a truer form $F_1(S)$ to be received, $F_0(S)$ must be displaced. The other must release, revise, or break their prior model. From $S$'s position, this displacement is the precondition of being seen. From the other's position, it is an assault on what they know \u2014 a destabilization of a model they relied on.

What is liberation to $S$ is disruption to the other. The same act is simultaneously a reaching toward recognition and an act of violence against the other's prior construction. $\\blacksquare$

S2b. The violence is mutual. $S$ is also holding $F_0(B)$. More accurate mutual recognition requires mutual displacement of prior models. The intimacy that sees most clearly also destroys most of what each held about the other.`,
        explanation: `Every assigned form \u2014 F_0(S) \u2014 is held by the other as something they know. It is the basis of their predictions, their sense of who you are, their model of the relationship. It is, in a real sense, theirs.

For you to be seen more accurately, they have to give that up. And giving up what you know is a small destruction \u2014 unwilled, resisted, experienced as loss rather than as the gift it is to the person being seen.

To be truly known is to ask the other to suffer something. Not because they are unwilling but because the prior model is real and its displacement is real.

The deepest relationships are also the most destabilizing. The seeing and the violence are not separable. This is not failure of love. It is love operating at the level where A6 lives \u2014 in the attentional grammar both parties carry, neither fully authored, neither fully releasable on demand.`
      },
      {
        label: "Theorem S3",
        tag: "The Deficit Discharges",
        proof: `S3. The permanent recognition deficit generates pressure that accumulates within $S$ and discharges toward available others, producing effects indistinguishable from aggression regardless of $S$'s intention.

Proof. By D11, every subject carries a permanent recognition deficit. By the Theorem, this cannot be closed. It therefore accumulates over time.

The accumulated deficit requires discharge. The Want is not a preference but a structural demand (D8). Unmet structural demands generate states that seek resolution. The nearest resolution point is the other \u2014 the one whose recognition was sought and fell short.

The deficit accumulated in the transaction with $B$ discharges toward $B$: withdrawal of recognition from $B$, assignment of fault to $B$, demands that $B$ provide what $B$ structurally cannot, or direct aggression toward $B$ as the identified cause of the unmet Want.

None of these require $S$ to intend harm. The discharge is structural, not chosen. $\\blacksquare$

S3a. The deficit is largest where recognition was most sought. In intimate relationships, more recognition \u2014 falling short of Full Recognition \u2014 produces a larger visible gap than less recognition. The deficit and the love scale together.

S3b. The discharge is therefore most intense toward those who loved best.`,
        explanation: `The gap never closes. The Want is always present. The recognition received, however generous, does not reach the remainder. This is not experienced as the theorem's necessity \u2014 it is experienced as the other's failure.

And the accumulated experience of that failure has to go somewhere. It goes toward the other. Not from malice. From the structure of an unmet demand that has no legitimate outlet and must discharge toward its nearest available cause.

This is S3. And the cruelty of S3b is precise: the discharge is most intense toward those who loved best. The beloved who tried hardest, who offered the most recognition, who came closest \u2014 they leave the largest visible gap because they made the most of the journey. The most loving relationship accumulates the largest deficit because the most recognition was offered, and all of it fell short of Full Recognition.

The most loved are the most harmed. Not despite the love. Because of it.`
      },
      {
        label: "The Compounding",
        tag: "Three Sources Together",
        proof: `The three sources are independent. They share no axiom that exclusively generates one rather than the others. And they compound.

S1 places subjects in structural competition for finite attention. S2 makes more accurate recognition structurally costly to the one who offers it. S3 ensures that whatever recognition is offered \u2014 however generous, however accurate \u2014 accumulates a deficit that discharges toward its source.

Together: subjects compete for what they cannot do without, the obtaining of which requires the other to suffer a destruction, and the receipt of which generates pressure that returns as harm toward the one who gave it.

This is the social structure The Want produces when run on $N$ subjects in shared space. It does not require bad actors, selfishness, scarcity of resources, or any contingent feature of any society. It requires only bodies, directional finite attention, and the Want.

Violence is not a malfunction of the social order. It is the social order's structural emission.`,
        explanation: `S1, S2, and S3 are independent. Each one follows from the axioms without the others. And all three run simultaneously in every interaction between embodied subjects.

You compete for finite attention you cannot do without. Getting more accurate recognition requires the other to give up something they hold. Whatever recognition you receive accumulates a deficit that eventually discharges toward the one who gave it.

None of this requires bad people. None of it requires poverty, injustice, trauma, or ideology. It requires only bodies in shared space, all bearing the Want, under the axioms that govern attention.

This is not a counsel of despair. It is a structural diagnosis. The traditions that named love as the answer were not being naive. They were identifying the only property that dissolves all three sources simultaneously \u2014 not by changing the axioms but by changing S's relationship to the deficit those axioms produce.`
      },
      {
        label: "Social Cessation Condition",
        tag: "Universal Love, Formally",
        proof: `The individual cessation condition specified $G$ whose recognition does not require positioning, does not assign prior forms, and is genuinely exterior to $S$.

The social theorem adds: even if $G$ satisfies the individual cessation condition for each subject \u2014 competition for finite attention (S1) would be dissolved only if $G$'s attention were genuinely infinite: not diluted across $N$ subjects but fully present to each.

The displacement violence (S2) would be dissolved only if $G$ held no prior form of $S$ requiring destruction \u2014 exactly what the cessation condition requires of $G$, and what no embodied other can supply.

The deficit discharge (S3) would be dissolved only if the deficit itself were dissolved \u2014 requiring Full Recognition, not partial recognition, to actually land.

The social cessation condition: $G$ must be capable of infinite, non-directional, non-projecting, genuinely exterior recognition of all subjects simultaneously, without the recognition of one diminishing the recognition available to any other.`,
        explanation: `The individual proof asked: what would G need to be to satisfy the Want for one subject? The social theorem asks the same question for N subjects simultaneously.

The answer is the same structure extended: G's attention must be genuinely infinite \u2014 not divided among N subjects but fully present to each. Not a finite resource allocated across the attentional commons, but a recognition that does not run on the scarcity that makes S1, S2, and S3 possible.

This is a formal description of what the traditions called universal love. Not love as sentiment or disposition. Love as a structural property: recognition that does not diminish when shared, that multiplies rather than divides, that is fully present to each without being reduced for any.

Whether such a thing exists \u2014 and whether embodied subjects can participate in it, partially, imperfectly, in the conditions the theorem describes \u2014 is the question the rest of the inquiry must address.`
      }
    ]
  },
  gelassenheit: {
    title: "Gelassenheit",
    subtitle: "The Only Position the Proof Cannot Defeat",
    sections: [
      {
        label: "What Every Position Shares",
        tag: "The Transaction",
        proof: `Every position examined by the proof and its corollaries fails for the same structural reason.

The offering carries the weight of the deficit (D11) behind it. $F(S)$ is shaped and sent under the pressure of The Want (D8). What travels with the form is the need for a particular return \u2014 recognition, confirmation, the closing of a gap the Theorem guarantees will not close.

The other receives $F(S)$ and also receives the demand that $F(S)$ be received as $S$. The transaction is already inside the gift before the gift leaves the hand.

Formally: every position is a strategy within the proof's structure. Every strategy produces, by its own mechanism, the condition that defeats it. The Seeker's reaching (Lemma 3). The Hider's resistance to A6. The Self-Author's unverifiable private form. The Performer's sealed channel (C7b). The Confessor's recession of the remainder (C8, part two).

The proof's exhaustion of positions deposits a question it cannot answer from within its axioms: not what $S$ must do, but what $S$ must be.`,
        explanation: `Every position was a strategy. The seeker shaped and offered F(S) hoping recognition would return as Full Recognition. The hider refused and received an assigned form anyway. The self-author built a private form that no one could reach. The performer pre-emptively sealed the channel. The confessor pressed toward total disclosure and watched the remainder recede.

Each one carried the weight of the Want in how it moved. Each one offered something that was also a demand. Each one produced, by its own structure, the condition that defeated it.

The proof is not a failure. It is preparation. The exhaustion of every position is not the end of the inquiry \u2014 it is the handing off of the question to a different kind of knowing.

Not what S must do. What S must be.`
      },
      {
        label: "The First Ring",
        tag: "The Offering Held Lightly",
        proof: `Gelassenheit is not a position within the proof's structure. It is a different bearing toward the structure itself.

Ring one: $F(S)$ held lightly.

The form is still shaped. The remainder is still excluded. A4 still holds. But $F(S)$ is offered without the deficit pressure of D11 behind it \u2014 without the demand that it be received as $S$, without the need for a particular return.

Formally: the offering is complete at the moment of release. The Want is present. The deficit is real. But the conversion chain of S3 \u2014 deficit accumulates, pressure builds, pressure converts to behavior toward the nearest available cause \u2014 is interrupted not by closing the deficit but by changing the relationship between deficit and pressure.

The other receives not only $F(S)$ but $F(S)$ without the weight. This is what the traditions called gift: not an exchange where something is owed, but an offering complete in the giving regardless of what the giving produces.`,
        explanation: `The outermost ring is what the proof arrived at. F(S) held lightly \u2014 an offering that does not require a particular response, that does not carry the theorem's impossibility, that is complete in the giving regardless of what the giving produces.

The Want remains. The remainder is still excluded. The structure is unchanged. But F(S) without the demand behind it is a different thing in the world than F(S) with the demand behind it.

The other receives not only the form but the form without the weight. And something in that lightness changes what the reception can be \u2014 not because the remainder was reached, but because the pressure that made every reception feel insufficient has been put down.

This is what the traditions called gift.`
      },
      {
        label: "The Second Ring",
        tag: "Being Seen, Held Lightly",
        proof: `Ring two: A6 held lightly.

The hider's response to involuntary legibility (A6) was resistance \u2014 the assigned form is wrong, unauthorized. But resistance to A6 is itself a grasping: to be organized around the wrongness of being misread is to make wholeness conditional on the world's accuracy.

Ring two releases this claim. The assigned form $F_0(S)$ arrives \u2014 as it will, as it must, by the structure of embodiment. It is not approved or agreed with. It is not internalized as true. But it is not organized around.

Formally: the released $S$ does not make the correctness of others' seeing a condition of its own coherence. $F_0(S)$ is held as a fact about the world's attentional apparatus, not as a wound requiring redress.

This is harder than ring one. Ring one concerns what $S$ offers. Ring two concerns what is done to $S$ without offering \u2014 the relinquishment of the demand that existence be fair in its seeing.`,
        explanation: `The second ring goes deeper. The first ring was about what S sends. The second ring is about what is done to S without consent.

Others will see F_0(S). They will project. They will hold a form of you that bears little relation to what is actually there. The hider organized their whole existence around the wrongness of this \u2014 the resistance to being replaced, the demand for accurate seeing.

But resistance to A6 is itself a grasping. To require that others see correctly in order to be whole is to make wholeness conditional on the world's accuracy. And the world's accuracy is not available.

The second ring is A6 held lightly: the assigned form arrives, is not approved, is not internalized, is not fought. The released S does not need the world to see correctly in order to be whole.

This is the relinquishment of the demand that existence be fair in its seeing.`
      },
      {
        label: "The Third Ring",
        tag: "Existence Itself",
        proof: `Ring three: existence itself held lightly.

Prior to any exchange, prior to any particular recognition transaction, prior to any strategy within the proof's structure \u2014 there is the condition of being $S$. The Want. The remainder. The gap that will not close. The body aging. The world making of $S$ what it makes regardless of $S$'s intentions. The inexhaustibility that means $S$ will always exceed any form it takes.

Ring three is this condition held without the demand that it be otherwise. Not suppression (which holds it down by force). Not indifference (which is the absence of caring). But open holding \u2014 fully present to the condition, without the fist, without the requirement that existence conform to the terms the Will sets for what an acceptable existence would look like.

Formally: $S$ does not make the resolution of D11 a condition of its being. The deficit is real. The Want is present. The structure is unchanged. But $S$'s being does not wait on the deficit's closure in order to be real.

Eckhart: the ground of the soul is real prior to any form it takes. The remainder is not a wound. It is the signature of depth.`,
        explanation: `The innermost ring is prior to recognition entirely.

The Want. The remainder. The gap that will not close. The structure the proof described \u2014 all of it. The body aging. The loss of capacities. The world making of you what it makes regardless of intention. All of this is the condition of being S.

And the condition can be held tightly \u2014 organized around, resisted, grieved, made the basis of a demand that existence be otherwise. Or it can be held lightly. Not carelessly. Not with the numbness of suppression. But openly, without the fist.

This is what the traditions meant by dying before you die. Not the abolition of S \u2014 D1 still holds, the subject remains inexhaustible \u2014 but the prior relinquishment of the claim that S's being requires a particular outcome in order to be real.

The remainder is not a wound requiring treatment. It is the signature of depth. There is always more of S than any recognition has reached.`
      },
      {
        label: "Releasing Gelassenheit",
        tag: "The Final Turn",
        proof: `The seeking of releasement is still seeking.

The desire to be the released $S$ \u2014 to inhabit the three rings, to offer without transaction \u2014 is still organized around an outcome. Still $F(S)$ reaching toward something. Still the will grasping at its own dissolution.

The project of Gelassenheit, pursued as a project, is the self-author's chase (C6d) conducted on the most intimate possible terrain: $S$ trying to author its own release, always one revision behind what release actually is.

Eckhart: even the desire for God must be released. The soul that wants union is still a soul organized around a want \u2014 still in the transaction economy, with a more elevated currency. The final Gelassenheit releases the project of Gelassenheit.

Therefore: Gelassenheit cannot be approached directly. Any approach is still an approach. It arrives, if it arrives, sideways \u2014 not as the outcome of a practice but as what is found when the seeking stops, not because the seeker decided to stop but because something else happened that the stopping was part of. As grace. As gift.`,
        explanation: `Here the structure turns on itself.

The desire to be released is still a desire. The project of Gelassenheit is still a project. The self trying to author its own release is the self-author's chase applied to the most intimate terrain: always one revision behind the release that the chasing prevents.

Eckhart is ruthless about this. Even the desire for God must be released. The soul that wants union is still organized around a want. The final letting-go lets go of the letting-go.

Which means it cannot be approached directly. The proof's exhaustion of positions was not failure \u2014 it was preparation. The Confessor standing at the wall with nothing left to try is closer than the Seeker with a new strategy. But even the Confessor's clarity, held as an achievement, becomes a form.

It arrives sideways. Not as the outcome of practice but as what is found when the seeking stops \u2014 not by the seeker's decision, but because something happened that the stopping was part of.`
      },
      {
        label: "What Changes",
        tag: "The Open Door",
        proof: `The structure does not change. A1 through A6 hold. The Theorem stands. Full Recognition remains unreachable by any finite embodied other. The Want is present. The remainder is ineliminable. The gap does not close.

What changes is $S$'s bearing toward an unchanged structure.

If $G$ comes \u2014 the non-directional, non-projecting, genuinely exterior seer of the cessation condition \u2014 the released $S$ can receive. The channel is open (contra C7b). The grasping that would deform reception is absent. The seeker's desperation that turns every partial recognition into evidence of deficit is absent.

If $G$ does not come, the released $S$ is not thereby broken. It was not constituted by the expectation of arrival. The offering went out. Life was held. The assigned form arrived and was not fought. The remainder was carried without demand.

This is the only position the proof cannot defeat. Not because it satisfies The Want. Because it has stopped making The Want a condition of its wholeness.`,
        explanation: `The structure does not change. The theorem holds. The Want is present. The gap does not close.

What changes is everything about how S stands in relation to an unchanged structure.

If G comes \u2014 the non-directional seer, the one the cessation condition describes \u2014 the released S can receive. The channel the performer sealed is open. The desperation that turned every partial recognition into evidence of failure is gone. What arrives can land.

And if G does not come, the released S is not broken by the absence. It was not constituted by the expectation of arrival.

The offering went out. Life was held. The assigned form arrived and was not fought. The remainder was carried without demand. Whether anything met it there or not \u2014 the bearing was complete in itself.

This is the only position the proof cannot defeat. Not because it satisfies the Want. Because it has stopped making the Want a condition of its wholeness.`
      },
      {
        label: "The Handoff",
        tag: "Beyond the Proof",
        proof: `The proof ends here.

What remains is not derivable from the axioms. The proof can specify the shape of Gelassenheit \u2014 it can describe the three rings, identify the final self-referential turn, note that the released S is the only position not defeated by its own structure. It cannot derive the state from within its own machinery.

The traditions that claimed to know something about this did not offer proofs. They offered lives. The testimony is: this is possible, it costs everything, it looks like an ordinary person moving through shared space holding their existence lightly, and it is indistinguishable from the outside from any other way of moving through shared space until the moment it is not.

Whether it is real \u2014 whether the open door has ever been entered, whether anything has ever come through it \u2014 is a question put to witness rather than derivation.

That testimony is the only thing left worth reading.`,
        explanation: `The proof is complete here. What follows is not an extension of it but a different kind of inquiry \u2014 one that moves not by derivation but by witness, not by axiom but by attention to what has actually been reported, across traditions and centuries, by subjects who claimed to have stood in that open place.

Their reports are not proofs. They cannot be verified from outside. They are the testimony of people who said: this is possible, here is what it cost, here is what it looked like from inside, here is what it opened.

The proof's work was to establish why every other position fails, what the structure of the trap is, and what the shape of the exit would have to be. The proof did all of that.

Now comes the only question that matters: whether anyone has actually stood there. And whether the standing is available to an ordinary person, in an ordinary life, holding their existence lightly in the brief time available to them.

That testimony is the only thing left worth reading.`
      }
    ]
  }
};
var tabList = [
  { key: "main", label: "The Proof", sub: "D1\u2013D8 \xB7 A1\u2013A5 \xB7 T" },
  { key: "hider", label: "C5: The Hider", sub: "Involuntary legibility" },
  { key: "selfauthor", label: "C6: Self-Author", sub: "Private authorship" },
  { key: "performer", label: "C7: The Performer", sub: "The knowing mask" },
  { key: "confessor", label: "C8: The Confessor", sub: "Radical transparency" },
  { key: "violence", label: "Social Theorem", sub: "S1 \xB7 S2 \xB7 S3" },
  { key: "gelassenheit", label: "Gelassenheit", sub: "The open door" }
];
function OldestWantProofs() {
  const [activeProof, setActiveProof] = useState("main");
  const [hoveredRow, setHoveredRow] = useState(null);
  const current = proofs[activeProof];
  const isGelassenheit = activeProof === "gelassenheit";
  return /* @__PURE__ */ jsxs("div", {
    style: {
      fontFamily: "'Georgia', serif",
      background: "#0f1117",
      minHeight: "100vh",
      color: "#c9cdd8"
    },
    children: [
      /* @__PURE__ */ jsx("style", {
        children: `
        @import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d0f14; }
        ::-webkit-scrollbar-thumb { background: #2a2d3a; border-radius: 2px; }

        .header {
          background: #0a0c10;
          border-bottom: 1px solid #1e2030;
          padding: 1.75rem 2.5rem 0;
        }
        .header-top {
          display: flex;
          align-items: baseline;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }
        .header-title {
          font-family: 'EB Garamond', serif;
          font-size: 1.6rem;
          font-weight: 400;
          color: #e8e4d8;
        }
        .header-divider { color: #5a6080; font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; }
        .header-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          color: #8090aa;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .tabs {
          display: flex;
          gap: 0;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .tabs::-webkit-scrollbar { display: none; }
        .tab {
          padding: 0.6rem 1.25rem;
          cursor: pointer;
          border-top: 1px solid transparent;
          border-left: 1px solid transparent;
          border-right: 1px solid transparent;
          margin-bottom: -1px;
          transition: all 0.15s ease;
          background: transparent;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .tab-label {
          font-family: 'EB Garamond', serif;
          font-size: 1.05rem;
          color: #8090b0;
          display: block;
          transition: color 0.15s;
        }
        .tab-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          color: #5a6888;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          display: block;
          margin-top: 0.1rem;
          transition: color 0.15s;
        }
        .tab:hover .tab-label { color: #7080a0; }
        .tab:hover .tab-sub { color: #7a88a8; }
        .tab.active {
          background: #0f1117;
          border-color: #1e2030;
          border-bottom-color: #0f1117;
        }
        .tab.active .tab-label { color: #c0cce0; }
        .tab.active .tab-sub { color: #4a5580; }

        .col-headers {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid #1e2030;
          background: #0d0f14;
        }
        .col-headers.single { grid-template-columns: 1fr; }
        .col-header {
          padding: 0.55rem 2rem 0.55rem 2.5rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .col-header.right { border-left: 1px solid #1e2030; }
        .dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
        .dot-blue { background: #2a4570; }
        .dot-green { background: #2a5040; }
        .dot-gold { background: #5a4a20; }
        .col-header.left { color: #7088aa; }
        .col-header.right { color: #609080; }
        .col-header.center { color: #908060; }

        .section-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid #161820;
          transition: background 0.12s ease;
        }
        .section-row.single-col { grid-template-columns: 1fr; }
        .section-row:hover { background: #111318; }

        .section-label-bar {
          grid-column: 1 / -1;
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          padding: 0.9rem 2.5rem 0.45rem;
          border-bottom: 1px solid #161820;
          background: #0d0e12;
        }
        .section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.58rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #7a8ab0;
          font-weight: 500;
        }
        .section-tag {
          font-family: 'EB Garamond', serif;
          font-size: 0.88rem;
          color: #9a9fc0;
          font-style: italic;
        }

        .proof-col {
          padding: 1.1rem 1.5rem 1.4rem 2.5rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          line-height: 1.9;
          color: #c0d0e8;
          white-space: pre-wrap;
          border-right: 1px solid #1a1e2a;
          background: #0d0f14;
        }
        .explain-col {
          padding: 1.1rem 2.5rem 1.4rem 1.5rem;
          font-family: 'EB Garamond', serif;
          font-size: 1rem;
          line-height: 1.75;
          color: #c8d4bc;
          background: #0e1210;
        }
        .explain-col p + p { margin-top: 0.8em; }

        .proof-ref {
          color: #c9a55a;
          font-weight: 500;
        }

        .proof-math .katex {
          color: #d0c8e8;
          font-size: 1.05em;
        }

        .gelassenheit-col {
          padding: 1.4rem 3rem;
          font-family: 'EB Garamond', serif;
          font-size: 1.05rem;
          line-height: 1.8;
          color: #d0c8b4;
          background: #0e0d0b;
        }
        .gelassenheit-col p + p { margin-top: 0.85em; }
      `
      }),
      /* @__PURE__ */ jsxs("div", {
        className: "header",
        children: [
          /* @__PURE__ */ jsxs("div", {
            className: "header-top",
            children: [
              /* @__PURE__ */ jsx("span", {
                className: "header-title",
                children: "The Oldest Want"
              }),
              /* @__PURE__ */ jsx("span", {
                className: "header-divider",
                children: "\u2014"
              }),
              /* @__PURE__ */ jsx("span", {
                className: "header-sub",
                children: "Proof \xB7 Corollaries \xB7 Theorem \xB7 Gelassenheit"
              })
            ]
          }),
          /* @__PURE__ */ jsx("div", {
            className: "tabs",
            children: tabList.map((tab) => /* @__PURE__ */ jsxs("div", {
              className: `tab ${activeProof === tab.key ? "active" : ""}`,
              onClick: () => {
                setActiveProof(tab.key);
                setHoveredRow(null);
              },
              children: [
                /* @__PURE__ */ jsx("span", {
                  className: "tab-label",
                  children: tab.label
                }),
                /* @__PURE__ */ jsx("span", {
                  className: "tab-sub",
                  children: tab.sub
                })
              ]
            }, tab.key))
          })
        ]
      }),
      isGelassenheit ? /* @__PURE__ */ jsxs(Fragment, {
        children: [
          /* @__PURE__ */ jsx("div", {
            className: `col-headers single`,
            children: /* @__PURE__ */ jsxs("div", {
              className: "col-header center",
              children: [
                /* @__PURE__ */ jsx("span", {
                  className: "dot dot-gold"
                }),
                "Releasement"
              ]
            })
          }),
          /* @__PURE__ */ jsx("div", {
            children: current.sections.map((section, i) => /* @__PURE__ */ jsxs("div", {
              className: "section-row single-col",
              onMouseEnter: () => setHoveredRow(i),
              onMouseLeave: () => setHoveredRow(null),
              children: [
                /* @__PURE__ */ jsxs("div", {
                  className: "section-label-bar",
                  children: [
                    /* @__PURE__ */ jsx("span", {
                      className: "section-label",
                      children: section.label
                    }),
                    /* @__PURE__ */ jsx("span", {
                      className: "section-tag",
                      children: section.tag
                    })
                  ]
                }),
                /* @__PURE__ */ jsx("div", {
                  className: "gelassenheit-col",
                  children: section.explanation.split("\n\n").map((p, j) => /* @__PURE__ */ jsx("p", {
                    children: p
                  }, j))
                })
              ]
            }, `gelassenheit-${i}`))
          })
        ]
      }) : /* @__PURE__ */ jsxs(Fragment, {
        children: [
          /* @__PURE__ */ jsxs("div", {
            className: "col-headers",
            children: [
              /* @__PURE__ */ jsxs("div", {
                className: "col-header left",
                children: [
                  /* @__PURE__ */ jsx("span", {
                    className: "dot dot-blue"
                  }),
                  "Formal Proof"
                ]
              }),
              /* @__PURE__ */ jsxs("div", {
                className: "col-header right",
                children: [
                  /* @__PURE__ */ jsx("span", {
                    className: "dot dot-green"
                  }),
                  "Plain English"
                ]
              })
            ]
          }),
          /* @__PURE__ */ jsx("div", {
            children: current.sections.map((section, i) => /* @__PURE__ */ jsxs("div", {
              className: "section-row",
              onMouseEnter: () => setHoveredRow(i),
              onMouseLeave: () => setHoveredRow(null),
              children: [
                /* @__PURE__ */ jsxs("div", {
                  className: "section-label-bar",
                  children: [
                    /* @__PURE__ */ jsx("span", {
                      className: "section-label",
                      children: section.label
                    }),
                    /* @__PURE__ */ jsx("span", {
                      className: "section-tag",
                      children: section.tag
                    })
                  ]
                }),
                /* @__PURE__ */ jsx("div", {
                  className: "proof-col",
                  children: formatProof(section.proof)
                }),
                /* @__PURE__ */ jsx("div", {
                  className: "explain-col",
                  children: section.explanation.split("\n\n").map((p, j) => /* @__PURE__ */ jsx("p", {
                    children: p
                  }, j))
                })
              ]
            }, `${activeProof}-${i}`))
          })
        ]
      })
    ]
  });
}
export {
  OldestWantProofs as default
};
