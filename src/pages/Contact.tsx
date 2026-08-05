import { useState, type ReactNode } from 'react';
import { MessageCircle, Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { siteConfig } from '@/config/site';
import { whatsappUrl, track } from '@/lib/analytics';
import { classNames } from '@/lib/utils';
import { useSeo } from '@/lib/seo';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function Contact() {
  useSeo({
    title: 'Contact — Get in Touch with FRELUX PAINT CALC',
    description:
      'Questions about a paint project, pricing, or colors? Send us a message or reach us directly on WhatsApp.',
    canonicalPath: '/contact',
    ogType: 'website',
  });

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('idle');

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Please enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.subject.trim()) e.subject = 'Add a short subject';
    if (form.message.trim().length < 10) e.message = 'Message should be at least 10 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setStatus('submitting');
    // No backend connected yet — surface an honest error rather than fake success.
    // Replace this block with a Supabase Edge Function or email service call later.
    window.setTimeout(() => {
      setStatus('error');
    }, 600);
  }

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        subtitle="Questions about a paint project, pricing, or colors? Send a message or reach us directly on WhatsApp."
        backTo="/"
        backLabel="Home"
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <form onSubmit={onSubmit} className="card p-6 sm:p-8" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" error={errors.name}>
                  <input
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    className="input-field"
                    placeholder="Jane Doe"
                  />
                </Field>
                <Field label="Email" error={errors.email}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className="input-field"
                    placeholder="you@example.com"
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Subject" error={errors.subject}>
                  <input
                    value={form.subject}
                    onChange={(e) => update('subject', e.target.value)}
                    className="input-field"
                    placeholder="How can we help?"
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Message" error={errors.message}>
                  <textarea
                    value={form.message}
                    onChange={(e) => update('message', e.target.value)}
                    rows={5}
                    className="input-field resize-y"
                    placeholder="Tell us a bit about your project…"
                  />
                </Field>
              </div>

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="btn-primary mt-6 w-full sm:w-auto disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {status === 'submitting' ? 'Sending…' : 'Send message'}
              </button>

              {status === 'error' && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    The contact form isn’t connected to a backend yet. For now, please reach us on WhatsApp and we’ll
                    respond shortly.
                  </p>
                </div>
              )}
              {status === 'success' && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Message sent. We’ll get back to you shortly.</p>
                </div>
              )}
            </form>
          </div>

          {/* Support info */}
          <div className="lg:col-span-2">
            <div className="card p-6 sm:p-8">
              <h2 className="text-lg font-bold text-brand-navy">Other ways to reach us</h2>
              <ul className="mt-4 space-y-4 text-sm">
                <li>
                  <a
                    href={whatsappUrl('Hello FRELUX, I have a question.')}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track('whatsapp_clicked', { source: 'contact' })}
                    className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3 transition-colors hover:border-accent-green/40 hover:bg-accent-green/5"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent-green/10 text-accent-green">
                      <MessageCircle className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-semibold text-brand-navy">WhatsApp</span>
                      <span className="block text-neutral-500">{siteConfig.whatsappDisplay}</span>
                    </span>
                  </a>
                </li>
                <li className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-purple/10 text-brand-purple">
                    <Mail className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-semibold text-brand-navy">Email</span>
                    <span className="block text-neutral-500">{siteConfig.email}</span>
                  </span>
                </li>
              </ul>
              <div className="mt-6 rounded-lg bg-neutral-50 p-4 text-xs text-neutral-500">
                Typical response time: within one business day on weekdays.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-neutral-700">{label}</span>
      <div className={classNames('mt-1.5')}>{children}</div>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
