import { useState, type ReactNode } from "react";
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Clock,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { siteConfig } from "@/config/site";
import { track } from "@/lib/analytics";
import { classNames } from "@/lib/utils";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/shadcn/button";

type Status = "idle" | "submitting" | "success" | "error";

export default function Contact() {
  useBreadcrumbJsonLd([{ name: "Get in touch", path: "/contact" }]);
  useSeo({
    title: "Contact: Get in Touch with FRELUX",
    description:
      "Questions about a paint project, pricing, or colors? Send us a message or reach us directly on WhatsApp.",
    canonicalPath: "/contact",
    ogType: "website",
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Please enter your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email address";
    if (!form.subject.trim()) e.subject = "Add a short subject";
    if (form.message.trim().length < 10)
      e.message = "Message should be at least 10 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setStatus("submitting");
    try {
      const { data: inserted, error } = await supabase
        .from("contact_messages")
        .insert({
          name: form.name,
          email: form.email,
          subject: form.subject,
          message: form.message,
        })
        .select("id")
        .maybeSingle();
      if (error) {
        setStatus("error");
        return;
      }
      setStatus("success");
      // Best-effort transactional email via the send-email edge
      // function; delivery failures never block the contact form.
      if (inserted?.id) {
        void supabase.functions
          .invoke("send-email", { body: { type: "contact", id: inserted.id } })
          .catch(() => undefined);
      }
    } catch {
      setStatus("error");
      return;
    }
    track("contact_form_submitted", { subject: form.subject });
    setForm({ name: "", email: "", subject: "", message: "" });
  }

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        subtitle="Questions about a paint project, pricing, or colors? Send a message or reach us directly on WhatsApp."
        breadcrumbs={[{ label: "Contact" }]}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <form
              onSubmit={onSubmit}
              aria-label="Contact form"
              className="card p-6 sm:p-8 dark:border-white/5 dark:bg-card"
              noValidate
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" error={errors.name}>
                  <input
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className="input-field dark:bg-card dark:border-white/10"
                    placeholder="Jane Doe"
                  />
                </Field>
                <Field label="Email" error={errors.email}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="input-field dark:bg-card dark:border-white/10"
                    placeholder="you@example.com"
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Subject" error={errors.subject}>
                  <input
                    value={form.subject}
                    onChange={(e) => update("subject", e.target.value)}
                    className="input-field dark:bg-card dark:border-white/10"
                    placeholder="How can we help?"
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Message" error={errors.message}>
                  <textarea
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    rows={5}
                    className="input-field dark:bg-card dark:border-white/10 resize-y"
                    placeholder="Tell us a bit about your project…"
                  />
                </Field>
              </div>

              <Button
                variant="default"
                type="submit"
                disabled={status === "submitting"}
                className="mt-6 w-full sm:w-auto disabled:opacity-50"
              >
                <Send aria-hidden="true" className="h-4 w-4" />
                {status === "submitting" ? "Sending…" : "Send message"}
              </Button>

              {status === "error" && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300"
                >
                  <AlertCircle
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <div className="space-y-1">
                    <p className="font-semibold">Unable to send message right now.</p>
                    <p className="text-xs">
                      Please send an email directly to{" "}
                      <a href={`mailto:${siteConfig.email}`} className="underline font-medium hover:text-foreground">
                        {siteConfig.email}
                      </a>{" "}
                      or reach us via WhatsApp at{" "}
                      <a
                        href={siteConfig.supportContact.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium hover:text-foreground"
                      >
                        {siteConfig.supportContact.whatsappDisplay}
                      </a>
                      .
                    </p>
                  </div>
                </div>
              )}
              {status === "success" && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
                >
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <p>Message sent. We’ll get back to you shortly.</p>
                </div>
              )}
            </form>
          </div>

          {/* Support info */}
          <div className="lg:col-span-2">
            <div className="card p-6 sm:p-8 dark:border-white/5 dark:bg-card">
              <h2 className="font-display text-lg font-bold text-foreground dark:text-primary-foreground">
                Other ways to reach us
              </h2>
              <ul className="mt-4 space-y-4 text-sm">
                <li className="flex items-start gap-3 rounded-lg border border-border p-3 dark:border-white/5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <MessageCircle aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="block font-semibold text-foreground dark:text-primary-foreground">
                      WhatsApp Support
                    </span>
                    <a
                      href={siteConfig.supportContact.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-block text-emerald-600 hover:underline dark:text-emerald-400 font-medium"
                    >
                      {siteConfig.supportContact.whatsappDisplay}
                    </a>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Fastest response on business days
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-3 rounded-lg border border-border p-3 dark:border-white/5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-brand-purple">
                    <Mail aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="block font-semibold text-foreground dark:text-primary-foreground">
                      Email
                    </span>
                    <a
                      href={`mailto:${siteConfig.email}`}
                      className="text-muted-foreground hover:underline dark:text-muted-foreground"
                    >
                      {siteConfig.email}
                    </a>
                  </div>
                </li>
              </ul>

              <div className="mt-6 space-y-2 rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground dark:bg-white/5 dark:text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{siteConfig.supportContact.operatingHours}</span>
                </div>
                <p>{siteConfig.supportContact.responseExpectation}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  const errorId = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
        {label}
      </span>
      <div
        className={classNames(
          "mt-1.5",
          error &&
            "[&_.input-field]:border-red-400 [&_.input-field]:focus:border-red-500 [&_.input-field]:focus:ring-red-300/40 dark:[&_.input-field]:border-red-500/60 dark:[&_.input-field]:focus:border-red-400",
        )}
      >
        {children}
      </div>
      {error && (
        <span
          role="alert"
          id={`${errorId}-error`}
          className="mt-1 block text-xs text-red-600"
        >
          {error}
        </span>
      )}
    </label>
  );
}
