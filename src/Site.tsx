import React, { useEffect, useState } from 'react';
import { getMDXComponent } from 'mdx-bundler/client';
import Header from './Header';
import { SiteState } from './Domain';
import UrlBar from './UrlBar';
import Blog from './Blog';
import Tweets from './Tweets';

function MDXPage({ code }: { code: string }) {
  const Component = getMDXComponent(code);
  return <Component />;
}
/*
const [data, setData] = useState<{ code: string } | null>(null);
  useEffect(() => {
    fetch(
      '/built/blog/2013-07-30-Inheritance-Aggregation-and-Pipelines.mdx.json',
    ).then(async (response) => {
      const json = await response.json();
      setData(json);
    });
  }, []);
*/

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
