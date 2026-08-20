# Private RSVP Tracker

A small Next.js app that stores guests in Supabase and sends each guest a unique RSVP link and code via SMS.

## Set up

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Copy `.env.example` to `.env.local` and fill in every value.
3. Configure the Vonage API key, secret, and sender ID from `.env.example`. Vonage is the default provider. To use Twilio instead, set `MESSAGING_PROVIDER=twilio` and configure a Twilio Messaging Service SID (preferred) or sender ID.
4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

5. Visit `/admin`. The browser will ask for `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Add guests using a UK number beginning with `0` or `+44`, then send their texts. Numbers beginning with `0` are converted to `+44` before being stored. Invitation texts include a tap-to-open `/rsvp/{code}` link and the 4-character code. Guests who prefer to type the code can still enter it at `/rsvp`. Set `NEXT_PUBLIC_APP_URL` to the public HTTPS origin Vonage has whitelisted (not localhost in production).

If the database was created before guest grouping was added, run `supabase/migrations/202608070001_add_guest_groups.sql` once in the Supabase SQL Editor. Then run `supabase/migrations/202608120001_unique_guest_group_names.sql` to enforce case-insensitive unique group names. Groups can be created and managed independently from the admin dashboard, and guests can be assigned while being created or through bulk actions. Any member's RSVP code can then RSVP for themselves, selected group members, or the entire group.

If the database was created before invitation categories were added, run `supabase/migrations/202608110001_add_invitation_categories.sql` once in the Supabase SQL Editor. Existing guests default to **Ceremony & reception** and can be reassigned individually or in bulk from the admin dashboard. Set `CEREMONY_RECEPTION_INFO_URL` and `RECEPTION_ONLY_INFO_URL` to provide a different information page for each category.

If the database was created before short RSVP codes were added, run `supabase/migrations/202608140001_short_guest_tokens.sql` once in the Supabase SQL Editor. Existing long tokens are rewritten as unique 4-character codes.

## Privacy model

- The Supabase service-role key is used only in server modules/actions.
- Row Level Security is enabled and there are no browser-access policies.
- Each guest has a unique 4-character RSVP code. Anyone who knows a code can open and update that invitation.
- Admin routes use HTTP Basic authentication. Use HTTPS in production.
- A guest can reuse their code to update their own response but cannot list or query other guests.

Treat RSVP codes like private invitations: anyone who receives or forwards a code can update that invitation. For stricter identity verification, add an SMS one-time code before showing the form.

## Messaging providers

All outbound messages use the `MessagingService` interface in `lib/messaging/messaging-service.ts`. `getMessagingService()` selects the Vonage implementation by default, or Twilio when `MESSAGING_PROVIDER=twilio`; the admin actions do not depend on either vendor. To add another provider, implement `MessagingService` and register it in `lib/messaging/index.ts`. Invitation texts include the guest's RSVP link (`/rsvp/{code}`) and the 4-character code as a backup.
