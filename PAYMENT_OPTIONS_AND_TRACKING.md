# Payment options and public order tracking

## Payment options

- Default active option: **Cash on Delivery only**.
- Admin can configure Visa/Mastercard/AmEx, PayPal, Apple Pay, Google Pay and bank transfer under **Admin → Store Settings → Checkout Payment Methods**. The implemented hosted card processor is **Lahza / Bank of Palestine**; PayPal, Apple Pay and Google Pay remain unavailable as operational payment routes until their separate integrations are added. A display toggle is not proof that a method is ready to accept money.
- Card checkout requires an approved Lahza merchant account, `LAHZA_SECRET_KEY`, Supabase server credentials and `SITE_URL` in Netlify. The customer is redirected to the secure provider-hosted payment page. The server verifies the transaction and updates order/payment status through protected Supabase RPCs; card details never pass through the store.
- A signed webhook endpoint is available at `/.netlify/functions/lahza-webhook`; configure it in the Lahza dashboard for `charge.success`. The browser-return verification endpoint is `/.netlify/functions/lahza-callback`. Start with a Lahza test key and only use a live key after merchant approval and end-to-end testing. Provider merchant approval and bank settlement setup are external requirements; entering an IBAN in Store Settings alone does not enable card settlements.
- Bank Transfer is a manual option: complete bank details in Store Settings and enable it. The order remains `awaiting_transfer` until an administrator confirms funds actually arrived using **Confirm bank transfer received** in Admin → Orders.
- Never put payment secrets or card details in Store Settings or frontend environment variables.

## Customer account one-time codes

The Account page requests and verifies Supabase Auth OTP for email or phone. Real delivery requires provider configuration:

- **Email OTP:** configure custom SMTP in Supabase Authentication → SMTP Settings. In production, Supabase's default email service only sends to pre-authorized project-team addresses. Use `supabase/templates/otp_email.html` in Authentication → Email Templates → Magic Link / OTP; keep `{{ .Token }}` so customers receive a numeric code. A verified sender domain is usually needed with services such as Resend.
- **Phone OTP:** enable Supabase phone auth, configure a supported SMS provider with real credentials, and use `supabase/templates/otp_sms.txt` as the SMS template. SMS provider fees and country restrictions apply.

The site cannot send codes to arbitrary customer emails or phone numbers until those services are configured and tested.

## Track an order

- Public page: `/#/track-order`; linked from the homepage, header, and order confirmation page.
- Buyers enter their order number (format `BG#...`) and the phone number used at checkout. A customer account is not required.
- The Netlify Function uses server-only `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, or the older `SUPABASE_SERVICE_ROLE_KEY`, to read an order. Do not use `VITE_` prefixes for secrets.
- The result intentionally omits the customer's full address, email and private order notes. It shows order progress, item summary, total and any courier information that an admin has entered.
- In Admin → Orders, add the carrier/company, delivery person's name and phone, a short public tracking message, and an `https://` tracking URL. The URL opens the courier's tracking service.
- Fully automatic delivery updates require an API/integration from the chosen delivery company. The generic store cannot infer live tracking status from just a company name.

## Deployment checklist

1. Run the latest full `supabase/schema.sql` in the project's Supabase SQL Editor.
2. Configure Netlify server variables: `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (preferred) or the legacy service-role key.
3. Deploy the Netlify Functions with the site.
4. Create a test COD order, then update status and courier details in Admin → Orders.
5. Open Track My Order in a private browser and look up the order using its code and checkout phone. Verify it shows the updated status and any courier information, without revealing the full address or email.
6. Keep the card toggle off until the approved merchant account is configured and test transactions succeed. Keep PayPal/Apple Pay/Google Pay off until their integrations are built. Enable manual Bank Transfer only after entering the correct account details, and confirm each transfer before marking an order paid.
