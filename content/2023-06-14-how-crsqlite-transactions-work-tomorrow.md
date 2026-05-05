---
title: 'How CR-SQLite Transactions Work Tomorrow'
tags: [software]
concern: [systems]
description: 'Future improvements for transactional guarantees in cr-sqlite.'
---

This is a follow on from [How CR-SQLite Transactions Work Today](/2023-03-30-how-crsqlite-transactions-work-today.html). The prior post described some potentially unexpected behavior when syncing transactions between two peers and the origins of that behavior. Namely that cr-sqlite only keeps the current state of the database around which can lead to "holes" in past transactions.

In future version of cr-sqlite, this will no longer be the case. cr-sqlite will give you the option to use an [immutable data structure with structural sharing](https://en.wikipedia.org/wiki/Persistent_data_structure) to back your CRRs.

This means that cr-sqlite will be able to re-wind the state of the databases to any given version, allowing it to fully and faithfully sync transactions.
