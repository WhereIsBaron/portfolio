import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, MapPin, Phone, Github, Linkedin, ArrowUpRight, Send, Loader2, CheckCircle2, AlertCircle, CreditCard, ChevronDown,
} from 'lucide-react';
import { profile } from '@/data/cv';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { campaignTag } from '@/lib/useVisitCount';

const socialIcon: Record<string, React.ReactNode> = {
  github: <Github size={18} />,
  linkedin: <Linkedin size={18} />,
};

// The public "send a message" form. Writes a real lead into Supabase via the
// validated submit_lead RPC (owner-only read), tagging it with the campaign the
// visitor arrived on so a warm reply ties back to the application/link.
function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    if (!supabase) {
      setState('error');
      setError('Messaging is offline right now — please email me directly.');
      return;
    }
    setState('sending');
    setError(null);
    const { data, error } = await supabase.rpc('submit_lead', {
      p_name: name.trim(),
      p_email: email.trim(),
      p_message: message.trim(),
      p_company: company.trim(),
      p_campaign: campaignTag(),
    });
    if (error || data !== true) {
      setState('error');
      setError(
        error?.message?.includes('invalid email')
          ? 'That email doesn’t look right — mind checking it?'
          : 'Something went wrong sending that. You can email me directly instead.'
      );
      return;
    }
    setState('sent');
    setName(''); setEmail(''); setCompany(''); setMessage('');
  };

  const field =
    'w-full rounded-xl border border-white/10 bg-[var(--bg-soft)] px-3 py-2.5 text-white placeholder:text-[var(--muted)]/60 focus:border-[var(--brand-bright)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-bright)]';

  if (state === 'sent') {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-[var(--brand)]/30 bg-[var(--surface)] p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-bright)]/15">
          <CheckCircle2 size={28} className="text-[var(--brand-bright)]" />
        </span>
        <h3 className="mt-4 font-display text-xl text-white">Message sent</h3>
        <p className="mt-2 max-w-xs text-sm text-[var(--muted)]">
          Thanks for reaching out — I’ll get back to you within two business days.
        </p>
        <button
          onClick={() => setState('idle')}
          className="mt-5 text-sm text-[var(--brand-bright)] hover:underline"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6">
      <h3 className="font-display text-xl text-white">Send a message</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">Prefer a form? Drop me a line and I’ll reply by email.</p>
      <div className="mt-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={field} placeholder="Your name" required maxLength={120}
            value={name} onChange={(e) => setName(e.target.value)} />
          <input className={field} type="email" placeholder="Email" required maxLength={200}
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <input className={field} placeholder="Company (optional)" maxLength={160}
          value={company} onChange={(e) => setCompany(e.target.value)} />
        <textarea className={`${field} min-h-[120px] resize-y`} placeholder="What’s on your mind?" required maxLength={4000}
          value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>

      {state === 'error' && error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-bright)] py-3 font-medium text-[#0b0d10] transition-colors hover:bg-white disabled:opacity-60"
      >
        {state === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {state === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}

// Compact "make a payment" card on the homepage. Collects a currency + amount,
// then hands off to the dedicated /pay page (which prefills from the query) to
// finish on DPO's secure hosted checkout. Keep currencies in sync with PayPage.
const PAY_CURRENCIES = ['USD', 'ZAR', 'BWP', 'KES', 'GBP', 'EUR'];

function PaymentCard() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');

  const go = () => {
    const params = new URLSearchParams({ currency });
    if (amount && Number(amount) > 0) params.set('amount', amount);
    navigate(`/pay?${params.toString()}`);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[var(--bg-soft)]">
          <CreditCard size={20} className="text-[var(--brand-bright)]" />
        </span>
        <div>
          <h3 className="font-display text-lg text-white">Make a payment</h3>
          <p className="text-sm text-[var(--muted)]">Settle a deposit or invoice securely via DPO Pay.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="flex flex-1 items-stretch overflow-hidden rounded-xl border border-white/10 bg-[var(--bg-soft)] transition-colors focus-within:border-[var(--brand-bright)] focus-within:ring-1 focus-within:ring-[var(--brand-bright)]">
          <div className="relative flex items-center border-r border-white/10">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-full cursor-pointer appearance-none bg-transparent py-2.5 pl-3.5 pr-8 text-sm font-medium text-white focus:outline-none"
              aria-label="Currency"
            >
              {PAY_CURRENCIES.map((c) => (
                <option key={c} value={c} className="bg-[var(--bg-soft)] text-white">
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-[var(--muted)]" />
          </div>
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            placeholder="Amount"
            className="w-full min-w-0 bg-transparent px-3.5 text-white placeholder:text-[var(--muted)]/50 focus:outline-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        <button
          onClick={go}
          className="group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--brand-bright)] px-5 py-2.5 text-sm font-medium text-[#0b0d10] transition-colors hover:bg-white"
        >
          Pay
          <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

export default function Contact() {
  const details = [
    {
      icon: <Mail size={22} className="text-[var(--brand-bright)]" />,
      label: 'Email',
      value: profile.email,
      href: `mailto:${profile.email}`,
      valueClass: 'break-all text-sm lg:text-base',
    },
    {
      icon: <Phone size={22} className="text-[var(--brand-bright)]" />,
      label: 'Phone',
      value: profile.phone,
      href: `tel:${profile.phone.replace(/\s+/g, '')}`,
    },
    {
      icon: <MapPin size={22} className="text-[var(--brand-bright)]" />,
      label: 'Location',
      value: profile.location,
      href: null as string | null,
    },
  ];

  return (
    <section id="contact" className="relative py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="reveal mb-14 flex items-center gap-4">
          <span className="text-sm font-medium text-[var(--brand-bright)]">06</span>
          <span className="h-px w-12 bg-white/15" />
          <span className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">Contact</span>
        </div>

        <h2 className="reveal max-w-2xl font-display text-4xl font-light leading-tight text-white sm:text-5xl">
          Let’s build something{' '}
          <span className="text-[var(--brand-bright)]">that works.</span>
        </h2>
        <p className="reveal mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
          Have a role or project in mind? WhatsApp is the quickest way to reach me, and I reply
          within two business days.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          {/* Left: contact details + actions */}
          <div>
        {/* Contact details, front and centre */}
        <div className="reveal grid gap-4 sm:grid-cols-2">
          {details.map((d) => {
            const inner = (
              <>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[var(--bg-soft)] transition-colors group-hover:border-[var(--brand-bright)]/40">
                  {d.icon}
                </span>
                <span className="mt-4 block text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {d.label}
                </span>
                <span
                  className={`mt-1 block break-words font-medium text-white ${
                    'valueClass' in d ? d.valueClass : 'text-lg'
                  }`}
                >
                  {d.value}
                </span>
              </>
            );
            return d.href ? (
              <a
                key={d.label}
                href={d.href}
                className="group rounded-2xl border border-white/10 bg-[var(--surface)] p-6 transition-colors hover:border-[var(--brand)]/40"
              >
                {inner}
              </a>
            ) : (
              <div
                key={d.label}
                className="group rounded-2xl border border-white/10 bg-[var(--surface)] p-6"
              >
                {inner}
              </div>
            );
          })}
        </div>

        {/* Primary email action + socials */}
        <div className="reveal mt-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`mailto:${profile.email}`}
              className="group inline-flex w-fit items-center gap-2 rounded-full bg-[var(--brand-bright)] px-6 py-3 text-sm font-medium text-[#0b0d10] transition-all hover:bg-white"
            >
              <Mail size={16} />
              Email me
              <ArrowUpRight
                size={16}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </a>
            {profile.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--muted)] transition-colors hover:border-white/40 hover:text-white"
              >
                {socialIcon[s.icon]}
                {s.label}
              </a>
            ))}
          </div>

          {/* Compact payment entry → hands off to /pay */}
          <PaymentCard />
        </div>
          </div>

          {/* Right: message form (falls back to email when Supabase is offline) */}
          {supabaseConfigured && (
            <div className="reveal">
              <ContactForm />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
