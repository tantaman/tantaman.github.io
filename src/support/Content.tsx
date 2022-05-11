import React from 'react';
import HtmlContent from './HtmlContent';
import MdxContent from './MdxContent';
import RawContent from './RawContent';

export default function Content({ path }: { path: string }) {
  const ext = path.substring(path.lastIndexOf('.') + 1);
  switch (ext) {
    case 'md':
    case 'html':
      return <HtmlContent path={path} />;
    case 'json':
      return <RawContent path={path} />;
    case 'mdx':
      return <MdxContent path={path} />;
  }

  throw new Error('Undefined case');
}
