When does immutability not serve us?

When going through hoops to update nested items.

Mutable serves us for always having the same shared view of the world. With immutability how do we get the new view of the world to everyone?
Or more importantly a slice of that world. Rather than having to give them a reference to the entire world via the root node.

Immutability and the concept of time. Being able to model it b/c all snapshots are had.
How often is that actually useful?

How problematic reactive systems become because more events are happening than can be processed. That we could ignore many if we ran on an update / polling cycle of a set interval that overlooked events smaller than that interval.

Events and all the threads of execution?

---

Where does OO stand up better than functional?
Games? Domain? But we can model the daomin through actions rather than nouns. Really we should have a mixed paradigm.
Where should we use functional over OO?

In a game, how do we handle updates to a player without mutation? The functional way is a hot mess. The oo way is easy and all parts see the new player. See Carmack's writings on this point, however.

The idea of identity is important for functional vs non functional.

Conceptual -- mutates
Material -- non mutable

The "james river" is the same river even though it is different in makeup every instant.