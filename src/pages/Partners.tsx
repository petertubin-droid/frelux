import { useState } from "react";
import {
  TrendingUp,
  Handshake,
  Users,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { supabase } from "@/lib/supabase";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Textarea } from "@/components/ui/shadcn/textarea";
import { Label } from "@/components/ui/shadcn/label";

type Interest = "investor" | "partner" | "collaborator" | "other";

const INTERESTS: { value: Interest; label: string }[] = [
  { value: "investor", label: "Investor relations" },
  { value: "partner", label: "Strategic partnership" },
  { value: "collaborator", label: "Collaboration" },
  { value: "other", label: "Something else" },
];

const LANES = [
  {
    icon: TrendingUp,
    title: "Investor relations",
    text: "Frelux is building the cost layer for construction worldwide: verified, market-real pricing for every trade, from foundation to roof. We share our metrics and roadmap with qualified investors in conversation.",
  },
  {
    icon: Handshake,
    title: "Strategic partnerships",
    text: "Retailers, material manufacturers, contractors and financial institutions: surface verified prices to your market, integrate our estimation engines, or build on the Frelux platform.",
  },
  {
    icon: Users,
    title: "Collaboration",
    text: "Researchers, trade professionals and builders: help us verify prices, expand coverage to new markets and languages, and keep every number in the platform honest and sourced.",
  },
];

export default function Partners() {
  useSeo({
    title: "Partnerships & Collaboration | Frelux",
    description:
      "Work with Frelux: investor relations, strategic partnerships and collaboration on the world's construction cost layer.",
    canonicalPath: "/partners",
    ogType: "website",
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    interest: "" as Interest | "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Please enter your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email address";
    if (!form.interest) e.interest = "Select what this is about";
    if (form.message.trim().length < 10)
      e.message = "Tell us a little more (at least 10 characters)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setStatus("submitting");
    try {
      const { error } = await supabase.from("partnership_inquiries").insert({
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim() || null,
        interest: form.interest,
        message: form.message.trim(),
      });
      if (error) {
        setStatus("error");
        return;
      }
    } catch {
      setStatus("error");
      return;
    }
    track("partnership_inquiry_submitted", { interest: form.interest });
    setStatus("success");
    setForm({ name: "", email: "", company: "", interest: "", message: "" });
  }

  return (
    <>
      <PageHeader
        eyebrow="Partnerships"
        title="Build with Frelux"
        subtitle="We work with a small number of investors, strategic partners and collaborators who share one conviction: construction deserves honest numbers."
        breadcrumbs={[{ label: "Partners" }]}
      />

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* Positioning lanes */}
          <div className="space-y-5 lg:col-span-2">
            {LANES.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="neon-edge-soft rounded-xl border border-border/60 bg-card p-6 dark:border-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h2 className="font-display text-lg font-semibold">
                    {title}
                  </h2>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {text}
                </p>
              </div>
            ))}
            <p className="px-1 text-xs leading-relaxed text-muted-foreground">
              Frelux reads and responds to every serious inquiry. Details about
              financing, metrics and roadmaps are shared in direct conversation,
              not on this page.
            </p>
          </div>

          {/* Inquiry form */}
          <div className="lg:col-span-3">
            {status === "success" ? (
              <div className="neon-edge-soft flex h-full min-h-[24rem] flex-col items-center justify-center rounded-xl border border-border/60 bg-card p-10 text-center dark:border-white/5">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-7 w-7 text-primary" aria-hidden />
                </span>
                <h2 className="mt-5 font-display text-xl font-semibold">
                  Thank you. Your message is with the team.
                </h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  We read every inquiry and reply to the serious ones. If your
                  note needs a longer conversation, we will suggest a call.
                </p>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={() => setStatus("idle")}
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <form
                onSubmit={onSubmit}
                className="neon-edge-soft space-y-5 rounded-xl border border-border/60 bg-card p-6 sm:p-8 dark:border-white/5"
                noValidate
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="partners-name">Name *</Label>
                    <Input
                      id="partners-name"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="Your full name"
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partners-email">Email *</Label>
                    <Input
                      id="partners-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="you@company.com"
                      aria-invalid={!!errors.email}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="partners-company">
                      Company / organisation
                    </Label>
                    <Input
                      id="partners-company"
                      value={form.company}
                      onChange={(e) => set("company", e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partners-interest">This is about *</Label>
                    <select
                      id="partners-interest"
                      value={form.interest}
                      onChange={(e) => set("interest", e.target.value)}
                      aria-invalid={!!errors.interest}
                      className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-background"
                    >
                      <option value="" disabled>
                        Select an option
                      </option>
                      {INTERESTS.map((i) => (
                        <option key={i.value} value={i.value}>
                          {i.label}
                        </option>
                      ))}
                    </select>
                    {errors.interest && (
                      <p className="text-xs text-destructive">
                        {errors.interest}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partners-message">Message *</Label>
                  <Textarea
                    id="partners-message"
                    rows={5}
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    placeholder="Tell us who you are and what you would like to explore."
                    aria-invalid={!!errors.message}
                  />
                  {errors.message && (
                    <p className="text-xs text-destructive">{errors.message}</p>
                  )}
                </div>

                {status === "error" && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                    Something went wrong sending your message. Please try again.
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-muted-foreground">
                    We reply from an official Frelux address. Your details are
                    never shared.
                  </p>
                  <Button
                    type="submit"
                    disabled={status === "submitting"}
                    className="shrink-0"
                  >
                    {status === "submitting" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Sending
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" aria-hidden />
                        Send message
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
