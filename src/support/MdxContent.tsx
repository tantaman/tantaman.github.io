import React, { memo } from 'react';
import { getMDXComponent } from 'mdx-bundler/client';
import { useQuery } from 'react-query';
import api from '../api/api';

// TODO: handle as normal md vs mdx vs html vs ...
// in other words, allow different content types to exist.
function MdxContent({ path }: { path: string }) {
  const { isLoading, error, data } = useQuery(path, api.content(path));

  if (data == null) {
    return <div></div>;
  }

  const Component = getMDXComponent(data.code);
  return <Component />;
}

const memoized = memo(MdxContent);

export default memoized;
