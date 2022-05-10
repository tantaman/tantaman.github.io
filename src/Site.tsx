import React, { useState } from 'react';
import Header from './support/Header';
import { SiteState } from './support/Domain';
import Blog from './Blog';
import Tweets from './Tweets';
import { decodeUrl } from './support/decodeUrl';

export default function Site() {
  const siteState = decodeUrl();
  // Listen for URL changes?
  return (
    <>
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
    case 'home':
      return <div>Home</div>;
  }
}
