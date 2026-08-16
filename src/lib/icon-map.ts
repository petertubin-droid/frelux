// Curated icon map for dynamic icon rendering from database values.
// Instead of importing the entire lucide-react library (700KB+),
// this maps string names to specific icon components — only the icons
// listed here are bundled.

import {
  BookOpen,
  Palette,
  Ruler,
  Calculator,
  DollarSign,
  TrendingUp,
  Star,
  Clock,
  Paintbrush,
  Layers,
  Grid3x3,
  Sparkles,
  ShieldCheck,
  Home,
  Building2,
  Brush,
  Droplet,
  Eye,
  Lightbulb,
  Heart,
  Award,
  Zap,
  Leaf,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  Palette,
  Ruler,
  Calculator,
  DollarSign,
  TrendingUp,
  Star,
  Clock,
  Paintbrush,
  Layers,
  Grid3x3,
  Sparkles,
  ShieldCheck,
  Home,
  Building2,
  Brush,
  Droplet,
  Eye,
  Lightbulb,
  Heart,
  Award,
  Zap,
  Leaf,
  Sun,
  Moon,
};

/**
 * Get a Lucide icon component by name.
 * Falls back to BookOpen if the icon name is not found.
 */
export function getIcon(name: string | null | undefined): LucideIcon {
  if (!name) return BookOpen;
  return ICON_MAP[name] ?? BookOpen;
}

export { ICON_MAP };
