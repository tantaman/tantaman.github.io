import React, { useEffect, useState } from 'react';
import Link from './support/Link';
import stripExtension from './support/stripExtension';

export default function Blog() {
  const [index, setIndex] = useState<{ [key: string]: {} }>();
  useEffect(() => {
    fetch('/built/blog/index.json').then(async (response) => {
      const json = await response.json();
      setIndex(json);
    });
  }, []);
  if (index == null) {
    return <div></div>;
  }
  return (
    <div>
      <ul>
        {Object.entries(index).map(([key, matter]) => (
          <li key={key}>
            <Link path={`/blog/${stripExtension(key)}`}>{key}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
