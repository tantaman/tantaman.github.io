import { SiteState } from './Domain';

export function decodeUrl(path: string = window.location.hash): SiteState {
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
