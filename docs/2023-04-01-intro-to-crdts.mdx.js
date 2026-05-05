/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
import GSetExample from '/dist/components/blog/gentle-crdts/GSetExample.js';
import TieBreakExample from '/dist/components/blog/gentle-crdts/TieBreakExample.js';
import ChangesSinceExample from '/dist/components/blog/gentle-crdts/ChangesSinceExample.js';
import Overflowit from '/dist/components/blog/gentle-crdts/Overflowit.js';
import Callout from '/dist/components/blog/shared/Callout.js';
function _createMdxContent(props) {
  const _components = Object.assign({
    nav: "nav",
    ol: "ol",
    li: "li",
    a: "a",
    p: "p",
    h2: "h2",
    span: "span",
    blockquote: "blockquote",
    img: "img",
    code: "code",
    h3: "h3",
    strong: "strong",
    table: "table",
    thead: "thead",
    tr: "tr",
    th: "th",
    tbody: "tbody",
    td: "td",
    pre: "pre",
    ul: "ul",
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
            href: "#quick-definition",
            children: "Quick Definition"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#when-you-need-a-crdt",
            children: "When you need a CRDT"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#what-is-a-crdt",
            children: "What is a CRDT?"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#a-simple-crdt",
            children: "A Simple CRDT"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#last-write---what-can-go-wrong",
            children: "Last Write - What Can Go Wrong?"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#about-time",
            children: "About Time"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#basic-logical-clock",
            children: "Basic Logical Clock"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#logical-clocks-distributed",
            children: "Logical Clocks, Distributed"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#happens-before-explained",
            children: "Happens-before, Explained"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#wrapping-up",
            children: "Wrapping Up"
          })
        })]
      })
    }), "\n", _jsx(_components.p, {
      children: "Conflict Free Replicated Data types (CRDTs) can be tricky. You may spend months reading papers and implementing different algorithms before they finally click and become simple. That or they'll seem simple out of the gate and you'll be missing a bunch of nuance."
    }), "\n", _jsx(_components.p, {
      children: "What follows is an attempt at distilling all the hard understanding work into a condensed and easy to understand set of reading for a software developer without any background in CRDTs or distributed systems."
    }), "\n", _jsx(_components.p, {
      children: "Outline of what's to come:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "The quick definition of a CRDT"
      }), "\n", _jsx(_components.li, {
        children: "When you need a CRDT"
      }), "\n", _jsx(_components.li, {
        children: "More About What a CRDT is"
      }), "\n", _jsx(_components.li, {
        children: "A Simple CRDT"
      }), "\n", _jsx(_components.li, {
        children: "Last Write Wins & What Can Go Wrong"
      }), "\n", _jsx(_components.li, {
        children: "Getting More Complicated and Rethinking Time"
      }), "\n"]
    }), "\n", _jsxs(_components.h2, {
      id: "quick-definition",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#quick-definition",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Quick Definition"]
    }), "\n", _jsx(_components.p, {
      children: "From Wikipedia:"
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsx(_components.p, {
        children: "A CRDT is a data structure that is replicated across multiple computers in a network, with the following features:"
      }), "\n", _jsxs(_components.ol, {
        children: ["\n", _jsx(_components.li, {
          children: "The application can update any replica independently, concurrently and without coordinating with other replicas."
        }), "\n", _jsx(_components.li, {
          children: "An algorithm (itself part of the data type) automatically resolves any inconsistencies that might occur."
        }), "\n", _jsx(_components.li, {
          children: "Although replicas may have different state at any particular point in time, they are guaranteed to eventually converge."
        }), "\n"]
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "We'll clarify and expand on this definition later."
    }), "\n", _jsxs(_components.h2, {
      id: "when-you-need-a-crdt",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#when-you-need-a-crdt",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "When you need a CRDT"]
    }), "\n", _jsx(_components.p, {
      children: "CRDTs are needed in situations where you want multiple processes to modify the same state without coordinating their writes to that state."
    }), "\n", _jsx(_components.p, {
      children: "Imagine a situation where you have a shared business document. Ideally you, and others, can modify your copies of that document even when internet access is down. When internet is restored, you and your peer's changes can all be merged together without conflict."
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.img, {
        src: "/blog/gentle-intro-to-crdts/business-doc-central.png",
        alt: "shared-business-doc"
      })
    }), "\n", _jsx(_components.p, {
      children: "Even in situations where you do have excellent connectivity, CRDTs are useful to present a realtime experience to users. CRDTs allow all writes to be processed locally and merged with remote nodes later rather than requiring round-trips to a server for every write."
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.img, {
        src: "/blog/gentle-intro-to-crdts/realtime-ex.png",
        alt: "realtime-ex"
      })
    }), "\n", _jsx(_components.p, {
      children: "Lastly, CRDTs can be merged in any order so changes don't need to go through a central server. This allows truly \"serverless\" setups where every node is a peer on equal footing, able to merge state with any other peer at any time."
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.img, {
        src: "/blog/gentle-intro-to-crdts/business-doc-p2p.png",
        alt: "shared-business-doc"
      })
    }), "\n", _jsx(_components.p, {
      children: "What I'm describing here is very similar to decentralized version control (e.g., git and mercurial). In git, you commit locally and eventually merge and push your changes into a remote repository. Unlike git, CRDTs don't have merge conflicts. Conflict resolution is handled by the CRDT algorithm itself. Although not exactly a CRDT, git will be a useful model to refer back to since it is something already familiar to most developers and incorporates similar concepts."
    }), "\n", _jsx(_components.p, {
      children: "We're not yet ready to tackle the complexities of git so let's start with understanding what a CRDT is and then looking at one of the simplest crdts."
    }), "\n", _jsxs(_components.h2, {
      id: "what-is-a-crdt",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#what-is-a-crdt",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "What is a CRDT?"]
    }), "\n", _jsx(_components.p, {
      children: "I'll skip the mathematical definition (lattice, join, meet, etc.) for now and focus on a practical definition."
    }), "\n", _jsx(_components.p, {
      children: "A CRDT is a data type that can be:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Copied to multiple machines"
      }), "\n", _jsx(_components.li, {
        children: "Be modified independently by those machines without any coordination and for any length of time"
      }), "\n", _jsx(_components.li, {
        children: "All divergent copies of that state can be merged back together in any order and by any machine. Once all machines have seen all divergent copies, they're guaranteed to have all converged to the same final state."
      }), "\n"]
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsx(_components.p, {
        children: "The last point is important given it allows peer to peer merging of state rather than requiring merges to go through a central server. We'll come back to this to understand why algorithms which rely on merging state in a cetnralized way can't always be applied in a peer to peer setting."
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "Going back to git, it's the same as giving every developer a copy of the repository and allowing each developer to make changes locally. At the end of the day, every developer in an organization can merge changes with every other developer however they like: pair-wise, round-robin, or through a central repository. Once all merges are complete, every developer will have the same state (assuming merge conflicts were deterministically resolved). Unlike git, a CRDT wouldn't hit merge conflicts and can merge out of order changes."
    }), "\n", _jsx(_components.p, {
      children: "Let's see how this actually works and how you can implement it in the large (full blown applications) and in the small (individiual fields in a record)."
    }), "\n", _jsxs(_components.h2, {
      id: "a-simple-crdt",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#a-simple-crdt",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "A Simple CRDT"]
    }), "\n", _jsx(_components.p, {
      children: "One of the simplest CRDTs is a set that can only grow. A set being defined as:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "An unordered collection of elements"
      }), "\n", _jsx(_components.li, {
        children: "Each element in the collection is distinct"
      }), "\n", _jsx(_components.li, {
        children: "Adding an element to a set that is already in the set does not change the set"
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["So your normal ", _jsx(_components.code, {
        children: "Set"
      }), " type in Java/JavaScript/Python/etc."]
    }), "\n", _jsx(_components.p, {
      children: "A set that only grows is a CRDT since:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "You can give a copy of that set to any number of nodes"
      }), "\n", _jsx(_components.li, {
        children: "Each node can add any elements it likes to its copy of the set"
      }), "\n", _jsx(_components.li, {
        children: "All sets from all nodes can be merged back together in any order"
      }), "\n", _jsx(_components.li, {
        children: "Once all merges are complete, all nodes will have the same set (the union of all individual sets)"
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["A slightly more useful incarnation of a grow only set is a database table where each row is keyed by a UUID (tangent: ", _jsx(_components.a, {
        href: "https://blog.devgenius.io/analyzing-new-unique-identifier-formats-uuidv6-uuidv7-and-uuidv8-d6cc5cd7391a",
        children: "use uuidv7 for primary keys"
      }), ") and only inserts are allowed (no updates or deletes)."]
    }), "\n", _jsx(_components.p, {
      children: "A table structured in this way can always be written to by separate nodes and merged back together without conflict since it is a grow only set. Use the example below to add rows to different grow-only tables and then merge them together."
    }), "\n", _jsx(GSetExample, {}), "\n", _jsx(_components.p, {
      children: "A grow only table is intereseting but you'll eventually want to do one or more of the following:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Modify a row"
      }), "\n", _jsx(_components.li, {
        children: "Run a reduce job over a set of rows to come up with a \"view\" of some object state"
      }), "\n", _jsx(_components.li, {
        children: "Delete a row"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "So how can we support all of this in a conflict-free way? Let's look at row modifications first."
    }), "\n", _jsx(_components.p, {
      children: "The simplest trick for merging rows is to \"take the last write.\" Two people wrote the same row? Take whomever's write is newer. This approach is pretty straightforward but, aside from losing writes, there are ways it can go wrong that are not always apparent."
    }), "\n", _jsx(_components.p, {
      children: "Looking into the ways it can be incorrectly implemented will help us understand why CRDTs have the properties they do and how to build a correct one."
    }), "\n", _jsxs(_components.h2, {
      id: "last-write---what-can-go-wrong",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#last-write---what-can-go-wrong",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Last Write - What Can Go Wrong?"]
    }), "\n", _jsx(_components.p, {
      children: "We'll take that \"last write wins\" is acceptable for the use case as a given. Now let's take some stabs at implementing a grow only table that supports last write replacements of rows."
    }), "\n", _jsx(_components.p, {
      children: "The first solution would be to timestamp rows with the current system time of the node that did the write. Remember we need nodes to be able to work without internet connectivitiy so we only have access to that node's local clock."
    }), "\n", _jsx(_components.p, {
      children: "From simplest to most complex, the four common mistakes in a last write wins setup are:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Forgetting to update the loser's timestamp"
      }), "\n", _jsx(_components.li, {
        children: "Having the wrong tie breaker for concurrent edits"
      }), "\n", _jsx(_components.li, {
        children: "\"Clock Pushing\" when one node proxies another"
      }), "\n", _jsx(_components.li, {
        children: "Trusting system time!"
      }), "\n"]
    }), "\n", _jsxs(_components.h3, {
      id: "error-1-forgetting-to-update-the-losers-timestamp",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#error-1-forgetting-to-update-the-losers-timestamp",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Error 1: Forgetting to Update the Loser's Timestamp"]
    }), "\n", _jsx(_components.p, {
      children: "When a node merges with another node and they both changed the same row, we'll take the row with the highest clock value. This can go wrong if we forget to update the timestamp of the row along with all the other values in that row. I.e., if we don't fully replace the losing node's row with the winning node's row."
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Node A:"
      })
    }), "\n", _jsxs(_components.table, {
      children: [_jsx(_components.thead, {
        children: _jsxs(_components.tr, {
          children: [_jsx(_components.th, {
            children: "id"
          }), _jsx(_components.th, {
            children: "content"
          }), _jsx(_components.th, {
            children: "time"
          })]
        })
      }), _jsx(_components.tbody, {
        children: _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "x"
          }), _jsx(_components.td, {
            children: "this"
          }), _jsx(_components.td, {
            children: "13:01:01"
          })]
        })
      })]
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Node B:"
      })
    }), "\n", _jsxs(_components.table, {
      children: [_jsx(_components.thead, {
        children: _jsxs(_components.tr, {
          children: [_jsx(_components.th, {
            children: "id"
          }), _jsx(_components.th, {
            children: "content"
          }), _jsx(_components.th, {
            children: "time"
          })]
        })
      }), _jsx(_components.tbody, {
        children: _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "x"
          }), _jsx(_components.td, {
            children: "that"
          }), _jsx(_components.td, {
            children: "12:00:00"
          })]
        })
      })]
    }), "\n", _jsx(_components.p, {
      children: "A<->B merge and say B does not update the time for it's row to match the max between A's row time and B's row time."
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Node B, after incorrect merge:"
      })
    }), "\n", _jsxs(_components.table, {
      children: [_jsx(_components.thead, {
        children: _jsxs(_components.tr, {
          children: [_jsx(_components.th, {
            children: "id"
          }), _jsx(_components.th, {
            children: "content"
          }), _jsx(_components.th, {
            children: "time"
          })]
        })
      }), _jsx(_components.tbody, {
        children: _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "x"
          }), _jsx(_components.td, {
            children: _jsx(_components.strong, {
              children: "this"
            })
          }), _jsx(_components.td, {
            children: _jsx("span", {
              style: {
                color: "red"
              },
              children: "12:00:00"
            })
          })]
        })
      })]
    }), "\n", _jsx(_components.p, {
      children: "Now if Node C comes along with a modificaiton to the same row, but at time 12:30, it'll overwrite the current value. This, however, isn't the last write since A's write was later. We now have an inconsistent state."
    }), "\n", _jsx(_components.p, {
      children: "This is a trivial bug but covering it will help to understand logical clocks. To reiterate, the correct solution is to take the whole row including timestamp."
    }), "\n", _jsxs(_components.h3, {
      id: "error-2-forgetting--inconsistent-tie-breaking",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#error-2-forgetting--inconsistent-tie-breaking",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Error 2: Forgetting & Inconsistent Tie Breaking"]
    }), "\n", _jsx(_components.p, {
      children: "This error is about not having a correct tie breaker for concurrent edits. It is possible that two processes provide the exact same time for an update. If you do not handle this case in a specific way you will end up with divergent state between processes."
    }), "\n", _jsx(_components.p, {
      children: "Maybe concurrent edits are unlikely in your case but:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "You should never rule them out and"
      }), "\n", _jsx(_components.li, {
        children: "We need to cover it since the 4th error, and solving the 4th error, will make this one more likely."
      }), "\n"]
    }), "\n", _jsx(TieBreakExample, {}), "\n", _jsx(_components.p, {
      children: "The two common ways of getting the tie breaker wrong when there are concurrent edits are:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Forgetting about tie breaking entirely"
      }), "\n", _jsx(_components.li, {
        children: "Always taking a peer's value on concurrent edit"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "I.e.,"
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Forgetting (Always Rejecting)"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-javascript",
        children: [_jsx(_components.span, {
          className: "hljs-comment",
          children: "// we forgot the `peer_time == my_time` case!"
        }), "\n", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// We are always rejecting the peer_value on concurrent writes."
        }), "\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "if"
        }), " (peer_time > my_time) {\n  my_value = peer_value;\n}\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "and"
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Always Taking"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-javascript",
        children: [_jsx(_components.span, {
          className: "hljs-comment",
          children: "// Better but also unsafe. Always taking the peer_value on concurrent writes."
        }), "\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "if"
        }), " (peer_time >= my_time) {\n  my_value = peer_value;\n}\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "To solve this there are two options:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Choose the greatest value when there are concurrent edits"
      }), "\n", _jsx(_components.li, {
        children: "Choose the value from the node with the largest node name"
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["Going with option (1), all nodes will choose ", _jsx(_components.code, {
        children: "z"
      }), " as the winner (", _jsx(_components.code, {
        children: "z > b > a"
      }), ")."]
    }), "\n", _jsxs(_components.p, {
      children: ["Going with option (2), all nodes will choose ", _jsx(_components.code, {
        children: "a"
      }), " as the winner (", _jsx(_components.code, {
        children: "node name C > node name B > node name A"
      }), ")."]
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsx(_components.p, {
        children: "You can test each strategy by trying out the example above -"
      }), "\n", _jsxs(_components.ol, {
        children: ["\n", _jsx(_components.li, {
          children: "Choose a tie breaker"
        }), "\n", _jsx(_components.li, {
          children: "Merge every node's state into every other node's"
        }), "\n", _jsx(_components.li, {
          children: "No matter what order you merge things, the end result will be convergence except in the always reject and always take cases. Always reject will never converge. Always take will converge or not converge depending on the order in which peers merge."
        }), "\n"]
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "Always take is somewhat subtle. To make it fail to converge in the example:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsxs(_components.li, {
        children: ["Merge ", _jsx(_components.strong, {
          children: "C"
        }), " into ", _jsx(_components.strong, {
          children: "A"
        })]
      }), "\n", _jsxs(_components.li, {
        children: ["Merge ", _jsx(_components.strong, {
          children: "B"
        }), " into ", _jsx(_components.strong, {
          children: "A"
        })]
      }), "\n", _jsxs(_components.li, {
        children: ["Merge ", _jsx(_components.strong, {
          children: "A"
        }), " into ", _jsx(_components.strong, {
          children: "B"
        })]
      }), "\n", _jsxs(_components.li, {
        children: ["Merge ", _jsx(_components.strong, {
          children: "C"
        }), " into ", _jsx(_components.strong, {
          children: "B"
        })]
      }), "\n", _jsx(_components.li, {
        children: "Your last two choices don't matter. You're already inconsistent."
      }), "\n"]
    }), "\n", _jsxs(_components.h3, {
      id: "error-3-clock-pushing-when-proxying-changes",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#error-3-clock-pushing-when-proxying-changes",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Error 3: Clock Pushing when Proxying Changes"]
    }), "\n", _jsx(_components.p, {
      children: "This isn't strictly related to last write wins but will come up when you want to start syncing partial updates from a source to a destination. As in, sync all changes that haven't already been synced."
    }), "\n", _jsx(_components.p, {
      children: "To do this, you'll need a way to figure out all changes a node has that you do not have. The simple way is to record the max timestamp from a node that you have merged with. Next time you merge, you ask for all rows after that timestamp."
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.img, {
        src: "/blog/gentle-intro-to-crdts/record-max.png",
        alt: "record-max"
      })
    }), "\n", _jsx(_components.p, {
      children: "This, however, can break when nodes acts as proxies for other nodes in the network."
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.img, {
        src: "/blog/gentle-intro-to-crdts/proxy-push.png",
        alt: "proxy-push"
      })
    }), "\n", _jsx(_components.p, {
      children: "Imagine this case:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: ["Node A has all changes from node B up and until ", _jsx(_components.code, {
          children: "12:00:00"
        }), ","]
      }), "\n", _jsxs(_components.li, {
        children: ["Node B receives changes from node C which includes rows created prior to ", _jsx(_components.code, {
          children: "12:00:00"
        }), " since B hasn't synced with C in some time."]
      }), "\n", _jsxs(_components.li, {
        children: ["Node A now wants all changes from B again but asks for changes ", _jsx(_components.em, {
          children: "after"
        }), " ", _jsx(_components.code, {
          children: "12:00:00"
        }), " since it thinks it already has all changes up to that time."]
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["If A will eventually talk to C on its own, this may not be a problem. If B is going to proxy changes from C and forward them to A, this will be a problem. A will not ask for the old rows B received from C since A believes it is up to date with B up to ", _jsx(_components.code, {
        children: "12:00:00"
      }), "."]
    }), "\n", _jsx(_components.p, {
      children: "So what can we do?"
    }), "\n", _jsxs(_components.p, {
      children: ["An incorrect solution is to \"clock push\" -- to record the timestamp for the row as being ", _jsx(_components.code, {
        children: "max(current_time, row_time)"
      }), ". This makes old writes look new and starts breaking merges down the line."]
    }), "\n", _jsx(_components.p, {
      children: "A correct solution is to retain two timestamps for a row:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: ["The time the row was written (created or updated) by whomever wrote it. We'll call this ", _jsx(_components.code, {
          children: "row_time"
        })]
      }), "\n", _jsxs(_components.li, {
        children: ["The local time of the process upon reception of or local modification of the row. We'll call this ", _jsx(_components.code, {
          children: "local_row_time"
        })]
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["The latter timestamp can be used to track ", _jsx(_components.code, {
        children: "changes_since"
      }), " and is always set to current time whenever a row is inserted or updated on a node -- either via local update or sync. The former timestamp is used for merging."]
    }), "\n", _jsxs(_components.table, {
      children: [_jsx(_components.thead, {
        children: _jsxs(_components.tr, {
          children: [_jsx(_components.th, {
            children: "id"
          }), _jsx(_components.th, {
            children: "content"
          }), _jsx(_components.th, {
            children: "row_time"
          }), _jsx(_components.th, {
            children: "local_row_time"
          })]
        })
      }), _jsxs(_components.tbody, {
        children: [_jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "x"
          }), _jsx(_components.td, {
            children: "foo"
          }), _jsx(_components.td, {
            children: "13:00:00"
          }), _jsx(_components.td, {
            children: "14:00:00"
          })]
        }), _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "y"
          }), _jsx(_components.td, {
            children: "bar"
          }), _jsx(_components.td, {
            children: "12:00:00"
          }), _jsx(_components.td, {
            children: "14:30:00"
          })]
        }), _jsxs(_components.tr, {
          children: [_jsx(_components.td, {
            children: "z"
          }), _jsx(_components.td, {
            children: "baz"
          }), _jsx(_components.td, {
            children: "13:04:01"
          }), _jsx(_components.td, {
            children: "13:20:32"
          })]
        })]
      })]
    }), "\n", _jsx(_components.p, {
      children: "In our proxy example:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsxs(_components.li, {
        children: ["When B receives new rows from C, it tags all those rows' ", _jsx(_components.code, {
          children: "local_row_time"
        }), " column with current time."]
      }), "\n", _jsxs(_components.li, {
        children: ["When A wants changes from B, it tracks ", _jsx(_components.code, {
          children: "changes_since"
        }), " by recording the largest ", _jsx(_components.code, {
          children: "local_row_time"
        }), " it has seen from B"]
      }), "\n", _jsxs(_components.li, {
        children: ["Merging is done via ", _jsx(_components.code, {
          children: "row_time"
        }), " so last write semantics are still corretly respected."]
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "You can play with the idea below. Note that each node's local time is just a simple integer counter in this case. Works just as well as (actually better than) system time for our purposes and is a gentle introduction to the next error."
    }), "\n", _jsx(ChangesSinceExample, {}), "\n", _jsxs(_components.h3, {
      id: "error-4-trusting-system-time",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#error-4-trusting-system-time",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Error 4: Trusting System Time"]
    }), "\n", _jsx(_components.p, {
      children: "You can't trust system time. Even more so in a distributed setting. Multiply that distrust in a distributed setting where internet is spotty. Forget about it in any setting where you do not control the devices."
    }), "\n", _jsx(_components.p, {
      children: "System time moves with its own rules and breaks many assumptions we have about it."
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsxs(_components.li, {
        children: ["An error ", _jsx(_components.a, {
          href: "https://www.eecis.udel.edu/~ntp/ntpfaq/NTP-s-sw-clocks.htm",
          children: "of just .001% in your system clock results in 1 second drift per day"
        }), ". If your clock is not often re-syncing its time, it will get off. Re-syncing can also cause your clock to move backwards if it was ahead."]
      }), "\n", _jsx(_components.li, {
        children: "Users can change their system time resulting in meaningless values and later events getting timestamped before earlier ones"
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "https://engineering.fb.com/2022/07/25/production-engineering/its-time-to-leave-the-leap-second-in-the-past/",
          children: "Introduction of leap seconds"
        }), " which can cause ", _jsx(_components.a, {
          href: "https://blog.cloudflare.com/how-and-why-the-leap-second-affected-cloudflare-dns/",
          children: "time to run backwards within a single process"
        }), "."]
      }), "\n", _jsxs(_components.li, {
        children: ["Different cores on a machine can ", _jsx(_components.a, {
          href: "https://www.ibm.com/support/pages/clock-moves-backwards-big-old-168817-168816-example",
          children: "have different values for the current system time"
        }), "."]
      }), "\n"]
    }), "\n", _jsxs(_components.h2, {
      id: "about-time",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#about-time",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "About Time"]
    }), "\n", _jsxs(_components.p, {
      children: ["So how do we handle time? CRDTs do not require a notion of time -- it isn't part of the strict mathematical definiton. ", _jsx(_components.a, {
        href: "https://braid.org",
        children: "Mike Toomim"
      }), " has a great quote about how CRDTs collapse time, they remove time from the equation."]
    }), "\n", _jsx(_components.p, {
      children: "Take a grow only set as an example. Time doesn't matter -- the state can always merge and merge at any point even without knowing about time."
    }), "\n", _jsx(_components.p, {
      children: "Even so, \"time\" is going to be an important factor in many CRDTs since -"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Users will want to know what happened before what"
      }), "\n", _jsx(_components.li, {
        children: "For something like last write wins, we want to know which writes happened before which"
      }), "\n", _jsx(_components.li, {
        children: "Time helps figure out deltas between state for efficient syncing"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "Given we shouldn't trust system time and can't trust it where we're going (distributed, possibly peer to peer, and unknown connectivity) we need to free our mind from the common conception of time."
    }), "\n", _jsxs(_components.p, {
      children: ["What we really care about is ", _jsx(_components.em, {
        children: "what events could have caused what other events"
      }), ". If two devices ", _jsx(_components.em, {
        children: "never communicate"
      }), " then what transpired on one could not have caused events to transpire on the other (ignoring backchannels). If the devices do communicate then you have a watermark at which to divide what events could have caused (and thus happened before) what other events."]
    }), "\n", _jsx(_components.p, {
      children: "Concretely, if I create a new document on my device but never send it to you then clearly you can't have made edits to that document. We don't need the system clock to tell us that. We can generalize this to everything about participants and events in a network in order to get a stable logical clock that allows us to partially order all events in the system."
    }), "\n", _jsx(_components.p, {
      children: "That is probably about as clear as mud so let's build a logical clock to understand this a bit better."
    }), "\n", _jsxs(_components.h2, {
      id: "basic-logical-clock",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#basic-logical-clock",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Basic Logical Clock"]
    }), "\n", _jsx(_components.p, {
      children: "The simplest logical clock implementation is simply to keep an integer in your process that you increment for every event. Each event gets timestamped with this counter."
    }), "\n", _jsxs(Callout, {
      type: "info",
      children: [_jsx(_components.p, {
        children: "Because I've had engineers worry about this in the past: a 64bit unsigned\ninteger can be incremented 1 million times a second for 6,000 centuries before\noverflowing."
      }), _jsx(_components.pre, {
        children: _jsxs(_components.code, {
          className: "hljs language-js",
          children: [_jsx(_components.span, {
            className: "hljs-number",
            children: "2"
          }), "^", _jsx(_components.span, {
            className: "hljs-number",
            children: "64"
          }), " / (", _jsx(_components.span, {
            className: "hljs-number",
            children: "10"
          }), "^", _jsx(_components.span, {
            className: "hljs-number",
            children: "6"
          }), " * ", _jsx(_components.span, {
            className: "hljs-number",
            children: "60"
          }), " * ", _jsx(_components.span, {
            className: "hljs-number",
            children: "60"
          }), " * ", _jsx(_components.span, {
            className: "hljs-number",
            children: "24"
          }), " * ", _jsx(_components.span, {
            className: "hljs-number",
            children: "365"
          }), " * ", _jsx(_components.span, {
            className: "hljs-number",
            children: "100"
          }), ") ~= ", _jsx(_components.span, {
            className: "hljs-number",
            children: "5"
          }), ",", _jsx(_components.span, {
            className: "hljs-number",
            children: "849"
          }), "\n"]
        })
      }), _jsxs(_components.p, {
        children: [_jsx(Overflowit, {}), " (I'll wait...)"]
      })]
    }), "\n", _jsxs(_components.p, {
      children: ["To totally order events within your process, order by that timestamp. To scale this up to many cores, use an atomic integer that you can ", _jsx(_components.a, {
        href: "https://en.wikipedia.org/wiki/Compare-and-swap",
        children: "compare-and-swap"
      }), "."]
    }), "\n", _jsx(_components.p, {
      children: "But how can we keep time across many devices? And without coordinating? Or if we're perf sensitive and don't want any contention between cores via a shared atomic int?"
    }), "\n", _jsxs(_components.h2, {
      id: "logical-clocks-distributed",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#logical-clocks-distributed",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Logical Clocks, Distributed"]
    }), "\n", _jsxs(_components.p, {
      children: ["A distributed logical clock builds upon the basic logical clock. Every node keeps their own independent counter that they increment on their own. The one key change is that whenever two nodes exchange information they also exchange clock values. Each node then sets their internal clock to ", _jsx(_components.code, {
        children: "max(peer_clock, my_clock) + 1"
      }), "."]
    }), "\n", _jsx(_components.p, {
      children: "This change lays the foundation for being able to determine what happened before what across many loosely connected peers in a network."
    }), "\n", _jsxs(_components.h2, {
      id: "happens-before-explained",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#happens-before-explained",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Happens-before, Explained"]
    }), "\n", _jsx(_components.p, {
      children: "This solves the issue of not having a clock in our control. We control the counter since it is internal to whatever software we're deploying. We also know the counter will never run backwards. A surprising thing we now know is that if an event we receive from a peer has a greater clock value than our clock, it must have been a concurrent or later write. It could not be a write that happened before our writes."
    }), "\n", _jsx(_components.p, {
      children: "That last sentence is probably a head scratcher. Surely a lower logical time on node A could have happened after a larger logical time on node B. In terms of wall time this is true. In terms of causality, it is not. A lower time event on node A could not have been caused by a higher time event on node B. For that to have happened, node A's clock would have to be greater than node B's given we bump local logical clocks forward when nodes communicate."
    }), "\n", _jsx(_components.p, {
      children: "Alas, clocks deserve their own separate discussion. There are limitations with the described clock and there are better logical clocks with more guarantees to consider and compare against."
    }), "\n", _jsxs(_components.p, {
      children: ["Suffice it to say: time, when considered as \"what caused what\", is best thought of as a ", _jsx(_components.a, {
        href: "https://en.wikipedia.org/wiki/Directed_acyclic_graph",
        children: "DAG"
      }), "."]
    }), "\n", _jsx(_components.p, {
      children: "We'll explore this in-depth and implement \"event sourced CRDTs\" and sequence/text CRDTs atop it. We'll also dive deeper into supporting deletes, sorting, counters, updates of individual columns in a row and more."
    }), "\n", _jsx(_components.p, {
      children: "Eventually we'll get into the theory and abstract definition of a CRDT."
    }), "\n", _jsxs(_components.h2, {
      id: "wrapping-up",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#wrapping-up",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Wrapping Up"]
    }), "\n", _jsxs(_components.p, {
      children: ["This was originally written for ", _jsx(_components.a, {
        href: "https://vlcn.io/",
        children: "vlcn.io"
      }), ", the company I built around CRDTs and ", _jsx(_components.code, {
        children: "cr-sqlite"
      }), ". The idea was to bring CRDTs to a relational database with a declarative API:"]
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "CREATE"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "TABLE"
        }), " foo (id ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "primary"
        }), " key ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NOT"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "NULL"
        }), ", bar, baz);\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "SELECT"
        }), " crsql_as_crr(", _jsx(_components.span, {
          className: "hljs-string",
          children: "'foo'"
        }), "); ", _jsx(_components.span, {
          className: "hljs-comment",
          children: "-- (crr means conflict free replicated relation)"
        }), "\n"]
      })
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
