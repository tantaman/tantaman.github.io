/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
import Figure from '/dist/components/Figure.js';
function _createMdxContent(props) {
  const _components = Object.assign({
    nav: "nav",
    ol: "ol",
    li: "li",
    a: "a",
    p: "p",
    strong: "strong",
    h2: "h2",
    span: "span",
    pre: "pre",
    code: "code"
  }, props.components);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.nav, {
      className: "toc",
      children: _jsxs(_components.ol, {
        className: "toc-level toc-level-1",
        children: [_jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#aggregation",
            children: "Aggregation"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#pipelines",
            children: "Pipelines"
          })
        })]
      })
    }), "\n", _jsx(_components.p, {
      children: "How does one write software that can be extended?"
    }), "\n", _jsx(_components.p, {
      children: "I think many developer’s first instinct is to set up some form of inheritance hierarchy. Inheritance is a step in the right direction but it is very restrictive. The problem with inheritance is that relationships between your components and their extensions are rigidly defined at compile time."
    }), "\n", _jsx(_components.p, {
      children: "Take a set of classes that provide access to resources at various URIs as an example. The base class just provides get/put/delete operations.\nz"
    }), "\n", _jsx(Figure, {
      url: "/blog-assets/inheritance-aggregation-pipelines/resource-provider.png",
      description: "base resource provider. get/put/delete resources at different URIs"
    }), "\n", _jsx(_components.p, {
      children: "Later, someone wants to add some sort of caching to this. Their first instinct is to extend the functionality via inheritance. So now you have something that looks like the following."
    }), "\n", _jsx(Figure, {
      url: "/blog-assets/inheritance-aggregation-pipelines/resource-lru-cached.png",
      description: "ResourceProvider extended to add caching"
    }), "\n", _jsx(_components.p, {
      children: "But someone else in the organization may have a use case where LRU caching doesn’t work well so they add a new extension."
    }), "\n", _jsx(Figure, {
      url: "/blog-assets/inheritance-aggregation-pipelines/lru-mru.png",
      description: "Two different caching algorithms"
    }), "\n", _jsxs(_components.p, {
      children: ["and finally a requirement is added that accesses to certain resource provider instances need to be journaled. So where do you put the journaling class in the hierarchy? You could inherit directly from ", _jsx(_components.strong, {
        children: "ResourceProvider"
      }), " but then should you update the cache implementations to inherit from the journaling class? What about the use cases that need caching but not journaling? Or journaling and not caching? Inheritance has forced you into an awkward situation where you can’t perfectly capture any of the relationships you need."]
    }), "\n", _jsxs(_components.p, {
      children: ["Another problem with the inheritance solution is that you can’t change your extension composition at runtime. E.g., you can’t easily change caching algorithms at runtime and you can’t easily add or remove journaling from a ", _jsx(_components.strong, {
        children: "ResourceProvider"
      }), " at runtime."]
    }), "\n", _jsx(_components.p, {
      children: "A slightly more experienced developer would have probably tackled this problem with aggregation instead of inheritance."
    }), "\n", _jsxs(_components.h2, {
      id: "aggregation",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#aggregation",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Aggregation"]
    }), "\n", _jsxs(_components.p, {
      children: ["A solution that depends on aggregation would differ in that instead of each class inheriting from ", _jsx(_components.strong, {
        children: "ResourceProvider"
      }), " each class would implement an ", _jsx(_components.strong, {
        children: "IResourceProvider"
      }), " interface and contain an instance of an ", _jsx(_components.strong, {
        children: "IResourceProvider"
      }), "."]
    }), "\n", _jsx(_components.p, {
      children: "If you want to make a Journaling, LRU cached resource provider then you instantiate those three classes and have them contain one another. Here is a class diagram to illustrate a Journaling, LRU cached resource provider:"
    }), "\n", _jsx(Figure, {
      url: "/blog-assets/inheritance-aggregation-pipelines/journaling.png",
      description: "Instead of inheriting, everyone implements a common interface and then holds an instance of that interface."
    }), "\n", _jsxs(_components.p, {
      children: ["The ", _jsx(_components.strong, {
        children: "JournalingResourceProvider"
      }), " contains an ", _jsx(_components.strong, {
        children: "LRUCachedResourceProvider"
      }), " which contains a regular ", _jsx(_components.strong, {
        children: "ResourceProvider"
      }), ". Calls made on the ", _jsx(_components.strong, {
        children: "JournalingResourceProvider"
      }), " are handled and then passed on to the ", _jsx(_components.strong, {
        children: "LRUCachedResourceProvider"
      }), " where they are handled by the cache and then passed on to the actual ", _jsx(_components.strong, {
        children: "ResourceProvider"
      }), " if need be."]
    }), "\n", _jsxs(_components.p, {
      children: ["Since these classes contain instances of ", _jsx(_components.strong, {
        children: "IResourceProvider"
      }), " and not any specific implementation, you can create any configuration of resource providers that you like. You could have a Journaling, MRU Cached resource provider or even a Journaling, MRU Cached and LRU Cached resource provider by varying your composition of instances of these classes."]
    }), "\n", _jsx(_components.p, {
      children: "Since aggregation sets up relationships between objects via member variables you can manipulate aggregation relationships at runtime. That is, you can change your cache from LRU to MRU by changing what delegate you’re holding."
    }), "\n", _jsxs(_components.p, {
      children: ["Of course aggregation has its limitations as well. In the prior example, if you want to have the ", _jsx(_components.strong, {
        children: "JournalingResourceProvider"
      }), " change its delegate from an ", _jsx(_components.strong, {
        children: "LRUCachedResourceProvider"
      }), " to a ", _jsx(_components.strong, {
        children: "MRUCachedResourceProvider"
      }), " you’ll have to do some fiddling. You need to get the original ", _jsx(_components.strong, {
        children: "IResourceProvider"
      }), " held by the ", _jsx(_components.strong, {
        children: "LRUCachedResourceProvider"
      }), " and put it into the new ", _jsx(_components.strong, {
        children: "MRUCachedResourceProvider"
      }), ". You’ll also have to explicitly update the reference managed by the ", _jsx(_components.strong, {
        children: "JournalingResourceProvider"
      }), "."]
    }), "\n", _jsx(_components.p, {
      children: "More generally, adding and removing delegates in the middle of the chain of aggregations is difficult. You have to touch the objects on either side of what is being added, removed or replaced."
    }), "\n", _jsx(Figure, {
      url: "/blog-assets/inheritance-aggregation-pipelines/aggregates-replacements.png",
      description: "Aggregate1's link needs to be updated to refer to Replacement. Aggregate2 needs to expose its link so Replacement can refer to Aggregate3."
    }), "\n", _jsx(_components.p, {
      children: "This difficulty in replacing arbitrary parts of the aggregation isn’t ideal but luckily there is a solution."
    }), "\n", _jsxs(_components.h2, {
      id: "pipelines",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#pipelines",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Pipelines"]
    }), "\n", _jsx(_components.p, {
      children: "Pipelines are the alternative abstraction that will help us resolve all of the difficulties mentioned previously. Instead of each class being responsible for holding its own delegate we move that responsibility to a 3rd party."
    }), "\n", _jsxs(_components.p, {
      children: ["Continuing our resource provider example, all of the instances of ", _jsx(_components.strong, {
        children: "IResourceProvider"
      }), " that we want to chain together will now be held by a ", _jsx(_components.strong, {
        children: "Pipeline"
      }), " class."]
    }), "\n", _jsx(Figure, {
      url: "/blog-assets/inheritance-aggregation-pipelines/pipeline.png",
      description: "The Pipeline holds a list of IResourceProviders instead of the IResourceProviders holding one another."
    }), "\n", _jsxs(_components.p, {
      children: ["As you can see the ", _jsx(_components.strong, {
        children: "Pipeline"
      }), " holds an arbitrary number of ", _jsx(_components.strong, {
        children: "IResourceProviders"
      }), " and allows ", _jsx(_components.strong, {
        children: "IResourceProvider"
      }), " instances to be added and removed. The ", _jsx(_components.strong, {
        children: "Pipeline"
      }), " also implements the ", _jsx(_components.strong, {
        children: "IResourceProvider"
      }), " interface since you’ll invoke methods on the pipeline which will forward those invocations to the members of the pipeline."]
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-typescript",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "public"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "static"
        }), " ", _jsx(_components.span, {
          className: "hljs-built_in",
          children: "void"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "main"
        }), "(", _jsxs(_components.span, {
          className: "hljs-params",
          children: [_jsx(_components.span, {
            className: "hljs-title class_",
            children: "String"
          }), " [] args"]
        }), ") {\n    resourcePipeline.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "put"
        }), "(uri, resource);\n}\n\n", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// A method from a very naive Pipeline implementation"
        }), "\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "public"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "class"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Pipeline"
        }), " {\n…\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "public"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "put"
        }), "(", _jsxs(_components.span, {
          className: "hljs-params",
          children: [_jsx(_components.span, {
            className: "hljs-title class_",
            children: "String"
          }), " uri, ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "Resource"
          }), " resource"]
        }), ") {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "for"
        }), " (", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "IResourceProvider"
        }), " handler : handlers) {\n      handler.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "put"
        }), "(uri, resource);\n    }\n  }\n…\n}\n"]
      })
    }), "\n", _jsxs(_components.p, {
      children: ["This moving of responsibility allows us to easily add/remove/replace items in the pipeline without touching any objects besides the ", _jsx(_components.strong, {
        children: "Pipeline"
      }), " instance."]
    }), "\n", _jsx(_components.p, {
      children: "Pipelining also allows us to build more and more complex processing without ever impacting existing classes."
    }), "\n", _jsx(_components.p, {
      children: "-Need to log put requests? Add an object to the pipeline for it."
    }), "\n", _jsx(_components.p, {
      children: "-Need to record calls to a specific URI? Add an object to the pipeline for it."
    }), "\n", _jsx(_components.p, {
      children: "-Need to calculate the number of bytes being put to a URI? Add an object to the pipeline for it."
    }), "\n", _jsxs(_components.p, {
      children: ["The simplest pipeline just invokes a method on every handler it contains. Kind of like notifying listeners. Of course this is not always how you would like to do things so a more robust pipeline passes a “", _jsx(_components.strong, {
        children: "next"
      }), "” or “", _jsx(_components.strong, {
        children: "context"
      }), "” object to each member of the pipeline that it calls. Using the context object, members of the pipeline can choose to stop a call from continuing down the pipeline or make adjustments to the parameters of a call as it moves down the pipeline."]
    }), "\n", _jsx(Figure, {
      url: "/blog-assets/inheritance-aggregation-pipelines/pipeline-context.png",
      description: "A new interface for items in the pipeline. The Context object can be used to stop calls from moving down the pipeline among other things."
    }), "\n", _jsxs(_components.p, {
      children: ["A common use for the ", _jsx(_components.strong, {
        children: "Context"
      }), " object is to allow members of the pipeline to choose when to call the next member of the pipeline. The context object could also allow a member of the pipeline to pass an updated set of parameters to the next member."]
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-java",
        children: [_jsx(_components.span, {
          className: "hljs-comment",
          children: "// An example of a member of the ResourceProvider Pipeline."
        }), "\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "public"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "class"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "LRUCachedResourceProvider"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "implements"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "IPipelinedResourceProvider"
        }), " {\n  …\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "public"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "void"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "get"
        }), _jsx(_components.span, {
          className: "hljs-params",
          children: "(String uri, Context ctx)"
        }), " {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "if"
        }), " (cacheContains(uri)) {\n      ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// we found it in our cache so return and don’t"
        }), "\n      ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// call the next member of the pipeline."
        }), "\n      ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " getCachedValue(uri);\n    } ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "else"
        }), " {\n      ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// It wasn’t in the cache.  Forward call to"
        }), "\n      ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// the next handler in the pipeline."
        }), "\n      ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " ctx.nextGet(uri, ctx);\n    }\n  }\n  …\n}\n"]
      })
    }), "\n", _jsxs(_components.p, {
      children: ["If you want to see the pipeline pattern in practice you can check out the Netty project and their ", _jsx(_components.a, {
        href: "http://docs.jboss.org/netty/3.2/api/org/jboss/netty/channel/ChannelPipeline.html",
        children: "ChannelPipeline"
      }), "."]
    }), "\n", _jsxs(_components.p, {
      children: ["Dynamic languages have a surprisingly easy time when it comes to constructing pipelines. Here an ", _jsx(_components.a, {
        href: "https://github.com/tantaman/Pipeline.js/blob/master/README.md",
        children: "example"
      }), " of using ", _jsx(_components.a, {
        href: "https://github.com/tantaman/Pipeline.js",
        children: "Pipeline.js"
      })]
    })]
  });
}
function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? _jsx(MDXLayout, Object.assign({}, props, {
    children: _jsx(_createMdxContent, props)
  })) : _createMdxContent(props);
}
export default MDXContent;
