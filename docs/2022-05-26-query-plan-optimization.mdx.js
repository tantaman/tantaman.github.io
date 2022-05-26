/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
import Mermaid from '/dist/components/Mermaid.js';
function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? _jsx(MDXLayout, Object.assign({}, props, {
    children: _jsx(_createMdxContent, {})
  })) : _createMdxContent();
  function _createMdxContent() {
    const _components = Object.assign({
      nav: "nav",
      ol: "ol",
      li: "li",
      a: "a",
      p: "p",
      ul: "ul",
      h1: "h1",
      span: "span",
      code: "code"
    }, props.components);
    return _jsxs(_Fragment, {
      children: [_jsx(_components.nav, {
        className: "toc",
        children: _jsxs(_components.ol, {
          className: "toc-level toc-level-1",
          children: [_jsx(_components.li, {
            className: "toc-item toc-item-h1",
            children: _jsx(_components.a, {
              className: "toc-link toc-link-h1",
              href: "#optimization-wtf-",
              children: "Optimization? Wtf? 😕"
            })
          }), _jsx(_components.li, {
            className: "toc-item toc-item-h1",
            children: _jsx(_components.a, {
              className: "toc-link toc-link-h1",
              href: "#optimization-goals",
              children: "Optimization Goals"
            })
          }), _jsx(_components.li, {
            className: "toc-item toc-item-h1",
            children: _jsx(_components.a, {
              className: "toc-link toc-link-h1",
              href: "#hoisting--collapsing-derived-expressions",
              children: "Hoisting / Collapsing Derived Expressions"
            })
          }), _jsx(_components.li, {
            className: "toc-item toc-item-h1",
            children: _jsx(_components.a, {
              className: "toc-link toc-link-h1",
              href: "#collapsing-hops",
              children: "Collapsing Hops"
            })
          })]
        })
      }), "\n", _jsxs(_components.p, {
        children: ["This is the third part in a deep dive into ", _jsx(_components.a, {
          href: "https://aphrodite.sh",
          children: "Aphrodite's"
        }), " query layer."]
      }), "\n", _jsxs(_components.ul, {
        children: ["\n", _jsxs(_components.li, {
          children: [_jsx(_components.a, {
            href: "./2022-05-26-query-builder",
            children: "Part 1"
          }), " we talked about the query builder"]
        }), "\n", _jsxs(_components.li, {
          children: [_jsx(_components.a, {
            href: "./2022-05-26-query-planning",
            children: "Part 2"
          }), " covered query plans"]
        }), "\n"]
      }), "\n", _jsx(_components.p, {
        children: "Now we'll cover how we optimize query plans."
      }), "\n", _jsxs(_components.h1, {
        id: "optimization-wtf-",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#optimization-wtf-",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Optimization? Wtf? 😕"]
      }), "\n", _jsxs(_components.p, {
        children: ["One of the first questions might be why an ", _jsx(_components.code, {
          children: "ORM"
        }), " needs to do query optimization. Isn't an ", _jsx(_components.code, {
          children: "ORM"
        }), " just translating the user's desired query to ", _jsx(_components.code, {
          children: "SQL"
        }), " (or other target backend query format)? And don't databases already do query optimization? Given that, why do we need an optimization layer in the ", _jsx(_components.code, {
          children: "ORM"
        }), "? Seems duplicative."]
      }), "\n", _jsxs(_components.h1, {
        id: "optimization-goals",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#optimization-goals",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Optimization Goals"]
      }), "\n", _jsxs(_components.p, {
        children: ["To understand this better we need to clarify what we mean by optimization. ", _jsx(_components.code, {
          children: "Aphrodite"
        }), "'s optimization step has two goals in mind:"]
      }), "\n", _jsxs(_components.ol, {
        children: ["\n", _jsx(_components.li, {
          children: "Generate as few database calls as possible"
        }), "\n", _jsx(_components.li, {
          children: "Minimze the amount of data returned from the database as much as possible"
        }), "\n"]
      }), "\n", _jsx(_components.p, {
        children: "A really dumb ORM might issue a SQL query for every join and then join all the data in the application server. We really don't want to do this."
      }), "\n", _jsxs(_components.p, {
        children: ["To accomplish our goals, ", _jsx(_components.code, {
          children: "Aphrodite"
        }), " does two things during optimization:"]
      }), "\n", _jsxs(_components.ol, {
        children: ["\n", _jsxs(_components.li, {
          children: ["Collapses ", _jsx(_components.code, {
            children: "HopPlans"
          }), " into their source plans everywhere possible"]
        }), "\n", _jsx(_components.li, {
          children: "Collapses derived expressions into source expressions everywhere possible"
        }), "\n"]
      }), "\n", _jsx(_components.p, {
        children: "What those two steps accomplish is to \"hoist\" all of the operations expressed by the user to be run in the database. E.g., hoisting filters, limits, hop/joins, order bys, etc. to be encoded into the SQL statement (or other db statement) and run in the database."
      }), "\n", _jsxs(_components.p, {
        children: [_jsx(_components.code, {
          children: "Aphrodite"
        }), " also need optimization for a third reason. That is due to the fact that ", _jsx(_components.code, {
          children: "Aphrodite"
        }), " lets (will let) you declare edges between rows in different data sources (e.g., ", _jsx(_components.code, {
          children: "SQL"
        }), " to ", _jsx(_components.code, {
          children: "Redis"
        }), " to ", _jsx(_components.code, {
          children: "ZippyDB"
        }), " to ", _jsx(_components.code, {
          children: "Neo4J"
        }), "). These datasources are unaware that they're being wired together at a higher level and thus ", _jsx(_components.code, {
          children: "Aphrodite"
        }), " needs to take care of optimizing queries that span data stores. Cross data store query optimization is for a different post but some of the building blocks are ", _jsx(_components.a, {
          href: "./2022-05-26-chunk-iterable",
          children: "hinted at here"
        }), "."]
      }), "\n", _jsxs(_components.h1, {
        id: "hoisting--collapsing-derived-expressions",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#hoisting--collapsing-derived-expressions",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Hoisting / Collapsing Derived Expressions"]
      }), "\n", _jsx(_components.p, {
        children: "todo"
      }), "\n", _jsxs(_components.h1, {
        id: "collapsing-hops",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#collapsing-hops",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Collapsing Hops"]
      }), "\n", _jsx(_components.p, {
        children: "todo"
      })]
    });
  }
}
export default MDXContent;
