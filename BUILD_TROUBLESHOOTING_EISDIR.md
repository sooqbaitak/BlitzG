# Local build troubleshooting: Vite EISDIR on index.html

## What the error means

If Vite reports:

`EISDIR: illegal operation on a directory, read .../blitz_v2_work/index.html`

Windows has a directory named `index.html` at the project root. Vite requires `index.html` to be a regular file. The project archive contains `blitz_v2_work/index.html` as a regular file; this error commonly happens when a ZIP is extracted over an older project folder and a previous `index.html` directory remains.

## Safest fix: extract to a brand-new folder

1. Close the Vite development server (`Ctrl+C`).
2. Do not delete or overwrite your old project folder.
3. Extract this ZIP to a new folder, e.g. `Downloads\\Blitz_Clean_Test`.
4. Open the inner `blitz_v2_work` folder (the one containing `package.json`).
5. Run this in PowerShell:

```powershell
Get-Item .\index.html | Format-List FullName,PSIsContainer,Length
```

`PSIsContainer` must be `False` and `Length` should be greater than zero.

6. Copy your existing `.env` file into this new `blitz_v2_work` folder, if you use one. Do not share it or replace it with `.env.example`.
7. Install and test:

```powershell
npm ci
npm run lint
npm run build
npm run dev
```

## If you must keep using the existing folder

First inspect the directory rather than deleting it:

```powershell
Get-Item .\index.html | Format-List FullName,PSIsContainer
if (Test-Path .\index.html -PathType Container) {
  Get-ChildItem .\index.html -Force
}
```

If it is a directory, move it aside to preserve anything inside:

```powershell
Rename-Item .\index.html ("index.html.backup-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
```

Then copy the actual `index.html` file from a fresh extraction of this archive into the project root. Do not create an empty `index.html` file.

## About the remaining lint warnings

The latest user-provided run reports 0 lint errors and 30 warnings. Those warnings do not themselves explain the Vite `EISDIR` failure. They include React effect/state patterns, hook dependency warnings, and a ref access warning. Do not globally disable the rules or bulk-edit effect dependencies just to hide warnings; refactor each behavior with a focused regression test.

## Dependency warnings

- `npm audit` reported 16 vulnerabilities, but the pasted log does not list the affected packages or paths. Run `npm audit` to get the full report before changing versions.
- Do not use `npm audit fix --force` without reviewing the breaking changes.
- `esbuild`'s install script was blocked by npm's install-script policy. This is separate from `EISDIR`. Only approve/rebuild it if a later command explicitly reports an esbuild binary/install problem.
