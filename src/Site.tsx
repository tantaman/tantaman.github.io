import React from 'react';

fetch('/public/built/blog/2013-06-28-services-and-coupling.md.json').then(
  async (response) => {
    const json = await response.json();
    console.log(json);
  },
);
export default function Site() {
  return <div>Welcome!</div>;
}
