/**
 * Smart Waste Calculator
 * Auto-calculates waste margin based on project type and surface condition.
 */

import type { ProjectType } from '@/types';

export type SurfaceCondition = 'smooth' | 'textured' | 'rough';
export type ApplicationMethod = 'brush' | 'roller' | 'spray';

interface SmartWasteInput {
  projectType: ProjectType;
  surfaceCondition: SurfaceCondition;
  applicationMethod?: ApplicationMethod;
  coats: number;
  isRepair?: boolean;
}

interface SmartWasteResult {
  wasteMargin: number; // percentage
  reason: string;
  breakdown: { factor: string; adjustment: number }[];
}

// Base waste margins by project type
const BASE_WASTE: Record<ProjectType, number> = {
  room: 8,
  house: 10,
  exterior: 15,
  fence: 5,
};

// Surface condition adjustments
const SURFACE_ADJUST: Record<SurfaceCondition, number> = {
  smooth: -2,   // Smooth surfaces waste less
  textured: 3,  // Textured surfaces absorb more
  rough: 6,     // Rough surfaces waste most
};

// Application method adjustments
const METHOD_ADJUST: Record<ApplicationMethod, number> = {
  brush: 2,     // Brushes lose more paint
  roller: 0,    // Rollers are efficient
  spray: 5,     // Sprays lose overspray
};

export function calculateSmartWaste(input: SmartWasteInput): SmartWasteResult {
  const breakdown: { factor: string; adjustment: number }[] = [];
  let margin = BASE_WASTE[input.projectType];
  breakdown.push({ factor: `Base (${input.projectType})`, adjustment: BASE_WASTE[input.projectType] });

  const surfaceAdj = SURFACE_ADJUST[input.surfaceCondition];
  margin += surfaceAdj;
  breakdown.push({ factor: `Surface (${input.surfaceCondition})`, adjustment: surfaceAdj });

  const method = input.applicationMethod ?? 'roller';
  const methodAdj = METHOD_ADJUST[method];
  if (methodAdj !== 0) {
    margin += methodAdj;
    breakdown.push({ factor: `Method (${method})`, adjustment: methodAdj });
  }

  // Repair work needs more paint
  if (input.isRepair) {
    margin += 5;
    breakdown.push({ factor: 'Repair work', adjustment: 5 });
  }

  // Multiple coats have diminishing waste
  if (input.coats >= 3) {
    margin -= 2;
    breakdown.push({ factor: '3+ coats efficiency', adjustment: -2 });
  }

  // Clamp between 0 and 30
  margin = Math.max(0, Math.min(30, Math.round(margin)));

  const reason = buildReason(input, margin);

  return { wasteMargin: margin, reason, breakdown };
}

function buildReason(input: SmartWasteInput, margin: number): string {
  const parts: string[] = [];

  if (input.projectType === 'exterior') {
    parts.push('Exterior projects need more paint due to weather exposure and uneven surfaces');
  } else if (input.projectType === 'fence') {
    parts.push('Fences are flat surfaces with minimal waste');
  } else if (input.projectType === 'house') {
    parts.push('Whole house projects have moderate waste from transitions between rooms');
  } else {
    parts.push('Single rooms have the lowest base waste');
  }

  if (input.surfaceCondition === 'rough') {
    parts.push('rough surfaces absorb significantly more paint');
  } else if (input.surfaceCondition === 'textured') {
    parts.push('textured surfaces need extra paint to fill crevices');
  }

  if (input.isRepair) parts.push('repair work requires extra paint for patching');
  if (input.coats >= 3) parts.push('multiple coats become more efficient as coverage improves');

  return `${margin}% waste margin — ${parts.join(', ')}.`;
}
