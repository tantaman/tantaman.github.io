import React from 'react';
import { ContentMeta } from './Domain';
import HtmlContent from './HtmlContent';
import MdxContent from './MdxContent';
import RawContent from './RawContent';

export default function Content({
  path,
  meta,
}: {
  path: string;
  meta: ContentMeta;
}) {
  const ext = path.substring(path.lastIndexOf('.') + 1);
  switch (ext) {
    case 'md':
    case 'html':
      if (meta.frontmatter.standalone) {
        window.location.replace(
          '/built/' + path + '.' + meta.frontmatter.standalone,
        );
      }
      return <HtmlContent path={path} />;
    case 'json':
      return <RawContent path={path} />;
    case 'mdx':
      return <MdxContent path={path} />;
  }

  throw new Error('Undefined case');
}
