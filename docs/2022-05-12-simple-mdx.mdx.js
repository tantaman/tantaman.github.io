/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
import {TwitterTweetEmbed} from 'https://esm.sh/react-twitter-embed';
import {Mermaid} from '/dist/components/Mermaid.js';
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
      code: "code",
      blockquote: "blockquote",
      h2: "h2",
      span: "span",
      h3: "h3",
      pre: "pre"
    }, props.components);
    return _jsxs(_Fragment, {
      children: [_jsx(_components.nav, {
        className: "toc",
        children: _jsx(_components.ol, {
          className: "toc-level toc-level-1",
          children: _jsxs(_components.li, {
            className: "toc-item toc-item-h2",
            children: [_jsx(_components.a, {
              className: "toc-link toc-link-h2",
              href: "#using-mdx",
              children: "Using MDX"
            }), _jsxs(_components.ol, {
              className: "toc-level toc-level-2",
              children: [_jsx(_components.li, {
                className: "toc-item toc-item-h3",
                children: _jsx(_components.a, {
                  className: "toc-link toc-link-h3",
                  href: "#ingesting-content",
                  children: "Ingesting Content"
                })
              }), _jsx(_components.li, {
                className: "toc-item toc-item-h3",
                children: _jsx(_components.a, {
                  className: "toc-link toc-link-h3",
                  href: "#picking-transformations",
                  children: "Picking transformations"
                })
              })]
            })]
          })
        })
      }), "\n", _jsxs(_components.p, {
        children: ["So you want to deploy a site that uses ", _jsx(_components.code, {
          children: "MDX"
        }), "? Outside of using ", _jsx(_components.a, {
          href: "https://nextjs.org/docs/advanced-features/using-mdx",
          children: "Nextjs"
        }), ", the process is much more difficult than it aught to be."]
      }), "\n", _jsx("center", {
        children: _jsx(TwitterTweetEmbed, {
          tweetId: '1524057494829547521'
        })
      }), "\n", _jsxs(_components.p, {
        children: ["Technically we don't even need to mess with ", _jsx(_components.code, {
          children: "mdx-bundler"
        }), " (see ", _jsx(_components.a, {
          href: "./2022-05-12-skipping-the-bundling",
          children: "Building Without Bundling"
        }), "). Going the \"bundle-free\" route, we can drop down and use ", _jsx(_components.a, {
          href: "https://github.com/mdx-js/mdx",
          children: _jsx(_components.code, {
            children: "@mdx-js/mdx"
          })
        }), " directly. To me, bundle-free makes sense for ", _jsx(_components.code, {
          children: "MDX"
        }), " given each ", _jsx(_components.code, {
          children: "MDX"
        }), " page will likely be a small scale project."]
      }), "\n", _jsxs(_components.blockquote, {
        children: ["\n", _jsxs(_components.p, {
          children: ["It will be interesting to see the days where we're developing entirely within documents and interlinking dozens or hundreds of docs via their exports. Where the prose is the first class citizen and the code the second. The confluence of ", _jsx(_components.a, {
            href: "https://www.notion.so/",
            children: "Notion"
          }), "/", _jsx(_components.a, {
            href: "https://observablehq.com/",
            children: "ObservableHQ"
          }), "/", _jsx(_components.a, {
            href: "https://jupyter.org/",
            children: "Jupyter"
          }), "/", _jsx(_components.a, {
            href: "https://quarto.org/",
            children: "Quarto"
          }), "/", _jsx(_components.a, {
            href: "https://mdxjs.com/",
            children: "MDX"
          }), "/", _jsx(_components.a, {
            href: "https://www.craft.do/",
            children: "CraftDocs"
          }), "/", _jsx(_components.a, {
            href: "https://coda.io/",
            children: "Coda"
          }), "/", _jsx(_components.a, {
            href: "https://obsidian.md/",
            children: "Obsidian"
          }), "/", _jsx(_components.a, {
            href: "https://www.airtable.com/",
            children: "Airtable"
          }), " like features being brought together into a single authoring and coding paltform."]
        }), "\n"]
      }), "\n", _jsxs(_components.h2, {
        id: "using-mdx",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#using-mdx",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Using MDX"]
      }), "\n", _jsxs(_components.p, {
        children: ["Lets get started using ", _jsx(_components.code, {
          children: "@mdx-js/mdx"
        }), " directly. We'll go over a few things:"]
      }), "\n", _jsxs(_components.ol, {
        children: ["\n", _jsx(_components.li, {
          children: "Ingesting MDX content for processing"
        }), "\n", _jsx(_components.li, {
          children: "Deciding what transformations to apply"
        }), "\n", _jsx(_components.li, {
          children: "Applying transforms and compiling the MDX to JavaScript"
        }), "\n", _jsx(_components.li, {
          children: "Loading the component on the frontend"
        }), "\n"]
      }), "\n", _jsxs(_components.h3, {
        id: "ingesting-content",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#ingesting-content",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Ingesting Content"]
      }), "\n", _jsxs(_components.p, {
        children: ["First step is to ingest your content. These can be files from disk or some other source of ", _jsx(_components.code, {
          children: "MDX"
        }), " content."]
      }), "\n", _jsxs(_components.p, {
        children: ["If they're files on disk you can read them easily via the ", _jsx(_components.code, {
          children: "fs"
        }), " api in ", _jsx(_components.code, {
          children: "Node"
        }), "/", _jsx(_components.code, {
          children: "Deno"
        }), "."]
      }), "\n", _jsx(_components.pre, {
        children: _jsxs(_components.code, {
          className: "hljs language-javascript",
          children: [_jsx(_components.span, {
            className: "hljs-keyword",
            children: "import"
          }), " { read } ", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "from"
          }), " ", _jsx(_components.span, {
            className: "hljs-string",
            children: "'to-vfile'"
          }), ";\n\n", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "const"
          }), " files = ", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "await"
          }), " fs.", _jsx(_components.span, {
            className: "hljs-property",
            children: "promises"
          }), ".", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "readdir"
          }), "(path);\n", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "await"
          }), " ", _jsx(_components.span, {
            className: "hljs-title class_",
            children: "Promise"
          }), ".", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "all"
          }), "(files.", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "map"
          }), "(", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "async"
          }), " (file) => ", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "processMdx"
          }), "(", _jsx(_components.span, {
            className: "hljs-keyword",
            children: "await"
          }), " ", _jsx(_components.span, {
            className: "hljs-title function_",
            children: "read"
          }), "(file))));\n"]
        })
      }), "\n", _jsxs(_components.p, {
        children: [_jsx(_components.a, {
          href: "https://github.com/vfile/to-vfile",
          children: _jsx(_components.code, {
            children: "to-vfile"
          })
        }), " is a package that converts a file to ", _jsx(_components.a, {
          href: "https://unifiedjs.com/",
          children: "Unifiedjs"
        }), "'s virtual file format for text processing. If you're reading files from the filesystem, its important to do this conversion to a vfile as some transformations rely on the metadata this conversion will bring (e.g., ", _jsx(_components.a, {
          href: "https://github.com/unifiedjs/unified-infer-git-meta",
          children: "unified-infer-git-meta"
        }), ")."]
      }), "\n", _jsxs(_components.p, {
        children: ["We'll fill in the details of ", _jsx(_components.code, {
          children: "processMdx"
        }), " when we cover compiling mdx to js."]
      }), "\n", _jsxs(_components.h3, {
        id: "picking-transformations",
        children: [_jsx(_components.a, {
          "aria-hidden": "true",
          tabIndex: "-1",
          href: "#picking-transformations",
          children: _jsx(_components.span, {
            className: "icon icon-link"
          })
        }), "Picking transformations"]
      }), "\n", _jsxs(_components.p, {
        children: [_jsx(_components.code, {
          children: "MDX"
        }), " is based on ", _jsx(_components.code, {
          children: "Remark"
        }), ", ", _jsx(_components.code, {
          children: "Rehype"
        }), " and the ", _jsx(_components.code, {
          children: "Unifiedjs"
        }), " ecosystem."]
      }), "\n", _jsxs(_components.p, {
        children: ["The root of this ecosystem is a representation of text as a syntax tree (", _jsx(_components.a, {
          href: "https://github.com/syntax-tree/hast",
          children: "hast"
        }), "). All ", _jsx(_components.code, {
          children: "unifiedjs"
        }), " processors are built around this abstraction and work by applying transofrmations to the tree, passing the updated tree along to the next step in the processing pipeline so it can apply its transofrmations and then pass the updated tree to the next step and so on."]
      }), "\n", _jsxs(_components.p, {
        children: ["For more on pipelines in general, see ", _jsx(_components.a, {
          href: "/2013-07-30-Inheritance-Aggregation-and-Pipelines.html#pipelines",
          children: "inheritance, aggregation and pipelines"
        })]
      }), "\n", _jsxs(_components.p, {
        children: ["A pipeline for converting ", _jsx(_components.code, {
          children: "Markdown"
        }), " to ", _jsx(_components.code, {
          children: "html"
        }), " might look something like:"]
      }), "\n", _jsx(Mermaid, {
        id: "example-pipe",
        chart: `
graph TD;
  remarkParse-->remarkFrontmatter
  remarkFrontmatter-->remarkGfm
  remarkGfm-->remarkWikiLink
  remarkWikiLink-->remarkRehype
  remarkRehype-->rehypeInferDescriptionMeta
  rehypeInferDescriptionMeta-->rehypeStringify
`
      })]
    });
  }
}
export default MDXContent;
