import { federation } from '@module-federation/vite';
import { mergeConfig } from 'vite';
import base from '../../vite.config.base';
import { sharedModules } from '../../module-federation.shared';

const PORT = 4403;

export default mergeConfig(base, {
  plugins: [
    federation({
      name: 'skillsHub',
      filename: 'remoteEntry.js',
      exposes: { './app': './src/app-entry.ts' },
      shared: sharedModules,
      dts: false,
      manifest: true,
    }),
  ],
  build: { target: 'esnext' },
  server: {
    port: PORT,
    strictPort: true,
    // The host loads this remote from another origin.
    cors: true,
    origin: `http://localhost:${PORT}`,
  },
  preview: { port: PORT, strictPort: true, cors: true },
});
