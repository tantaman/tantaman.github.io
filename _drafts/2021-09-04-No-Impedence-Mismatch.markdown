---
layout: post
title: 'No Impedence Mismatch'
tags: software-engineering
---

There is no impedence mismatch!

To think that in-memory representation of data in a program has an "impedence mismatch" with the relational storage of that program is a misunderstanding of how data should be or is modeled in your program.

User -> Posts -> Text -> ...

Not really a document in memory but a normalized structure built off of pointers (e.g., ids).

"List" is also a horrid structure to represent this server side. You're doing it wrong if you do use a list to go from `User` -> `Posts`
List misses the details of this being an unbounded connection, which the DB does understand.
