import type { ReactNode } from 'react';
import { classNames } from '@/lib/utils';

export default function Container({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'main' | 'article';
}) {
  return (
    <Tag className={classNames('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>
      {children}
    </Tag>
  );
}
