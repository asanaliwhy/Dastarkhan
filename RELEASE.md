# Sprint 3: Vercel deployment readiness

## Deployment target

Use the committed `vercel.json`: Next.js preset, `npm ci`, `npm run build:vercel`, `.next-vercel` output. Node.js 22 is used in CI. The separate output and TypeScript config avoid collisions with an existing Vinext development server.

The existing `npm run dev` / `npm run build` commands still target Cloudflare/Vinext. For the Vercel runtime use `npm run dev:vercel` or build then `npm run start:vercel -- --port 5180`.

## What works without credentials

- Local preferences and meal plans; pantry quantities and per-plan grocery checks.
- Planner worker, whole-pack shopping quantities, CSV export and same-product store comparisons.
- Catalog guide with source links; barcode number lookup through Open Food Facts, with on-device photo decoding when BarcodeDetector is available.
- Health endpoint `/api/health`, error recovery page, structured server events and GitHub CI.

## Explicit production gaps

This is suitable for a **preview with device storage**, not a full public release with accounts.

- Vercel cannot use the existing `cloudflare:workers` D1 binding. The Vercel adapter reports device storage and disables cloud persistence. A production database and verified authentication provider still need integrating. Do not trust Sites identity headers on an ordinary Vercel deployment; the adapter never creates a DB from those headers.
- The bundled snapshot has 983 products overall, not 1,000 per store. Only 14 core ingredients have live price refresh. Store-wide ingestion and freshness coverage from Sprint 1 remain incomplete.
- Nutrition values are generic estimates; recipe substitutions and generated recipe variations need a nutrition/content review before making allergy or precise macro promises. Localization currently covers navigation and headings, not every screen.
- Explicit imported weights and volumes are normalized from titles (for example, 240 g is now 240 g, not the old 1,000 g placeholder). Unknown quantities, ranges and ambiguous multipacks are excluded from plan calculations. Eggs and bananas retain explicitly approximate edible yields. A source-label audit is still required for drained weights, mixed ingredients, cross-contact and freshness; parsing titles is not package verification.
- Recipe portion controls preview quantities; they do not edit the saved meal plan.
- Barcode identification requires an external service and does not prove a local-store match. Users must confirm an ingredient. Open Food Facts data is attributed in the lookup UI; see https://openfoodfacts.github.io/openfoodfacts-server/api/ for usage and data license requirements.

## Optional AI setup

Set server-only environment variables `OPENAI_API_KEY`, `OPENAI_MODEL` (a Responses API model available to your account), and `ENABLE_AI_CHAT=true`. Never use NEXT_PUBLIC for these values. AI remains off unless all three are present, and visitors opt in before their question and limited context are sent. No raw weight, age or full health profile is sent. Responses use `store:false`; this does not itself mean zero provider retention.

Before enabling paid AI on a public deployment, configure Vercel firewall limits for `/api/chat`, account spending limits, and an appropriate privacy notice. The in-process limiter is only a per-instance guard; it is not a distributed quota. AI source links are retrieved catalog evidence, not a guarantee every generated sentence is correct. AI failures return an explicitly labeled catalog answer. The integration has mocked provider tests; live billing/API-key verification is still required.

## Verification and operations

Run `npm test`, `npm run lint -- --quiet`, and `npm run build:vercel`. CI repeats these on a clean Ubuntu checkout. Monitor `/api/health` and platform function error rates. `status:ok` means the configured device-mode service is healthy, not that absent accounts/database are ready. Logs record event names, request IDs and durations only, not questions or personal measurements. Connect Vercel log retention/alerts before a public release; an external monitoring account is not provisioned by this code.

Before promotion, test on the actual preview domain: generate a Small-only plan, refresh, reopen it, check groceries, add pantry quantities, export CSV, open comparison and guide dialogs, and test barcode unsupported/not-found states. Verify mobile layout and keyboard focus. Roll back by promoting the previous deployment; do not delete user storage to recover a render error.

No Vercel deployment or production database has been created by this sprint.

### Local verification, 13 September 2026

- Ten automated tests cover Small-only planning, pantry rounding, store filtering, CSV escaping, barcode validation, request limits, retrieval exclusions, and mocked AI success/failure responses.
- TypeScript and ESLint pass. Both the Vinext and Next.js production builds pass (non-fatal bundle/cache warnings remain).
- Next.js production UI tested at desktop and 390 px: worker-generated week, pantry savings, reloaded checkmarks/pantry, chat response, comparison across five stores, Escape/focus restoration, and no horizontal overflow in the inspected mobile catalog.
- Live AI, camera hardware, live barcode-provider responses, deployment-domain behavior, and clean remote CI execution have not been verified. The integration code includes graceful fallbacks; these are still checks before promotion.

References: https://vercel.com/docs/builds/configure-a-build and https://developers.openai.com/api/reference/resources/responses/methods/create

### Bug-fix pass, 14 September 2026

- Ingredient resolution now matches specific foods; the broad category fallback is removed. Dry and canned legumes cannot be substituted silently. Recipe nutrition uses the core ingredient references rather than imported category guesses. Imported product cards and AI context omit unsupported macro values.
- Generated recipes now require the complete cooking equipment and explicitly cook eggs and lentils. Saved plans are restored against canonical current recipes; malformed/obsolete plans produce a rebuild message instead of a render crash. Profile and plan writes use bounded bodies and shared validation.
- Shopping rows aggregate by resolved product before rounding packs. Refresh retains compatible plans and reports unavailable ingredients. Database offer sets replace removed offers atomically; catalog reads exclude out-of-stock rows.
- Fixed stale grocery filters, contradictory budget labels, image fallback state, incomplete product names, obvious flavour-based category mistakes, and chat timeout/draft handling.
- Sixteen regression tests cover these cases, including a complete week for each of the five stores with the default kitchen (80,000 ₸ maximum for store coverage; Small also passes the default 25,000 ₸ limit). This is not a guarantee every combination of budget, tools and exclusions is feasible.
- Browser inspection confirmed the obsolete-plan recovery message and the 240 g catalog correction on desktop/mobile. The browser generation action was blocked by automatic approval review because it would overwrite the existing saved plan; no browser overwrite was performed during this pass.
- Final verification: all 16 tests, ESLint, the Next.js/Vercel production build and the Vinext production build pass. Local production health, catalog, profile and plan GET endpoints return 200; health correctly reports device storage, no database and AI disabled. The guide returns sourced Small-store reference foods in the browser. Non-fatal webpack cache and Vinext bundle-size warnings remain. No remote deployment or clean remote CI run was performed.
