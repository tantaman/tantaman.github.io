/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
function _createMdxContent(props) {
  const _components = Object.assign({
    nav: "nav",
    ol: "ol",
    li: "li",
    a: "a",
    h1: "h1",
    span: "span",
    p: "p",
    blockquote: "blockquote",
    img: "img",
    ul: "ul",
    pre: "pre",
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
            href: "#recursive-ordering",
            children: "Recursive Ordering"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h1",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h1",
            href: "#how-recursive-ordering-works",
            children: "How Recursive Ordering Works"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h1",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h1",
            href: "#pros",
            children: "Pros"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h1",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h1",
            href: "#cons",
            children: "Cons"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h1",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h1",
            href: "#why-is-it-recursive",
            children: "Why is it \"recursive\""
          })
        })]
      })
    }), _jsxs(_components.h1, {
      id: "recursive-ordering",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#recursive-ordering",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Recursive Ordering"]
    }), "\n", _jsxs(_components.p, {
      children: ["We previously covered ", _jsx(_components.a, {
        href: "/2023-01-26-fractional-indexing.html",
        children: "fractional indexing"
      }), " which is useful for cases where:"]
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "You have a large number of rows"
      }), "\n", _jsx(_components.li, {
        children: "You want to provide an order to those rows"
      }), "\n", _jsx(_components.li, {
        children: "Changing the order of one row, with respect to the others, should not require modifying any row except the one being moved"
      }), "\n", _jsx(_components.li, {
        children: "Retrieving rows in sorted order should be fast"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "But it had some downsides"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "A fraction will lose precision quickly"
      }), "\n", _jsx(_components.li, {
        children: "Arbitrary precision floats could get very large in pathological cases"
      }), "\n", _jsx(_components.li, {
        children: "In a distributed setting, fractional indices can collide preventing insertions of items between the collision"
      }), "\n", _jsx(_components.li, {
        children: "In a distributed setting, concurrent edits based on fractional index will interleave"
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["Recursive ordering gets around these drawbacks and it is possible to efficiently order by a recurisve relationship -- even in a relational database. To skip how the algorithm works and jump directly to implementing it in sqlite, see ", _jsx(_components.a, {
        href: "/2022-12-20-recursive-ordering-in-sqlite.html",
        children: "recursive-ordering-in-sqlite"
      }), "."]
    }), "\n", _jsxs(_components.h1, {
      id: "how-recursive-ordering-works",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#how-recursive-ordering-works",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "How Recursive Ordering Works"]
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsx(_components.p, {
        children: "This first pass at recursive ordering will assume we're dealing with a centralized rather than distributed system. Later explorations will create derivations of the algorithm that work in a distributed setting."
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "Recursive ordering leverages relationships between items to create an order. The simplest example of this is a linked list. The order of the linked list provides the order of the items."
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.img, {
        src: "/blog/recursive-ordering/list.png",
        alt: "list"
      })
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsx(_components.p, {
        children: "Note that we link each item to the thing it was inserted after. This will become useful later."
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "If we order things like this, updating the position of something is just a matter of updating a few pointers rather than re-numbering all of the items in the set."
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Worst case, 3 pointers"
      }), "\n", _jsx(_components.li, {
        children: "Best case, 1 pointer"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.img, {
        src: "/blog/recursive-ordering/insert-before-b.png",
        alt: "insert-before-b"
      })
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.img, {
        src: "/blog/recursive-ordering/move-d-after-b.png",
        alt: "move-d-after-b"
      })
    }), "\n", _jsx(_components.p, {
      children: "You can create a linked list in a table through a schema like the following:"
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "CREATE"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "TABLE"
        }), " node (\n  id ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "primary"
        }), " key ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NOT"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NULL"
        }), ",\n  parent_id,\n  content,\n);\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "CREATE"
        }), " INDEX node_parent_id ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " node (parent_id);\n"]
      })
    }), "\n", _jsxs(_components.p, {
      children: ["Where each ", _jsx(_components.code, {
        children: "node"
      }), " has an ", _jsx(_components.code, {
        children: "id"
      }), " and points to the id of its parent, providing the ordering. You're likely wondering:"]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "How do you order a table by a relationship?"
      }), "\n", _jsx(_components.li, {
        children: "Is ordering tables through relationships even performant?"
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["See ", _jsx(_components.a, {
        href: "/2022-12-20-recursive-ordering-in-sqlite.html",
        children: "recursive-ordering-in-sqlite"
      }), "."]
    }), "\n", _jsxs(_components.h1, {
      id: "pros",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#pros",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Pros"]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Insertions only requiring updating at most 3 records"
      }), "\n", _jsx(_components.li, {
        children: "If you have a given start node you can easily find all nodes before it by traversing pointers"
      }), "\n", _jsx(_components.li, {
        children: "If you need to go in both directions, you can store the other direction of the relationship without much extra cost to insertion time"
      }), "\n"]
    }), "\n", _jsxs(_components.h1, {
      id: "cons",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#cons",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Cons"]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Without additional constraints, this will not work in a distributed setting where writers can update the ordering without coordinating. Someone could move B before D on one node and D before B on another, creating a cycle and breaking the list."
      }), "\n"]
    }), "\n", _jsxs(_components.h1, {
      id: "why-is-it-recursive",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#why-is-it-recursive",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Why is it \"recursive\""]
    }), "\n", _jsx(_components.p, {
      children: "This is a considered a recursive ordering since determining the total ordering of the set requires recursively following pointers until arriving at the root."
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
