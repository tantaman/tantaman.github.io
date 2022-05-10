import React from 'react';
import { useQuery } from 'react-query';
import api from './api/api';
import { BlogState } from './support/Domain';
import Link from './support/Link';
import stripExtension from './support/stripExtension';

export default function Blog({ state }: { state: BlogState }) {
  console.log(state);
  const { isLoading, error, data } = useQuery('blog/index', api.index('blog'));
  if (data == null) {
    return <div></div>;
  }
  return (
    <div>
      <ul>
        {Object.entries(data).map(([key, matter]) => (
          <li key={key}>
            <Link path={`/blog/${stripExtension(key)}`}>{key}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
