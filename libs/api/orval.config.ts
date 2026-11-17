import { defineConfig } from 'orval';

// Types only: the hand-written `apiRequest` wrappers stay, so abort signals, `ApiError` and
// server error messages keep working. The no-op client emits no endpoint functions, only the
// schemas into src/generated/contract.ts. Regenerate with `nx run api:generate`; CI
// fails on drift.
//
// The OpenAPI contract is owned by the backend repository (OpenJCockpit/OpenJCockpit,
// shared/contracts/). Locally this reads the sibling checkout `../OpenJCockpit`; point
// OPENAPI_CONTRACT at another openapi.yaml to override (CI does, with a checked-out copy).
const contract =
  process.env.OPENAPI_CONTRACT ?? '../../../OpenJCockpit/shared/contracts/openapi.yaml';

// The ControlTower contract is owned by the OpenJControlTower repository (contracts/openapi.yaml).
// Locally this reads the sibling checkout `../OpenJControlTower`; OPENAPI_CONTROLTOWER_CONTRACT
// overrides the path. Generated with `nx run api:generate-controltower`.
const controltowerContract =
  process.env.OPENAPI_CONTROLTOWER_CONTRACT ?? '../../../OpenJControlTower/contracts/openapi.yaml';

// A no-op client: types only, no endpoint functions.
const typesOnly = () => ({
  client: () => ({ implementation: '', imports: [] }),
  header: () => '',
  dependencies: () => [],
  footer: () => '',
  title: () => '',
});

export default defineConfig({
  controltower: {
    input: {
      target: controltowerContract,
      parserOptions: { externalRefs: { allow: ['*'], strategy: 'always' } },
    },
    output: {
      mode: 'single',
      client: typesOnly,
      target: './src/generated/controltower-contract.ts',
      prettier: true,
    },
  },
  api: {
    input: {
      target: contract,
      parserOptions: { externalRefs: { allow: ['*'], strategy: 'always' } },
    },
    output: {
      mode: 'single',
      client: typesOnly,
      target: './src/generated/contract.ts',
      prettier: true,
    },
  },
});
