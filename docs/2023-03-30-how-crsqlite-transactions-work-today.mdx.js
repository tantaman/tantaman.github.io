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
    em: "em",
    h2: "h2",
    code: "code",
    img: "img"
  }, props.components);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.nav, {
      className: "toc",
      children: _jsx(_components.ol, {
        className: "toc-level toc-level-1",
        children: _jsxs(_components.li, {
          className: "toc-item toc-item-h1",
          children: [_jsx(_components.a, {
            className: "toc-link toc-link-h1",
            href: "#how-cr-sqlite-transactions-work-today",
            children: "How CR-SQLite Transactions Work Today"
          }), _jsxs(_components.ol, {
            className: "toc-level toc-level-2",
            children: [_jsx(_components.li, {
              className: "toc-item toc-item-h2",
              children: _jsx(_components.a, {
                className: "toc-link toc-link-h2",
                href: "#syncing-transactions",
                children: "Syncing Transactions"
              })
            }), _jsx(_components.li, {
              className: "toc-item toc-item-h2",
              children: _jsx(_components.a, {
                className: "toc-link toc-link-h2",
                href: "#upside",
                children: "Upside"
              })
            }), _jsx(_components.li, {
              className: "toc-item toc-item-h2",
              children: _jsx(_components.a, {
                className: "toc-link toc-link-h2",
                href: "#delta-state",
                children: "Delta State"
              })
            }), _jsx(_components.li, {
              className: "toc-item toc-item-h2",
              children: _jsx(_components.a, {
                className: "toc-link toc-link-h2",
                href: "#merging",
                children: "Merging"
              })
            })]
          })]
        })
      })
    }), _jsxs(_components.h1, {
      id: "how-cr-sqlite-transactions-work-today",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#how-cr-sqlite-transactions-work-today",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "How CR-SQLite Transactions Work Today"]
    }), "\n", _jsx(_components.p, {
      children: "cr-sqlite started with a few foundational decisions:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Re-use as much of SQLite as possible. No custom trees or VFSs."
      }), "\n", _jsx(_components.li, {
        children: "Have 0 impact on read performance."
      }), "\n", _jsx(_components.li, {
        children: "Writes to CRRs should be no slower than 2.5x a write to a normal SQLite table."
      }), "\n", _jsx(_components.li, {
        children: "The amount of storage required should be a constant factor of the size of the base data, no matter how long a peer is offline."
      }), "\n", _jsx(_components.li, {
        children: "Deltas between two databases can be computed by only exchanging Lamport timestamps."
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["The most influential decision is (4). This means that we ", _jsx(_components.em, {
        children: "only"
      }), " keep current state around. We do not retain the history of modifications that have occurred on the database nor do we keep an event log."]
    }), "\n", _jsx(_components.p, {
      children: "This has some practical impacts on syncing transaction."
    }), "\n", _jsxs(_components.h2, {
      id: "syncing-transactions",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#syncing-transactions",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Syncing Transactions"]
    }), "\n", _jsxs(_components.p, {
      children: ["Every commit to the database gets a unique ", _jsx(_components.code, {
        children: "db_version"
      }), " associated with it. When asking ", _jsx(_components.code, {
        children: "crsql_changes"
      }), " for all changes with a given ", _jsx(_components.code, {
        children: "db_version"
      }), " you will get all updates committed in that transaction with one exception."]
    }), "\n", _jsx(_components.p, {
      children: "The exception comes from the fact that cr-sqlite only stores the latest state (decision 4)."
    }), "\n", _jsx(_components.p, {
      children: "Given this, later transactions can overwrite values from earlier transactions. What this means is that when asking for all changes with a given db_version, you will be missing any values for that transaction that were overwritten by a later transaction."
    }), "\n", _jsxs(_components.p, {
      children: ["Visually this looks like:\n", _jsx(_components.img, {
        src: "/blog/how-it-works-today/tx-sync.png",
        alt: "transaction depiction and venn diagram where first tx is missing all overlap with the second"
      })]
    }), "\n", _jsx(_components.p, {
      children: "You can deal with this in a few ways:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Handle it in your application by understanding this limitation"
      }), "\n", _jsx(_components.li, {
        children: "In your network layer, sync after every commit"
      }), "\n", _jsx(_components.li, {
        children: "In your network layer, sync all changes from N to current db_version in a single transaction"
      }), "\n", _jsx(_components.li, {
        children: "In your network layer, keep a log of changeset batches to sync. Like 3 but split into chunks on transaction boundaries."
      }), "\n", _jsx(_components.li, {
        children: "Wait for cr-sqlite to include a full fidelity transaction log for these use cases"
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["So while you can commit atomic transactions locally, when syncing a transaction ", _jsx(_components.em, {
        children: "might be"
      }), " split up across two db_versions unless you've written a custom networking layer."]
    }), "\n", _jsxs(_components.p, {
      children: ["To see how we'll better support transactional guarantees in the future, see ", _jsx(_components.a, {
        href: "/2023-06-14-how-crsqlite-transactions-work-tomorrow.html",
        children: "How CR-SQLite Transactions Work Tomorrow"
      }), "."]
    }), "\n", _jsxs(_components.h2, {
      id: "upside",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#upside",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Upside"]
    }), "\n", _jsx(_components.p, {
      children: "Aside from minimal storage footprint, the other big advantage of the current approach is in dealing with high frequency writes. Given we only store current state, it does not matter if someone updates some set of rows thousands of times a second. Those updates:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Will not increase the size of the databases"
      }), "\n", _jsx(_components.li, {
        children: "Will not increase the number of entries in crsql_changes"
      }), "\n", _jsx(_components.li, {
        children: "Will not overload the network with sync events"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "If we kept full fidelity history of what things looked like at every transaction, high frequency updates would present a problem."
    }), "\n", _jsxs(_components.h2, {
      id: "delta-state",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#delta-state",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Delta State"]
    }), "\n", _jsxs(_components.p, {
      children: ["Regarding decision (5), each cell that is written also has the ", _jsx(_components.code, {
        children: "db_version"
      }), " recorded along side it. This allows us to find all cells that were create/updated after a given ", _jsx(_components.code, {
        children: "db_version"
      }), "."]
    }), "\n", _jsxs(_components.h2, {
      id: "merging",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#merging",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Merging"]
    }), "\n", _jsx(_components.p, {
      children: "Merging is done cell-wise. Each cell contains a logical clock that is incremented on mutation of that cell. When merging cells, we take the cell with the highest logical clock. If the two tie, we take the cell with the greater value."
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
