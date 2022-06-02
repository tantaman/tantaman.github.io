[[notes/distributed computing lectures]]

# Chapters

http://dist-prog-book.com/chapter/

Good review material on [[notes/distributed computing]].
Go to each chapter dir and open the `html` file.

Random thought:
Yes, distributed computing has unique challenges but also not so much.
Monolithic pieces of software that are comprised of hundreds of packages and dependencies (but run on a single host in a single app) also share many of the same characteristics of distributed computing.
- A dependency could swallow exceptions, causing partial failures
- A depedency could spawn threads that call back into you, causing indeterminism
- A dependency could be buggy, changing data in undesirable ways.
- A dependency could busy wait or sleep or be otherwise non-perofrmant, leading to latency


Other random thought -- 
Single threaded apps can cause the same problems as multi-threaded apps when passing mutable data structures around. I.e., that old trick where `.hashCode()` inserts into a map and blows it out past capacity in Java because HashMap capacity isn't checked while computing a hash code.
^-- This is an ancient observation from circa 2009 while working at Lockheed Martin.

# Chapter 5 - Languages Extended for Distributed Computing

http://dist-prog-book.com/chapter/5/langs-extended-for-dist.html

Extending [[notes/type systems]] to take into account distributed computing. Reminds me of [[notes/rust]] but encoding distribution concerns (e.g., latency, failure, resource sharing) rather than memory concerns into the type system. There's some overlap though in that memory concerns and sharing concerns overlap. Does Rust encode threading concerns into the type system? [[notes/questions]]
[[notes/Cloud Haskell]]? wut?
