import { useQuery } from 'react-query';
import api from '../api/api';

const cache: Map<string, any> = new Map();
export default function useIndex(path: string): {
  isLoading?: boolean;
  error?: unknown;
  data: any;
} {
  const data = cache.get(path);
  if (data) {
    return { data };
  }

  const ret = useQuery(path, api.index(path));
  if (ret.data != null) {
    cache.set(path, ret.data);
  }

  return ret;
}
