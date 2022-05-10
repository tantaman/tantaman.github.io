import React, { useEffect, useState } from 'react';
import Header from './support/Header';
import { SiteState } from './support/Domain';
import UrlBar from './support/UrlBar';
import Blog from './Blog';
import Tweets from './Tweets';

export default function Site() {
  const [siteState, setSiteState] = useState<SiteState>({
    section: 'blog',
  });
  return (
    <>
      <UrlBar state={siteState} />
      <Header />
      <main>
        <Routed state={siteState} />
      </main>
    </>
  );
}

function Routed({ state }: { state: SiteState }) {
  switch (state.section) {
    case 'blog':
      return <Blog />;
    case 'tweets':
      return <Tweets />;
  }
}
