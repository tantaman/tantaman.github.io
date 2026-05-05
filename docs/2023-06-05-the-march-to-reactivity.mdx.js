/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
import Callout from '/dist/components/blog/shared/Callout.js';
function _createMdxContent(props) {
  const _components = Object.assign({
    nav: "nav",
    ol: "ol",
    li: "li",
    a: "a",
    p: "p",
    pre: "pre",
    code: "code",
    span: "span",
    ul: "ul",
    h2: "h2",
    em: "em"
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
            href: "#today-naively-via-update_hook",
            children: "Today: Naively via update_hook"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#tomorrow-smarter-via-differential-data-flow",
            children: "Tomorrow: Smarter via Differential Data Flow"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#tomorrow-even-smarter-with-an-inverted-database",
            children: "Tomorrow++: Even Smarter with an Inverted Database"
          })
        })]
      })
    }), "\n", _jsx(_components.p, {
      children: "The request-response pattern isn't optimal for the types of applications we'd like to build today. If you want your application to update as soon as information is available, it is much easier for that information to be pushed to you incrementally than for you to have to go request it."
    }), "\n", _jsx(_components.p, {
      children: "Even if you're not sold on a push model and would rather pull, you still have two problems:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Knowing when the data you care about, or any data it depends on, has changed"
      }), "\n", _jsx(_components.li, {
        children: "Making that re-pull cheap and/or limiting what you pull to just the updated data"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "To make this a bit more concrete, think of something like an event planning app that allows multiple users to collaboratively plan an event."
    }), "\n", _jsx(_components.p, {
      children: "The details of an event page might be fetched with a query like:"
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "SELECT"
        }), "\n  \"event\".\"name\",\n  \"event\".\"description\",\n  \"event\".\"date\",\n  \"place\".\"address\",\n  \"place\".\"name\",\n  json_group_array(\"invitee\".\"name\") ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "as"
        }), " \"invitees\",\n  json_group_array(\"planner\".\"name\") ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "as"
        }), " \"planners\"\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "FROM"
        }), " \"event\"\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "JOIN"
        }), " \"event_invitee\" ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " \"event_invitees\".\"event_id\" ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " \"event\".\"id\"\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "JOIN"
        }), " \"user\" ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "as"
        }), " \"invitee\" ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " \"event_invitee\".\"user_id\" ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " \"invitee\".\"id\"\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "JOIN"
        }), " \"place\" ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " \"event\".\"place_id\" ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " \"place\".\"id\"\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "JOIN"
        }), " \"event_planner\" ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " \"event_planner\".\"event_id\" ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " \"event\".\"id\"\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "JOIN"
        }), " \"user\" ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "as"
        }), " \"planner\" ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " \"event_planner\".\"planner_id\" ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " \"planner\".\"id\"\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "WHERE"
        }), " \"event\".\"id\" ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " :event_id\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "If:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "An invitee is added to an event"
      }), "\n", _jsx(_components.li, {
        children: "An invitee is removed from an event"
      }), "\n", _jsx(_components.li, {
        children: "Another planner is modifying event name, description, date or place"
      }), "\n", _jsx(_components.li, {
        children: "New planners are added or removed"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "The dashboard should reflect that in real time."
    }), "\n", _jsx(_components.p, {
      children: "How do we solve reactivity in Vulcan?"
    }), "\n", _jsxs(_components.h2, {
      id: "today-naively-via-update_hook",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#today-naively-via-update_hook",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Today: Naively via update_hook"]
    }), "\n", _jsx(_components.p, {
      children: "Today, implement reactivity somewhat naively."
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Developers tell us which queries should be \"live\" or \"reactive\""
      }), "\n", _jsxs(_components.li, {
        children: ["We use SQLite's ", _jsx(_components.code, {
          children: "tables_used"
        }), " method to understand the transitive set of all tables used by a query"]
      }), "\n", _jsxs(_components.li, {
        children: ["We register an ", _jsx(_components.code, {
          children: "update_hook"
        }), " with SQLite to be notified whenever a row is inserted/updated/deleted"]
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["When the ", _jsx(_components.code, {
        children: "update_hook"
      }), " tells us tables impact by a write, we map that back to the live queries registered by the developer. Those queries are proactively re-run and the results passed back."]
    }), "\n", _jsx(_components.p, {
      children: "This is obviously rather naive. Someone could alter rows that have no impact on the query, resulting in re-running queries that do not need to be run."
    }), "\n", _jsx(_components.p, {
      children: "This has worked ok but requires developers to do workarounds for extremely interactive code paths. The most common workaround is to build a standard domain model atop SQL. E.g., building Event, Planner, User classes that load data from the DB and create objects that reside in memory. The domain model, residing in-memory, is realtime reactive to user events happening locally. The SQL layer only updates the domain model when new data has been synced over the network."
    }), "\n", _jsxs(Callout, {
      type: "info",
      children: [_jsxs(_components.p, {
        children: ["For the JS world ", _jsx(_components.a, {
          href: "https://tinybase.org/",
          children: "TinyBase"
        }), ", and ", _jsx(_components.a, {
          href: "https://tanstack.com/query/v3/",
          children: "ReactQuery"
        }), " integrations could go a long way to solving the highly interactive paths until they're solve in Vulcan itself."]
      }), _jsxs(_components.ul, {
        children: ["\n", _jsx(_components.li, {
          children: "For TinyBase, we could hydrate from cr-sqlite and lazily persist to cr-sqlite"
        }), "\n", _jsx(_components.li, {
          children: "ReactQuery allows fine-grained manual invalidations at the query level. So while a lot of manual tracking, you'd only re-run the exact queries you specify."
        }), "\n"]
      })]
    }), "\n", _jsxs(_components.h2, {
      id: "tomorrow-smarter-via-differential-data-flow",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#tomorrow-smarter-via-differential-data-flow",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Tomorrow: Smarter via Differential Data Flow"]
    }), "\n", _jsxs(Callout, {
      type: "warning",
      children: [_jsx(_components.p, {
        children: "This is a live document. It will be updated as this problem is further explored and solved. Things not yet covered:"
      }), _jsxs(_components.ul, {
        children: ["\n", _jsx(_components.li, {
          children: "Materializing joins"
        }), "\n", _jsx(_components.li, {
          children: "Sub-queries and aggregations"
        }), "\n"]
      })]
    }), "\n", _jsx(_components.p, {
      children: "The reactive end goal is being able to allow users to:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Update their data at 120 FPS"
      }), "\n", _jsx(_components.li, {
        children: "Have all queries, no matter how complex, that rely on updated data refresh within the same frame"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "Re-running every query against a table any time a piece of data changes in that table is obviously not going to cut it. What we can do, however, is:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Parse the SQL in Live Queries"
      }), "\n", _jsxs(_components.li, {
        children: ["Convert Live Queries to ", _jsx(_components.a, {
          href: "https://github.com/TimelyDataflow/differential-dataflow",
          children: "Differential Data Flow"
        }), " pipelines", "\n", _jsxs(_components.ol, {
          children: ["\n", _jsxs(_components.li, {
            children: ["This is doable as seen from ", _jsx(_components.a, {
              href: "/2022-05-26-query-planning.html",
              children: "another project of mine"
            }), " that converts the other direction (map/filter/union/intersect to SQL)"]
          }), "\n"]
        }), "\n"]
      }), "\n", _jsx(_components.li, {
        children: "Map Live Queries to tables used"
      }), "\n", _jsx(_components.li, {
        children: "Run insert/update/delete statements through the relevant differential data flow pipelines to quickly and synchronously produce the updated result(s) for their corresponding queries"
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["This is ", _jsx(_components.em, {
        children: "much"
      }), " faster than the naive approach as live queries only need to be incrementally updated based on the content of a write rather than fully recomputed."]
    }), "\n", _jsxs(_components.p, {
      children: ["It still isn't ", _jsx(_components.em, {
        children: "the best we can do"
      }), " since we'll still run pipelines that we could reasonable exclude. I.e., if a write comes in against the ", _jsx(_components.code, {
        children: "user"
      }), " table, we'll still run all pipelines that used the ", _jsx(_components.code, {
        children: "user"
      }), " table. These pipelines will be fast for sure but, for server side applications, with potentially tens of thousands of unrelated writes for a given subscription this isn't going to cut it."]
    }), "\n", _jsx(_components.p, {
      children: "For that we'd need an \"inverted database.\""
    }), "\n", _jsx(_components.p, {
      children: "Prior art related to this phase:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "https://github.com/mit-pdos/noria",
          children: "Noria"
        })
      }), "\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "https://materialize.com/",
          children: "Materialize"
        })
      }), "\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "https://readyset.io/",
          children: "ReadySet"
        })
      }), "\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "https://github.com/wotbrew/relic",
          children: "Relic"
        })
      }), "\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "https://github.com/TimelyDataflow/differential-dataflow",
          children: "Differential Data Flow"
        })
      }), "\n"]
    }), "\n", _jsxs(_components.h2, {
      id: "tomorrow-even-smarter-with-an-inverted-database",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#tomorrow-even-smarter-with-an-inverted-database",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Tomorrow++: Even Smarter with an Inverted Database"]
    }), "\n", _jsx(_components.p, {
      children: "\"Inverted Database\" is not a technical term but it describes the problem well. Rather than indexing data we want to index the ranges used by live queries."
    }), "\n", _jsx(_components.p, {
      children: "E.g.,"
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "SELECT"
        }), " ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "*"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "FROM"
        }), " foo ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "WHERE"
        }), " x ", _jsx(_components.span, {
          className: "hljs-operator",
          children: ">"
        }), " ", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "AND"
        }), " y ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "<"
        }), " ", _jsx(_components.span, {
          className: "hljs-number",
          children: "10"
        }), ";\n"]
      })
    }), "\n", _jsxs(_components.p, {
      children: ["We should create a range for ", _jsx(_components.code, {
        children: "x > 1"
      }), " and a range for ", _jsx(_components.code, {
        children: "y < 10"
      }), ". This way when data comes in"]
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "INSERT"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "INTO"
        }), " foo (id, x, y) ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "VALUES"
        }), " (", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), ", ", _jsx(_components.span, {
          className: "hljs-number",
          children: "5"
        }), ", ", _jsx(_components.span, {
          className: "hljs-number",
          children: "3"
        }), ");\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "We can use our inverted database to tell us exactly which queries that write impacts."
    }), "\n", _jsx(_components.p, {
      children: "Deletes are similar."
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "DELETE"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "FROM"
        }), " foo ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "WHERE"
        }), " id ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " ", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), "\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "except that we'll need to check if the row is already in-memory. If so, then see if the values in that row intersect any ranges (or points) specified by a live query. If so, update that query."
    }), "\n", _jsx(_components.p, {
      children: "Updates are similar to deletes in that we need to load the cached value (i.e., the value previously returned by a live query) to see if the mutation of a column would remove it from the live query's results. If the row was never cached (never returned by the live query) we can just see if the update would have made it applicable to the live query."
    }), "\n", _jsx(_components.p, {
      children: "This last case of course has some gotchas. E.g., maybe there are some extra columns we need from disk to make this final determination."
    }), "\n", _jsx(_components.p, {
      children: "Prior art in this area:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "https://github.com/ccorcos/tuple-database",
          children: "tuple-database"
        })
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["Other:\nquery decomposition: ", _jsx(_components.a, {
        href: "https://www.figma.com/blog/livegraph-real-time-data-fetching-at-figma/",
        children: "https://www.figma.com/blog/livegraph-real-time-data-fetching-at-figma/"
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
