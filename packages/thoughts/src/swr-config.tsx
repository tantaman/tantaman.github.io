import { SWRConfig } from 'swr';

const swrOptions = {
  revalidateOnFocus: false,
  dedupingInterval: 5000,
  errorRetryCount: 2,
};

// SWR bundles @types/react@18 which conflicts with the project's @types/react@19.
// Use `any` for the component type to avoid the ReactNode mismatch.
const Config = SWRConfig as any;

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return <Config value={swrOptions}>{children}</Config>;
}
