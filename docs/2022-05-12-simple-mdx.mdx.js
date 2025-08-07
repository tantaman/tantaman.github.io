/*@jsxRuntime automatic @jsxImportSource https://esm.sh/react*/
import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "https://esm.sh/react/jsx-runtime";
import {TwitterTweetEmbed} from 'https://esm.sh/react-twitter-embed';
function _createMdxContent(props) {
  const _components = Object.assign({
    nav: "nav",
    ol: "ol",
    li: "li",
    a: "a",
    blockquote: "blockquote",
    p: "p",
    code: "code",
    h2: "h2",
    span: "span",
    h3: "h3",
    pre: "pre",
    strong: "strong"
  }, props.components);
  return _jsxs(_Fragment, {
    children: [_jsx(_components.nav, {
      className: "toc",
      children: _jsxs(_components.ol, {
        className: "toc-level toc-level-1",
        children: [_jsxs(_components.li, {
          className: "toc-item toc-item-h2",
          children: [_jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#getting-started",
            children: "Getting Started"
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
                children: "Picking Transformations"
              })
            }), _jsx(_components.li, {
              className: "toc-item toc-item-h3",
              children: _jsx(_components.a, {
                className: "toc-link toc-link-h3",
                href: "#applying-transformations",
                children: "Applying Transformations"
              })
            }), _jsx(_components.li, {
              className: "toc-item toc-item-h3",
              children: _jsx(_components.a, {
                className: "toc-link toc-link-h3",
                href: "#supplying-jsx--using-the-component",
                children: "Supplying JSX & Using the Component"
              })
            })]
          })]
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#full-sample-code",
            children: "Full Sample Code"
          })
        }), _jsx(_components.li, {
          className: "toc-item toc-item-h2",
          children: _jsx(_components.a, {
            className: "toc-link toc-link-h2",
            href: "#this-post-is-mdx",
            children: "This post is MDX!"
          })
        })]
      })
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsxs(_components.p, {
        children: ["tldr; ", _jsx(_components.a, {
          href: "#full-sample-code",
          children: "skip to full sample code"
        })]
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["So you want to deploy a site that uses ", _jsx(_components.code, {
        children: "MDX"
      }), "? Outside of using ", _jsx(_components.a, {
        href: "https://nextjs.org/docs/advanced-features/using-mdx",
        children: "Nextjs"
      }), ", this process is much more difficult than it aught to be."]
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
        children: ["It will be interesting, however, to see the days where we're developing entirely within documents and interlinking dozens or hundreds of docs via their exports. Where the prose is the first class citizen and the code the second. The confluence of ", _jsx(_components.a, {
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
        }), " like features being brought together into a single authoring and coding platform."]
      }), "\n"]
    }), "\n", _jsxs(_components.h2, {
      id: "getting-started",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#getting-started",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Getting Started"]
    }), "\n", _jsxs(_components.p, {
      children: ["To use ", _jsx(_components.code, {
        children: "@mdx-js/mdx"
      }), " directly we'll go over a few things:"]
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsxs(_components.li, {
        children: ["Ingesting ", _jsx(_components.code, {
          children: "MDX"
        }), " content for processing"]
      }), "\n", _jsx(_components.li, {
        children: "Deciding what transformations to apply"
      }), "\n", _jsxs(_components.li, {
        children: ["Applying transforms and compiling the ", _jsx(_components.code, {
          children: "MDX"
        }), " to ", _jsx(_components.code, {
          children: "JavaScript"
        })]
      }), "\n", _jsxs(_components.li, {
        children: ["Supplying ", _jsx(_components.code, {
          children: "JSX"
        }), " & using the component on the frontend"]
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
          children: "const"
        }), " componentCode = ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Promise"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "all"
        }), "(\n  files.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "map"
        }), "(", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "async"
        }), " (file) => ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "processMdx"
        }), "(", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "read"
        }), "(file))),\n);\n"]
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
      }), "'s virtual file format for text processing. If you're reading files from the filesystem, its important to do this conversion to a ", _jsx(_components.code, {
        children: "vfile"
      }), " as some transformations rely on the metadata this conversion will bring (e.g., ", _jsx(_components.a, {
        href: "https://github.com/unifiedjs/unified-infer-git-meta",
        children: "unified-infer-git-meta"
      }), ")."]
    }), "\n", _jsxs(_components.p, {
      children: ["We'll fill in the details of ", _jsx(_components.code, {
        children: "processMdx"
      }), " when we cover applying transforms."]
    }), "\n", _jsxs(_components.h3, {
      id: "picking-transformations",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#picking-transformations",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Picking Transformations"]
    }), "\n", _jsxs(_components.p, {
      children: [_jsx(_components.code, {
        children: "MDX"
      }), " is based on ", _jsx(_components.code, {
        children: "Remark"
      }), ", ", _jsx(_components.code, {
        children: "Rehype"
      }), " and the ", _jsx(_components.code, {
        children: "Unifiedjs"
      }), " ecosystem. This ecosystem is comprised of a large set of plugins that you can use to control/transform the final output of your ", _jsx(_components.code, {
        children: "MDX"
      }), " conversion."]
    }), "\n", _jsxs(_components.p, {
      children: ["At a high level, plugins are chained together into a processing pipeline. The plugins that come first deal at the lowest level of abstract, enriching or transforming the data to higher levels of abstraction before passing it on to the next set of plugins in the chain (for more on pipelines in general, see ", _jsx(_components.a, {
        href: "/2013-07-30-Inheritance-Aggregation-and-Pipelines.html#pipelines",
        children: "inheritance, aggregation and pipelines"
      }), ")."]
    }), "\n", _jsxs(_components.blockquote, {
      children: ["\n", _jsxs(_components.p, {
        children: ["Nit: At the lowest levels (e.g., parsing and tokenizing) extensions will be combined or invoked in turn without passing data to one another. At higher levels (rehype and above) each plugin does manipulate the ", _jsx(_components.code, {
          children: "AST"
        }), " and pass on its results to the next plugin."]
      }), "\n"]
    }), "\n", _jsxs(_components.p, {
      children: ["All of the various plugins that are available to you to enrich your transformation of ", _jsx(_components.code, {
        children: "MDX"
      }), " (or ", _jsx(_components.code, {
        children: "MD"
      }), " or just text in general) can ", _jsx(_components.a, {
        href: "https://unifiedjs.com/explore/",
        children: "be found here"
      }), "."]
    }), "\n", _jsx(_components.p, {
      children: "Figuring out what to use may seem daunting so here are a few common packages."
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "https://github.com/remarkjs/remark/tree/main/packages/remark-parse",
          children: "remark-parse"
        }), " - to parse markdown. Already included by ", _jsx(_components.code, {
          children: "@mdx-js/mdx"
        }), "."]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "https://github.com/remarkjs/remark-frontmatter",
          children: "remark-frontmatter"
        }), " - to extract frontmatter"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "https://github.com/remarkjs/remark-gfm",
          children: "remark-gfm"
        }), " - to support github flavored markdown"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "https://github.com/landakram/remark-wiki-link",
          children: "remark-wiki-link"
        }), " - to enable wiki link syntax"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "https://github.com/remarkjs/remark-rehype",
          children: "remark-rehype"
        }), " - to convert the markdown ast to an html ast for further processing. Already included by ", _jsx(_components.code, {
          children: "@mdx-js/mdx"
        }), "."]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.a, {
          href: "https://github.com/rehypejs/rehype-highlight",
          children: "rehype-highlight"
        }), " - to enable code highlighting"]
      }), "\n"]
    }), "\n", _jsxs(_components.h3, {
      id: "applying-transformations",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#applying-transformations",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Applying Transformations"]
    }), "\n", _jsxs(_components.p, {
      children: ["Applying transformations is as simple as passing their imported modules and options to ", _jsx(_components.code, {
        children: "compile"
      }), " from ", _jsx(_components.code, {
        children: "@mdx-js/mdx"
      }), ". To do that, we'll go ahead an implement the ", _jsx(_components.code, {
        children: "processMdx"
      }), " function that we called earlier."]
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-javascript",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " { compile } ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'@mdx-js/mdx'"
        }), ";\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " remarkFrontmatter ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'remark-frontmatter'"
        }), ";\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " remarkGfm ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'remark-gfm'"
        }), ";\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " remarkWikiLink ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'remark-wiki-link'"
        }), ";\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " rehypeInferDescriptionMeta ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'rehype-infer-description-meta'"
        }), ";\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " rehypeAutolinkHeadings ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'rehype-autolink-headings'"
        }), ";\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " rehypeHighlight ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'rehype-highlight'"
        }), ";\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "async"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "function"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "processMdx"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "file"
        }), ") {\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "compile"
        }), "(file, {\n    ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "remarkPlugins"
        }), ": [\n      remarkFrontmatter,\n      ", _jsx(_components.span, {
          className: "hljs-function",
          children: "() =>"
        }), " ", _jsxs(_components.span, {
          className: "hljs-function",
          children: ["(", _jsx(_components.span, {
            className: "hljs-params",
            children: "tree, file"
          }), ") =>"]
        }), " {\n        ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "matter"
        }), "(file, { ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "strip"
        }), ": ", _jsx(_components.span, {
          className: "hljs-literal",
          children: "true"
        }), " });\n      },\n      remarkGfm,\n      remarkWikiLink,\n    ],\n    ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "rehypePlugins"
        }), ": [\n      [rehypeInferDescriptionMeta, { ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "truncateSize"
        }), ": ", _jsx(_components.span, {
          className: "hljs-number",
          children: "255"
        }), " }],\n      rehypeAutolinkHeadings,\n      rehypeHighlight,\n    ],\n  }).", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "toString"
        }), "();\n}\n"]
      })
    }), "\n", _jsxs(_components.h3, {
      id: "supplying-jsx--using-the-component",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#supplying-jsx--using-the-component",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Supplying JSX & Using the Component"]
    }), "\n", _jsxs(_components.p, {
      children: ["What ", _jsx(_components.code, {
        children: "processMdx"
      }), " will do is to return a ", _jsx(_components.code, {
        children: "JavaScript"
      }), " module that defines a ", _jsx(_components.code, {
        children: "React"
      }), " component that represents the ", _jsx(_components.code, {
        children: "MDX"
      }), " document. What is not included in the genreated component, however, is the code for any imports the component may require."]
    }), "\n", _jsxs(_components.p, {
      children: ["One way of including React without bundling it directly with the ", _jsx(_components.code, {
        children: "MDX"
      }), " component (or requiring another build step after generating the component) is to supply the ", _jsx(_components.code, {
        children: "jsxImportSource"
      }), " option."]
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-javascript",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "async"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "function"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "processMdx"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "file"
        }), ") {\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "compile"
        }), "(file, {\n    ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "jsxImportSource"
        }), ": ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'https://esm.sh/react'"
        }), ",\n    ...\n  });\n}\n"]
      })
    }), "\n", _jsxs(_components.p, {
      children: ["If you need to bundle your dependencies along with the ", _jsx(_components.code, {
        children: "MDX"
      }), " component in this phase, see ", _jsx(_components.a, {
        href: "https://github.com/kentcdodds/mdx-bundler",
        children: _jsx(_components.code, {
          children: "mdx-bundler"
        })
      }), ". ", _jsx(_components.code, {
        children: "mdx-bundler"
      }), " works much the same as what we've describe here except it'll use ", _jsx(_components.code, {
        children: "ESBuild"
      }), " to scan imports and bundle their code in with the final component. We've taken a non-bundling approach (as described ", _jsx(_components.a, {
        href: "http://localhost:3000/2022-05-12-skipping-the-bundling",
        children: "here"
      }), ") for this article."]
    }), "\n", _jsx(_components.p, {
      children: "Now how do you use this component on the fronted?"
    }), "\n", _jsxs(_components.p, {
      children: ["Given the component is pure ", _jsx(_components.code, {
        children: "JavaScript"
      }), " you can write the code to disk and use it like you would any other ", _jsx(_components.code, {
        children: "JavaScript"
      }), " module."]
    }), "\n", _jsxs(_components.p, {
      children: [_jsx(_components.strong, {
        children: "Backend"
      }), " -- write generated ", _jsx(_components.code, {
        children: "MDX"
      }), " ", _jsx(_components.code, {
        children: "JS"
      }), " to disk:"]
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-javascript",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " filenamesAndCode = ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Promise"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "all"
        }), "(\n  files.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "map"
        }), "(", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "async"
        }), " (file) => [file, ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "processMdx"
        }), "(", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "read"
        }), "(file))]),\n);\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Promise"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "all"
        }), "(\n  filenamesAndCode.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "map"
        }), "(", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "async"
        }), " ([filename, code]) => {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " fs.", _jsx(_components.span, {
          className: "hljs-property",
          children: "promises"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "writeFile"
        }), "(filename + ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'.js'"
        }), ", code);\n  }),\n);\n"]
      })
    }), "\n", _jsxs(_components.p, {
      children: [_jsx(_components.strong, {
        children: "Client/Frontend"
      }), " -- import written ", _jsx(_components.code, {
        children: "MDX"
      }), ":"]
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-javascript",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "SomeComponent"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'/path/to/generated-mdx.js'"
        }), ";\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "function"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "MyComponent"
        }), "(", _jsx(_components.span, {
          className: "hljs-params"
        }), ") {\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " ", _jsx(_components.span, {
          className: "xml",
          children: _jsxs(_components.span, {
            className: "hljs-tag",
            children: ["<", _jsx(_components.span, {
              className: "hljs-name",
              children: "SomeComponent"
            }), " />"]
          })
        }), ";\n}\n"]
      })
    }), "\n", _jsxs(_components.h2, {
      id: "full-sample-code",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#full-sample-code",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "Full Sample Code"]
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-javascript",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " fs ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'fs'"
        }), ";\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " { read } ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'to-vfile'"
        }), ";\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " { compile } ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'@mdx-js/mdx'"
        }), ";\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " remarkFrontmatter ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'remark-frontmatter'"
        }), ";\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " remarkGfm ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'remark-gfm'"
        }), ";\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " remarkWikiLink ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'remark-wiki-link'"
        }), ";\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " rehypeInferDescriptionMeta ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'rehype-infer-description-meta'"
        }), ";\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " rehypeAutolinkHeadings ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'rehype-autolink-headings'"
        }), ";\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " rehypeHighlight ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'rehype-highlight'"
        }), ";\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " path = ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'./content'"
        }), ";\n", _jsx(_components.span, {
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
          children: "const"
        }), " filenamesAndCode = ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Promise"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "all"
        }), "(\n  files.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "map"
        }), "(", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "async"
        }), " (file) => [file, ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "processMdx"
        }), "(", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "read"
        }), "(file))]),\n);\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "Promise"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "all"
        }), "(\n  filenamesAndCode.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "map"
        }), "(", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "async"
        }), " ([filename, code]) => {\n    ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " fs.", _jsx(_components.span, {
          className: "hljs-property",
          children: "promises"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "writeFile"
        }), "(filename + ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'.js'"
        }), ", code);\n  }),\n);\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "async"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "function"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "processMdx"
        }), "(", _jsx(_components.span, {
          className: "hljs-params",
          children: "file"
        }), ") {\n  ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "return"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "await"
        }), " ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "compile"
        }), "(file, {\n    ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "remarkPlugins"
        }), ": [\n      remarkFrontmatter,\n      ", _jsx(_components.span, {
          className: "hljs-function",
          children: "() =>"
        }), " ", _jsxs(_components.span, {
          className: "hljs-function",
          children: ["(", _jsx(_components.span, {
            className: "hljs-params",
            children: "tree, file"
          }), ") =>"]
        }), " {\n        ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "matter"
        }), "(file, { ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "strip"
        }), ": ", _jsx(_components.span, {
          className: "hljs-literal",
          children: "true"
        }), " });\n      },\n      remarkGfm,\n      remarkWikiLink,\n    ],\n    ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "rehypePlugins"
        }), ": [\n      [rehypeInferDescriptionMeta, { ", _jsx(_components.span, {
          className: "hljs-attr",
          children: "truncateSize"
        }), ": ", _jsx(_components.span, {
          className: "hljs-number",
          children: "255"
        }), " }],\n      rehypeAutolinkHeadings,\n      rehypeHighlight,\n    ],\n  }).", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "toString"
        }), "();\n}\n"]
      })
    }), "\n", _jsxs(_components.h2, {
      id: "this-post-is-mdx",
      children: [_jsx(_components.a, {
        "aria-hidden": "true",
        tabIndex: "-1",
        href: "#this-post-is-mdx",
        children: _jsx(_components.span, {
          className: "icon icon-link"
        })
      }), "This post is MDX!"]
    }), "\n", _jsxs(_components.p, {
      children: ["This blog post actually is an ", _jsx(_components.code, {
        children: "MDX"
      }), " component!"]
    }), "\n", _jsx(_components.p, {
      children: "If you view the source of this page you can see how we include the component and render it into the page --"
    }), "\n", _jsx(_components.pre, {
      children: _jsxs(_components.code, {
        className: "hljs language-javascript",
        children: [_jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "MDXContent"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'./2022-05-12-simple-mdx.mdx.js'"
        }), ";\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " ", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "React"
        }), " ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'https://esm.sh/react'"
        }), ";\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "import"
        }), " { createRoot } ", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "from"
        }), " ", _jsx(_components.span, {
          className: "hljs-string",
          children: "'https://esm.sh/react-dom/client'"
        }), ";\n\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " rootElement = ", _jsx(_components.span, {
          className: "hljs-variable language_",
          children: "document"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "getElementById"
        }), "(", _jsx(_components.span, {
          className: "hljs-string",
          children: "'mdx'"
        }), ");\n", _jsx(_components.span, {
          className: "hljs-keyword",
          children: "const"
        }), " root = ", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "createRoot"
        }), "(rootElement);\nroot.", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "render"
        }), "(", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "React"
        }), ".", _jsx(_components.span, {
          className: "hljs-title function_",
          children: "createElement"
        }), "(", _jsx(_components.span, {
          className: "hljs-title class_",
          children: "MDXContent"
        }), ", {}, ", _jsx(_components.span, {
          className: "hljs-literal",
          children: "null"
        }), "));\n"]
      })
    }), "\n", _jsxs(_components.p, {
      children: ["the source mdx that this post was built from ", _jsx(_components.a, {
        href: "https://github.com/tantaman/tantaman.github.io/blob/master/content/2022-05-12-simple-mdx.mdx",
        children: "can be found here"
      }), ", the ", _jsx(_components.code, {
        children: "mdx"
      }), " compiler ", _jsx(_components.a, {
        href: "https://github.com/tantaman/tantaman.github.io/blob/19e8c05dc4ed51f2ed38fde624405436e5706b30/packages/compiler/src/handlers.js#L36",
        children: "here"
      }), " and the compiled mdx ", _jsx(_components.a, {
        href: "http://localhost:3000/2022-05-12-simple-mdx.mdx.js",
        children: "here"
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
