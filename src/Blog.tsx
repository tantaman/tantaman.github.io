import React, { useEffect, useState } from 'react';

export default function Blog() {
  const [index, setIndex] = useState<{ [key: string]: {} }>();
  useEffect(() => {
    fetch('/built/blog/index.json').then(async (response) => {
      const json = await response.json();
      setIndex(json);
    });
  }, []);
  console.log(index);
  return <div>Blog</div>;
}
