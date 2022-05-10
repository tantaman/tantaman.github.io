import React, { useEffect, useState } from 'react';
import { getMDXComponent } from 'mdx-bundler/client';

function MDXPage({ code }: { code: string }) {
  const Component = getMDXComponent(code);
  return (
    <main>
      <Component />
    </main>
  );
}

export default function Site() {
  const [data, setData] = useState<{ code: string } | null>(null);
  useEffect(() => {
    fetch(
      '/built/blog/2013-07-30-Inheritance-Aggregation-and-Pipelines.mdx.json',
    ).then(async (response) => {
      const json = await response.json();
      setData(json);
    });
  }, []);
  return <div>{data != null ? <MDXPage code={data.code} /> : null}</div>;
}
