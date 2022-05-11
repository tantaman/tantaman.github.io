import React from 'react';
import { useQuery } from 'react-query';
import api from './api/api';
import { BlogState, Index } from './support/Domain';
import Link from './support/Link';
import Oops from './error/Oops';
import Content from './support/Content';

export default function Blog({ state }: { state: BlogState }) {
  const { isLoading, error, data } = useQuery('blog/index', api.index('blog'));
  if (error) {
    return <Oops e={error} />;
  }

  if (state.post && data) {
    return <BlogPost index={data} post={state.post} />;
  }
  return <BlogHome index={data} />;
}

function BlogHome({ index }: { index?: Index }) {
  if (index == null) {
    return <div></div>;
  }
  return (
    <div>
      <ul>
        {Object.entries(index).map(([key, matter]) => (
          <li key={key}>
            <Link path={`#/blog/${key}`}>{key}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BlogPost({ post, index }: { post: string; index: Index }) {
  const path = `blog/${post}`;
  return <Content path={path} />;
}
