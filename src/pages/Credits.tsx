"use client";

import { useAuth } from "@/lib/auth";
import { CreditsWallet } from "@/components/credits/CreditsWallet";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";

export default function CreditsPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2
          aria-hidden="true"
          className="h-6 w-6 animate-spin text-brand-purple"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-sm text-muted-foreground dark:text-muted-foreground">
          {t("Sign in to view your FRELUX Credits and start earning.")}
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        variant="tool"
        breadcrumbs={[
          { label: t("Home"), path: "/" },
          { label: t("FRELUX Credits") },
        ]}
        title={t("FRELUX Credits")}
        subtitle={t(
          "Your balance, what each credit unlocks, and where your last credits went.",
        )}
      />
      <Container className="max-w-2xl pb-12 pt-6">
        <CreditsWallet userId={user.id} />
      </Container>
    </>
  );
}
