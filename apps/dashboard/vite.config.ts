import { federation } from '@module-federation/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../vite.config.base';
import { sharedModules } from '../../module-federation.shared';
import { mockApi } from './mock/mockApi';

// The plugin rewrites the entry for federation, which tests do not need and jsdom cannot run.
const plugins = process.env.VITEST
  ? []
  : [
      federation({
        name: 'dashboard',
        // Remotes are registered at runtime from /federation.manifest.json, never listed here.
        remotes: {},
        shared: sharedModules,
        dts: false,
        manifest: true,
      }),
    ];

// `npm run start:hub:core`: HUB_WITHOUT=controltower,... leaves those remotes out of the dev manifest, so the
// host runs as if they were not installed (no request to a dev server that is not running).
function withoutRemotes(names: string[]): Plugin {
  return {
    name: 'manifest-without-remotes',
    configureServer(server) {
      server.middlewares.use('/federation.manifest.json', (_req, res) => {
        const file = fileURLToPath(new URL('./public/federation.manifest.json', import.meta.url));
        const manifest = JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>;
        for (const name of names) delete manifest[name];
        res.setHeader('content-type', 'application/json');
        res.setHeader('cache-control', 'no-store');
        res.end(JSON.stringify(manifest));
      });
    },
  };
}

const omitted = (process.env.HUB_WITHOUT ?? '').split(',').filter(Boolean);

// `npm run dev:mock`: serve fixtures for /api and skip Keycloak, so the UI runs without the backend.
const mock = process.env.MOCK_API === '1';

export default mergeConfig(base, {
  plugins: [
    ...plugins,
    ...(omitted.length > 0 ? [withoutRemotes(omitted)] : []),
    ...(mock ? [mockApi()] : []),
  ],
  resolve: mock
    ? {
        alias: [
          {
            find: /^\.\/keycloak$/,
            replacement: fileURLToPath(new URL('./mock/keycloak.stub.ts', import.meta.url)),
          },
        ],
      }
    : {},
  build: { target: 'esnext' },
  server: {
    port: 4000,
    proxy: {
      '/api': 'http://localhost:9080',
      // ControlTower backend; it also serves /api, so the prefix is rewritten.
      '/controltower-api': {
        target: 'http://localhost:9180',
        rewrite: (path: string) => path.replace(/^\/controltower-api/, '/api'),
      },
    },
  },
  test: {
    coverage: {
      // Bootstrap and test helpers, not logic worth covering.
      exclude: ['src/main.tsx', 'src/testUtils/**'],
      // Floors sit at the measured baseline; the two remaining branches are unreachable defensive code.
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
