import { Section } from '../support/Domain';

export default {
  index(section: Section) {
    return () =>
      fetch(`/built/${section}/index.json`).then((response) => response.json());
  },

  content(path: string) {
    return () =>
      fetch(`/built/${path}.json`).then((response) => response.json());
  },
};
