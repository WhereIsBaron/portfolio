# Andrew Langeveldt Portfolio - setup & deploy

## What's in here

- Your **photo** (`public/andrew.jpg`) shown in the About section.
- **Screenshot galleries** for four projects (`public/projects/<slug>/`): BHC
  Mobile App (20), Classroom Scheduling (9), Browser Userscripts (11), The Dying
  Forge (5). Click any project with a "photos" badge to open a full gallery with
  a lightbox.
- **Owner-only rearranging** (Supabase): sign in via the "Owner" button
  (bottom-right) to drag project cards and gallery images into any order. That
  order is saved for every visitor; everyone else is view-only.
- A working **contact form** (Supabase `messages` table).

The site loads fine even if Supabase is not set up yet - the Owner button and
contact form simply stay dormant until you complete the steps below.

## Run locally

```
npm install
npm run dev
```

## Supabase (enables rearranging + contact form)

Your `.env` already points at your Supabase project
(`xvuijpiylypwhvievroa`). In the Supabase dashboard for that project:

1. **SQL Editor** > run each file in `supabase/migrations/` once:
   - `..._create_messages_table.sql` (contact form)
   - `..._create_portfolio_layout.sql` (rearranging)
2. **Authentication > Users > Add user**: create your own email + password, tick
   *Auto Confirm*. This is your owner login. You type this password only into
   your own site's Owner box.
3. **Authentication > Providers/Settings**: turn **off** public sign-ups, so no
   one else can create a login. Only you can rearrange.

(If you would rather use a different Supabase project, replace the two values in
`.env` and run both migrations there instead.)

## Deploy to Netlify

Build locally, then drag the **`dist`** folder onto your Netlify site's Deploys
tab (or use `npx netlify-cli deploy --prod --dir dist --site <your-site>`).

For the Owner login and contact form to work on the live site, add these two
environment variables in Netlify (**Site configuration > Environment
variables**), copying the values from `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The anon key is safe to expose publicly; Row Level Security protects the data.
