import { Link } from "react-router-dom";
import { ArrowRight, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import Container from "@/components/ui/Container";
import { useLanguage } from "@/lib/i18n";

/**
 * Plain statement of what FRELUX asks Google for and what it never touches.
 *
 * Google's OAuth review requires the homepage itself, reachable without
 * signing in, to explain the purpose of the data the app requests, so this is
 * written as a fact list rather than marketing copy. It also states the thing
 * reviewers check hardest: the calculators work with no account at all.
 */
export default function GoogleDataUse() {
  const { t } = useLanguage();

  const rows = [
    {
      icon: UserRound,
      title: t("What we receive"),
      body: t(
        "Your name, your email address and your Google profile photo. Nothing else is requested, and we do not ask for any additional Google scope.",
      ),
    },
    {
      icon: KeyRound,
      title: t("Why we ask for it"),
      body: t(
        "To create and secure your account so saved estimates, templates and client projects follow you across devices, and so a contractor you share an estimate with knows who sent it.",
      ),
    },
    {
      icon: ShieldCheck,
      title: t("What we never access"),
      body: t(
        "No Gmail, Drive, Calendar, Contacts, Photos or any other Google service. We cannot read your messages, files or calendar, and we never post on your behalf.",
      ),
    },
  ];

  return (
    <section
      aria-labelledby="google-data-use-heading"
      className="border-t border-border/60 bg-muted/40 py-14 dark:bg-card sm:py-16"
    >
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-label">{t("Your account, your data")}</p>
          <h2
            id="google-data-use-heading"
            className="mt-2 text-2xl font-bold text-foreground sm:text-3xl"
          >
            {t("Signing in with Google, in plain terms")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t(
              "Every calculator and estimate on FRELUX works without an account. Signing in is optional, and it is only for saving your work and connecting with professionals. This is exactly what that sign-in asks for.",
            )}
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <div
                key={row.title}
                className="rounded-2xl border border-border/70 bg-card p-5 dark:border-white/10 dark:bg-white/5"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background text-primary dark:border-white/10 dark:bg-white/5">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-foreground">
                  {row.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {row.body}
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          {t(
            "You can delete your account and its saved projects at any time from your account settings, or revoke FRELUX's access from your Google account permissions page.",
          )}{" "}
          <Link
            to="/privacy-policy"
            className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t("Read the full privacy policy")}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </p>
      </Container>
    </section>
  );
}
