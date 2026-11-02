# Cart.tsx imageIndex TypeScript fix

## What changed

`src/pages/Cart.tsx` now imports the shared `ProductVariant` type from `src/lib/types.ts` and uses `ProductVariant | undefined` for the cart row's `variant` property instead of an inline object type that omitted optional fields.

`ProductVariant` already defines `imageIndex?: number`, so the cart can safely resolve a variant's linked gallery image without using `any` or weakening type safety.

## Validation

- Confirmed `ProductVariant.imageIndex` is declared as an optional zero-based gallery index.
- Confirmed `Cart.tsx` uses the shared type for the variant value.
- A full `tsc -b` run could not complete in this environment because project dependencies/type definitions are not installed (`@types/node` and `vite/client` are unavailable). Run the build in Vercel after pushing; this addresses the reported `imageIndex` type error.
