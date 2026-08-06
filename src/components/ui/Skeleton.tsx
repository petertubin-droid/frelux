import { classNames } from '@/lib/utils';

type SkeletonVariant = 'text' | 'rect' | 'circle' | 'card';

const variantClasses: Record<SkeletonVariant, string> = {
  text: 'h-4 rounded',
  rect: 'rounded-lg',
  circle: 'rounded-full',
  card: 'rounded-xl',
};

export function Skeleton({
  variant = 'rect',
  className,
  width,
  height,
}: {
  variant?: SkeletonVariant;
  className?: string;
  width?: string;
  height?: string;
}) {
  return (
    <div
      className={classNames('animate-skeleton-pulse bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]', variantClasses[variant], className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={classNames('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" className={classNames('w-full', i === lines - 1 && 'w-2/3')} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={classNames('card p-5 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width="2.5rem" height="2.5rem" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/2" />
          <Skeleton variant="text" className="w-1/3" />
        </div>
      </div>
      <Skeleton variant="rect" className="w-full h-24" />
      <div className="flex gap-2">
        <Skeleton variant="text" className="w-20" />
        <Skeleton variant="text" className="w-20" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={classNames('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={classNames('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border border-neutral-200 rounded-xl">
          <Skeleton variant="circle" width="2.5rem" height="2.5rem" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-1/3" />
            <Skeleton variant="text" className="w-1/2" />
          </div>
          <Skeleton variant="text" className="w-16" />
        </div>
      ))}
    </div>
  );
}
