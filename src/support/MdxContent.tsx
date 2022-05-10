import React, { useEffect, useState } from 'react';
import memoizeOne from 'memoize-one';
import { getMDXComponent } from 'mdx-bundler/client';

function MdxContent({ path }: { path: string }) {
  const [data, setData] = useState<{ code: string } | null>(null);
  useEffect(() => {
    fetch(path).then(async (response) => {
      const json = await response.json();
      setData(json);
    });
  }, [path]);

  if (data == null) {
    return <div></div>;
  }

  const Component = getMDXComponent(data.code);
  return <Component />;
}

const memoized = memoizeOne(MdxContent);

export default memoized;
