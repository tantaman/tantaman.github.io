import { createContext } from 'react';

export const AuthContext = createContext<{
  secret: string | null;
  updateSecret: (s: string | null) => void;
}>({ secret: null, updateSecret: () => {} });
