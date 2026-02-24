export default function GravityIntro() {
  const p = { style: { margin: "0 0 1.2em", lineHeight: 1.75 } };
  const em = (text) => <em>{text}</em>;
  const b = (text) => <strong style={{ color: "#e8e4da" }}>{text}</strong>;

  return (
    <div style={{
      maxWidth: 720,
      margin: "0 auto",
      padding: "48px 24px 80px",
      fontFamily: "'Crimson Pro', Georgia, serif",
      fontSize: "18px",
      color: "#c8c4b8",
      lineHeight: 1.75,
    }}>
      <h1 style={{
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontSize: "42px",
        fontWeight: 400,
        color: "#e8e4da",
        margin: "0 0 32px",
        letterSpacing: "0.02em",
      }}>Gravity</h1>

      <blockquote style={{
        borderLeft: "3px solid #c9a84c",
        margin: "0 0 36px",
        padding: "8px 0 8px 24px",
        color: "#9a9888",
        fontStyle: "italic",
        fontSize: "17px",
      }}>
        <p style={{ margin: "0 0 0.5em" }}>All the natural movements of the soul are controlled by laws analogous to those of physical gravity. Grace is the only exception.</p>
        <p style={{ margin: 0, fontStyle: "normal", fontSize: "15px" }}>— Simone Weil, <em>Gravity and Grace</em> (1947)</p>
      </blockquote>

      <hr style={{ border: "none", borderTop: "1px solid #2a2a28", margin: "0 0 36px" }} />

      <p {...p}>Each domain begins with depth and encounter. Each domain ends in instrumentalization.</p>

      <p {...p}>The pattern every time is:</p>

      <ol style={{
        margin: "0 0 1.4em",
        paddingLeft: "1.4em",
        lineHeight: 1.75,
        color: "#c8c4b8",
      }}>
        <li style={{ margin: "0 0 0.5em" }}>A methodological reduction is made for practical purposes (bracket depth, study surfaces)</li>
        <li style={{ margin: "0 0 0.5em" }}>The method produces genuine results at the surface level</li>
        <li style={{ margin: "0 0 0.5em" }}>The success of the method is taken as evidence that the bracketed dimension doesn't exist</li>
        <li style={{ margin: "0 0 0.5em" }}>The reduction hardens into dogma</li>
        <li style={{ margin: "0 0 0.5em" }}>Anyone who points to the missing dimension is dismissed as prescientific or mystical</li>
      </ol>

      <p {...p}>{b("In science:")} Bacon and Descartes made a methodological choice — let's bracket final causes and study only efficient causes, because efficient causes are the ones we can manipulate. This was brilliant as method. It produced the scientific revolution. But somewhere between 1600 and 1900 the methodological bracket hardened into a metaphysical claim: there are no final causes, no intrinsic meaning, no participation — only mechanism. The tool for ignoring depth got confused with proof that depth doesn't exist. Whitehead saw this clearly — he called it "the fallacy of misplaced concreteness." You mistake your abstraction for the concrete reality.</p>

      <p {...p}>{b("In economics:")} Marginal utility theory was a genuine technical advance — it lets you model price formation with calculus. But the methodological choice to treat humans as utility-maximizing rational agents hardened into the metaphysical claim that humans {em("are")} utility-maximizing rational agents, and that value is price. The math worked, so the reduction must be true. Meanwhile everything the math couldn't capture — dignity, meaning, community, the common good — got filed under "externalities," which is economics-speak for "real things our model isn't built to see."</p>

      <p {...p}>{b("In psychology:")} Behaviorism made genuine discoveries about conditioning. The cognitive revolution made genuine discoveries about information processing. But "we can model some aspects of behavior without reference to inner life" became "there {em("is")} no inner life," and then "we can model some aspects of cognition as computation" became "cognition {em("is")} computation." Each time, methodological success got laundered into metaphysical elimination.</p>

      <p {...p}>{b("In education:")} Standardized testing genuinely does measure certain cognitive skills more reliably than subjective assessment. But "we can measure these specific skills" became "these specific skills are what education is {em("for")}," which became "anything we can't measure doesn't count." {em("Paideia")} — the formation of a whole human being — got eliminated not because anyone proved it was wrong, but because it couldn't be put on a spreadsheet.</p>

      <p {...p}>The knowledge gains are real. The metaphysical conclusion drawn from them — that the participatory, depth dimension of reality is illusory — is a non sequitur. It's like concluding from the success of your map that the territory doesn't exist.</p>

      <hr style={{ border: "none", borderTop: "1px solid #2a2a28", margin: "36px 0" }} />

      <p {...p}>Read these diagrams from top to bottom. The vertical axis is not a ranking of sophistication. It is a map of {b("metaphysical commitment")}. At the top: traditions that understand knowing as participation, the knower as transformed, reality as inexhaustible, and meaning as intrinsic. At the bottom: traditions that understand knowing as extraction, the knower as unchanged, reality as a resource, and meaning as instrumental.</p>

      <p style={{ margin: 0, lineHeight: 1.75 }}>Read them from left to right. The horizontal axis is not progress. It is the operation of gravity over time. Each column is a sedimentation. The green flows are traditions that have, against the odds, maintained the participatory commitment. The red flows are what happens when gravity wins — not destruction, but {em("inversion")}. The corrupt form of the best thing is the worst thing. {em("Corruptio optimi pessima.")}</p>
    </div>
  );
}
