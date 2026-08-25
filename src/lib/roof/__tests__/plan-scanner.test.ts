/**
 * FRELUX PLAN SCANNER — Tests
 *
 * Feature 9: Plan Scanner
 * Feature 10: Scale Calibration (computePixelsPerMeter)
 */

import { describe, it, expect } from 'vitest';
import {
  detectPlanFileType,
  isSupportedPlanType,
  MAX_PLAN_FILE_SIZE,
  validatePlanFile,
  createPlanFile,
  createDefaultCalibration,
  computePixelsPerMeter,
  completeCalibration,
} from '../plan-scanner';

// =========================================================
// File Type Detection
// =========================================================

describe('Plan Scanner: File Type Detection', () => {
  it('detects PDF from extension', () => {
    expect(detectPlanFileType('plan.pdf')).toBe('pdf');
  });

  it('detects PDF from MIME type', () => {
    expect(detectPlanFileType('file', 'application/pdf')).toBe('pdf');
  });

  it('detects PNG', () => {
    expect(detectPlanFileType('image.png')).toBe('png');
    expect(detectPlanFileType('image', 'image/png')).toBe('png');
  });

  it('detects JPG/JPEG', () => {
    expect(detectPlanFileType('photo.jpg')).toBe('jpg');
    expect(detectPlanFileType('photo.jpeg')).toBe('jpg');
    expect(detectPlanFileType('photo', 'image/jpeg')).toBe('jpg');
  });

  it('detects WEBP', () => {
    expect(detectPlanFileType('image.webp')).toBe('webp');
    expect(detectPlanFileType('image', 'image/webp')).toBe('webp');
  });

  it('returns unknown for unsupported types', () => {
    expect(detectPlanFileType('file.docx')).toBe('unknown');
    expect(detectPlanFileType('file.txt')).toBe('unknown');
    expect(detectPlanFileType('file.xyz')).toBe('unknown');
  });

  it('returns unknown for no extension', () => {
    expect(detectPlanFileType('noextension')).toBe('unknown');
  });
});

// =========================================================
// Supported Type Check
// =========================================================

describe('Plan Scanner: Supported Types', () => {
  it('supports PDF, PNG, JPG, WEBP', () => {
    expect(isSupportedPlanType('pdf')).toBe(true);
    expect(isSupportedPlanType('png')).toBe(true);
    expect(isSupportedPlanType('jpg')).toBe(true);
    expect(isSupportedPlanType('webp')).toBe(true);
  });

  it('does not support unknown', () => {
    expect(isSupportedPlanType('unknown')).toBe(false);
  });
});

// =========================================================
// File Validation
// =========================================================

describe('Plan Scanner: File Validation', () => {
  it('valid PDF passes', () => {
    const result = validatePlanFile('plan.pdf', 1024 * 1024, 'application/pdf');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.fileType).toBe('pdf');
  });

  it('rejects unsupported file type', () => {
    const result = validatePlanFile('plan.docx', 1024, 'application/vnd.openxmlformats');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Unsupported');
  });

  it('rejects file too large', () => {
    const result = validatePlanFile('big.pdf', MAX_PLAN_FILE_SIZE + 1, 'application/pdf');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('too large');
  });

  it('rejects empty file', () => {
    const result = validatePlanFile('empty.pdf', 0, 'application/pdf');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('File is empty.');
  });

  it('accepts file at max size', () => {
    const result = validatePlanFile('max.pdf', MAX_PLAN_FILE_SIZE, 'application/pdf');
    expect(result.valid).toBe(true);
  });

  it('accepts JPG with JPEG MIME', () => {
    const result = validatePlanFile('photo.jpg', 500000, 'image/jpeg');
    expect(result.valid).toBe(true);
    expect(result.fileType).toBe('jpg');
  });
});

// =========================================================
// Plan File Factory
// =========================================================

describe('Plan Scanner: Plan File Factory', () => {
  it('creates a plan file with id and metadata', () => {
    const pf = createPlanFile('roof.pdf', 2000000, 'blob:http://...', 'application/pdf');
    expect(pf.id).toBeTruthy();
    expect(pf.filename).toBe('roof.pdf');
    expect(pf.fileType).toBe('pdf');
    expect(pf.fileSizeBytes).toBe(2000000);
    expect(pf.uploadedAt).toBeTruthy();
  });
});

// =========================================================
// Scale Calibration
// =========================================================

describe('Plan Scanner: Scale Calibration', () => {
  it('creates default calibration (uncalibrated)', () => {
    const cal = createDefaultCalibration();
    expect(cal.calibrated).toBe(false);
    expect(cal.pixelsPerMeter).toBeNull();
    expect(cal.calibratedAt).toBeNull();
  });

  it('computes pixels per meter from meters', () => {
    const ppm = computePixelsPerMeter(5, 'm', 500);
    expect(ppm).toBe(100); // 500px / 5m = 100 px/m
  });

  it('computes pixels per meter from feet', () => {
    const ppm = computePixelsPerMeter(10, 'ft', 304.8);
    // 10ft = 3.048m, 304.8px / 3.048m = 100 px/m
    expect(ppm).toBeCloseTo(100, 1);
  });

  it('computes pixels per meter from cm', () => {
    const ppm = computePixelsPerMeter(500, 'cm', 200);
    // 500cm = 5m, 200px / 5m = 40 px/m
    expect(ppm).toBe(40);
  });

  it('computes pixels per meter from mm', () => {
    const ppm = computePixelsPerMeter(5000, 'mm', 200);
    // 5000mm = 5m, 200px / 5m = 40 px/m
    expect(ppm).toBe(40);
  });

  it('returns null for zero known length', () => {
    expect(computePixelsPerMeter(0, 'm', 500)).toBeNull();
  });

  it('returns null for zero pixel length', () => {
    expect(computePixelsPerMeter(5, 'm', 0)).toBeNull();
  });

  it('returns null for unknown unit', () => {
    expect(computePixelsPerMeter(5, 'inches', 500)).toBeNull();
  });

  it('returns null for negative values', () => {
    expect(computePixelsPerMeter(-5, 'm', 500)).toBeNull();
    expect(computePixelsPerMeter(5, 'm', -500)).toBeNull();
  });
});

// =========================================================
// Complete Calibration
// =========================================================

describe('Plan Scanner: Complete Calibration', () => {
  it('completes calibration with valid data', () => {
    const cal = createDefaultCalibration();
    const result = completeCalibration(cal, 5, 'm', 500);
    expect(result.calibrated).toBe(true);
    expect(result.pixelsPerMeter).toBe(100);
    expect(result.calibratedAt).toBeTruthy();
  });

  it('does not complete calibration with invalid data', () => {
    const cal = createDefaultCalibration();
    const result = completeCalibration(cal, 0, 'm', 500);
    expect(result.calibrated).toBe(false);
    expect(result.pixelsPerMeter).toBeNull();
    expect(result.calibratedAt).toBeNull();
  });
});
