/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
function _createMdxContent(props) {
  const _components = Object.assign({
    nav: "nav",
    ol: "ol",
    li: "li",
    a: "a",
    p: "p",
    code: "code",
    h2: "h2",
    span: "span",
    strong: "strong",
    ul: "ul"
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
            href: "#getting-started",
            children: "Getting Started"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#components",
            children: "Components"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#relationships",
            children: "Relationships"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#series-format",
            children: "Series Format"
          })
        })]
      })
    }), _jsxs(_components.p, {
      children: ["With services like ", _jsx(_components.code, {
        children: "Herkou"
      }), ", ", _jsx(_components.code, {
        children: "AWS"
      }), ", ", _jsx(_components.code, {
        children: "Azure"
      }), " and ", _jsx(_components.code, {
        children: "Google Cloud"
      }), ", creating and managing your own cloud architecture may be a dying art. Some might accuse me of showing my age, like professors of old who swore that their students must learn ", _jsx(_components.code, {
        children: "C"
      }), " and how to ", _jsx(_components.code, {
        children: "alloc"
      }), " & ", _jsx(_components.code, {
        children: "free"
      }), "."]
    }), "\n", _jsxs(_components.p, {
      children: ["Well I don't think that those professors were entirely wrong. Of course you want to take advantage of all the abstractions available to you in the modern era but you'll inevitbly have to face low level problems at some point in your career. Joel Spolsky has some great writing on this topic. While I think Joel goes a bit overboard (we're surrounded by abstraction that rarely, if ever, leak) all of this reminds me of his article on ", _jsx(_components.a, {
        href: "https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/",
        children: "leaky abstractions"
      }), ". Tldr: at some point something lower in the stack breaks (or bubbles up), requiring you to understand how it works so you can fix (or accomodate) it."]
    }), "\n", _jsxs(_components.p, {
      children: ["The most spectacular example I've seen of a leaky abstraction in production was a bug we had generating hashes of passwords. Developers in the ", _jsx(_components.code, {
        children: "PHP"
      }), " stack would call ", _jsx(_components.code, {
        children: "hash_password"
      }), " (when registering a user) or ", _jsx(_components.code, {
        children: "check_pasword($user_input, $stored_hash)"
      }), " when checking credentials. New accounts would get created, but the users could never log in. At the same time, the number of failed login attempts for previously registered users increased. Ultimately, the cause of the bug ended up being new servers we had installed which contained Intel chips that were generating incorrect SHA values. The abstraction leaked from the metal all the way up to application developers."]
    }), "\n", _jsx(_components.p, {
      children: "All that being said, you don't know which part of the stack is going to end up breaking in your future but some part, deep down, will break. Given that, a good developer should have a passing familiarity with all levels of the stack."
    }), "\n", _jsxs(_components.h2, {
      id: "getting-started",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#getting-started",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Getting Started"]
    }), "\n", _jsx(_components.p, {
      children: "In this series I'll be setting up a full blown cloud, the likes of which you'd see deployed at Facebook, Google, Amazon or Microsoft. The cloud will be scaled down to tens of servers rather than tens of thousands of servers. The hardware we're using will also be exclusively Raspberry Pis."
    }), "\n", _jsx(_components.p, {
      children: "The princple we'll be using while developing this cloud is that nothing is done until it is fully monitored. We'll call this \"monitoring driven development.\""
    }), "\n", _jsxs(_components.h2, {
      id: "components",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#components",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Components"]
    }), "\n", _jsx(_components.p, {
      children: "Before we can get started we need to understand what components we'll need. When taken together, the set of components should be capable of supporting a diverse and rich array of applications that would be hosted in our cloud."
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Load balancer"
        }), " - so we can spread the incoming requests across multiple servers"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Application servers"
        }), " - handle requests from the outside world. Could call these \"API Servers\""]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Lambda tier"
        }), " - tier to run random jobs. Could call this \"background\" or \"async\" tier. Could be expanded to consume the responsibilities of the application servers if we're going for a ", _jsx(_components.a, {
          href: "https://martinfowler.com/articles/serverless.html",
          children: "\"serverless acrhitecture.\""
        })]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Database tier"
        }), " - persistence for online services"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Cache"
        }), " - fronts the DB"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Middleware / Message bus"
        }), " - facilitates one to many communication amongs components. The choices we make here can vastly simplify logging and monitoring."]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Blob storage"
        }), " - save and serve things like images and files"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Real time metrics database"
        }), " - so we can query exactly what is happening right now in our services"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Log collection"
        }), " - bring logs from all services on all servers to our real time db and data warehouse"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Data warehouse"
        }), " - for offline analysis of logs"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Service registry"
        }), " - allow services to discover one another as they come and go"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Chaos Monkey"
        }), " - simulate failures in order to test our fault tolerance (e.g., failover)"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Network separation"
        }), " - keep our internal/home/whatever network safe if the pi-cloud gets popped"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Real time abuse protection"
        }), " - prevent spam, child porn, terrorist propaganda, etc. from being uploaded by users of our applications"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "ACL management"
        }), " - control what services and users have access to what"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Automated Deployment"
        }), " - committed some new code? It should get deployed without us having to think about it or even press a single button"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Misc machine pool"
        }), " - this is for services to be deployed to that can't run in the application or lambda tier. I debated including this as the entire cloud of Pis could be seen as a \"misc machine pool\" that we just so happened to deploy a specific confiugration to. I think it warrants inclusion as most organizations have some random long tail of services that don't fit into the broad buckets of: web/database/lambda. These are generally stateful services."]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Work queues"
        }), " - Application servers will likely need to enqueue work to be done at a later date (e.g., sending emails, scheduling account deletion jobs). This \"work\" will go to the lambda tier but we'll need a queue to front it in many cases."]
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "For our DB tier, we may get into shard maps. TBD."
    }), "\n", _jsx(_components.p, {
      children: "We may also get into data governance as using user data appropriately (based on whatever consent we've collected from the user), and properly anonymizing and deleting data is a big deal in this era."
    }), "\n", _jsxs(_components.h2, {
      id: "relationships",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#relationships",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Relationships"]
    }), "\n", _jsx(_components.p, {
      children: "To understand how all of the components connect, let's draw them out."
    }), "\n", _jsx(_components.p, {
      children: "Below is a high level diagram that shows how requests:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Come in from the internet"
      }), "\n", _jsx(_components.li, {
        children: "Hit our load balancer"
      }), "\n", _jsx(_components.li, {
        children: "Get sent to an app server"
      }), "\n", _jsx(_components.li, {
        children: "App servers talk with our database cache which, on miss, hits the DBs"
      }), "\n", _jsx(_components.li, {
        children: "App servers may enqueue work to our work queues"
      }), "\n", _jsx(_components.li, {
        children: "Lambda tier pulls work from the queues (or is pushed work from the queue)"
      }), "\n", _jsx(_components.li, {
        children: "Application and lambda tiers talk to a service map to lookup and talk to specific long-tail/misc services they may need"
      }), "\n", _jsx(_components.li, {
        children: "The DB holds a link (like a file handle) to content in the blob storage"
      }), "\n", _jsx(_components.li, {
        children: "Blob storage content is served to users via CDN"
      }), "\n"]
    }), "\n", _jsx("img", {
      src: "/blog-assets/pi-cloud/first/high-level.svg",
      style: {
        height: 700
      }
    }), "\n", _jsx("figcaption", {
      style: {
        textAlign: 'center'
      },
      children: _jsx("i", {
        children: "High level diagram of the relationships between the cloud components"
      })
    }), "\n", _jsx("br", {}), "\n", _jsx(_components.p, {
      children: "We'll somehow have to manage deployment of all of these services to the various Raspberry Pis. Services will describe their resource constraints and a machine will be picked for them to run on."
    }), "\n", _jsx("img", {
      src: "/blog-assets/pi-cloud/first/deploy.svg",
      style: {
        height: 400
      }
    }), "\n", _jsx("figcaption", {
      style: {
        textAlign: 'center'
      },
      children: _jsx("i", {
        children: _jsx(_components.p, {
          children: "Deployment is handled by services declaring their resource needs, stacking\nconstraints and number of instances to run. The deployment service will find\nmachines to run the services on that match the constraints."
        })
      })
    }), "\n", _jsx("br", {}), "\n", _jsx(_components.p, {
      children: "And lastly we have log collection. This may seem unimportant to some but having a central and streamlined way of processing log data will vastly simplify monitoring, alerting, application experimentation, abuse protection, online machine learning and more within our cloud."
    }), "\n", _jsx("img", {
      src: "/blog-assets/pi-cloud/first/log-collect.svg",
      style: {
        height: 400
      }
    }), "\n", _jsx("figcaption", {
      style: {
        textAlign: 'center'
      },
      children: _jsx("i", {
        children: _jsx(_components.p, {
          children: "All logs will be collected, or sent, to a central message bus. The bus will\ndistribute the logs to any services that would like to subscribe to them."
        })
      })
    }), "\n", _jsx("br", {}), "\n", _jsxs(_components.h2, {
      id: "series-format",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#series-format",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Series Format"]
    }), "\n", _jsx(_components.p, {
      children: "We've roughly laid out the vision for this series. Future posts will do a deep dive into each component, what software we pick (or write) to run that component, how we integrate it into the system and then finally how we monitor and test that component."
    }), "\n", _jsx(_components.p, {
      children: "We'll end up covering topics like:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "error rates"
      }), "\n", _jsx(_components.li, {
        children: "bandwidth usage"
      }), "\n", _jsx(_components.li, {
        children: "cpu & memory usage"
      }), "\n", _jsx(_components.li, {
        children: "service failover"
      }), "\n", _jsx(_components.li, {
        children: "database replication"
      }), "\n", _jsx(_components.li, {
        children: "log collection"
      }), "\n", _jsx(_components.li, {
        children: "alerting"
      }), "\n", _jsx(_components.li, {
        children: "hardware failure remediation"
      }), "\n", _jsx(_components.li, {
        children: "when to shard"
      }), "\n", _jsx(_components.li, {
        children: "finding bottlenecks"
      }), "\n", _jsx(_components.li, {
        children: "when to horizontally vs vertically scale"
      }), "\n", _jsx(_components.li, {
        children: "service discovery"
      }), "\n", _jsx(_components.li, {
        children: "spam fighting"
      }), "\n", _jsx(_components.li, {
        children: "and more!"
      }), "\n"]
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
