
This is hyperbole but I like to say:

> 99% of apps could just be spreadsheets.

and

> Code is a liability.

The meaning of the first is manifold. In one sense, the right abstraction can solve most of your problems. In another, [YAGNI](https://martinfowler.com/bliki/Yagni.html).

The last is to remind developers that while code does deliver value there is also a cost to every line that is written.
Maintenance cost, cost to the next developer who has to spend time reading it, eventually (at scale) even deployment costs. The last
one being a surprisingly high cost at Meta scale where we were well into the hundreds of millions of lines of code by the
time I departed the company.

Code is **obviously not always a liability**. If it were we'd never write it. Well tested and well abstracted code that never
needs to be inspected is nearly 100% value and 0% cost.
