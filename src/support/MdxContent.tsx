import React from 'react';
import memoizeOne from 'memoize-one';
import { getMDXComponent } from 'mdx-bundler/client';
import { useQuery } from 'react-query';
import api from '../api/api';

function MdxContent({ path }: { path: string }) {
  const { isLoading, error, data } = useQuery('blog/index', api.content(path));

  if (data == null) {
    return <div></div>;
  }

  const Component = getMDXComponent(data.code);
  return <Component />;
}

const memoized = memoizeOne(MdxContent);

export default memoized;
