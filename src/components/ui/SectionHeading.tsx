import type { ReactNode } from 'react';
import Container from '@/components/ui/Container';
import { classNames } from '@/lib/utils';

interface SectionHeadingProps {
  label?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export default function SectionHeading({
  label,
  title,
  subtitle,
  align = 'left',
  className,
}: SectionHeadingProps) {
  return (
    <Container
      className={classNames(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className
      )}
    >
      {label && <p className="section-label mb-3">{label}</p>}
      <h2 className="section-title text-balance">{title}</h2>
      {subtitle && <p className="section-subtitle mt-4 text-balance">{subtitle}</p>}
    </Container>
  );
}
