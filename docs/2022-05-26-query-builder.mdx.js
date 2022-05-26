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
      p: "p",
      a: "a",
      pre: "pre",
      code: "code",
      span: "span",
      li: "li"
    }, props.components);
    return _jsxs(_Fragment, {
      children: [_jsx(_components.nav, {
        className: "toc",
        children: _jsx(_components.ol, {
          className: "toc-level toc-level-1"
        })
      }), "\n", _jsxs(_components.p, {
        children: [_jsx(_components.a, {
          href: "http://aphrodite.sh",
          children: "Aphrodite"
        }), " features a rich and type safe ", _jsx(_components.a, {
          href: "https://github.com/tantaman/aphrodite/blob/main/packages/integration-tests-ts/src/generated/UserQuery.ts#L17-L66",
          children: "query builder"
        }), ".\nThe builder can not only query for nodes of a given type but also traverse edges, apply filters, do pagination and more."]
      }), "\n", _jsx(_components.p, {
        children: "As an example, we can traverse from a user to their photos uploaded after 2022-01-01 to users tagged in those photos named Jeff like so:"
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
      }), "\n", _jsxs(_components.p, {
        children: ["Given that each hop can return a new type of query (e.g., ", _jsx(_components.code, {
          children: "PhotoQuery"
        }), " or ", _jsx(_components.code, {
          children: "UserQuery"
        }), ") on which to apply filters or take more hops, how do we enable such an API?"]
      }), "\n", _jsx(_components.p, {
        children: "The solution is pretty simple. Every invocation to a method on the query builder returns a new query that holds:"
      }), "\n", _jsxs(_components.ol, {
        children: ["\n", _jsx(_components.li, {
          children: "A reference the previous query"
        }), "\n", _jsx(_components.li, {
          children: "A reference to the expression (filter/map/limit/etc) being applied"
        }), "\n"]
      }), "\n", _jsx(_components.p, {
        children: "This forms a linked list which perfectly represents the invocations against the query builder, creating a structure that looks like:"
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
      }), "\n", _jsx(_components.p, {
        children: "As a JSON structure it looks like:"
      }), "\n", _jsx(_components.pre, {
        children: _jsxs(_components.code, {
          className: "hljs language-typescript",
          children: [_jsx(_components.span, {
            className: "hljs-keyword",
            children: "const"
          }), " jeffQuery = ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "UserQuery"
          }), " {\n  ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "expression"
          }), ": ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "FilterExpression"
          }), "(name == ", _jsx(_components.span, {
            className: "hljs-string",
            children: "'Jeff'"
          }), ")\n  ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "sourceQuery"
          }), ": ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "UserQuery"
          }), " {\n    ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "expression"
          }), ": ", _jsx(_components.span, {
            className: "hljs-literal",
            children: "null"
          }), ",\n    ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "sourceQuery"
          }), ": ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "PhotoQuery"
          }), " {\n      ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "expression"
          }), ": ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "FilterExpression"
          }), "(uploadDate > ", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "new"
          }), " ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "Date"
          }), "(", _jsx(_components.span, {
            className: "hljs-string",
            children: "'2022-01-01'"
          }), "))\n      ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "sourceQuery"
          }), ": ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "PhotoQuery"
          }), " {\n        ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "expression"
          }), ": ", _jsx(_components.span, {
            className: "hljs-literal",
            children: "null"
          }), ",\n        ", _jsx(_components.span, {
            className: "hljs-attr",
            children: "sourceQuery"
          }), ": ", _jsx(_components.span, {
            className: "hljs-literal",
            children: "null"
          }), ",\n      }\n    }\n  }\n}\n"]
        })
      }), "\n", _jsxs(_components.p, {
        children: ["Walking the linked list to the end will get you to the root that starts the query off.\nRunning each node in the list from the end back to the start will run the full query. In reality, however, we convert the query to a ", _jsx(_components.code, {
          children: "plan"
        }), " and optimize the ", _jsx(_components.code, {
          children: "plan"
        }), " before running it.\nSee ", _jsx(_components.a, {
          href: "./2022-05-26-query-planning",
          children: "Query Planning"
        }), " for more info on this."]
      }), "\n", _jsx(_components.p, {
        children: "The structure is a bit more complicated in practice since we need to constrain queries to only fetch items related to the prior hop but this is the basic idea."
      }), "\n", _jsx(_components.p, {
        children: "For the interested, a more faithful representation of what happens in practice is reproduced below."
      }), "\n", _jsx("center", {
        children: _jsx(Mermaid, {
          id: "two",
          chart: `graph TD
UserQueryF["UserQuery(name == Jeff)"] --> UserQuery
UserQuery --> HopQueryPtoU["HopQuery(PhotosToUsersEdge)"]
HopQueryPtoU --> PhotoQueryF["PhotoQuery(uploadDate > 2022-01-01)"]
PhotoQueryF --> PhotoQuery
PhotoQuery --> HopQueryUtoP["HopQuery(UsersToPhotosEdge)"]
HopQueryUtoP --> Root["Root(User)"]`
        })
      }), "\n", _jsxs(_components.p, {
        children: ["Base query classes:\n", _jsx(_components.a, {
          href: "https://github.com/tantaman/aphrodite/blob/main/packages/query-runtime-ts/src/Query.ts",
          children: "https://github.com/tantaman/aphrodite/blob/main/packages/query-runtime-ts/src/Query.ts"
        })]
      }), "\n", _jsxs(_components.p, {
        children: ["Example generated query builder:\n", _jsx(_components.a, {
          href: "https://github.com/tantaman/aphrodite/blob/main/packages/integration-tests-ts/src/generated/UserQuery.ts#L17-L66",
          children: "https://github.com/tantaman/aphrodite/blob/main/packages/integration-tests-ts/src/generated/UserQuery.ts#L17-L66"
        })]
      })]
    });
  }
}
export default MDXContent;
