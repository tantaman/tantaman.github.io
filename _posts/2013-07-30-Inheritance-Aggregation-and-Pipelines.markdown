---
layout: post
title: 'Inheritance, Aggregation, and Pipelines'
tags: software design api-design oo functional
---

How does one write software that can be extended?

I think many developer’s first instinct is to set up some form of inheritance hierarchy. Inheritance is a step in the right direction but it is very restrictive. The problem with inheritance is that relationships between your components and their extensions are rigidly defined at compile time.

Take a set of classes that provide access to resources at various URIs as an example. The base class just provides get/put/delete operations.

{% include image.html url="/assets/images/inheritance-aggregation-pipelines/resource-provider.png" description="base resource provider. get/put/delete resources at different URIs" %}

Later, someone wants to add some sort of caching to this. Their first instinct is to extend the functionality via inheritance. So now you have something that looks like the following.

{% include image.html url="/assets/images/inheritance-aggregation-pipelines/resource-lru-cached.png" description="ResourceProvider extended to add caching" %}

But someone else in the organization may have a use case where LRU caching doesn’t work well so they add a new extension.

{% include image.html url="/assets/images/inheritance-aggregation-pipelines/lru-mru.png" description="Two different caching algorithms" %}

and finally a requirement is added that accesses to certain resource provider instances need to be journaled. So where do you put the journaling class in the hierarchy? You could inherit directly from **ResourceProvider** but then should you update the cache implementations to inherit from the journaling class? What about the use cases that need caching but not journaling? Or journaling and not caching? Inheritance has forced you into an awkward situation where you can’t perfectly capture any of the relationships you need.

Another problem with the inheritance solution is that you can’t change your extension composition at runtime. E.g., you can’t easily change caching algorithms at runtime and you can’t easily add or remove journaling from a **ResourceProvider** at runtime.

A slightly more experienced developer would have probably tackled this problem with aggregation instead of inheritance.

## Aggregation

A solution that depends on aggregation would differ in that instead of each class inheriting from **ResourceProvider** each class would implement an **IResourceProvider** interface and contain an instance of an **IResourceProvider**.

If you want to make a Journaling, LRU cached resource provider then you instantiate those three classes and have them contain one another. Here is a class diagram to illustrate a Journaling, LRU cached resource provider:

{% include image.html url="/assets/images/inheritance-aggregation-pipelines/journaling.png" description="Instead of inheriting, everyone implements a common interface and then holds an instance of that interface." %}

The **JournalingResourceProvider** contains an **LRUCachedResourceProvider** which contains a regular **ResourceProvider**. Calls made on the **JournalingResourceProvider** are handled and then passed on to the **LRUCachedResourceProvider** where they are handled by the cache and then passed on to the actual **ResourceProvider** if need be.

Since these classes contain instances of **IResourceProvider** and not any specific implementation, you can create any configuration of resource providers that you like. You could have a Journaling, MRU Cached resource provider or even a Journaling, MRU Cached and LRU Cached resource provider by varying your composition of instances of these classes.

Since aggregation sets up relationships between objects via member variables you can manipulate aggregation relationships at runtime. That is, you can change your cache from LRU to MRU by changing what delegate you’re holding.

Of course aggregation has its limitations as well. In the prior example, if you want to have the **JournalingResourceProvider** change its delegate from an **LRUCachedResourceProvider** to a **MRUCachedResourceProvider** you’ll have to do some fiddling. You need to get the original **IResourceProvider** held by the **LRUCachedResourceProvider** and put it into the new **MRUCachedResourceProvider**. You’ll also have to explicitly update the reference managed by the **JournalingResourceProvider**.

More generally, adding and removing delegates in the middle of the chain of aggregations is difficult. You have to touch the objects on either side of what is being added, removed or replaced.

{% include image.html url="/assets/images/inheritance-aggregation-pipelines/aggregates-replacements.png" description="Aggregate1's link needs to be updated to refer to Replacement. Aggregate2 needs to expose its link so Replacement can refer to Aggregate3." %}

This difficulty in replacing arbitrary parts of the aggregation isn’t ideal but luckily there is a solution.

## Pipelines

Pipelines are the alternative abstraction that will help us resolve all of the difficulties mentioned previously. Instead of each class being responsible for holding its own delegate we move that responsibility to a 3rd party.

Continuing our resource provider example, all of the instances of **IResourceProvider** that we want to chain together will now be held by a **Pipeline** class.

{% include image.html url="/assets/images/inheritance-aggregation-pipelines/pipeline.png" description="The Pipeline holds a list of IResourceProviders instead of the IResourceProviders holding one another." %}

As you can see the **Pipeline** holds an arbitrary number of **IResourceProviders** and allows **IResourceProvider** instances to be added and removed. The **Pipeline** also implements the **IResourceProvider** interface since you’ll invoke methods on the pipeline which will forward those invocations to the members of the pipeline.

```
public static void main(String [] args) {
    resourcePipeline.put(uri, resource);
}

// A method from a very naive Pipeline implementation
public class Pipeline {
…
  public put(String uri, Resource resource) {
    for (IResourceProvider handler : handlers) {
      handler.put(uri, resource);
    }
  }
…
}
```

This moving of responsibility allows us to easily add/remove/replace items in the pipeline without touching any objects besides the **Pipeline** instance.

Pipelining also allows us to build more and more complex processing without ever impacting existing classes.

-Need to log put requests? Add an object to the pipeline for it.

-Need to record calls to a specific URI? Add an object to the pipeline for it.

-Need to calculate the number of bytes being put to a URI? Add an object to the pipeline for it.

The simplest pipeline just invokes a method on every handler it contains. Kind of like notifying listeners. Of course this is not always how you would like to do things so a more robust pipeline passes a “**next**” or “**context**” object to each member of the pipeline that it calls. Using the context object, members of the pipeline can choose to stop a call from continuing down the pipeline or make adjustments to the parameters of a call as it moves down the pipeline.

{% include image.html url="/assets/images/inheritance-aggregation-pipelines/pipeline-context.png" description="A new interface for items in the pipeline. The Context object can be used to stop calls from moving down the pipeline among other things." %}

A common use for the **Context** object is to allow members of the pipeline to choose when to call the next member of the pipeline. The context object could also allow a member of the pipeline to pass an updated set of parameters to the next member.

    // An example of a member of the ResourceProvider Pipeline.
    public class LRUCachedResourceProvider implements IPipelinedResourceProvider {
      …
      public void get(String uri, Context ctx) {
        if (cacheContains(uri)) {
          // we found it in our cache so return and don’t
          // call the next member of the pipeline.
          return getCachedValue(uri);
        } else {
          // It wasn’t in the cache.  Forward call to
          // the next handler in the pipeline.
          return ctx.nextGet(uri, ctx);
        }
      }
      …
    }

If you want to see the pipeline pattern in practice you can check out the Netty project and their [ChannelPipeline](http://docs.jboss.org/netty/3.2/api/org/jboss/netty/channel/ChannelPipeline.html).

Dynamic languages have a surprisingly easy time when it comes to constructing pipelines. Here an [example](https://github.com/tantaman/Pipeline.js/blob/master/README.md) of using [Pipeline.js](https://github.com/tantaman/Pipeline.js)
