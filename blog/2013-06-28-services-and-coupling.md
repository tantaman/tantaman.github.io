---
slug: 2013-06-28-services-and-coupling
title: Services and Coupling
tags: [software-engineering]
---

Lines of code like:

> PositionCalculator calc = new MercatorPositionCalculator();

(where **_PositionCalculator_** is an interface and **_MercatorPositionCalculator_** the implementation) have always bugged me and probably any other astute programmer out there.

We’re trying to be generic by typing our variable as the interface type but that one call to **_new MercatorPositionCalculator()_** suddenly death-ties the class containing that line to the **_MercatorPositionCalculator_**.

The use of the interface is effectively useless in a line where you directly construct the implementation of the interface.
<!--truncate-->

### Dependency Injection

Dependency injection helps to resolve the above problem but it still falls short. With dependency injection your class no longer directly constructs its dependencies but instead takes them in as parameters.

Example:

    public class ObjectDrawer {
      private final PositionCalculator calc;
      public ObjectDrawer(PositionCalculator calc) {
        this.calc = calc;
      }
    }

This trick of pushing dependencies out and requiring them to be passed in makes our **_ObjectDrawer_** more reusable since it now only has interface level dependencies.

Users of **_ObjectDrawer_** can use it with **_Spherical_**, **_Stereographic_**, **_Mercator_** or any other type of **_PositionCalculator_** by passing in the correct implementation.

Using Dependency Injection we’ve resolved the dependency problem at the class level but our component, as a whole, still has hard dependencies on the implementations being used.

### Enter Services

Using dependency injection, construction of dependencies is still the responsibility of your component. Services, however, push your dependencies out to their final level.

In a service oriented world each component is responsible for instantiating the implementations of the services that it provides. That is, instead of the user of an interface instantiating the implementation of that interface, the component providing the implementation is responsible for instantiating it.

> Since the provider of an implementation is also responsible for instantiating the implementation you no longer have any cross component dependencies! (other than at the interface level but your interfaces should be in a component all on their own)

This makes total sense since the thing providing an implementation doesn’t have to pull in extra stuff to instantiate the implementation. Conversely, if the consumer of some some interface had to instantiate the implementation of that interface then it would have to pull the implementation in as a dependency.

The next question is how does the consumer of an interface get an implementation if the consumer, and nothing in the component that the consumer is a part of, instantiates the implementation?

In most service frameworks there is a notion of a registry. The registry is where components go to register the services that they provide or look up the services they need.

If I have a component that handles Mercator coordinates then it would register its **_MercatorCalculator_** with the registry under the interface name **_PositionCalculator._**

Another component that handles Stereographic coordinates would register its **_StereographicCalculator_** under the same **_PositionCalculator_** interface name. Various bits of metadata can be attached to service registrations to handle the case where multiple services implementing the same interface are registered.

The components that are clients of a service then look up the services they need by their interface name and/or additional metadata. This allows components to be dependent on **descriptions** of **capabilities** and not some specific set of implementations.

So a component that relies on **_PositionCalculators_** would then do something like:

    calculator = registry.getService(PositionCalculator.class.getName(), worldLocation);

to get the implementation that it needs. As you can see, the component only has a dependency on the **_PositionCalculator_** interface.

The second parameter would be additional metadata to discriminate between available position calculators. The additional metadata should be something that is well within the domain of the component. In this case, the metadata is a conflated location in the world since that determines if we should use [Stereographic](http://en.wikipedia.org/wiki/Universal_Polar_Stereographic_coordinate_system) or [Mercator](http://en.wikipedia.org/wiki/Universal_Transverse_Mercator) coordinate systems.

If you’re developing in Java, [OSGi](http://en.wikipedia.org/wiki/OSGi) has a great component and service model (although getting up and running for your first time will be a trial but it is worth it in the end).

If you’re a Javascript developer, [AngularJS](http://angularjs.org/) has a decent service system with automatic dependency injection.

There is also [ServiceRegistry.js](https://github.com/tantaman/ServiceRegistry.js) which is used by [Strut.io](http://strut.io/) to manage storage providers, presentation generators, available edit modes and more. It lacks an automatic dependency injection mechanism and so it can be quite cumbersome but it does account for the service lifecycle.
