import { Section } from '../support/Domain';

export default {
  index(path: string) {
    return () =>
      fetch(`/built/${path}/index.json`).then((response) => response.json());
  },

  content(path: string) {
    return () =>
      fetch(`/built/${path}.json`).then((response) => response.json());
  },
};
