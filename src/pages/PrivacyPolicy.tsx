import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { profile } from '@/data/cv';

const CONTACT_EMAIL = 'andrewpjlangeveldt@gmail.com';
const UPDATED = '7 September 2026';

// A small typed section so the page reads consistently.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-[var(--muted)]">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--bg)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">
            Andrew<span className="text-[var(--brand-bright)]">.</span>Langeveldt
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white"
          >
            <ArrowLeft size={15} /> Back to portfolio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl font-light leading-tight text-white">Privacy Policy</h1>
        <p className="mt-3 text-sm text-[var(--muted)]/70">Last updated: {UPDATED}</p>

        <p className="mt-6 text-[var(--muted)]">
          This is the personal portfolio website of {profile.name}. It is not a commercial service
          and does not sell anything. This page explains what limited information the site collects,
          why, and how you can ask for it to be removed.
        </p>

        <Section title="Who is responsible">
          <p>
            {profile.name} operates this website and decides how the information described here is
            handled. You can get in touch about anything on this page at{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[var(--brand-bright)] underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="What the site collects">
          <p>The site keeps data to a minimum. Specifically:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-white">Visit statistics.</strong> When you open the site, it
              records your IP address, your browser type (user agent), the page you landed on, and
              the site you came from (referrer). This is used to understand how many people visit and
              where they come from. A small running total of visits is shown in the footer.
            </li>
            <li>
              <strong className="text-white">Chat assistant.</strong> If you use the chat assistant,
              the messages you type are sent to an AI provider (Google Gemini or Groq) to generate a
              reply. Your IP address is also checked briefly to stop the chat being spammed. The site
              itself does not keep a stored transcript of your conversation.
            </li>
            <li>
              <strong className="text-white">Booking demo.</strong> The booking page is a front-end
              demonstration only. Anything you type there is not saved, sent, or stored anywhere.
            </li>
          </ul>
        </Section>

        <Section title="What the site does not do">
          <ul className="list-disc space-y-2 pl-5">
            <li>No advertising, and no third-party marketing or tracking cookies.</li>
            <li>Your information is never sold or rented to anyone.</li>
            <li>No accounts, newsletters, or profiles are created for visitors.</li>
          </ul>
        </Section>

        <Section title="Cookies and local storage">
          <p>
            The site does not use advertising or tracking cookies. It uses a small amount of your
            browser&apos;s own storage for essential things only, such as remembering that a visit
            has already been counted for your session, and keeping the owner signed in when they log
            in to manage the site. None of this is shared with advertisers.
          </p>
        </Section>

        <Section title="Who processes the data">
          <p>The site runs on a few trusted services that may process the above on its behalf:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-white">Netlify</strong> — hosting. It keeps standard server
              logs, which can include IP addresses, as part of running the site.
            </li>
            <li>
              <strong className="text-white">Supabase</strong> — the database that stores the visit
              statistics described above.
            </li>
            <li>
              <strong className="text-white">Google Gemini / Groq</strong> — only the messages you
              send to the chat assistant, and only to produce a reply.
            </li>
          </ul>
        </Section>

        <Section title="How long it is kept">
          <p>
            Visit statistics are kept only as long as they are useful for understanding traffic, and
            can be deleted on request. Chat messages are not retained by the site after a reply is
            generated.
          </p>
        </Section>

        <Section title="Your choices">
          <p>
            You can ask what information is held about you, and ask for it to be deleted, by emailing{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[var(--brand-bright)] underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
            . You can also block cookies and local storage in your browser settings, though the visit
            counter may then count your visit more than once.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If this policy changes, the date at the top of the page will be updated. Please check back
            occasionally.
          </p>
        </Section>

        <div className="mt-12 border-t border-white/5 pt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-white"
          >
            <ArrowLeft size={15} /> Back to portfolio
          </Link>
        </div>
      </main>
    </div>
  );
}
