Making queries reactive --

`LiveResult` - MVP
- Understands what datasets a query hits
- Records those
- Listens to `CommitLog` for mutations
- See what datasets a mutation hits
- If LiveResult query used same datasets, re-run query

`LiveResult` - Optimized
- Done in-memory
- Checks if mutation matches against filters via chunk iterable and field getter frameworking and chaining after.
- Cannot be done for certain cases like 2nd stage + hops.