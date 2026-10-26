# Blitz Gaming — Payment & account verification readiness

This project now contains the source code for a server-side Lahza-hosted card checkout and Supabase Auth OTP sign-in. The store is **not yet accepting real card payments and OTP delivery is not verified** until the external provider accounts below are configured. No payment or SMS/email provider credentials are included in the ZIP.

## Payment methods

- **Cash on Delivery:** enabled by default and is the only payment method that should be considered ready for the initial launch.
- **Visa / Mastercard / American Express:** server-side Lahza hosted checkout is implemented. It keeps card details on the provider-hosted page, verifies payments server-to-server, validates amount/currency/reference, and includes a signed webhook. To use it, Blitz Gaming must be approved for the Lahza / Bank of Palestine merchant gateway and settlement account; add `LAHZA_SECRET_KEY`, `SITE_URL`, `SUPABASE_URL`, and server-only `SUPABASE_SECRET_KEY` (or legacy service-role key) in Netlify. Start with test keys, register the callback/webhook, complete test transactions, then use live keys. Do not expose secret keys as `VITE_*`.
- **Bank Transfer:** manual transfer. Fill the bank/account details in Admin → Store Settings, enable Bank Transfer, and confirm the funds in the bank account from Admin → Orders. Entering an IBAN does not automate verification.
- **PayPal / Apple Pay / Google Pay:** currently configuration/display options only. They are not operational payment routes until separate provider integrations are implemented. Keep them off.

A personal bank account cannot simply be typed into the site to start accepting Visa/Mastercard. The acquiring/payment gateway provider must approve the merchant and configure settlement to the appropriate account. See the [Bank of Palestine payment gateway information](https://web.bankofpalestine.com/business/electronic-services/digital-payments/payment-gateway).

## Email and phone OTP

The Account page sends and verifies OTP using Supabase Auth. For real customers to receive codes:

1. **Email:** configure custom SMTP in Supabase Authentication → SMTP Settings. Set the email template using `supabase/templates/otp_email.html` and preserve `{{ .Token }}`. The default Supabase email sender is restricted for public production use. Use a verified sender/domain and test a non-team Gmail address.
2. **Phone:** enable Supabase Authentication → Providers → Phone, configure an SMS provider (for example one supported by Supabase), provide its credentials, and use `supabase/templates/otp_sms.txt` with `{{ .Code }}`. Confirm delivery to Palestinian mobile numbers and check provider pricing/rules.
3. Set the correct production Site URL and allowed redirect URLs in Supabase Auth, then verify both codes from the live Netlify URL.

The code cannot create merchant, SMTP or SMS accounts or configure provider credentials on your behalf. Keep all service secrets private and server-side.

## Validation performed for this source bundle

- 56 TypeScript/TSX files passed syntax transpilation with zero syntax errors.
- All Netlify `.mjs` function files passed `node --check`.
- Mocked Lahza initialization verified 25 ILS converts to 2,500 agorot, with ILS and callback URL.
- Webhook HMAC mock accepted a valid signature and rejected one signed with the wrong secret.
- `package.json` and `package-lock.json` parsed as valid JSON; root SQL copy matches `supabase/schema.sql`; ZIP integrity was checked.
- A full Vite production build could not be completed because `npm ci` timed out while reaching the npm registry. This bundle is not claimed to be production-build verified. Netlify must install dependencies and show a successful build before launch.
