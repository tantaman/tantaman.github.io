import React from 'react';
import MdxContent from './MdxContent';
import RawContent from './RawContent';

export default function Content({ path }: { path: string }) {
  const ext = path.substring(path.lastIndexOf('.') + 1);
  switch (ext) {
    case 'md':
    case 'html':
    case 'json':
      return <RawContent path={path} />;
    case 'mdx':
      return <MdxContent path={path} />;
  }

  throw new Error('Undefined case');
}
