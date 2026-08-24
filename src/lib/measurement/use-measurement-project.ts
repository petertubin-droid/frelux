/**
 * FRELUX MEASUREMENT PROJECT HOOK
 *
 * React hook for building and managing measurement projects.
 * This is the shared UI layer that all calculators use to collect measurements
 * without duplicating input logic.
 *
 * The hook manages:
 * - Project state (sections, groups, entries)
 * - Adding/removing/editing measurements
 * - Validation
 * - Calculation results (separate from input)
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  MeasurementProject,
  MeasurementSection,
  MeasurementGroup,
  MeasurementEntry,
  MeasurementProjectResult,
  ValidationResult,
} from './types';
import type { CalculatorContext, LengthUnit } from './units';
import { getAllowedUnits } from './units';
import {
  createMeasurementProject,
  createMeasurementSection,
  createMeasurementGroup,
  createMeasurementEntry,
  calculateMeasurementProject,
  validateMeasurementProject,
} from './index';

export interface UseMeasurementProjectOptions {
  calculatorContext: CalculatorContext;
  preferredUnit?: LengthUnit;
  projectMode?: MeasurementProject['projectMode'];
}

export interface UseMeasurementProjectReturn {
  project: MeasurementProject;
  result: MeasurementProjectResult | null;
  validation: ValidationResult;
  // Section management
  addSection: (label: string) => void;
  removeSection: (sectionId: string) => void;
  // Group/entry management
  addEntry: (sectionId: string, label: string, entry: Partial<MeasurementEntry>) => void;
  updateEntry: (sectionId: string, groupId: string, updates: Partial<MeasurementEntry>) => void;
  removeEntry: (sectionId: string, groupId: string) => void;
  // Project management
  setProjectMode: (mode: MeasurementProject['projectMode']) => void;
  setPreferredUnit: (unit: LengthUnit) => void;
  // Calculation
  calculate: () => MeasurementProjectResult;
  // Reset
  reset: () => void;
  // Allowed units for this context
  allowedUnits: LengthUnit[];
}

export function useMeasurementProject(
  options: UseMeasurementProjectOptions,
): UseMeasurementProjectReturn {
  const { calculatorContext, preferredUnit, projectMode = 'single_room' } = options;

  const [project, setProject] = useState<MeasurementProject>(() => {
    const p = createMeasurementProject(calculatorContext, preferredUnit);
    p.projectMode = projectMode;
    return p;
  });
  const [result, setResult] = useState<MeasurementProjectResult | null>(null);

  const allowedUnits = useMemo(() => getAllowedUnits(calculatorContext), [calculatorContext]);

  const validation = useMemo(() => validateMeasurementProject(project), [project]);

  const addSection = useCallback((label: string) => {
    setProject((prev) => ({
      ...prev,
      sections: [...prev.sections, createMeasurementSection(label)],
    }));
  }, []);

  const removeSection = useCallback((sectionId: string) => {
    setProject((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
  }, []);

  const addEntry = useCallback(
    (sectionId: string, label: string, entry: Partial<MeasurementEntry>) => {
      setProject((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const newEntry = createMeasurementEntry({
            unit: prev.preferredUnit,
            ...entry,
          });
          return {
            ...s,
            groups: [...s.groups, createMeasurementGroup(label, newEntry)],
          };
        }),
      }));
    },
    [],
  );

  const updateEntry = useCallback(
    (sectionId: string, groupId: string, updates: Partial<MeasurementEntry>) => {
      setProject((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s;
          return {
            ...s,
            groups: s.groups.map((g) => {
              if (g.id !== groupId) return g;
              return {
                ...g,
                entry: { ...g.entry, ...updates },
              };
            }),
          };
        }),
      }));
    },
    [],
  );

  const removeEntry = useCallback((sectionId: string, groupId: string) => {
    setProject((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          groups: s.groups.filter((g) => g.id !== groupId),
        };
      }),
    }));
  }, []);

  const setProjectMode = useCallback((mode: MeasurementProject['projectMode']) => {
    setProject((prev) => ({ ...prev, projectMode: mode }));
  }, []);

  const setPreferredUnit = useCallback((unit: LengthUnit) => {
    setProject((prev) => ({ ...prev, preferredUnit: unit }));
  }, []);

  const calculate = useCallback(() => {
    const r = calculateMeasurementProject(project);
    setResult(r);
    return r;
  }, [project]);

  const reset = useCallback(() => {
    const p = createMeasurementProject(calculatorContext, preferredUnit);
    p.projectMode = projectMode;
    setProject(p);
    setResult(null);
  }, [calculatorContext, preferredUnit, projectMode]);

  return {
    project,
    result,
    validation,
    addSection,
    removeSection,
    addEntry,
    updateEntry,
    removeEntry,
    setProjectMode,
    setPreferredUnit,
    calculate,
    reset,
    allowedUnits,
  };
}
