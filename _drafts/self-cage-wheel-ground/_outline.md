# The Self, The Cage, The Wheel, The Ground

The manuscript is complete in four movements and twelve chapters, with an introduction, a fictional epilogue, and further reading.

Read the [continuous manuscript](../../publishing/self-cage-wheel-ground/combined-content.md), or use the chapter files below.

- [Introduction: A Life That Does Not Need to Win](00-front-matter/00-introduction.md)
- **Movement One: Self** — [1. Know Thyself](01-self/01-know-thyself.md); [2. The Modern Self](01-self/02-the-modern-self.md); [3. Why These?](01-self/03-why-these.md)
- **Movement Two: Cage** — [4. The Inheritance](02-cage/04-the-inheritance.md); [5. The Bars](02-cage/05-the-bars.md); [6. How the Bars Are Installed](02-cage/06-how-bars-stay-up.md)
- **Movement Three: Wheel** — [7. The Turn](03-wheel/07-the-turn.md); [8. The Engine](03-wheel/08-the-engine.md); [9. The Fuel](03-wheel/09-the-fuel.md)
- **Movement Four: Ground** — [10. The Grammar Beneath Grammar](04-ground/10-the-grammar-beneath-grammar.md); [11. The Unearned](04-ground/11-the-unearned.md); [12. The Open Hand](04-ground/12-the-open-hand.md)
- [Epilogue: The Next Morning](05-back-matter/13-the-next-morning.md)
- [Sources and Further Reading](05-back-matter/14-sources-and-further-reading.md)

The arc moves from inherited forms of selfhood through institutional reinforcement and recurring capture to narrative accountability, grace, and a communal life that can act without claiming to complete or possess its members.

## Working with the manuscript

Edit the individual chapter files. [chapters.txt](chapters.txt) controls the reading order. Rebuild the continuous manuscript from the repository root:

```sh
bash publishing/self-cage-wheel-ground/combine-content.sh
```

An optional output filename is accepted. The assembler validates chapter files, relative source links, and footnotes. The existing Pandoc publishing configuration remains in [publishing/self-cage-wheel-ground](../../publishing/self-cage-wheel-ground/).

Original outlines and exploratory Wheel notes are preserved in [_planning](_planning/) and excluded from assembly. Chapter source notes retain links to the blog material; the original blog posts remain separate from the book.
