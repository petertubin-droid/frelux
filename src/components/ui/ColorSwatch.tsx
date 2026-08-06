import { classNames } from '@/lib/utils';

type Size = 'xs' | 'sm' | 'md' | 'lg';

const sizeClasses: Record<Size, string> = {
  xs: 'h-4 w-4 rounded',
  sm: 'h-5 w-5 rounded-md',
  md: 'h-7 w-7 rounded-lg',
  lg: 'h-10 w-10 rounded-xl',
};

export default function ColorSwatch({
  hex,
  name,
  size = 'sm',
  className,
  showBorder = true,
}: {
  hex: string;
  name?: string;
  size?: Size;
  className?: string;
  showBorder?: boolean;
}) {
  if (!hex) return null;
  return (
    <span
      className={classNames('inline-block shrink-0 shadow-sm', sizeClasses[size], showBorder && 'ring-1 ring-black/5', className)}
      style={{ backgroundColor: hex }}
      title={name ?? hex}
      aria-label={name ? `Color: ${name}` : `Color ${hex}`}
    />
  );
}
