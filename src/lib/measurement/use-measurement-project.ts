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
 *
 * Auto-creates a default section so entries can be added immediately.
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  MeasurementProject,
  MeasurementSection,
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
  /** Default section label (defaults to "Measurements") */
  defaultSectionLabel?: string;
}

export interface UseMeasurementProjectReturn {
  project: MeasurementProject;
  result: MeasurementProjectResult | null;
  validation: ValidationResult;
  // Section management
  addSection: (label: string) => string;
  removeSection: (sectionId: string) => void;
  // Group/entry management
  addEntry: (sectionId: string, label: string, entry: Partial<MeasurementEntry>) => void;
  /** Simplified addEntry — adds to the first/active section automatically */
  addMeasurement: (label: string, entry: Partial<MeasurementEntry>) => void;
  updateEntry: (sectionId: string, groupId: string, updates: Partial<MeasurementEntry>) => void;
  /** Simplified update — finds the entry in any section */
  updateMeasurement: (groupId: string, updates: Partial<MeasurementEntry>) => void;
  removeEntry: (sectionId: string, groupId: string) => void;
  /** Simplified remove — finds the entry in any section */
  removeMeasurement: (groupId: string) => void;
  // Project management
  setProjectMode: (mode: MeasurementProject['projectMode']) => void;
  setPreferredUnit: (unit: LengthUnit) => void;
  // Calculation
  calculate: () => MeasurementProjectResult;
  // Reset
  reset: () => void;
  // Reset with a new mode
  resetWithMode: (mode: MeasurementProject['projectMode']) => void;
  // Allowed units for this context
  allowedUnits: LengthUnit[];
  // The active section (first section, auto-created)
  activeSection: MeasurementSection | undefined;
}

export function useMeasurementProject(
  options: UseMeasurementProjectOptions,
): UseMeasurementProjectReturn {
  const {
    calculatorContext,
    preferredUnit,
    projectMode = 'single_room',
    defaultSectionLabel = 'Measurements',
  } = options;

  const [project, setProject] = useState<MeasurementProject>(() => {
    const p = createMeasurementProject(calculatorContext, preferredUnit);
    p.projectMode = projectMode;
    // Auto-create a default section
    p.sections = [createMeasurementSection(defaultSectionLabel)];
    return p;
  });
  const [result, setResult] = useState<MeasurementProjectResult | null>(null);

  const allowedUnits = useMemo(() => getAllowedUnits(calculatorContext), [calculatorContext]);

  const validation = useMemo(() => validateMeasurementProject(project), [project]);

  const activeSection = project.sections[0];

  const addSection = useCallback((label: string): string => {
    const section = createMeasurementSection(label);
    setProject((prev) => ({
      ...prev,
      sections: [...prev.sections, section],
    }));
    return section.id;
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

  const addMeasurement = useCallback(
    (label: string, entry: Partial<MeasurementEntry>) => {
      setProject((prev) => {
        if (prev.sections.length === 0) {
          // Auto-create section if none exists
          const section = createMeasurementSection(defaultSectionLabel);
          const newEntry = createMeasurementEntry({
            unit: prev.preferredUnit,
            ...entry,
          });
          section.groups = [createMeasurementGroup(label, newEntry)];
          return { ...prev, sections: [section] };
        }
        // Add to first section
        const sectionId = prev.sections[0].id;
        return {
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
        };
      });
    },
    [defaultSectionLabel],
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

  const updateMeasurement = useCallback(
    (groupId: string, updates: Partial<MeasurementEntry>) => {
      setProject((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => ({
          ...s,
          groups: s.groups.map((g) => {
            if (g.id !== groupId) return g;
            return { ...g, entry: { ...g.entry, ...updates } };
          }),
        })),
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

  const removeMeasurement = useCallback((groupId: string) => {
    setProject((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => ({
        ...s,
        groups: s.groups.filter((g) => g.id !== groupId),
      })),
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
    p.sections = [createMeasurementSection(defaultSectionLabel)];
    setProject(p);
    setResult(null);
  }, [calculatorContext, preferredUnit, projectMode, defaultSectionLabel]);

  const resetWithMode = useCallback(
    (mode: MeasurementProject['projectMode']) => {
      const p = createMeasurementProject(calculatorContext, preferredUnit);
      p.projectMode = mode;
      const sectionLabel =
        mode === 'fence'
          ? 'Fence Dimensions'
          : mode === 'house_building'
            ? 'Building Spaces'
            : mode === 'exterior'
              ? 'Exterior Surfaces'
              : defaultSectionLabel;
      p.sections = [createMeasurementSection(sectionLabel)];
      setProject(p);
      setResult(null);
    },
    [calculatorContext, preferredUnit, defaultSectionLabel],
  );

  return {
    project,
    result,
    validation,
    addSection,
    removeSection,
    addEntry,
    addMeasurement,
    updateEntry,
    updateMeasurement,
    removeEntry,
    removeMeasurement,
    setProjectMode,
    setPreferredUnit,
    calculate,
    reset,
    resetWithMode,
    allowedUnits,
    activeSection,
  };
}
