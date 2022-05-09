import react from '@vitejs/plugin-react';
import ssr from 'vite-plugin-ssr/plugin';
import mdx from '@mdx-js/rollup';
import { UserConfig } from 'vite';

const config: UserConfig = {
  plugins: [mdx(), react(), ssr()],
};

export default config;
