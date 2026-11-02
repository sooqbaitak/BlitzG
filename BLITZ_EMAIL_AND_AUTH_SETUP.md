# BLITZ Gaming — email, customer login and notifications setup

This project includes the email OTP template and the order-notification server function, but delivery providers and account branding must be configured in Supabase and Vercel. These settings cannot be enabled from frontend code alone.

## 1. Make customer sign-up emails show a code instead of a redirect link

The website requests email OTPs through Supabase Auth's `/auth/v1/otp` endpoint. Supabase uses the **Magic Link or OTP** email template for this flow. The essential change is to use `{{ .Token }}` instead of `{{ .ConfirmationURL }}`.

1. Open the correct Supabase project → **Authentication → Email Templates**.
2. Open **Magic Link** (sometimes labelled **Magic Link or OTP**).
3. Set the subject to `Your BLITZ GAMING verification code`.
4. Replace the body with the full contents of `supabase/templates/otp_email.html` in this project. It displays `{{ .Token }}` so the customer receives a code to enter on the website.
5. Save the template. The **Confirm signup** template is only needed for a separate confirmation-email flow; changing it alone will not fix this site's OTP request.

Do not use `{{ .ConfirmationURL }}` in the Magic Link / OTP template. That sends a link rather than the code the website asks the customer to enter. Supabase documents that email OTP and magic links share this template. See the official [passwordless email sign-in guide](https://supabase.com/docs/guides/auth/auth-email-passwordless) and [email templates guide](https://supabase.com/docs/guides/auth/auth-email-templates).

## 2. Show BLITZ GAMING as the sender instead of Supabase

In Supabase → **Project Settings → Authentication** (or **Auth → SMTP Settings**, depending on dashboard layout), configure a custom SMTP sender. Set the sender display name to `BLITZ GAMING` and use an email address on a domain you control and have verified with your email provider.

Supabase's built-in mail service is intended for testing and has restrictive delivery/rate limits. For customer-facing production emails, configure custom SMTP. One option is Resend SMTP after verifying your sending domain:

- SMTP host: `smtp.resend.com`
- Port: `465` (SSL) or `587` (STARTTLS)
- Username: `resend`
- Password: your Resend API key
- Sender email: an address on your verified domain (example only: `auth@YOUR-VERIFIED-DOMAIN`)
- Sender name: `BLITZ GAMING`

Use the SMTP provider's current instructions if its dashboard shows different settings. Never use an unverified sender address.

## 3. Enable the order email to the store Gmail

In Resend, create an API key and verify the domain/address used as the sender. Then in Vercel → **blitzgaming → Settings → Environment Variables**, set these server-only variables for Production (and Preview if you test preview deployments):

| Name | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_SECRET_KEY` | Your Supabase secret key (`sb_secret_...`) |
| `RESEND_API_KEY` | Your Resend API key |
| `ORDER_EMAIL_FROM` | `BLITZ GAMING <orders@YOUR-VERIFIED-DOMAIN>` (use your actual verified sender) |
| `SITE_URL` | `https://blitz-g.vercel.app` |

For older Supabase projects, `SUPABASE_SERVICE_ROLE_KEY` can be used instead of `SUPABASE_SECRET_KEY`. Do not expose either secret in any `VITE_` variable, frontend code, or GitHub.

In Admin → Store Settings, set **New Order Email Notifications** recipient to `sooqbaitak@gmail.com`, then save. Create a new Vercel deployment after changing environment variables. Place one small test order and check Vercel → Functions/Runtime Logs if the order is saved but the email fails.

The email is sent by the server function after the order is saved. A failed email does not undo the order. The website now reports that the order was saved separately from an email delivery failure.

## 4. Customer phone sign-in

Phone login is hidden by default. In Admin → Store Settings → Customer account sign-in, enable **Show phone-number sign-in** only after configuring a supported SMS provider in Supabase → Authentication → SMS Provider. An SMS provider account and its current credentials/country delivery setup are required. This project normalizes Palestinian mobile formats such as `059xxxxxxx` and `+97059xxxxxxx` to E.164.

Until SMS is configured and tested with a real Palestine number, leave phone sign-in disabled and use email OTP.

## 5. Browser order notifications

Browser notifications require the admin to grant permission on the deployed HTTPS site and to keep the admin dashboard open. The dashboard can request permission and send a test notification under Store Settings. This is not background push: notifications while the browser is closed require a separate push-notification service and service worker setup.
