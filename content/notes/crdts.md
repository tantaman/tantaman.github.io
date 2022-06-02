See backlinks (which are not yet implemented lulz)


> In order for a set of operations to converge on the same value in an environment where replicas only communicate occasionally, the operations need to be order-independent and insensitive to (message) duplication/redelivery. Thus, their operations need to be:
>
> Associative (a+(b+c)=(a+b)+c), so that grouping doesn't matter
> Commutative (a+b=b+a), so that order of application doesn't matter
> Idempotent (a+a=a), so that duplication does not matter
> - https://book.mixu.net/distsys/eventual.html#crdts-convergent-replicated-data-types


https://hal.inria.fr/file/index/docid/555588/filename/techreport.pdf
