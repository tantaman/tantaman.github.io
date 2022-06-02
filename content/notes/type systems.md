Remeber your thoughts on type systems for multi-threading. Related to EATs. Realms of single-threadedness. Realms of multi. Basically actor model with the realms of single.

- Data type annotations for what data structures are thread safe.
- Static analysis to tell you when functions are called by multiple threads but not accessing thread safe structures.
- Annotations to restrict access to methods to certain threads

[[notes/Rust]] encodes [[notes/memory concerns]]. Lets encode [[notes/threading]] and [[notes/distributed system]] concerns too.

[[notes/bloom]] looks like a language aimed at solving distributed computing problems.

---

- Public doesn't indicate data visibility correctly. "anyone on the internet can see" being a better name.
- https://github.com/tantaman/language-research
- [Types for policies](https://www.typescriptlang.org/play?#code/C4TwDgpgBACg9gGwJYGMRQLxQEQBUDucAYgIYrZQA+OAwnAHbBnACSAtmHAE7DYDcAKAGhIUAIIIEcfBAAmAHlwAaKLjBQIAD2AR6sgM6xEqEAD5MqqADIoAbwFRHUTsjQAuOw6feA2gGkoJHpVMABdD2AuAFcIQW8AXwFE4XBoeFckOUVzLFxrT28XEw97b18AoKNXEFCAfgjo2K9HROSRNIALBmgsUqckWQ96KLYAIwguOKdhtg99SKCAc0F4wQEAMyj6FGAkBkCObmA6RmZ9AAoo-QmPCSkZBRgu+ggVbBOmHfZOHmxTAEoCk4UAx9IgIAA6KSLc4AciQhx4UBBpx2+ghGNh-xWQk2212+2AhFIKEu1y4t0k0iyT26bwIxDIf0BfUcKLBCEh0LhACZ1iQsTiNlsdntglISLJaS9zgMhiNxlx-h50qhMo9nhBzKyoFwIMAolxgrYBioZh5sAB2ACsNoAbDaAMwABgAnNgVEV3HZ4qskriRQTgigOhAUABrO7UhTKVS4DpLDTaXQGKpqrK4UwqXCqtBJnR6Qy5sznZpQYAJ+iLDy4eNLJRlr0gGvFhvK8RUh6KOtV7PF8zULayCDrIJyIGOJDrKDnCtLCFNnxN0KYDBYSIxFll7x6g1G8uVxZQEiGKNd2uHvvGNCmKYtIQ7-WG+hC9nAZyaiwSqWa84ARh5R1sSEAB6ECoEILhZAEBEfmOBhPmAC4wE1YDhGJMhzhQ7o0LfZFQwjccsBDMNI07OQsM1FRYQ+ZhviOQUYOnc4SMI2Qt28WCjlotEWII8M5GA5IwNUOAoE5Eh9zYbhoBIUY4Cid8K2gBASCrKISEWV5kVccNj3kgA3aBKmwABRTQSA4Tl9AobgcAAdQ6EhgFhQwADkIHwbAIQEESAHllK4fAkGuFQtPfeZJJ0WQoFGdA9WkgzE2U65kTgNg2F0JDjz0A9oEghAYpCqAQAUrhnFUkBFi4BS9B8xwgA)
- [Coeffects](http://tomasp.net/coeffects/)
  - Policy zones
- Execution context vs viewer context