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
    h2: "h2",
    p: "p",
    ul: "ul",
    pre: "pre",
    code: "code",
    em: "em",
    blockquote: "blockquote",
    h3: "h3"
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
            href: "#differential-dataflow-for-mere-mortals",
            children: "Differential Dataflow For Mere Mortals"
          }), _jsxs(_components.ol, {
            className: "toc-level toc-level-2",
            children: [_jsx(_components.li, {
              className: "toc-item toc-item-h2",
              children: _jsx(_components.a, {
                className: "toc-link toc-link-h2",
                href: "#differental-dataflow",
                children: "Differental Dataflow"
              })
            }), _jsx(_components.li, {
              className: "toc-item toc-item-h2",
              children: _jsx(_components.a, {
                className: "toc-link toc-link-h2",
                href: "#for-mere-mortals",
                children: "For Mere Mortals"
              })
            }), _jsx(_components.li, {
              className: "toc-item toc-item-h2",
              children: _jsx(_components.a, {
                className: "toc-link toc-link-h2",
                href: "#the-z-set",
                children: "The Z-Set"
              })
            })]
          })]
        })
      })
    }), _jsxs(_components.h1, {
      id: "differential-dataflow-for-mere-mortals",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#differential-dataflow-for-mere-mortals",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Differential Dataflow For Mere Mortals"]
    }), "\n", _jsxs(_components.h2, {
      id: "differental-dataflow",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#differental-dataflow",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Differental Dataflow"]
    }), "\n", _jsx(_components.p, {
      children: "Differential Dataflow is a technique for incrementally maintaining views and query results."
    }), "\n", _jsx(_components.p, {
      children: "Consider a music application. A music app may normalize its data and store it across a number of tables."
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Track table"
      }), "\n", _jsx(_components.li, {
        children: "Playlist table"
      }), "\n", _jsx(_components.li, {
        children: "Artist table"
      }), "\n", _jsx(_components.li, {
        children: "Album table"
      }), "\n", _jsx(_components.li, {
        children: "Playlist_Track junction table"
      }), "\n", _jsx(_components.li, {
        children: "Track_Artist junction table"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "When viewing a playlist we'll need to join all of these tables together to get the whole picture."
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "SELECT"
        }), "\n  playlist.track_num,\n  track.name,\n  track.duration,\n  group_array(artist.name),\n  album.name,\n  album.art_handle\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "FROM"
        }), " playlist\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "JOIN"
        }), " playlist_track ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " playlist_track.playlist_id ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " playlist.id,\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "JOIN"
        }), " track ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " track ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " playlist_track.track_id\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "JOIN"
        }), " album ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " album ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " track.album_id\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "JOIN"
        }), " track_artist ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " track_artist.track_id ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " track.id\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "JOIN"
        }), " artist ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "ON"
        }), " artist.id ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " track_artist.artist_id\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "WHERE"
        }), " playlist.id ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " ", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), "\n"]
      })
    }), "\n", _jsxs(_components.p, {
      children: ["That's a very expensive operation for what will be a common query in a music application. Ideally we could de-normalize this data into a single table and query ", _jsx(_components.em, {
        children: "that"
      }), " instead."]
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-sql",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "SELECT"
        }), " track_num, name, duration, artist_names, album_name, art_handle ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "FROM"
        }), " playlist_denormalized ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "WHERE"
        }), " id ", _jsx(_components.span, {
          className: "hljs-operator",
          children: "="
        }), " ", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), ";\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "There's a problem with de-normalizing, however. After de-normalizing there will be multiple copies of the same data to keep in sync.\nThis problem can be made more tractable by forcing all de-normalized forms of the data to be read-only. Doing this means that the normalized form\nbecomes the single source of truth for the data."
    }), "\n", _jsx(_components.p, {
      children: "The problem created by this solution, however, is that the de-normalized forms must somehow be updated whenever a write occurs to one of it's input tables."
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsx(_components.p, {
        children: "How can we efficiently update the de-normalized form when a write happens to one of its input tables?"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "This is the problem of incremental view maintenance and differential dataflow is one solution to this problem."
    }), "\n", _jsxs(_components.h2, {
      id: "for-mere-mortals",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#for-mere-mortals",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "For Mere Mortals"]
    }), "\n", _jsx(_components.p, {
      children: "Knowing the problem and a solution to that problem, can the solution be made accessible to average developers?"
    }), "\n", _jsx(_components.p, {
      children: "There is no lack of literature on differential dataflow:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "https://timelydataflow.github.io/differential-dataflow/introduction.html",
          children: "https://timelydataflow.github.io/differential-dataflow/introduction.html"
        })
      }), "\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "https://materialize.com/blog/differential-from-scratch/",
          children: "https://materialize.com/blog/differential-from-scratch/"
        })
      }), "\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "https://arxiv.org/abs/2203.16684",
          children: "https://arxiv.org/abs/2203.16684"
        })
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "But it is rather inaccessible, even though differential dataflow it based on some simple ideas."
    }), "\n", _jsx(_components.p, {
      children: "Those ideas are:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "The Z-Set"
      }), "\n", _jsx(_components.li, {
        children: "Linear and non-linear operations"
      }), "\n", _jsx(_components.li, {
        children: "Operator Graph"
      }), "\n", _jsx(_components.li, {
        children: "Operator Memory"
      }), "\n"]
    }), "\n", _jsxs(_components.h2, {
      id: "the-z-set",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#the-z-set",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "The Z-Set"]
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsxs(_components.p, {
        children: ["A ", _jsx(_components.code, {
          children: "Z-Set"
        }), " is the same thing as a set except that each element contains a magnitude indicating the number of times that element should be present. In addition, duplicate elements (same value and magnitude) are allowed as well as negative magnitudes."]
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: "Before getting into how this is helpful for incremental view maintenance, it'll be useful to understand this definition a bit more."
    }), "\n", _jsx(_components.p, {
      children: "Capturing the english definition as a type definition:"
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-ts",
        children: [_jsx(_components.span, {
          className: "hljs-comment",
          children: "// A ZSet is an array of tuples. The first element of the tuple"
        }), "\n", _jsx(_components.span, {
          className: "hljs-comment",
          children: "// can be anything. The second element is an integer representing its weight."
        }), "\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "type"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "ZSet"
        }), " = ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Vec"
        }), "<(", _jsx(_components.span, {
          className: "hljs-built_in",
          children: "any"
        }), ", int)>;\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "Some example z-sets that fit the definition follow."
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "A set where each element is present exactly once"
      }), "\n"]
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-python",
        children: ["a = [(A, ", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), "), (B, ", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), "), (C, ", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), ")]\n"]
      })
    }), "\n", _jsxs(_components.ol, {
      start: "2",
      children: ["\n", _jsx(_components.li, {
        children: "Another set where each element is present once. This set is equal to the first."
      }), "\n"]
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-python",
        children: ["a = [(A, ", _jsx(_components.span, {
          className: "hljs-number",
          children: "2"
        }), "), (A, -", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), "), (B, ", _jsx(_components.span, {
          className: "hljs-number",
          children: "2"
        }), "), (B, -", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), "), (C, ", _jsx(_components.span, {
          className: "hljs-number",
          children: "2"
        }), "), (C, -", _jsx(_components.span, {
          className: "hljs-number",
          children: "1"
        }), ")]\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "Normalizing or consolidating a z-set allows comparing z-sets and is a matter of summing the weights of identical elements and removing those with a weight of 0."
    }), "\n", _jsx(_components.p, {
      children: "In the examples, (2) becomes (1) after summing weights."
    }), "\n", _jsxs(_components.h3, {
      id: "application-to-incremental-view-maintenance",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#application-to-incremental-view-maintenance",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Application to Incremental View maintenance"]
    }), "\n", _jsxs(_components.p, {
      children: ["A ", _jsx(_components.code, {
        children: "Z-Set"
      }), " is useful for incremental view maintenance since its weights allow tracking how a set is changing over time."]
    }), "\n", _jsxs(_components.p, {
      children: ["Given a stream of updates to a ", _jsx(_components.code, {
        children: "Z-Set"
      }), ", the weights tell:"]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "If an item was added (positive weight)"
      }), "\n", _jsx(_components.li, {
        children: "If an item was removed (negative weight)"
      }), "\n", _jsx(_components.li, {
        children: "How many times the item was added or removed (sum of and magnitude of weight for that item)"
      }), "\n"]
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsx(_components.p, {
        children: _jsx(_components.em, {
          children: "This post was left unfinished on the original site."
        })
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
