import React, { useEffect, useState } from 'react';
import Header from './support/Header';
import { SiteState } from './support/Domain';
import Blog from './Blog';
import Tweets from './Tweets';
import { decodeUrl } from './support/decodeUrl';
import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient();
export default function Site() {
  const [siteState, setSiteState] = useState<SiteState>(decodeUrl());
  useEffect(() => {
    window.history.pushState = new Proxy(window.history.pushState, {
      apply: (target, thisArg, argArray: [any, string, string]) => {
        setSiteState(decodeUrl(argArray[2]));
        return target.apply(thisArg, argArray);
      },
    });
  }, []);
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
      return <Blog state={state} />;
    case 'tweets':
      return <Tweets />;
    case 'home':
      return <div>Home</div>;
  }
}
