---
title: 📚 Not Machine Readable?
tags: [software]
concern: [craft]
summary: 'The term "machine readable" is imprecise because it doesn''t account for the semantic gap between data structures and specific consumer needs; data is only readable when a programmer''s task aligns with both the structure''s format and its underlying ontology, meaning even formally structured data fails to be "machine readable" if its terminology and concepts don''t match the consumer''s requirements.'
---

Was watching https://www.youtube.com/watch?v=AHblHPLoKKE&t=139s and this dawned on me.

When we say "something isn't machine readable" we're not speaking accurately. What we really mean is that the content is not readable for the way that programmers currently write programs to read data.

Its not "machine readable" means "its not readable in the context of a specific task that a programmer is setting out to accomplish." Is structured data even "machine readable" from this perspective? Not really. If a _structure's_ terminology (what we've called fields and types) and ontology doesn't overlap with the consumer of the structure it is still not "machine readable."

e.g., https://www.inkandswitch.com/cambria/

"Manually wiring together APIs would be nonsense" -- https://youtu.be/8pTEmbeENF4?t=747

https://github.com/tantaman/tantaman.github.io/blob/master/_drafts/2022-01-26-protocol-for-integrations.markdown