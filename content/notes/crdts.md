See backlinks (which are not yet implemented lulz)


> In order for a set of operations to converge on the same value in an environment where replicas only communicate occasionally, the operations need to be order-independent and insensitive to (message) duplication/redelivery. Thus, their operations need to be:
>
> Associative (a+(b+c)=(a+b)+c), so that grouping doesn't matter
> Commutative (a+b=b+a), so that order of application doesn't matter
> Idempotent (a+a=a), so that duplication does not matter
> - https://book.mixu.net/distsys/eventual.html#crdts-convergent-replicated-data-types


https://hal.inria.fr/file/index/docid/555588/filename/techreport.pdf

# Shelf

https://bartoszsypytkowski.com/shelf-crdt/

3rd property is interesting to remove "client ids":
1. If we merge two Object nodes, we recursively merge their corresponding entries. Entry which didn't exist on merge side will just get added.
2. If we merge nodes of different types, we arbitrary allow for Objects to take precedence over Values.
3. If we merge two Values, we first compare their versions: greater version number wins. But what if versions were the same? You may have notices that our type Shelf<'t when 't : comparison> puts a comparison constraint over 't. That's right: since we don't use replica identifiers, we compare values themselves and pick the one that's logically "higher".

Path thru doc and incrementing version count...

Obviously can't work in relational world? Where paths can start from anywhere? Or can it?
