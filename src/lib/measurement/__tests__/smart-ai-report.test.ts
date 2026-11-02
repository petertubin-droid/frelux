import { describe, it, expect } from 'vitest';
import { buildSmartAiImageReport } from '../smart-ai-report';
import type { VerificationState } from '../verification-states';

describe('Feature 21: Smart AI Image Report', () => {
  function makeBaseParams() {
    return {
      imageReference: {
        reference: 'img_001.jpg',
        imageType: 'photo' as const,
        processedDate: '2026-01-15',
        aiProvider: 'Gemini Vision',
        aiModel: 'gemini-3.6-flash',
      },
      detectedBuilding: {
        buildingType: 'Duplex',
        buildingTypeConfidence: 'high' as const,
        estimatedFloors: 2,
        estimatedHeight: 7,
        heightUnit: 'm',
        verificationState: 'ai_detected' as VerificationState,
        aiDetected: '2-story residential building',
        userCorrections: [],
      },
      detectedRooms: [
        { roomName: 'Bedroom 1', roomType: 'bedroom', length: 12, width: 12, unit: 'ft', area: 144, quantity: 1, aiConfidence: 'high' as const, verificationState: 'user_verified' as VerificationState, userCorrections: [] },
        { roomName: 'Living Room', roomType: 'living', length: 15, width: 20, unit: 'ft', area: 300, quantity: 1, aiConfidence: 'moderate' as const, verificationState: 'ai_detected' as VerificationState, userCorrections: ['width: 18→20'] },
      ],
      detectedDimensions: [
        { label: 'Building Length', value: 40, unit: 'ft', dimensionType: 'length' as const, aiConfidence: 'high' as const, verificationState: 'user_verified' as VerificationState, aiOriginalValue: 38, finalValue: 40, userCorrected: true },
        { label: 'Building Width', value: 30, unit: 'ft', dimensionType: 'width' as const, aiConfidence: 'high' as const, verificationState: 'user_verified' as VerificationState, aiOriginalValue: 30, finalValue: 30, userCorrected: false },
      ],
      detectedRoof: {
        roofType: 'Hip',
        roofTypeConfidence: 'high' as const,
        estimatedRoofArea: 200,
        areaUnit: 'm²',
        pitch: '30°',
        verificationState: 'calculated' as VerificationState,
      },
      scaleInfo: {
        status: 'verified' as const,
        referenceObject: 'Door height 2.1m',
        scaleRatio: '1:100',
        userConfirmed: true,
        explanation: 'Scale verified using standard door height',
      },
      aiReview: {
        status: 'reviewed' as const,
        reviewedItems: ['Building dimensions', 'Room areas'],
        correctedItems: ['Building Length'],
        confirmedItems: ['Building Width', 'Building type'],
        reviewDate: '2026-01-15',
      },
      verifiedMeasurements: [
        { label: 'Total Floor Area', value: 2400, unit: 'ft²', category: 'building' as const, source: 'calculated' as VerificationState, derivation: 'Sum of all room areas' },
      ],
      calculationResults: [
        { calculator: 'Build-to-Roof', result: '₦15,000,000', verificationState: 'calculated' as VerificationState, explanation: 'Full estimate with materials + labour' },
      ],
      materialRequirements: [
        { materialName: 'Cement', requiredQuantity: 200, unit: 'bags', wastePercent: 5, purchaseQuantity: 210, verificationState: 'calculated' as VerificationState, unitPrice: 7500, currency: 'NGN', priceVerified: true, priceSource: 'market_intelligence', lineTotal: 1575000, explanation: '200 + 5% waste' },
        { materialName: 'Sand', requiredQuantity: 5, unit: 'trips', wastePercent: 0, purchaseQuantity: 5, verificationState: 'calculated' as VerificationState, unitPrice: 0, currency: 'NGN', priceVerified: false, priceSource: 'not_configured', lineTotal: 0, explanation: 'No price configured' },
      ],
      confidence: {
        overallConfidence: 'high' as const,
        aiDetectionConfidence: 'high' as const,
        scaleConfidence: 'verified' as const,
        calculationConfidence: 'high' as const,
        marketPriceConfidence: 'medium' as const,
      },
    };
  }

  it('builds a complete smart AI image report', () => {
    const report = buildSmartAiImageReport(makeBaseParams());
    expect(report.imageReference.reference).toBe('img_001.jpg');
    expect(report.detectedBuilding.buildingType).toBe('Duplex');
    expect(report.detectedRooms).toHaveLength(2);
    expect(report.detectedDimensions).toHaveLength(2);
    expect(report.detectedRoof).not.toBeNull();
    expect(report.scaleInfo.status).toBe('verified');
    expect(report.aiReview.status).toBe('reviewed');
  });

  it('includes image/plan reference', () => {
    const report = buildSmartAiImageReport(makeBaseParams());
    expect(report.imageReference.imageType).toBe('photo');
    expect(report.imageReference.aiProvider).toBe('Gemini Vision');
    expect(report.imageReference.processedDate).toBe('2026-01-15');
  });

  it('includes detected building information', () => {
    const report = buildSmartAiImageReport(makeBaseParams());
    expect(report.detectedBuilding.buildingType).toBe('Duplex');
    expect(report.detectedBuilding.buildingTypeConfidence).toBe('high');
    expect(report.detectedBuilding.estimatedFloors).toBe(2);
    expect(report.detectedBuilding.verificationState).toBe('ai_detected');
  });

  it('includes detected rooms with verification states', () => {
    const report = buildSmartAiImageReport(makeBaseParams());
    expect(report.detectedRooms[0].verificationState).toBe('user_verified');
    expect(report.detectedRooms[1].verificationState).toBe('ai_detected');
    expect(report.detectedRooms[1].userCorrections).toContain('width: 18→20');
  });

  it('includes detected dimensions with AI original and user-corrected values', () => {
    const report = buildSmartAiImageReport(makeBaseParams());
    const dim = report.detectedDimensions[0];
    expect(dim.aiOriginalValue).toBe(38);
    expect(dim.finalValue).toBe(40);
    expect(dim.userCorrected).toBe(true);
  });

  it('includes detected roof information', () => {
    const report = buildSmartAiImageReport(makeBaseParams());
    expect(report.detectedRoof!.roofType).toBe('Hip');
    expect(report.detectedRoof!.verificationState).toBe('calculated');
  });

  it('includes scale status', () => {
    const report = buildSmartAiImageReport(makeBaseParams());
    expect(report.scaleInfo.status).toBe('verified');
    expect(report.scaleInfo.userConfirmed).toBe(true);
    expect(report.scaleInfo.referenceObject).toBe('Door height 2.1m');
  });

  it('includes AI review status with corrections and confirmations', () => {
    const report = buildSmartAiImageReport(makeBaseParams());
    expect(report.aiReview.status).toBe('reviewed');
    expect(report.aiReview.correctedItems).toContain('Building Length');
    expect(report.aiReview.confirmedItems).toContain('Building Width');
  });

  it('includes verified measurements', () => {
    const report = buildSmartAiImageReport(makeBaseParams());
    expect(report.verifiedMeasurements).toHaveLength(1);
    expect(report.verifiedMeasurements[0].label).toBe('Total Floor Area');
    expect(report.verifiedMeasurements[0].source).toBe('calculated');
  });

  it('includes calculation results', () => {
    const report = buildSmartAiImageReport(makeBaseParams());
    expect(report.calculationResults).toHaveLength(1);
    expect(report.calculationResults[0].calculator).toBe('Build-to-Roof');
  });

  it('includes material requirements with price status', () => {
    const report = buildSmartAiImageReport(makeBaseParams());
    expect(report.materialRequirements).toHaveLength(2);
    expect(report.materialRequirements[0].priceVerified).toBe(true);
    expect(report.materialRequirements[1].priceVerified).toBe(false);
  });

  it('distinguishes AI detected, user corrected, verified, calculated, and market price verified', () => {
    const report = buildSmartAiImageReport(makeBaseParams());
    expect(report.confidence.aiDetectedCount).toBeGreaterThan(0);
    expect(report.confidence.userCorrectedCount).toBeGreaterThan(0);
    expect(report.confidence.userVerifiedCount).toBeGreaterThan(0);
    expect(report.confidence.calculatedCount).toBeGreaterThan(0);
  });

  it('clearly states AI confidence does not guarantee calculation accuracy', () => {
    const report = buildSmartAiImageReport(makeBaseParams());
    const text = report.confidence.explanation.join(' ');
    expect(text).toContain('does NOT guarantee calculation accuracy');
    expect(text).toContain('does NOT mean its market price is verified');
  });

  it('generates share text', () => {
    const report = buildSmartAiImageReport(makeBaseParams());
    expect(report.shareText).toContain('FRELUX AI Image Report');
    expect(report.shareText).toContain('Gemini Vision');
    expect(report.shareText).toContain('Duplex');
    expect(report.shareText).toContain('Bedroom 1');
  });

  it('generates full explanation text', () => {
    const report = buildSmartAiImageReport(makeBaseParams());
    const text = report.explanation.join('\n');
    expect(text).toContain('Detected Building');
    expect(text).toContain('Detected Rooms');
    expect(text).toContain('Scale Status');
    expect(text).toContain('AI Review');
    expect(text).toContain('Material Requirements');
    expect(text).toContain('Confidence Summary');
  });

  it('handles null roof info', () => {
    const baseParams = makeBaseParams();
    const report = buildSmartAiImageReport({ ...baseParams, detectedRoof: null });
    expect(report.detectedRoof).toBeNull();
  });
});
