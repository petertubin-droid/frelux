/**
 * Long tail questions that live on the borehole estimator page itself.
 *
 * These stay out of the shared tool FAQ registry on purpose. The registry
 * carries a five question guarantee and a long form article under a word cap,
 * so adding hardware and cost questions there would push the article past its
 * limit. A page that owns its copy renders these with FaqItemsWithSchema, which
 * still emits matching FAQPage markup from the same strings.
 *
 * Every answer describes what the calculator actually does with the inputs. No
 * price, casing length or horsepower figure is quoted here that the tool cannot
 * produce from its own arithmetic.
 */

export interface PageFaq {
  question: string;
  answer: string;
}

export const BOREHOLE_SEO_FAQS: PageFaq[] = [
  {
    question: "What pump horsepower (HP) do I need for a 250 feet borehole?",
    answer:
      "Depth alone does not answer it. The calculator adds the static lift from the pumping water level, the drawdown the aquifer gives under load, the friction loss in the riser at the flow you enter, and the head needed to fill the tank. It then selects the next stocked submersible motor size from that total. For a 250 feet (about 76 m) hole serving a house with a 4 m tank stand, that arithmetic usually lands between 1.5 HP and 2 HP at normal household flow. Change the depth, the tank height or the flow above and the motor follows.",
  },
  {
    question: "How many lengths of casing pipe are needed for drilling?",
    answer:
      "The cased depth divided by the length of one stick. The calculator sets the cased depth from the soil type you choose. Loose sedimentary ground such as Lagos Mainland, Lekki or Delta sands is cased from the top down to the screen. Rocky basement ground such as Abuja, Ibadan or Enugu is cased down to competent rock, above the screen. A 60 m hole cased top to bottom works out at about 11 sticks of 5.8 m UPVC casing, and the takeoff lists casing and screen quantities separately.",
  },
  {
    question:
      "What does an overhead tank stand cost, and does 1,000 or 2,500 litres change it?",
    answer:
      "The litres change everything, because the stand is sized by load. A litre of water is a kilogram, so 2,500 litres is two and a half tonnes before the shell, ring beam, deck and piers are counted. The calculator designs the stand you pick, blockwork piers or a reinforced frame, sizes a footing pad under each support against the ground bearing you enter, and returns angle iron, reinforcement, concrete and blockwork quantities. Prices come from the market rate book where one is verified, or from the figures you type, and tax is left undetermined.",
  },
  {
    question:
      "How deep do I drill in Abuja basement complex compared with Lagos sedimentary ground?",
    answer:
      "Basement complex ground is drilled through weathered overburden until it meets fractured rock, and the casing is taken down to that rock so the hole does not collapse above it. Sedimentary ground is drilled through sands and clays that usually give a shallower water level and a higher yield, with casing over most of the depth. Choose the soil type in the calculator and the drilling depth, casing requirement, drawdown and yield assumptions change with it.",
  },
  {
    question:
      "Do I still need a booster pump if my overhead tank is high enough?",
    answer:
      "Check the pressure at the tap, not the tank height. The calculator reports the gravity pressure at the ground floor from the tank outlet height and deducts ten percent for pipe losses, and it warns when that falls under 0.5 bar. One storey usually runs on gravity. A second storey, a long run of small pipe, or several outlets open at once will drop below the useful figure, and a booster is the honest answer there.",
  },
];
