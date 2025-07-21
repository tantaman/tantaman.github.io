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
    pre: "pre",
    code: "code",
    span: "span",
    h1: "h1",
    em: "em",
    blockquote: "blockquote"
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
            href: "#updates",
            children: "Updates"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h1",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h1",
            href: "#what-do",
            children: "What Do?"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h1",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h1",
            href: "#integrating-it",
            children: "Integrating It"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h1",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h1",
            href: "#framework",
            children: "Framework"
          })
        })]
      })
    }), "\n", _jsxs(_components.p, {
      children: ["Something irks me about React. It's how ", _jsx(_components.a, {
        href: "https://youtu.be/AdNJ3fydeao",
        children: "inefficiently it handles deeply nested updates"
      }), "."]
    }), "\n", _jsx(_components.p, {
      children: "React apps, like any app, will have a display hierarchy of deeply nested components. The root component being the entrypoint of the app, the leaves being the individual buttons, table rows and text rendered by the app."
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Example"
      })
    }), "\n", _jsxs(_components.p, {
      children: ["Let's take a presentation editor (e.g., powerpoint / keynote or ", _jsx(_components.a, {
        href: "https://strut.io",
        children: "strut.io"
      }), ") as an example."]
    }), "\n", _jsx(_components.p, {
      children: "The component hierarchy might look something like:"
    }), "\n", _jsx(Figure, {
      url: "/blog-assets/deeply-nested-updates/deeply-nested.png",
      description: "App Components"
    }), "\n", _jsx(_components.p, {
      children: "Which, in code, looks like:"
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-tsx",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "function"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "App"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "{ appState }"
        }), ") {\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " (\n    ", _jsxs(_components.span, {
          className: "xml",
          children: [_jsxs(_components.span, {
            className: "hljs-tag",
            children: ["<", _jsx(_components.span, {
              className: "hljs-name",
              children: "Editor"
            }), ">"]
          }), "\n      ", _jsxs(_components.span, {
            className: "hljs-tag",
            children: ["<", _jsx(_components.span, {
              className: "hljs-name",
              children: "Header"
            }), ">"]
          }), "\n        ", _jsxs(_components.span, {
            className: "hljs-tag",
            children: ["<", _jsx(_components.span, {
              className: "hljs-name",
              children: "StylingButtons"
            }), " ", _jsx(_components.span, {
              className: "hljs-attr",
              children: "authoringState"
            }), "=", _jsx(_components.span, {
              className: "hljs-string",
              children: "{appState.authoringState}"
            }), " />"]
          }), "\n      ", _jsxs(_components.span, {
            className: "hljs-tag",
            children: ["</", _jsx(_components.span, {
              className: "hljs-name",
              children: "Header"
            }), ">"]
          }), "\n      ", _jsxs(_components.span, {
            className: "hljs-tag",
            children: ["<", _jsx(_components.span, {
              className: "hljs-name",
              children: "SlideWell"
            }), " ", _jsx(_components.span, {
              className: "hljs-attr",
              children: "deck"
            }), "=", _jsx(_components.span, {
              className: "hljs-string",
              children: "{appState.deck}"
            }), " />"]
          }), "\n      ", _jsxs(_components.span, {
            className: "hljs-tag",
            children: ["<", _jsx(_components.span, {
              className: "hljs-name",
              children: "SlideEditor"
            }), "\n        ", _jsx(_components.span, {
              className: "hljs-attr",
              children: "slide"
            }), "=", _jsx(_components.span, {
              className: "hljs-string",
              children: "{appState.deck.currentlySelectedSlide}"
            }), "\n        ", _jsx(_components.span, {
              className: "hljs-attr",
              children: "authoringState"
            }), "=", _jsx(_components.span, {
              className: "hljs-string",
              children: "{appState.authoringState}"
            }), "\n      />"]
          }), "\n    ", _jsxs(_components.span, {
            className: "hljs-tag",
            children: ["</", _jsx(_components.span, {
              className: "hljs-name",
              children: "Editor"
            }), ">"]
          })]
        }), "\n  );\n}\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "function"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "StylingButtons"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "{ authoringState }"
        }), ") {\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " (\n    ", _jsxs(_components.span, {
          className: "xml",
          children: [_jsxs(_components.span, {
            className: "hljs-tag",
            children: ["<", _jsx(_components.span, {
              className: "hljs-name",
              children: "div"
            }), ">"]
          }), "\n      ", _jsxs(_components.span, {
            className: "hljs-tag",
            children: ["<", _jsx(_components.span, {
              className: "hljs-name",
              children: "ParagraphStyle"
            }), " ", _jsx(_components.span, {
              className: "hljs-attr",
              children: "blockState"
            }), "=", _jsx(_components.span, {
              className: "hljs-string",
              children: "{authoringState.blockState}"
            }), " />"]
          }), "\n      ", _jsxs(_components.span, {
            className: "hljs-tag",
            children: ["<", _jsx(_components.span, {
              className: "hljs-name",
              children: "InlineStyle"
            }), " ", _jsx(_components.span, {
              className: "hljs-attr",
              children: "authoringState"
            }), "=", _jsx(_components.span, {
              className: "hljs-string",
              children: "{authoringState}"
            }), " />"]
          }), "\n    ", _jsxs(_components.span, {
            className: "hljs-tag",
            children: ["</", _jsx(_components.span, {
              className: "hljs-name",
              children: "div"
            }), ">"]
          })]
        }), "\n  );\n}\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "function"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "ParagraphStyle"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "{ blockState }"
        }), ") {\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " (\n    ", _jsxs(_components.span, {
          className: "xml",
          children: [_jsxs(_components.span, {
            className: "hljs-tag",
            children: ["<", _jsx(_components.span, {
              className: "hljs-name",
              children: "ButtonGroup"
            }), ">"]
          }), "\n      {blockTypes.map((type) => (\n        ", _jsxs(_components.span, {
            className: "hljs-tag",
            children: ["<", _jsx(_components.span, {
              className: "hljs-name",
              children: "BlockOption"
            }), "\n          ", _jsx(_components.span, {
              className: "hljs-attr",
              children: "type"
            }), "=", _jsx(_components.span, {
              className: "hljs-string",
              children: "{type}"
            }), "\n          ", _jsx(_components.span, {
              className: "hljs-attr",
              children: "selected"
            }), "=", _jsx(_components.span, {
              className: "hljs-string",
              children: "{blockState.isSelected(type)}"
            }), "\n          ", _jsx(_components.span, {
              className: "hljs-attr",
              children: "onClick"
            }), "=", _jsx(_components.span, {
              className: "hljs-string",
              children: "{()"
            }), " =>"]
          }), " blockState.apply(type)}\n        />\n      ))}\n    ", _jsxs(_components.span, {
            className: "hljs-tag",
            children: ["</", _jsx(_components.span, {
              className: "hljs-name",
              children: "ButtonGroup"
            }), ">"]
          })]
        }), "\n  );\n}\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "function"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "SlideEditor"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "{ authoringState }"
        }), ") {\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " (\n    ", _jsxs(_components.span, {
          className: "xml",
          children: [_jsxs(_components.span, {
            className: "hljs-tag",
            children: ["<", _jsx(_components.span, {
              className: "hljs-name",
              children: "div"
            }), ">"]
          }), "\n      ...\n      ", _jsxs(_components.span, {
            className: "hljs-tag",
            children: ["<", _jsx(_components.span, {
              className: "hljs-name",
              children: "MarkdownEditor"
            }), "\n        ", _jsx(_components.span, {
              className: "hljs-attr",
              children: "blockState"
            }), "=", _jsx(_components.span, {
              className: "hljs-string",
              children: "{authoringState.blockState}"
            }), "\n        ", _jsx(_components.span, {
              className: "hljs-attr",
              children: "inlineState"
            }), "=", _jsx(_components.span, {
              className: "hljs-string",
              children: "{authoringState.inlineState}"
            }), "\n      />"]
          }), "\n      ...\n    ", _jsxs(_components.span, {
            className: "hljs-tag",
            children: ["</", _jsx(_components.span, {
              className: "hljs-name",
              children: "div"
            }), ">"]
          })]
        }), "\n  );\n}\n"]
      })
    }), "\n", _jsx(_components.p, {
      children: "The corresponding application state structure thus looks like:"
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-markdown",
        children: ["appState {\n  authoringState {\n", _jsx(_components.span, {
          className: "hljs-code",
          children: "    blockState\n    inlineState\n  }\n  deck {\n    currentlySelectedSlide\n  }\n}\n"
        })]
      })
    }), "\n", _jsx("br", {}), "\n", _jsxs(_components.h1, {
      id: "updates",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#updates",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Updates"]
    }), "\n", _jsx(_components.p, {
      children: "All is well and good until we want to update our application's state."
    }), "\n", _jsxs(_components.p, {
      children: ["If ", _jsx(_components.code, {
        children: "appState"
      }), " is immutable, an update to a deeply nested property like ", _jsx(_components.code, {
        children: "blockState"
      }), " will cause a re-render cycle across our entire app."]
    }), "\n", _jsxs(_components.p, {
      children: [_jsx(_components.code, {
        children: "App"
      }), " will get re-render due to it receiving a new ", _jsx(_components.code, {
        children: "appState"
      }), " reference. The ", _jsx(_components.code, {
        children: "App"
      }), " render method will visit ", _jsx(_components.code, {
        children: "Header"
      }), " which re-renders. ", _jsx(_components.code, {
        children: "Header"
      }), " re-renders since its child ", _jsx(_components.code, {
        children: "StylingButtons"
      }), " re-renders. ", _jsx(_components.code, {
        children: "StylingButtons"
      }), " re-renders since its child ", _jsx(_components.code, {
        children: "ParagraphStyle"
      }), " re-renders. ", _jsx(_components.code, {
        children: "ParagraphStyle"
      }), " re-renders since its children ", _jsx(_components.code, {
        children: "BlockOptions"
      }), " actually change. Similar pattern goes for ", _jsx(_components.code, {
        children: "SlideEditor"
      }), " and ", _jsx(_components.code, {
        children: "MarkdownEditor"
      }), "."]
    }), "\n", _jsxs(_components.p, {
      children: ["We only wanted to re-render the leaves -- ", _jsx(_components.code, {
        children: "BlockOptions"
      }), " and ", _jsx(_components.code, {
        children: "MarkdownEditor"
      }), " but we ended up re-rendering the entire component graph."]
    }), "\n", _jsx(Figure, {
      url: "/blog-assets/deeply-nested-updates/deeply-nested-re-render.png",
      description: "Everything in <font color='red'>red</font> re-renders, but we only needed to re-render the stuff in <font color='blue'>blue</font>"
    }), "\n", _jsxs(_components.h1, {
      id: "what-do",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#what-do",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "What Do?"]
    }), "\n", _jsxs(_components.p, {
      children: ["We need a different model for ", _jsx(_components.code, {
        children: "React"
      }), " components to subscribe to application state and for those state updates to propagate through the app, without sacraficing the pros of the ", _jsx(_components.a, {
        href: "https://reactjs.org/docs/thinking-in-react.html",
        children: "unidirectional data flow of react"
      }), "."]
    }), "\n", _jsxs(_components.p, {
      children: ["To do this we need to distinguish between ", _jsx(_components.em, {
        children: "nominal"
      }), " and ", _jsx(_components.em, {
        children: "physical"
      }), " identity in software."]
    }), "\n", _jsxs(_components.p, {
      children: [_jsx(_components.strong, {
        children: "Nominal"
      }), " identity is like a proper name. Proper names hold over time, no matter how the ", _jsx(_components.strong, {
        children: "physical"
      }), " characteristics of the named thing changes."]
    }), "\n", _jsxs(_components.p, {
      children: [_jsx(_components.strong, {
        children: "E.g.,"
      }), " We always recognize that the ", _jsx(_components.strong, {
        children: "Nile"
      }), " refers to the ", _jsx(_components.strong, {
        children: "Nile"
      }), " river, even though at every instant the physical makeup of the ", _jsx(_components.strong, {
        children: "Nile"
      }), " is changing. This is the case because nominal identities get their meaning from causal links over time rather than physical composition at snapshots in time. See ", _jsx(_components.a, {
        href: "2021-12-17-Object-Identity",
        children: "Understanding Reference Equality"
      }), " for more discussion."]
    }), "\n", _jsxs(_components.p, {
      children: ["For our specific use case, adding and removing slides from a slide deck does not change the nominal identity of the deck. It's still the same deck, just with a longer causal chain of events attached to it. More concretely, if I make a presentation on Apes called ", _jsx(_components.em, {
        children: "\"Matt's Ape Presentation\""
      }), " and remove a slide or fix up spelling mistakes, it is still ", _jsx(_components.em, {
        children: "\"Matt's Ape Presentation.\""
      })]
    }), "\n", _jsx(_components.p, {
      children: "It might sound like I'm suggesting a regression back to mutable data structures and all the complications that that entails. In some ways yes, in other ways no. I think we can have the best of both worlds:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsx(_components.li, {
        children: "Nominal identities rooted in causal links and refer to things that change over time"
      }), "\n", _jsx(_components.li, {
        children: "Physical identities that refer to immutable snapshots in time."
      }), "\n"]
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsxs(_components.p, {
        children: ["The current state software engineering is in is a false dichotomy between immutable & functional vs mutable & oo. I explore this more in ", _jsx(_components.a, {
          href: "2021-12-16-Missing-Mutation-Primitives",
          children: "Missing Mutation Primitives"
        }), " as well as ", _jsx(_components.a, {
          href: "2021-12-17-Object-Identity",
          children: "Understanding Reference Equality"
        }), "."]
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["If we introduce the concept of nominal identity into our example, certain references in our state tree would be nominal references. If something in ", _jsx(_components.code, {
        children: "AuthoringState"
      }), " changes, the nominal reference to ", _jsx(_components.code, {
        children: "AuthoringState"
      }), " from ", _jsx(_components.code, {
        children: "AppState"
      }), " would not change. If ", _jsx(_components.code, {
        children: "slides"
      }), " are added to a ", _jsx(_components.code, {
        children: "Deck"
      }), ", the nominal reference to ", _jsx(_components.code, {
        children: "Deck"
      }), " from ", _jsx(_components.code, {
        children: "AppState"
      }), " would not change."]
    }), "\n", _jsxs(_components.p, {
      children: ["Further, ", _jsx(_components.code, {
        children: "AppState"
      }), " would never change nominally. It would be constant for the lifetime of the user's session. ", _jsx(_components.code, {
        children: "AuthoringState"
      }), " would be nominally constant so long as the user does not load a new ", _jsx(_components.code, {
        children: "Deck"
      }), ". ", _jsx(_components.code, {
        children: "blockState"
      }), " would change nominally every time we reference a different block element within the slide. E.g., new paragraph, header, quote, etc. block."]
    }), "\n", _jsx(_components.p, {
      children: "The stability of these references would allow us to only render the components whose data actually changed."
    }), "\n", _jsxs(_components.h1, {
      id: "integrating-it",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#integrating-it",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Integrating It"]
    }), "\n", _jsxs(_components.p, {
      children: ["To integrate these concepts, ", _jsx(_components.code, {
        children: "React"
      }), " components need to understand whether they depend on something nominally or physically."]
    }), "\n", _jsx(_components.p, {
      children: "If a component depends on something nominally, this means that the component does not re-render if the physical structure or makeup of the thing it depends on changes. The component would only re-render if the nominal identity of its dependency changes. E.g., my \"Ape Presentation\" is replaced by my \"Zebra Presentation.\""
    }), "\n", _jsx(_components.p, {
      children: "If a component depends on something physically, this means that the component re-renders any time any bit of that thing changes. E.g., a letter in a string that is rendered by a text box changes."
    }), "\n", _jsx(_components.p, {
      children: "I've not discussed physical identity in detail but pysical identity means that the physical attributes must match excatly for two things to be the same. A single nominal identity (e.g., a river or the ship of Theseus) can have an infinite number of physical identities over its lifetime. Things get interesting when you have physical things which contain nominal references and this needs to be explored further as to whether or not this relationship should be allowed. Nominal things containing physical things is intuitive and well defined."
    }), "\n", _jsxs(_components.h1, {
      id: "framework",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#framework",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Framework"]
    }), "\n", _jsxs(_components.p, {
      children: ["I've built out a ", _jsx(_components.a, {
        href: "https://reactjs.org/docs/hooks-intro.html",
        children: "React Hook"
      }), " framework, based on the work outlined here, which I'll be publishing as part of ", _jsx(_components.a, {
        href: "https://github.com/tantaman/aphrodite",
        children: "Aphrodite"
      }), "."]
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
