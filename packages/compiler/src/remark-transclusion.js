import fs from 'fs';
import path from 'path';
import { visit } from 'unist-util-visit';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import { matter } from 'vfile-matter';

/**
 * Transclusion plugin for remark that replaces image syntax ![text](./path/to/file.md) 
 * with the entire content of the referenced markdown file
 */
export default function remarkTransclusion() {
  return async function transformer(tree, file) {
    const promises = [];
    
    visit(tree, 'image', (node, index, parent) => {
      // Only process .md files
      if (!node.url || !node.url.endsWith('.md')) {
        return;
      }
      
      // Create a promise to process this transclusion
      const promise = processTransclusion(node, file.dirname || file.cwd).then((transcludedNodes) => {
        if (transcludedNodes && parent && typeof index === 'number') {
          // Replace the image node with the transcluded content
          parent.children.splice(index, 1, ...transcludedNodes);
          
          // Update indices for any remaining visits since we modified the tree
          return transcludedNodes.length - 1; // Return the number of nodes added minus the one removed
        }
      });
      
      promises.push(promise);
    });
    
    // Wait for all transclusions to complete
    await Promise.all(promises);
  };
}

async function processTransclusion(imageNode, baseDir) {
  try {
    // Resolve the path relative to the current file
    const filePath = path.resolve(baseDir, imageNode.url);
    
    // Read the file content
    const content = await fs.promises.readFile(filePath, 'utf8');
    
    // Parse the markdown content using unified
    const processor = unified()
      .use(remarkParse)
      .use(remarkFrontmatter)
      .use(() => (tree, file) => {
        matter(file, { strip: true });
      });
    
    const result = await processor.run(processor.parse(content));
    
    // Return the child nodes (excluding the root document node)
    return result.children || [];
    
  } catch (error) {
    console.warn(`Warning: Could not transclude file ${imageNode.url}: ${error.message}`);
    
    // Return a warning message as a paragraph node
    return [{
      type: 'paragraph',
      children: [{
        type: 'text',
        value: `[Transclusion failed: ${imageNode.url}]`
      }]
    }];
  }
}