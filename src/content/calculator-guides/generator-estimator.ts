import type { CalculatorGuide } from "@/components/calculators/CalculatorGuideBlock";

/**
 * Guide text for the backup power generator and transfer switch estimator.
 *
 * Standby generation requires matching user-selected kVA brackets to electrical
 * changeover switchgear, heavy gauge armoured copper feeders, dedicated safety
 * earthing, and concrete vibration foundation pads.
 */
export const generatorEstimatorGuide: CalculatorGuide = {
  slug: "generator-estimator",
  heading: "How the backup generator and transfer switch estimator works",
  howItWorks: [
    "Select the generator power capacity bracket in kVA or kW. The capacity must come from a comprehensive load assessment that accounts for continuous running watts as well as inductive starting surges from air conditioner compressors and borehole water pumps.",
    "Size the Automatic Transfer Switch (ATS) or manual changeover switch. The switchgear rating must match or exceed the main utility service breaker amperage, ensuring safe mechanical and electrical interlock isolation between mains supply and generator power.",
    "Measure the cable run distance between the outdoor generator plinth and the main electrical distribution panel. Heavy copper multi-core steel wire armoured (SWA) cable is sized to keep voltage drop under 2.5 per cent across the full running current.",
    "Schedule dedicated electrical safety earthing. Stationary generators require an independent low-resistance earth electrode (minimum 16 mm copper-bonded rod), earth clamp, inspection pit, and high conductivity green/yellow earth bonding conductor.",
    "Estimate civil and mechanical installation requirements. Every diesel or petrol set requires a reinforced concrete foundation plinth (150 mm thick) isolated with anti-vibration rubber mounts, exhaust pipe thermal lagging, and battery float chargers.",
  ],
  workedExample: {
    intro:
      "A residential building installing a 20 kVA three-phase diesel soundproof generator located 18 metres from the main distribution board, requiring automatic changeover and dedicated earthing.",
    steps: [
      {
        label: "Generator rating",
        value: "20 kVA (16 kW at 0.8 power factor)",
      },
      { label: "Full load rated current", value: "28.8 Amps per phase" },
      {
        label: "Automatic Transfer Switch (ATS)",
        value: "63 Amp 4-pole contactor ATS",
      },
      {
        label: "Armoured cable run (18 m + 15% route slack)",
        value: "21.0 m of 4-core 16 mm² XLPE/SWA copper",
      },
      {
        label: "Earth electrode system",
        value: "1 x 1.8 m copper-bonded rod with concrete pit",
      },
      {
        label: "Concrete plinth (150 mm thick)",
        value: "1.8 m x 1.0 m x 0.15 m (0.27 m³ C25 concrete)",
      },
      {
        label: "Starting battery",
        value: "12 V 100 Ah maintenance-free calcium battery",
      },
    ],
    result:
      "The installation requires a 20 kVA generator, 63 A 4-pole ATS unit, 21 metres of 16 mm² 4-core armoured cable, an earthing assembly, and a 0.27 m³ concrete pad.",
    note: "The ATS rating is based on electrical service capacity to prevent breaker tripping during utility load spikes. Fuel consumption averages 4.5 litres per hour at 75% load.",
  },
  ratioTable: {
    caption:
      "Standard standby generator kVA ratings, typical fuel burn, minimum cable sizes, and ATS ratings.",
    columns: [
      "Generator Rating",
      "Continuous kW (0.8 PF)",
      "Fuel Burn at 75% Load",
      "Minimum ATS Rating",
      "Armoured Cable (up to 25m)",
    ],
    rows: [
      [
        "7.5 kVA (Single Phase)",
        "6.0 kW",
        "2.1 L/hr (petrol/diesel)",
        "40 Amp 2-pole",
        "3-core 10 mm² copper",
      ],
      [
        "12.5 kVA (Single Phase)",
        "10.0 kW",
        "3.2 L/hr (diesel)",
        "63 Amp 2-pole",
        "3-core 16 mm² copper",
      ],
      [
        "15 kVA (Three Phase)",
        "12.0 kW",
        "3.8 L/hr (diesel)",
        "40 Amp 4-pole",
        "4-core 10 mm² copper",
      ],
      [
        "20 kVA (Three Phase)",
        "16.0 kW",
        "4.5 L/hr (diesel)",
        "63 Amp 4-pole",
        "4-core 16 mm² copper",
      ],
      [
        "30 kVA (Three Phase)",
        "24.0 kW",
        "6.2 L/hr (diesel)",
        "80 Amp 4-pole",
        "4-core 25 mm² copper",
      ],
      [
        "50 kVA (Three Phase)",
        "40.0 kW",
        "10.5 L/hr (diesel)",
        "125 Amp 4-pole",
        "4-core 35 mm² copper",
      ],
    ],
  },
  faqs: [
    {
      question:
        "Why does the estimator not calculate generator sizing automatically?",
      answer:
        "Generator sizing depends on simultaneous appliance diversity and electric motor inrush currents, which can be three times the running wattage. Sizing without an on-site clamp meter audit risks severe undersizing or wasteful generator fuel wet-stacking.",
    },
    {
      question:
        "What is the difference between Standby (ESP) and Prime (PRP) power ratings?",
      answer:
        "Emergency Standby Power (ESP) is the maximum output available for the duration of a utility power outage with varying load. Prime Power (PRP) is the continuous power rating for unlimited annual operating hours with an average 70 per cent load factor.",
    },
    {
      question:
        "Why is a 4-pole ATS required for three-phase installations instead of 3-pole?",
      answer:
        "A 4-pole transfer switch breaks all three phase conductors as well as the neutral conductor. This isolates the generator neutral from the mains utility neutral, preventing dangerous stray circulating neutral currents and false earth leakage tripping.",
    },
    {
      question:
        "Why is an independent earthing rod essential for a standby generator?",
      answer:
        "When the utility supply fails, the generator acts as a separately derived electrical source. It must possess its own low-resistance path to earth (ideally under 5 ohms) to ensure circuit breakers trip instantaneously in the event of an insulation short circuit.",
    },
    {
      question:
        "What civil foundation does a soundproof canopy generator require?",
      answer:
        "Stationary generators should be mounted on a reinforced concrete slab at least 150 mm thick, extending 150 mm to 300 mm beyond the canopy perimeter. The concrete mass dampens low-frequency engine vibrations and prevents plinth settlement.",
    },
  ],
  limits:
    "This calculator provides equipment and material takeoff for installation planning only. The power capacity bracket is chosen by the user and does not replace a physical electrical load audit, harmonic distortion study, or local municipal emissions permit.",
};
