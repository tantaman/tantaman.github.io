import React, { memo } from 'react';
import { useQuery } from 'react-query';
import api from '../api/api';

function RawContent({ path }: { path: string }) {
  const { isLoading, error, data } = useQuery(path, api.content(path));

  if (data == null) {
    return <div></div>;
  }

  return <pre>{data.code}</pre>;
}

const memoized = memo(RawContent);
export default memoized;
