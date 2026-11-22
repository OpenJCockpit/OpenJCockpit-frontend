# @openjcockpit/settings

Data hooks for Settings sections. Pairs with the presentational blocks in `@openjcockpit/ui` (`SettingsGroup`, `SettingsRow`, `SettingsForm`, `SettingsStatus`, `DangerZone`).

- **Exports:** `useSettingsResource` (load, edit, save, reset one settings object; tracks `dirty`, `saving`, `saved`, `error`).
- **Tag:** `type:util`. Depends only on React and TanStack Query, so `api` stays transport-only and `ui` stays presentational. Feature libs call it with their own `@openjcockpit/api` functions.
- **Tests / checks:** `nx run settings:test`, `settings:lint`, `settings:typecheck`, `settings:format-check`.
