# Private RSVP Tracker

A small Next.js app that stores guests in Supabase and sends each guest a unique RSVP link via Twilio.

## Set up

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Copy `.env.example` to `.env.local` and fill in every value. `NEXT_PUBLIC_APP_URL` must be your public HTTPS URL in production.
3. Configure the Vonage API key, secret, and sender ID from `.env.example`. Vonage is the default provider. To use Twilio instead, set `MESSAGING_PROVIDER=twilio` and configure a Twilio Messaging Service SID (preferred) or sender ID.
4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

5. Visit `/admin`. The browser will ask for `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Add guests using a UK number beginning with `0` or `+44`, then send their texts. Numbers beginning with `0` are converted to `+44` before being stored.

If the database was created before guest grouping was added, run `supabase/migrations/202608070001_add_guest_groups.sql` once in the Supabase SQL Editor. On the admin dashboard, select guests, enter a group name, and choose **Create group**. Any member's private link can then RSVP for themselves, selected group members, or the entire group.

If the database was created before invitation categories were added, run `supabase/migrations/202608110001_add_invitation_categories.sql` once in the Supabase SQL Editor. Existing guests default to **Ceremony & reception** and can be reassigned individually or in bulk from the admin dashboard. Set `CEREMONY_RECEPTION_INFO_URL` and `RECEPTION_ONLY_INFO_URL` to provide a different information page for each category.

## Privacy model

- The Supabase service-role key is used only in server modules/actions.
- Row Level Security is enabled and there are no browser-access policies.
- Each link contains a 256-bit random bearer token and queries only that matching guest.
- Admin routes use HTTP Basic authentication. Use HTTPS in production.
- A guest can revisit their link to update their own response but cannot list or query other guests.

Treat RSVP URLs like private invitations: anyone who receives or forwards a URL can update that invitation. For stricter identity verification, add an SMS one-time code before showing the form.

## Messaging providers

All outbound messages use the `MessagingService` interface in `lib/messaging/messaging-service.ts`. `getMessagingService()` selects the Vonage implementation by default, or Twilio when `MESSAGING_PROVIDER=twilio`; the admin actions do not depend on either vendor. To add another provider, implement `MessagingService` and register it in `lib/messaging/index.ts`.
