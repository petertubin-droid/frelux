import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useUserTemplates } from '@/lib/useTemplates';
import SaveTemplateModal from './SaveTemplateModal';
import type { CalculatorType } from '@/types/database';
import { Button } from "@/components/ui/shadcn/button";

interface SaveTemplateButtonProps {
  calculatorType: CalculatorType;
  inputData: Record<string, unknown>;
  defaultName?: string;
}

export default function SaveTemplateButton({
  calculatorType,
  inputData,
  defaultName,
}: SaveTemplateButtonProps) {
  const { user } = useAuth();
  const { create } = useUserTemplates(calculatorType);
  const [modalOpen, setModalOpen] = useState(false);

  if (!user) return null;

  const handleSave = async (name: string, description: string | undefined) => {
    await create({
      calculator_type: calculatorType,
      name,
      description,
      input_data: inputData,
      visibility: 'private',
    });
  };

  return (
    <>
      <Button variant="ghost"
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-brand-purple/30 hover:bg-primary/5 hover:text-brand-purple dark:border-white/10 dark:text-muted-foreground/80 dark:hover:border-brand-purple/30 dark:hover:bg-primary/10"
      >
        <Bookmark aria-hidden="true" className="h-3.5 w-3.5" />
        Save as Template
      </Button>

      <SaveTemplateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        calculatorType={calculatorType}
        inputData={inputData}
        onSave={handleSave}
        defaultName={defaultName}
      />
    </>
  );
}
