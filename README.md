# CheckMe — event tickets & gate check-in

Admins generate group tickets (1, 5, 10, 20-man…), send them on WhatsApp in one tap,
and scan them at the gate with a phone camera. Each scan shows paid / admitted / remaining
slots, and lets you admit part of a group now and the rest later.

## Roles
- **Owner**: create and edit events, set ticket prices, add or remove team members, plus everything an admin can do.
- **Admin**: create, edit and void tickets, send them on WhatsApp, scan and check people in.
- **Scanner**: scan tickets and check guests in at the gate. Can search tickets and undo a mistaken check-in,
  but can't create, edit or void tickets, and doesn't see amounts paid or revenue.

## First-time setup

1. **Supabase** (free): create a project at https://supabase.com. Pick the region closest to your guests (e.g. *West EU*).
2. In Supabase, open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
   Then do the same with [`supabase/002_branding.sql`](supabase/002_branding.sql) and
   [`supabase/003_scanner_and_prices.sql`](supabase/003_scanner_and_prices.sql), then
   [`supabase/004_ticket_upgrades.sql`](supabase/004_ticket_upgrades.sql).
3. Copy `.env.example` to `.env.local` and fill in the values from **Project Settings → API Keys**:
   - `NEXT_PUBLIC_SUPABASE_URL`: the project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the publishable (or legacy *anon*) key
   - `SUPABASE_SECRET_KEY`: the secret (or legacy *service_role*) key. **Never share this.**
4. Install and run:
   ```bash
   npm install
   npm run dev
   ```
5. Open http://localhost:3000. You'll be sent to **/setup** to create your organisation and the owner account.
6. As owner: **Events** → create the event, then **Team** → add the other admins.

## Email verification (codes)
- **Setup** emails a verification code. The organisation and owner account are only created once it's entered.
- **Owners** who haven't verified (e.g. accounts created before this feature) see **Verify your email**
  and must enter an emailed code before using the admin area.
- Accounts with unconfirmed emails can't log in. The login page links to the code screen.

### One-time Supabase configuration
1. **Custom SMTP** (needed for branded emails and to email anyone outside your Supabase team):
   Authentication → Emails → SMTP Settings. Set **Sender name** to `CheckMe`.
   - Gmail: host `smtp.gmail.com`, port `465`, username = your Gmail address, password = a Google
     **App password** (needs 2-Step Verification), sender email = your Gmail address.
2. **Templates**: Authentication → Emails → Templates.
   - *Confirm signup*: subject `Your CheckMe code: {{ .Token }}`, body = `supabase/email-templates/confirm-signup.html`
   - *Magic link*: subject `Your CheckMe code: {{ .Token }}`, body = `supabase/email-templates/magic-link.html`
3. **Code length**: Authentication → Sign In / Providers → Email → **Email OTP Length** = `6`.
4. **URL Configuration**: Site URL = your app's address (`http://localhost:3000` locally, your Vercel URL once deployed).

## Deploying (Vercel, free)
1. Push this folder to a GitHub repository.
2. On https://vercel.com, click **Add New → Project**, import the repo, and add the same three environment variables.
3. Deploy. The camera scanner needs HTTPS, which Vercel provides automatically.

> The Supabase free tier pauses a project after about a week without activity. Open the
> Supabase dashboard and click **Restore** before an event if it has been idle.

## Event-day checklist
- Every gate phone: log in, then open **Scan** and allow camera access once.
- Make sure the right event is selected in the top bar.
- If a guest's phone is dead, go to **Tickets**, search by name or phone, open the ticket, and check them in.
- Admitted someone by mistake? Open the ticket and press **Undo** in its check-in history.

## Ticket prices
Owners set a price **per person** for Regular, VIP and Table at the top of **Events** (or **More → Ticket prices**).
On the new-ticket screen each type shows its price; tap a type and a number of people (Single, 5-man, 10-man,
100-man…) and the amount is worked out (e.g. 10-man Regular at ₦5,000 = ₦50,000). You can still type a
different amount for a discount. A new event copies the prices from the latest event.

The amount paid is printed on the ticket and the downloadable ticket image (hidden when it's ₦0).

## Upgrading a ticket
Owners and admins open a ticket and press **Upgrade** to add more people and/or move it to a better type
(e.g. Regular → VIP). The extra amount fills in from the price list: new people at the new price, plus the
price difference for people already on the ticket if the type changes. The QR code and link stay the same,
so the guest's ticket updates automatically. Every upgrade is logged on the ticket with who did it and how much.

## Picking contacts
On the new-ticket screen, the buyer's name box searches as you type and fills in the WhatsApp number:
- **Past buyers**: anyone who bought a ticket before (any event).
- **Imported contacts**: tap **Import contacts file** once and choose a `.vcf` export
  (iPhone: Contacts → Lists → long-press All Contacts → Export; Google: contacts.google.com → Export → vCard).
  They're kept only in that browser on that device.
- **Android Chrome** also shows **Choose from phone contacts**, which opens the phone's contact list directly.
  This needs the site on https (e.g. the Vercel link). iPhones and computers don't allow it.

## Branding
Owners go to **Branding** (or **More → Branding** on a phone) to upload a logo and a flyer/banner (PNG or JPG,
max 5 MB) and pick a brand colour for the selected event. There's a live preview. Branding applies to the
event's tickets and the downloadable ticket image, and each new event copies the branding of the latest one.

The admin app's own accent colour lives in `app/globals.css` (`--accent`).
