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

export default defineConfig({
  api: {
    input: {
      target: contract,
      parserOptions: { externalRefs: { allow: ['*'], strategy: 'always' } },
    },
    output: {
      mode: 'single',
      client: () => ({
        client: () => ({ implementation: '', imports: [] }),
        header: () => '',
        dependencies: () => [],
        footer: () => '',
        title: () => '',
      }),
      target: './src/generated/contract.ts',
      clean: true,
      prettier: true,
    },
  },
});
