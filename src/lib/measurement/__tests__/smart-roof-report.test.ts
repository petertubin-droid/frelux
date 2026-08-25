import { describe, it, expect } from 'vitest';
import { buildSmartRoofReport } from '../smart-roof-report';
import type { VerificationState } from '../verification-states';

describe('Feature 20: Smart Roof Report', () => {
  const mockVerification = (state: VerificationState) => state;

  it('builds a complete smart roof report', () => {
    const report = buildSmartRoofReport({
      projectName: 'Test House',
      buildingName: 'Main House',
      location: 'Lagos, Nigeria',
      measurementSource: 'user_verified',
      roofSummary: {
        totalGrossArea: 200,
        totalNetArea: 185,
        sectionCount: 2,
        areaUnit: 'm²',
        sections: [
          { sectionName: 'Main Roof', grossArea: 150, netArea: 140, pitch: '30°', roofType: 'Hip', verificationState: mockVerification('user_verified') },
          { sectionName: 'Garage', grossArea: 50, netArea: 45, pitch: '15°', roofType: 'Shed', verificationState: mockVerification('calculated') },
        ],
      },
      linearMeasurements: [
        { type: 'ridge', label: 'Ridge', length: 12, unit: 'm', count: 1, verificationState: mockVerification('user_verified') },
        { type: 'eave', label: 'Eave', length: 40, unit: 'm', count: 1, verificationState: mockVerification('calculated') },
      ],
      cutouts: [
        { name: 'Skylight', type: 'penetration', area: 2, unit: 'm²', verificationState: mockVerification('manual_input') },
      ],
      materialRequirements: [
        { materialName: 'Roofing Sheets', requiredQuantity: 185, unit: 'm²', wastePercent: 10, purchaseQuantity: 203.5, verificationState: mockVerification('calculated'), explanation: '185 m² + 10% waste' },
      ],
      wasteEntries: [
        { materialName: 'Roofing Sheets', wastePercent: 10, wasteAmount: 18.5, unit: 'm²' },
      ],
      marketPrices: [
        { materialName: 'Roofing Sheets', unitPrice: 3500, currency: 'NGN', priceSource: 'market_intelligence', priceVerified: true, priceFreshness: '5 days', lineTotal: 712250 },
      ],
      confidence: {
        overallConfidence: 'high',
        verificationStates: [
          { label: 'Roof sections', state: 'user_verified', count: 2 },
          { label: 'Linear measurements', state: 'calculated', count: 1 },
        ],
      },
      calculationSteps: [
        { step: 'Gross area calculation', detail: '150 m² + 50 m² = 200 m²', verificationState: mockVerification('calculated') },
      ],
    });

    expect(report.metadata.projectName).toBe('Test House');
    expect(report.metadata.buildingName).toBe('Main House');
    expect(report.metadata.location).toBe('Lagos, Nigeria');
    expect(report.metadata.measurementSource).toBe('user_verified');
    expect(report.metadata.measurementSourceLabel).toBe('User Verified');
  });

  it('includes roof summary with gross/net area and sections', () => {
    const report = buildSmartRoofReport({
      projectName: 'Test',
      roofSummary: {
        totalGrossArea: 200, totalNetArea: 185, sectionCount: 2, areaUnit: 'm²',
        sections: [
          { sectionName: 'Main', grossArea: 150, netArea: 140, pitch: '30°', roofType: 'Hip', verificationState: 'user_verified' },
          { sectionName: 'Garage', grossArea: 50, netArea: 45, pitch: '15°', roofType: 'Shed', verificationState: 'calculated' },
        ],
      },
      linearMeasurements: [], cutouts: [], materialRequirements: [], wasteEntries: [],
      marketPrices: [], confidence: { overallConfidence: 'high', verificationStates: [] },
      calculationSteps: [],
    });
    expect(report.roofSummary.totalGrossArea).toBe(200);
    expect(report.roofSummary.totalNetArea).toBe(185);
    expect(report.roofSummary.sections).toHaveLength(2);
    expect(report.roofSummary.sections[0].pitch).toBe('30°');
  });

  it('calculates total linear measurement length', () => {
    const report = buildSmartRoofReport({
      projectName: 'Test',
      roofSummary: { totalGrossArea: 100, totalNetArea: 90, sectionCount: 1, areaUnit: 'm²', sections: [] },
      linearMeasurements: [
        { type: 'ridge', label: 'Ridge', length: 12, unit: 'm', count: 1, verificationState: 'user_verified' },
        { type: 'eave', label: 'Eave', length: 40, unit: 'm', count: 2, verificationState: 'calculated' },
      ],
      cutouts: [], materialRequirements: [], wasteEntries: [],
      marketPrices: [], confidence: { overallConfidence: 'high', verificationStates: [] },
      calculationSteps: [],
    });
    // 12*1 + 40*2 = 92
    expect(report.linearMeasurements.totalLength).toBe(92);
  });

  it('includes cutouts with total area', () => {
    const report = buildSmartRoofReport({
      projectName: 'Test',
      roofSummary: { totalGrossArea: 100, totalNetArea: 90, sectionCount: 1, areaUnit: 'm²', sections: [] },
      linearMeasurements: [],
      cutouts: [
        { name: 'Skylight 1', type: 'penetration', area: 2, unit: 'm²', verificationState: 'manual_input' },
        { name: 'Vent', type: 'penetration', area: 0.5, unit: 'm²', verificationState: 'manual_input' },
      ],
      materialRequirements: [], wasteEntries: [],
      marketPrices: [], confidence: { overallConfidence: 'high', verificationStates: [] },
      calculationSteps: [],
    });
    expect(report.cutouts.entries).toHaveLength(2);
    expect(report.cutouts.totalCutoutArea).toBe(2.5);
  });

  it('includes material requirements with waste and purchase quantities', () => {
    const report = buildSmartRoofReport({
      projectName: 'Test',
      roofSummary: { totalGrossArea: 100, totalNetArea: 90, sectionCount: 1, areaUnit: 'm²', sections: [] },
      linearMeasurements: [], cutouts: [],
      materialRequirements: [
        { materialName: 'Roofing Sheets', requiredQuantity: 185, unit: 'm²', wastePercent: 10, purchaseQuantity: 203.5, verificationState: 'calculated', explanation: '185 + 10%' },
        { materialName: 'Screws', requiredQuantity: 500, unit: 'pcs', wastePercent: 5, purchaseQuantity: 525, verificationState: 'calculated', explanation: '500 + 5%' },
      ],
      wasteEntries: [], marketPrices: [],
      confidence: { overallConfidence: 'high', verificationStates: [] },
      calculationSteps: [],
    });
    expect(report.materialRequirements.entries).toHaveLength(2);
    expect(report.materialRequirements.totalMaterials).toBe(2);
  });

  it('distinguishes verified and unverified market prices', () => {
    const report = buildSmartRoofReport({
      projectName: 'Test',
      roofSummary: { totalGrossArea: 100, totalNetArea: 90, sectionCount: 1, areaUnit: 'm²', sections: [] },
      linearMeasurements: [], cutouts: [], materialRequirements: [], wasteEntries: [],
      marketPrices: [
        { materialName: 'Sheets', unitPrice: 3500, currency: 'NGN', priceSource: 'market_intelligence', priceVerified: true, priceFreshness: '5 days', lineTotal: 712250 },
        { materialName: 'Ridge caps', unitPrice: 0, currency: 'NGN', priceSource: 'not_configured', priceVerified: false, priceFreshness: 'N/A', lineTotal: 0 },
      ],
      confidence: { overallConfidence: 'high', verificationStates: [] },
      calculationSteps: [],
    });
    expect(report.marketPrices.hasVerifiedPrices).toBe(true);
    expect(report.marketPrices.unpricedCount).toBe(1);
    expect(report.marketPrices.totalCost).toBe(712250);
  });

  it('handles no market prices gracefully', () => {
    const report = buildSmartRoofReport({
      projectName: 'Test',
      roofSummary: { totalGrossArea: 100, totalNetArea: 90, sectionCount: 1, areaUnit: 'm²', sections: [] },
      linearMeasurements: [], cutouts: [], materialRequirements: [], wasteEntries: [],
      marketPrices: [],
      confidence: { overallConfidence: 'medium', verificationStates: [] },
      calculationSteps: [],
    });
    expect(report.marketPrices.hasVerifiedPrices).toBe(false);
    expect(report.marketPrices.unpricedCount).toBe(0);
    expect(report.marketPrices.explanation).toContain('No verified market prices available');
  });

  it('includes confidence/verification states with counts by source', () => {
    const report = buildSmartRoofReport({
      projectName: 'Test',
      roofSummary: {
        totalGrossArea: 100, totalNetArea: 90, sectionCount: 2, areaUnit: 'm²',
        sections: [
          { sectionName: 'A', grossArea: 50, netArea: 45, pitch: '30°', roofType: 'Hip', verificationState: 'ai_detected' },
          { sectionName: 'B', grossArea: 50, netArea: 45, pitch: '30°', roofType: 'Hip', verificationState: 'user_verified' },
        ],
      },
      linearMeasurements: [
        { type: 'ridge', label: 'Ridge', length: 12, unit: 'm', count: 1, verificationState: 'calculated' },
      ],
      cutouts: [], materialRequirements: [], wasteEntries: [],
      marketPrices: [
        { materialName: 'Sheets', unitPrice: 3500, currency: 'NGN', priceSource: 'market_intelligence', priceVerified: true, priceFreshness: '5 days', lineTotal: 350000 },
      ],
      confidence: { overallConfidence: 'high', verificationStates: [] },
      calculationSteps: [],
    });
    expect(report.confidence.aiDetectedCount).toBe(1);
    expect(report.confidence.userVerifiedCount).toBe(1);
    expect(report.confidence.calculatedCount).toBe(1);
    expect(report.confidence.marketPriceVerifiedCount).toBe(0); // market price verified is separate state
  });

  it('includes calculation explanation steps', () => {
    const report = buildSmartRoofReport({
      projectName: 'Test',
      roofSummary: { totalGrossArea: 100, totalNetArea: 90, sectionCount: 1, areaUnit: 'm²', sections: [] },
      linearMeasurements: [], cutouts: [], materialRequirements: [], wasteEntries: [],
      marketPrices: [],
      confidence: { overallConfidence: 'high', verificationStates: [] },
      calculationSteps: [
        { step: 'Gross area', detail: '50 + 50 = 100 m²', verificationState: 'calculated' },
        { step: 'Waste', detail: '100 × 10% = 10 m²', verificationState: 'calculated' },
      ],
    });
    expect(report.calculationExplanation.entries).toHaveLength(2);
    expect(report.calculationExplanation.entries[0].step).toBe('Gross area');
  });

  it('generates share text for WhatsApp/email', () => {
    const report = buildSmartRoofReport({
      projectName: 'Villa Project',
      buildingName: 'Main House',
      location: 'Lekki, Lagos',
      roofSummary: { totalGrossArea: 200, totalNetArea: 185, sectionCount: 2, areaUnit: 'm²', sections: [] },
      linearMeasurements: [
        { type: 'ridge', label: 'Ridge', length: 12, unit: 'm', count: 1, verificationState: 'user_verified' },
      ],
      cutouts: [], materialRequirements: [], wasteEntries: [],
      marketPrices: [],
      confidence: { overallConfidence: 'high', verificationStates: [] },
      calculationSteps: [],
    });
    expect(report.shareText).toContain('Villa Project');
    expect(report.shareText).toContain('Main House');
    expect(report.shareText).toContain('Lekki, Lagos');
    expect(report.shareText).toContain('FRELUX');
    expect(report.shareText).toContain('Roof Summary');
  });

  it('uses default date when not provided', () => {
    const report = buildSmartRoofReport({
      projectName: 'Test',
      roofSummary: { totalGrossArea: 100, totalNetArea: 90, sectionCount: 1, areaUnit: 'm²', sections: [] },
      linearMeasurements: [], cutouts: [], materialRequirements: [], wasteEntries: [],
      marketPrices: [], confidence: { overallConfidence: 'high', verificationStates: [] },
      calculationSteps: [],
    });
    expect(report.metadata.date).toBeTruthy();
    // Should be a valid date string (YYYY-MM-DD)
    expect(report.metadata.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
