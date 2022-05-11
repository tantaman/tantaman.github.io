import { SiteState } from './Domain';

export function decodeUrl(path: string = window.location.hash): SiteState {
  const q = path.indexOf('?');
  if (q != -1) {
    path = path.substring(0, q);
  }
  const [_, section, subsection] = path.split('/');
  if (section === 'blog') {
    return {
      section: 'blog',
      post: subsection,
    };
  }
  return {
    section: 'home',
  };
}
