import React, { ReactNode } from 'react';

export default function Link({
  path,
  children,
}: {
  path: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={path}
      onClick={(e) => {
        // TODO: handle cmd click
        e.preventDefault();
        history.pushState(null, '', path);
        return false;
      }}
    >
      {children}
    </a>
  );
}
