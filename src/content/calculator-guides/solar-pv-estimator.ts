import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the solar PV roofing and system estimator.
 *
 * Estimating photovoltaic solar installations involves sizing daily kilowatt-hour
 * generation, solar module array layout, inverter capacity ratios, battery storage
 * autonomy, and essential balance-of-system electrical components.
 */
export const solarPvEstimatorGuide: CalculatorGuide = {
  slug: "solar-pv-estimator",
  heading: "How the solar PV roofing and system estimator works",
  howItWorks: [
    "Determine the daily household electrical energy demand in kilowatt-hours (kWh/day) from recent utility bills or by summing individual appliance wattages and daily operating hours.",
    "Factor in the location solar resource, known as Peak Sun Hours (PSH). Divide daily energy target by peak sun hours and apply a system performance ratio of 0.75 to 0.80 to account for inverter conversion loss, cable resistance, module dirt, and temperature degradation.",
    "Calculate the required solar array peak capacity (kWp). Divide the total peak wattage by the chosen monocrystalline panel rating (typically 450 W to 550 W per module) to determine total solar module count.",
    "Verify available unshaded roof area. Modern high efficiency monocrystalline solar panels require approximately 5.5 m² to 6.2 m² of unobstructed roof space per kilowatt-peak, oriented toward the equator at an optimal tilt angle.",
    "Size the power inverter and balance of system accessories. The inverter is selected with a DC-to-AC oversizing ratio between 1.15 and 1.30, matched with aluminum mounting rails, mid and end clamps, double-insulated 4 mm² or 6 mm² UV-resistant DC solar cables, DC disconnect isolators, and AC/DC surge protection devices.",
  ],
  workedExample: {
    intro:
      "A four-bedroom household consuming an average of 18 kWh per day in a region with 4.8 peak sun hours, using 500 W monocrystalline panels, a hybrid inverter, and lithium iron phosphate (LiFePO4) storage.",
    steps: [
      { label: "Daily consumption target", value: "18.0 kWh/day" },
      { label: "Peak sun hours (PSH)", value: "4.8 hours" },
      { label: "System performance ratio", value: "0.78 (78% efficiency)" },
      {
        label: "Required array capacity",
        value: "4.81 kWp (18 / (4.8 x 0.78))",
      },
      {
        label: "Module count (500 W panels)",
        value: "10 modules (5.0 kWp total)",
      },
      { label: "Required roof area", value: "28.5 m² unobstructed surface" },
      { label: "Hybrid inverter capacity", value: "5.0 kW continuous AC" },
      {
        label: "Battery storage (1 night autonomy)",
        value: "10.0 kWh LiFePO4 (90% DoD)",
      },
    ],
    result:
      "The system requires 10 modules of 500 W (5.0 kWp photovoltaic field), a 5 kW hybrid inverter, 28.5 m² of mounting rails, and a 10 kWh lithium battery bank.",
    note: "Actual daily harvest varies with seasonal cloud cover, panel azimuth orientation, and ambient temperature, as solar cells lose approximately 0.35% efficiency per degree Celsius above 25°C.",
  },
  ratioTable: {
    caption:
      "Solar panel module footprints, typical array capacities, and inverter sizing parameters.",
    columns: [
      "Array Capacity",
      "Panel Count (500 W)",
      "Roof Area Needed",
      "Recommended Inverter",
      "Typical Daily Yield",
    ],
    rows: [
      [
        "3.0 kWp System",
        "6 panels",
        "17 to 19 m²",
        "3.0 kW string/hybrid",
        "12 to 14 kWh/day",
      ],
      [
        "5.0 kWp System",
        "10 panels",
        "28 to 31 m²",
        "5.0 kW hybrid",
        "20 to 24 kWh/day",
      ],
      [
        "8.0 kWp System",
        "16 panels",
        "45 to 50 m²",
        "8.0 kW hybrid",
        "32 to 38 kWh/day",
      ],
      [
        "10.0 kWp System",
        "20 panels",
        "56 to 62 m²",
        "10.0 kW three-phase",
        "40 to 48 kWh/day",
      ],
      [
        "15.0 kWp System",
        "30 panels",
        "84 to 93 m²",
        "15.0 kW commercial",
        "60 to 72 kWh/day",
      ],
    ],
  },
  faqs: [
    {
      question:
        "What is the difference between Peak Sun Hours and total daylight hours?",
      answer:
        "Daylight hours measure the total time the sun is above the horizon. Peak sun hours describe the equivalent number of hours when solar irradiance averages 1,000 watts per square metre. An area with 12 hours of daylight may only experience 4.5 to 5.5 peak sun hours.",
    },
    {
      question: "Why is an inverter DC to AC ratio above 1.0 recommended?",
      answer:
        "Solar modules rarely operate at their theoretical laboratory peak due to heat, hazy skies, and angle of incidence. Sizing the DC array 15 to 25 per cent larger than the inverter AC rating ensures the inverter runs near its highest efficiency curve for more hours each day.",
    },
    {
      question:
        "How much battery storage do I need for overnight power backup?",
      answer:
        "Determine the critical evening and night electrical loads (typically 50 to 60 per cent of daily total). For Lithium LiFePO4 batteries with an 85 to 90 per cent depth of discharge (DoD), divide evening energy demand by 0.85 to calculate necessary battery bank capacity in kilowatt-hours.",
    },
    {
      question:
        "Does solar panel orientation and roof pitch make a significant difference?",
      answer:
        "Yes. In the Northern Hemisphere, panels should face true south at an angle roughly equal to local latitude minus 5 degrees for annual optimization. Facing east or west reduces peak yield by 12 to 18 per cent, which requires additional panels to compensate.",
    },
    {
      question:
        "What safety disconnects are mandatory in a rooftop solar installation?",
      answer:
        "Every installation requires a dedicated lockable DC isolator switch near the inverter, rapid shutdown or string fusing, AC circuit breaker, and Type 2 Surge Protective Devices (SPD) on both DC and AC lines to protect equipment from lightning surges.",
    },
  ],
  limits:
    "This calculator provides preliminary equipment and material quantity estimates. It does not replace detailed solar engineering shadow modeling, roof structural truss load analysis, or certified electrical utility grid interconnection permits.",
};
