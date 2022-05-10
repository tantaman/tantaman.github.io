import { SiteState } from './Domain';

export function decodeUrl(): SiteState {
  const path = window.location.pathname;
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
