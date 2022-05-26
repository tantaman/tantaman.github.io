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
      h1: "h1",
      span: "span",
      p: "p",
      pre: "pre",
      code: "code",
      h2: "h2"
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
              href: "#review",
              children: "Review"
            })
          }), _jsxs(_components.li, {
            className: "toc-item toc-item-h1",
            children: [_jsx(_components.a, {
              className: "toc-link toc-link-h1",
              href: "#planning",
              children: "Planning"
            }), _jsxs(_components.ol, {
              className: "toc-level toc-level-2",
              children: [_jsx(_components.li, {
                className: "toc-item toc-item-h2",
                children: _jsx(_components.a, {
                  className: "toc-link toc-link-h2",
                  href: "#the-walk",
                  children: "The Walk"
                })
              }), _jsx(_components.li, {
                className: "toc-item toc-item-h2",
                children: _jsx(_components.a, {
                  className: "toc-link toc-link-h2",
                  href: "#a-complicated-walk",
                  children: "A Complicated Walk"
                })
              }), _jsx(_components.li, {
                className: "toc-item toc-item-h2",
                children: _jsx(_components.a, {
                  className: "toc-link toc-link-h2",
                  href: "#hops-and-many-plans",
                  children: "Hops and Many Plans"
                })
              })]
            })]
          }), _jsxs(_components.li, {
            className: "toc-item toc-item-h1",
            children: [_jsx(_components.a, {
              className: "toc-link toc-link-h1",
              href: "#optimization",
              children: "Optimization"
            }), _jsxs(_components.ol, {
              className: "toc-level toc-level-2",
              children: [_jsx(_components.li, {
                className: "toc-item toc-item-h2",
                children: _jsx(_components.a, {
                  className: "toc-link toc-link-h2",
                  href: "#hoisting",
                  children: "Hoisting"
                })
              }), _jsx(_components.li, {
                className: "toc-item toc-item-h2",
                children: _jsx(_components.a, {
                  className: "toc-link toc-link-h2",
                  href: "#joining-plans",
                  children: "Joining Plans"
                })
              }), _jsx(_components.li, {
                className: "toc-item toc-item-h2",
                children: _jsx(_components.a, {
                  className: "toc-link toc-link-h2",
                  href: "#unhoistable-expressions",
                  children: "Unhoistable Expressions"
                })
              }), _jsx(_components.li, {
                className: "toc-item toc-item-h2",
                children: _jsx(_components.a, {
                  className: "toc-link toc-link-h2",
                  href: "#chain-after",
                  children: "Chain-after"
                })
              })]
            })]
          })]
        })
      }), "\n", _jsxs(_components.h1, {
        id: "review",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#review",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Review"]
      }), "\n", _jsxs(_components.p, {
        children: ["Previously we discussed the ", _jsx(_components.a, {
          href: "./2022-05-26-query-builder",
          children: "query builder"
        }), "."]
      }), "\n", _jsx(_components.p, {
        children: "To recap, when a user interacts with the query builder a linked list of queries is built up behind the scenes. This list of queries holds a reference to the prior query and an expression to apply. Wehn taking this list together as a whole, it represents the user's desired final query."
      }), "\n", _jsx(_components.p, {
        children: "E.g., invoking the query builder like this"
      }), "\n", _jsx(_components.pre, {
        children: _jsxs(_components.code, {
          className: "hljs language-typescript",
          children: [_jsx(_components.span, {
            className: "hljs-keyword",
            children: "const"
          }), " jeffQuery = user\n  .", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "queryPhotos"
          }), "()\n  .", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "whereUploadDate"
          }), "(P.", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "greaterThan"
          }), "(", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "new"
          }), " ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "Date"
          }), "(", _jsx(_components.span, {
            className: "hljs-string",
            children: "'2022-01-01'"
          }), ")))\n  .", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "queryTaggedUsers"
          }), "()\n  .", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "whereName"
          }), "(P.", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "equals"
          }), "(", _jsx(_components.span, {
            className: "hljs-string",
            children: "'Jeff'"
          }), "));\n"]
        })
      }), "\n", _jsx(_components.p, {
        children: "returns a linked list that looks roughly like"
      }), "\n", _jsx("center", {
        children: _jsx(Mermaid, {
          id: "one",
          chart: `graph LR
UserQueryF["UserQuery(name == Jeff)"] --> UserQuery
UserQuery --> PhotoQueryF["PhotoQuery(uploadDate > 2022-01-01)"]
PhotoQueryF --> PhotoQuery`
        })
      }), "\n", _jsxs(_components.p, {
        children: ["The first node in the list represents the last query builder method that was invoked (", _jsx(_components.code, {
          children: "whereName(P.equals('Jeff'))"
        }), ") and the last node in the list the first query builder method (", _jsx(_components.code, {
          children: "queryPhotos"
        }), ")."]
      }), "\n", _jsxs(_components.h1, {
        id: "planning",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#planning",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Planning"]
      }), "\n", _jsx(_components.p, {
        children: "There are several important steps that happen after building a query to get it into a state where it can be executed. The first of those is the query planning step."
      }), "\n", _jsxs(_components.p, {
        children: ["The core idea of query planning is to walk the list of expressions and pull out (hoist) as many expressions as possible to send them to be executed directly in the database. Expressions that cannot be hoisted will be executed within the application via the ", _jsx(_components.a, {
          href: "./2022-05-26-chunk-iterable",
          children: "chunk iterable framework"
        }), " (chunked iteration phase to be covered in more detail in a future post)."]
      }), "\n", _jsxs(_components.h2, {
        id: "the-walk",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#the-walk",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "The Walk"]
      }), "\n", _jsx(_components.p, {
        children: "We walk the list of queries provided by our query builder, collecting the expressions it contains into one or more plans."
      }), "\n", _jsx(_components.p, {
        children: "We perform this walk by asking the last query returned by the query builder to plan itself. It then asks the query before it to plan itself and so on, all the way to the beginning."
      }), "\n", _jsx(_components.p, {
        children: "The \"root\" or \"source\" plan is then returned back up the stack. As the plan comes up the stack, each derived query appends its expression to the plan."
      }), "\n", _jsx(_components.pre, {
        children: _jsxs(_components.code, {
          className: "hljs language-typescript",
          children: [_jsx(_components.span, {
            className: "hljs-keyword",
            children: "abstract"
          }), " ", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "class"
          }), " ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "DerivedQuery"
          }), " {\n\n  ...\n\n  ", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "plan"
          }), "(", _jsx(_components.span, {
            className: "hljs-params"
          }), ") {\n    ", _jsx(_components.span, {
            className: "hljs-comment",
            children: "// Ask the prior query to plan itself"
          }), "\n    ", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "const"
          }), " plan = ", _jsx(_components.span, {
            className: "hljs-variable language_",
            children: "this"
          }), ".", _jsx(_components.span, {
            className: "hljs-property",
            children: "priorQuery"
          }), ".", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "plan"
          }), "();\n    ", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "if"
          }), " (", _jsx(_components.span, {
            className: "hljs-variable language_",
            children: "this"
          }), ".", _jsx(_components.span, {
            className: "hljs-property",
            children: "expression"
          }), ") {\n      ", _jsx(_components.span, {
            className: "hljs-comment",
            children: "// append our expression to the plan"
          }), "\n      plan.", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "addDerivation"
          }), "(", _jsx(_components.span, {
            className: "hljs-variable language_",
            children: "this"
          }), ".", _jsx(_components.span, {
            className: "hljs-property",
            children: "expression"
          }), ");\n    }\n\n    ", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "return"
          }), " plan;\n  }\n}\n\n", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "abstract"
          }), " ", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "class"
          }), " ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "SourceQuery"
          }), " {\n  ", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "plan"
          }), "(", _jsx(_components.span, {
            className: "hljs-params"
          }), ") {\n    ", _jsx(_components.span, {
            className: "hljs-comment",
            children: "// We're the source query. Return a new plan with our source expression."
          }), "\n    ", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "return"
          }), " ", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "new"
          }), " ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "Plan"
          }), "(", _jsx(_components.span, {
            className: "hljs-variable language_",
            children: "this"
          }), ".", _jsx(_components.span, {
            className: "hljs-property",
            children: "expression"
          }), ". [])\n  }\n}\n"]
        })
      }), "\n", _jsx(_components.p, {
        children: "Lets start with a simple query. Finding all users named \"Bill\"."
      }), "\n", _jsx(_components.pre, {
        children: _jsxs(_components.code, {
          className: "hljs language-javascript",
          children: [_jsx(_components.span, {
            className: "hljs-keyword",
            children: "const"
          }), " query = user.", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "queryAll"
          }), "().", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "whereName"
          }), "(P.", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "equals"
          }), "(", _jsx(_components.span, {
            className: "hljs-string",
            children: "'Bill'"
          }), "));\n"]
        })
      }), "\n", _jsx(_components.p, {
        children: "This query would return a linked list that looks like:"
      }), "\n", _jsx("center", {
        children: _jsx(Mermaid, {
          id: "twp",
          chart: `graph LR
UserQueryF["UserQuery(name == Bill)"] --> UserQuery
UserQuery --> SQLSourceQuery
`
        })
      }), "\n", _jsxs(_components.p, {
        children: [_jsx(_components.code, {
          children: "UserQuery(name == Bill)"
        }), " being the last node in the list and linked back to the prior queries."]
      }), "\n", _jsxs(_components.p, {
        children: [_jsx(_components.code, {
          children: "SQLSourceQuery"
        }), " is a new addition to the diagram. It is a query type that is returned by the query builder when creating a new query not derived from a prior query. It represents the root and would be specific to the storage type that is kicking off the query. E.g., ", _jsx(_components.code, {
          children: "SQLSourceQuery"
        }), ", ", _jsx(_components.code, {
          children: "CypherSourceQuery"
        }), " or ", _jsx(_components.code, {
          children: "IndexDBSourceQuery"
        }), " would be some possibilities depending on where the source model type is stored."]
      }), "\n", _jsx(_components.p, {
        children: "The plan for this query would look like:"
      }), "\n", _jsx(_components.pre, {
        children: _jsxs(_components.code, {
          className: "hljs language-css",
          children: ["Plan {\n  source: SQLSourceExpression,\n  derivations: [\n    ", _jsx(_components.span, {
            className: "hljs-built_in",
            children: "FilterExpression"
          }), "(name == Bill),\n  ]\n}\n"]
        })
      }), "\n", _jsxs(_components.h2, {
        id: "a-complicated-walk",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#a-complicated-walk",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "A Complicated Walk"]
      }), "\n", _jsxs(_components.h2, {
        id: "hops-and-many-plans",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#hops-and-many-plans",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Hops and Many Plans"]
      }), "\n", _jsxs(_components.h1, {
        id: "optimization",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#optimization",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Optimization"]
      }), "\n", _jsxs(_components.h2, {
        id: "hoisting",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#hoisting",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Hoisting"]
      }), "\n", _jsxs(_components.h2, {
        id: "joining-plans",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#joining-plans",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Joining Plans"]
      }), "\n", _jsxs(_components.h2, {
        id: "unhoistable-expressions",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#unhoistable-expressions",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Unhoistable Expressions"]
      }), "\n", _jsxs(_components.h2, {
        id: "chain-after",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#chain-after",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Chain-after"]
      })]
    });
  }
}
export default MDXContent;
