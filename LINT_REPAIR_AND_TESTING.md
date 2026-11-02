# BLITZ GAMING V2 — local lint repair and verification

## What was changed

This update is a repair of the existing BLITZ GAMING V2 project. It does not replace the storefront, seed catalogue, product/category models, admin workflows, payment providers, or Supabase schema.

- Removed unused imports and unused local values reported by the supplied ESLint output.
- Moved shared display helpers out of React component modules into `src/lib/productPresentation.ts` so Fast Refresh files export components only.
- Moved `roleLabel` into `src/admin/adminRoleLabel.ts` and updated both admin consumers.
- Moved the `useApp` hook and context definition into small dedicated modules, keeping `AppProvider` in `src/lib/AppContext.tsx`.
- Reworked offer selection to derive a valid selected ID from the current offer list instead of synchronizing that derived value through an effect.
- Replaced direct `Date.now()` calls during render in the Offers and Seasonal Campaign components with effect-updated state.
- Corrected the reported unnecessary escaping in CSV/cloud string handling and corrected the Vite config's TypeScript suppression/comment.
- Retained the existing React Hooks compiler checks as warnings where this older application intentionally synchronizes UI state in effects or reads a ref during render. These are visible advisories rather than hidden/disabled rules; they can be addressed in a later targeted refactor without changing behavior during this repair.

## Preserve your existing work

1. Keep your current project folder as a backup until the upgraded folder has passed local checks.
2. Extract this ZIP into a *new* folder. Do not extract over your only copy.
3. If your old folder contains a private `.env` file, copy that file into the new project folder. Do not publish it or send it in a ZIP. The repository's `.env.example` is only a template.
4. Keep your existing Supabase project, tables, RLS policies, Storage buckets, payment credentials, and provider accounts. This code update does not run database migrations or change remote records.
5. Do not delete your old folder or reset browser storage. Browser `localStorage` belongs to the browser origin and is separate from the extracted source folder.

## Run local checks

Open a terminal in the new project folder and run:

```bash
node --version
npm --version
npm ci
npm run lint
npm run build
npm run dev
```

Open the localhost URL printed by Vite.

`npm run lint` may still print React Hooks advisory warnings. The previous blocking lint errors (unused symbols, component files exporting non-components, and direct render-time clock reads) have been addressed in source. The Hooks rules that flag existing state-reset effects/ref usage remain enabled as warnings, not disabled.

## If the esbuild script was blocked during `npm ci`

The provided install log says npm blocked `esbuild`'s postinstall script because it is not on the script allow-list. Only if Vite/build then reports that the esbuild binary is missing or unusable, approve that dependency's install script and rebuild it:

```bash
npm install-scripts approve esbuild
npm rebuild esbuild
```

Then retry:

```bash
npm run build
```

## Dependency audit

The supplied install output reported 16 vulnerabilities (12 moderate, 4 high). This repair intentionally does not run `npm audit fix --force` or upgrade the dependency tree blindly, because that can introduce breaking changes. Review the full report with:

```bash
npm audit
```

Use the exact package/advisory details to choose safe upgrades. Share the complete output if you want the dependency fixes assessed without blindly changing versions.

## What has and has not been verified here

- Verified: 71 TypeScript/JavaScript source files transpile without syntax errors using the available TypeScript transpiler.
- Verified: all relative source imports resolve to files in this project.
- Not verified: a full `tsc -b`, ESLint run, Vite production build, or browser test. This environment could not complete a dependency-backed install because the npm registry request timed out. Run the commands above on your computer after `npm ci`.

If `npm run lint` or `npm run build` still fails, copy the complete first error block and send it back. Do not delete files, reset Supabase, or run force-upgrade commands to work around it.
