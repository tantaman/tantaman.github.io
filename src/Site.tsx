import React from 'react';
import Header from './support/Header';
import { SiteState } from './support/Domain';
import Blog from './Blog';
import Tweets from './Tweets';
import { decodeUrl } from './support/decodeUrl';
import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient();
export default function Site() {
  const siteState = decodeUrl();
  // TODO: Listen for URL changes?
  return (
    <QueryClientProvider client={queryClient}>
      <Header />
      <main>
        <Routed state={siteState} />
      </main>
    </QueryClientProvider>
  );
}

function Routed({ state }: { state: SiteState }) {
  switch (state.section) {
    case 'blog':
      return <Blog />;
    case 'tweets':
      return <Tweets />;
    case 'home':
      return <div>Home</div>;
  }
}
