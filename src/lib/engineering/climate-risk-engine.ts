/**
 * FRELUX Hyper-Local Climate & Weather Risk Engine
 *
 * Connects construction scheduling timelines directly to hyper-local GPS coordinates
 * and weather predictive risk models (Precipitation, Freeze/Frost, Humidity, High Wind).
 *
 * Computes:
 * - Activity-specific risk scoring (e.g. Concrete Casting, Roof Painting, Screeding, Deep Excavation)
 * - Timeline impact alerts with protective recommendations (e.g. adjust delivery, cure delay)
 * - 7-day hyper-local forecast simulation / live provider hook
 */

export type WeatherRiskLevel = 'low' | 'moderate' | 'high' | 'severe';

export interface WeatherRiskAlert {
  id: string;
  stageName: string;
  activityType: 'concrete_casting' | 'roof_painting' | 'screeding_plastering' | 'excavation_earthworks' | 'external_tiling' | 'bricklaying';
  targetDate: string;
  riskLevel: WeatherRiskLevel;
  riskFactor: 'precipitation' | 'freezing_temperature' | 'high_wind' | 'extreme_humidity_monsoon';
  probabilityPercent: number;
  expectedMetric: string;
  alertMessage: string;
  recommendation: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  locationName: string;
}

/**
 * Evaluates weather risk for key construction stages given coordinates and season/forecast
 */
export function evaluateStageWeatherRisk(params: {
  stageName: string;
  activityType: WeatherRiskAlert['activityType'];
  scheduledDate: string;
  coords: Coordinates;
  forecastTempMinC?: number;
  forecastPrecipMm?: number;
  forecastWindKph?: number;
}): WeatherRiskAlert | null {
  const precip = params.forecastPrecipMm ?? 0;
  const tempMin = params.forecastTempMinC ?? 24;
  const wind = params.forecastWindKph ?? 12;

  // 1. Concrete Casting
  if (params.activityType === 'concrete_casting') {
    if (precip > 15) {
      return {
        id: `risk-concrete-${params.scheduledDate}`,
        stageName: params.stageName,
        activityType: 'concrete_casting',
        targetDate: params.scheduledDate,
        riskLevel: 'high',
        riskFactor: 'precipitation',
        probabilityPercent: Math.min(95, Math.round(precip * 4)),
        expectedMetric: `${precip}mm heavy precipitation expected`,
        alertMessage: `Weather risk high for concrete casting on ${params.scheduledDate}. Heavy rainfall will wash away cement paste and degrade water-cement ratio.`,
        recommendation: 'Postpone ready-mix delivery or prepare heavy-duty waterproof tarpaulins to cover freshly poured slab immediately.'
      };
    }
    if (tempMin < 3) {
      return {
        id: `risk-concrete-freeze-${params.scheduledDate}`,
        stageName: params.stageName,
        activityType: 'concrete_casting',
        targetDate: params.scheduledDate,
        riskLevel: 'severe',
        riskFactor: 'freezing_temperature',
        probabilityPercent: 90,
        expectedMetric: `Sub-zero / near freezing (${tempMin}°C) low predicted`,
        alertMessage: `Freeze warning for concrete casting on ${params.scheduledDate}. Freezing hydration water causes micro-cracking and loss of compressive strength.`,
        recommendation: 'Use heated aggregates, calcium chloride accelerators, or thermal curing blankets.'
      };
    }
  }

  // 2. Roof Painting / Waterproofing
  if (params.activityType === 'roof_painting') {
    if (precip > 2) {
      return {
        id: `risk-roof-${params.scheduledDate}`,
        stageName: params.stageName,
        activityType: 'roof_painting',
        targetDate: params.scheduledDate,
        riskLevel: 'high',
        riskFactor: 'precipitation',
        probabilityPercent: 88,
        expectedMetric: `${precip}mm rain forecasted during drying window`,
        alertMessage: `Weather risk high for roof painting / coatings on ${params.scheduledDate}. Moisture stops adhesion and causes blistering or wash-off.`,
        recommendation: 'Reschedule coating application until at least 48 hours of continuous dry weather are confirmed.'
      };
    }
    if (wind > 35) {
      return {
        id: `risk-roof-wind-${params.scheduledDate}`,
        stageName: params.stageName,
        activityType: 'roof_painting',
        targetDate: params.scheduledDate,
        riskLevel: 'moderate',
        riskFactor: 'high_wind',
        probabilityPercent: 75,
        expectedMetric: `High gusts up to ${wind} km/h`,
        alertMessage: `Hazardous high wind on roof level for ${params.scheduledDate}. Fall risk and severe spray drift loss.`,
        recommendation: 'Cease elevated roof spraying or install certified harness tie-offs and perimeter windbreak screens.'
      };
    }
  }

  // 3. Excavation & Earthworks
  if (params.activityType === 'excavation_earthworks') {
    if (precip > 10) {
      return {
        id: `risk-excavation-${params.scheduledDate}`,
        stageName: params.stageName,
        activityType: 'excavation_earthworks',
        targetDate: params.scheduledDate,
        riskLevel: 'high',
        riskFactor: 'precipitation',
        probabilityPercent: 82,
        expectedMetric: `${precip}mm rain with ground saturation risk`,
        alertMessage: `Trench collapse and flooding hazard for excavation works on ${params.scheduledDate}.`,
        recommendation: 'Ensure de-watering sump pumps are on standby and timber shoring / trench boxes are installed.'
      };
    }
  }

  // 4. Plastering & Screeding
  if (params.activityType === 'screeding_plastering') {
    if (precip > 4) {
      return {
        id: `risk-screed-${params.scheduledDate}`,
        stageName: params.stageName,
        activityType: 'screeding_plastering',
        targetDate: params.scheduledDate,
        riskLevel: 'moderate',
        riskFactor: 'precipitation',
        probabilityPercent: 70,
        expectedMetric: `${precip}mm ambient rainfall`,
        alertMessage: `Rain ingress hazard for screeding / external plastering on ${params.scheduledDate}.`,
        recommendation: 'Ensure exterior window openings and roof carcass are sealed before proceeding with floor screeding.'
      };
    }
  }

  return null;
}
