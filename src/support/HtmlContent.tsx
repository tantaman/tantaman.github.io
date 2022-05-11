import React, { memo, useState } from 'react';
import { useQuery } from 'react-query';
import api from '../api/api';

export default function HtmlContent({ path }: { path: string }) {
  const { isLoading, error, data } = useQuery(path, api.content(path));

  if (data == null) {
    return <div></div>;
  }

  return <div dangerouslySetInnerHTML={{ __html: data.code }} />;
}

/*
ref={(n) => {
        if (n == null || addedScripts) {
          return;
        }
        n.querySelectorAll('script').forEach((oldScript) => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach((attr) =>
            newScript.setAttribute(attr.name, attr.value),
          );
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        });
        setAddedScripts(true);
      }}
*/
