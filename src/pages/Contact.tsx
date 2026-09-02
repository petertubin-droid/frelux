import { useState, type ReactNode } from 'react';
import { MessageCircle, Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { siteConfig } from '@/config/site';
import { whatsappUrl, track } from '@/lib/analytics';
import { classNames } from '@/lib/utils';
import { useSeo } from '@/lib/seo';
import { supabase } from '@/lib/supabase';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function Contact() {
  useSeo({
    title: 'Contact: Get in Touch with FRELUX PAINT CALC',
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setStatus('submitting');
    try {
      const { error } = await supabase.from('contact_messages').insert({
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
      });
      if (error) {
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch {
      setStatus('error');
      return;
    }
    track('contact_form_submitted', { subject: form.subject });
    setForm({ name: '', email: '', subject: '', message: '' });
  }

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        subtitle="Questions about a paint project, pricing, or colors? Send a message or reach us directly on WhatsApp."
        breadcrumbs={[{ label: 'Contact' }]}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <form onSubmit={onSubmit} aria-label="Contact form" className="card p-6 sm:p-8 dark:border-white/5 dark:bg-card" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" error={errors.name}>
                  <input
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    className="input-field dark:bg-card dark:border-white/10"
                    placeholder="Jane Doe"
                  />
                </Field>
                <Field label="Email" error={errors.email}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className="input-field dark:bg-card dark:border-white/10"
                    placeholder="you@example.com"
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Subject" error={errors.subject}>
                  <input
                    value={form.subject}
                    onChange={(e) => update('subject', e.target.value)}
                    className="input-field dark:bg-card dark:border-white/10"
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
                    className="input-field dark:bg-card dark:border-white/10 resize-y"
                    placeholder="Tell us a bit about your project…"
                  />
                </Field>
              </div>

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="btn-primary mt-6 w-full sm:w-auto disabled:opacity-50"
              >
                <Send aria-hidden="true" className="h-4 w-4" />
                {status === 'submitting' ? 'Sending…' : 'Send message'}
              </button>

              {status === 'error' && (
                <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    The contact form isn’t connected to a backend yet. For now, please reach us on WhatsApp and we’ll
                    respond shortly.
                  </p>
                </div>
              )}
              {status === 'success' && (
                <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Message sent. We’ll get back to you shortly.</p>
                </div>
              )}
            </form>
          </div>

          {/* Support info */}
          <div className="lg:col-span-2">
            <div className="card p-6 sm:p-8 dark:border-white/5 dark:bg-card">
              <h2 className="font-display text-lg font-bold text-foreground dark:text-primary-foreground">Other ways to reach us</h2>
              <ul className="mt-4 space-y-4 text-sm">
                <li>
                  <a
                    aria-label="Contact us on WhatsApp"
                    href={whatsappUrl('Hello FRELUX, I have a question.')}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track('whatsapp_clicked', { source: 'contact' })}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:border-accent-green/40 hover:bg-accent-green/5 dark:border-white/5 dark:hover:border-accent-green/30 dark:hover:bg-accent-green/10"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent-green/10 text-accent-green">
                      <MessageCircle aria-hidden="true" className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-semibold text-foreground dark:text-primary-foreground">WhatsApp</span>
                      <span className="block text-muted-foreground dark:text-muted-foreground">{siteConfig.whatsappDisplay}</span>
                    </span>
                  </a>
                </li>
                <li className="flex items-start gap-3 rounded-lg border border-border p-3 dark:border-white/5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
                    <Mail aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-semibold text-foreground dark:text-primary-foreground">Email</span>
                    <span className="block text-muted-foreground dark:text-muted-foreground">{siteConfig.email}</span>
                  </span>
                </li>
              </ul>
              <div className="mt-6 rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground dark:bg-white/5 dark:text-muted-foreground">
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
  const errorId = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">{label}</span>
      <div className={classNames('mt-1.5')}>{children}</div>
      {error && <span role="alert" id={`${errorId}-error`} className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
