import React from 'react';
import Layout from '@theme/Layout';
import BlogPostItem from '@theme/BlogPostItem';
import { Content } from '@theme/BlogPostPage';

interface Props {
  readonly recentPosts: readonly { readonly content: Content }[];
}

const Home = ({ recentPosts }: Props) => {
  return (
    <Layout>
      <div className="container">
        <div className="row">
          <div className="col col--9 col--offset-1">
            {recentPosts.map(({ content: BlogPostContent }) => (
              <BlogPostItem
                key={BlogPostContent.metadata.permalink}
                frontMatter={BlogPostContent.frontMatter}
                assets={BlogPostContent.assets}
                metadata={BlogPostContent.metadata}
                truncated={BlogPostContent.metadata.truncated}
              >
                <BlogPostContent />
              </BlogPostItem>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
