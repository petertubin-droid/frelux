# FRELUX User Guide

Public guide for FRELUX users. It explains how to use every customer-facing feature.
Last reviewed: 2026-09-08. Matches the live production system.

---

## 1. Getting Started

FRELUX is a construction estimation platform. It helps you estimate materials, quantities and costs for building and finishing work, with or without a floor plan.

Three ways to start:

1. **Quick calculators.** Open any calculator, enter your measurements, get results instantly. No account needed.
2. **AI Image Estimator.** Upload a floor-plan image and let AI extract the rooms, then calculate from the plan.
3. **Build-to-Roof Estimator.** A guided flow for whole-building estimates from foundation to roof.

To save your work, keep an estimate history and use the AI features, create a free account. Paid plans unlock premium features (see Account and Premium Features).

Works on any phone, tablet or computer. FRELUX installs as an app (PWA): on Android choose "Add to Home Screen" in your browser menu; on iOS use Share, then "Add to Home Screen". Once installed it opens full screen like a native app and can work with limited connectivity.

## 2. Navigation

- **Home** explains FRELUX and links to everything.
- **Calculators** lists every estimator.
- **Smart Calculator** asks what you want to build and routes you to the right tool.
- **AI** groups the AI features (Image Estimator, Copilot, color tools).
- **Learn** (Learn Hub) hosts guides and articles.
- **Material Prices** shows current market price information where available.
- **My Projects** holds your saved projects, estimates and timeline once you are signed in.
- **Pricing** shows plans and what each includes.
- **Contact** reaches the FRELUX team.

On a phone, the main sections live in the menu, and the most-used calculators sit on the home screen.

## 3. The Calculators and What They Need

Every calculator states which measurements it needs before you calculate. If a required value is missing, FRELUX asks for it instead of guessing.

| Calculator                  | Route                       | Required input                                       | What you get                               |
| --------------------------- | --------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| Paint Calculator            | /paint-calculator           | Room length, width, wall height (metres or feet)     | Paint litres, number of containers, primer |
| Painting Estimator          | /painting-estimator         | Same as paint calculator plus paint type and quality | Estimate with costs                        |
| Paint Comparison            | /paint-comparison           | Two or more paint scenarios                          | Side-by-side comparison                    |
| Screeding Calculator        | /screeding-calculator       | Room length, width, height (wall surface)            | Screeding materials                        |
| Screeding Cost Estimator    | /screeding-cost-estimator   | Wall area or room dimensions                         | Materials with costs                       |
| Tile Calculator             | /tile-calculator            | Floor length and width, tile size                    | Tiles, boxes, adhesive                     |
| Tile Cost Estimator         | /tile-cost-estimator        | Same plus tile price                                 | Full cost estimate                         |
| POP Ceiling Calculator      | /pop-ceiling-calculator     | Room length and width (ceiling area)                 | POP boards and materials                   |
| POP Ceiling Cost Estimator  | /pop-ceiling-cost-estimator | Ceiling area                                         | Materials with costs                       |
| Finish Estimator (Grafitex) | /finish-estimator           | Wall area                                            | Grafitex materials                         |
| Tyrolene Estimator          | /tyrolene-estimator         | Partition width and height                           | Partition materials                        |
| Cost Estimator              | /cost-estimator             | Paint area and your material prices                  | Total cost breakdown                       |
| Foundation Calculator       | /foundation-calculator      | Building footprint and foundation type               | Foundation quantities                      |
| Structural Calculator       | /structural-calculator      | Structural member dimensions                         | Member quantities                          |
| Build-to-Roof Estimator     | /build-to-roof-estimator    | Building size and build choices                      | Full building estimate                     |
| Project Timeline            | /project-timeline           | Project scope                                        | Phased schedule                            |
| Image Estimator             | /image-estimator            | A floor-plan image                                   | Extracted rooms plus estimates             |

## 4. Units and Conversions

You can enter measurements in **metres or feet**. Pick the unit before you calculate and FRELUX converts internally. Results are always shown in metric units (square metres, litres) because materials are sold that way.

Money is shown in your market's currency. Where FRELUX has verified price information for your market, it is used and labeled with its source. Where it does not, FRELUX asks you for the price instead of inventing one.

## 5. How Results Are Calculated (Plain Language)

FRELUX measures real surfaces first, then applies material rules:

- **Screeding** is calculated on the **wall surface area**: the room perimeter multiplied by wall height, minus door and window openings. It is never the floor area.
- **Tiling** is calculated on the **floor area**: length times width.
- **POP ceiling** is calculated on the **ceiling area**: room length times width. The room's ceiling dimensions are what matter.
- **Painting** follows the FRELUX room method: wall and ceiling areas, minus openings, then litres, then whole containers ("buckets"). You buy containers, so FRELUX tells you containers, not just square metres.
- **Tyrolene** follows the partition method: partition width and height.
- **Grafitex** is a square-metre method applied to the wall area.

Every result states the area it used, so you can check the number yourself. Waste allowance and rounding rules are shown on the result, and each quantity line names its unit (litres, bags, buckets, boxes, pieces).

## 6. Material Quantities

For each material you get the quantity needed and, where sizes matter, the purchase quantity: for example "5 buckets" rather than "4.81 buckets" when buckets are sold whole. Rounding is always visible, and extra material for waste is included and labeled.

## 7. Cost Estimates

Cost estimates multiply quantities by prices. Prices come from, in order of preference:

1. A price you entered yourself.
2. A verified market price for your region, where FRELUX has one.
3. Nothing. If FRELUX has no price, it tells you a price is needed instead of guessing.

Labour costs are separate line items where a calculator offers them.

## 8. Saving Estimates and Estimate History

With an account you can save any result to a project. Saved estimates keep the exact numbers you saw at the moment of saving, including the prices and configuration used. If market prices change later, your saved estimate does not silently change; it is a record of that moment. You can recalculate any time for fresh numbers.

Estimate history lists your saved calculations with dates, and you can reopen them from the project.

## 9. PDF, Export and Sharing

From a result screen you can:

- Export a PDF quote with your own company details and branding where the calculator supports it.
- Share a cost summary to WhatsApp with a link.
- Copy the numbers into your own documents.

The PDF shows the same numbers as the screen. It does not recalculate.

## 10. Projects

"My Projects" groups your estimates, plans and timelines per property or project. You can keep several projects, each with its own saved calculations and documents. Project Workspace shows everything about one project in one place.

## 11. AI Features

- **AI Image Estimator.** Upload a floor-plan image. The AI extracts rooms, dimensions and openings, marks how confident it is about each value, and asks you to confirm uncertain measurements before calculating. Only confirmed values are used.
- **AI Copilot.** Chat about your project. When a question involves a calculation, the AI runs the same certified calculators behind the scenes and reports their output; it does not invent numbers.
- **AI Color Assistant and Color Preview** help you choose and preview paint colors.
- **Construction Sequence** explains the order of building work.

## 12. Build-to-Roof Estimator

A guided estimator for a whole building from foundation to roof level. You choose the building size and build options; FRELUX shows each stage with its quantities. Structural stages carry a safety notice: FRELUX quantities are budgeting guides, and a qualified engineer must confirm structural elements before construction.

## 13. Regional and International Settings

FRELUX starts with Nigeria as the default market. Where a calculator supports other regions, you choose yours and FRELUX uses that region's verified prices only. It never substitutes Nigerian prices for another region silently. If your region lacks verified price data, FRELUX says so and asks you for prices.

## 14. Account and Premium Features

Create a free account to save projects and history. Paid plans (see the Pricing page) unlock premium features such as advanced AI usage and premium tools. Your plan and what it includes always show on your profile. You can buy plans and AI tokens online; payments are processed by a secure payment provider.

## 15. Rewarded Access

Where you hit a limit on a free plan, you can sometimes unlock extra AI usage by watching a rewarded ad, or by upgrading. This keeps the free tier usable while keeping FRELUX running.

## 16. Learn Hub

The Learn Hub contains plain-language guides: how to measure a room, how screeding works, choosing tiles, and more. Articles are written for the Nigerian market first, with international notes where relevant.

## 17. What FRELUX Can and Cannot Calculate

FRELUX can:

- Estimate material quantities and costs for painting, screeding, tiling, POP ceiling, finishes, partitions, foundations, structures and whole buildings.
- Read floor plans with AI and calculate from confirmed dimensions.
- Save, export and share estimates.

FRELUX cannot:

- Replace a qualified engineer, architect or quantity surveyor.
- Account for hidden site conditions (soil tests, existing damage) it cannot see.
- Guarantee market prices; prices change and estimates are guides.
- Approve structural designs. Structural results are indicative only.

## 18. Safety Limitations

- Structural, foundation and roof quantities are budgeting estimates. A qualified engineer must review and approve anything structural before you build.
- AI-extracted dimensions must be confirmed by you. FRELUX shows confidence levels and asks for confirmation.
- If information is missing, FRELUX refuses to calculate rather than inventing values.

## 19. Errors and Missing Information

When something is missing you will see a clear message such as:

- "Select a paint quality before calculating."
- "Tile selection required: choose a tile size and price before we calculate tiling."
- "Screeding configuration is unavailable right now: use the Screeding Cost Estimator directly."
- "No approved price available for this product in your market: enter a price or try another region."

These messages mean exactly what they say: give FRELUX the missing information and try again.

## 20. Help FRELUX Learn This Region (Planned)

A "Help FRELUX Learn This Region" feature is planned. It will let users submit local prices and material availability for their region. Submitted information will enter a controlled candidate review queue and will only become trusted knowledge after FRELUX verification. This is not live yet; today, verified prices come from FRELUX market intelligence, and anything unverified is clearly labeled or requested from you.

## 21. Troubleshooting

- **A result looks wrong.** Check the stated area: most surprises come from wall area versus floor area confusion (screeding and painting use walls, tiling uses the floor, POP uses the ceiling).
- **Missing price errors.** Enter the price manually; your region may not have verified data yet.
- **AI could not read the plan.** Use a clear, high-contrast image and confirm extracted dimensions manually.
- **Cannot save.** Sign in first; saving needs an account.
- **App will not update.** Close and reopen, or reinstall from the browser; the app updates itself in the background.

## 22. Contact and Help

Use the Contact page to reach the team, and the in-app messaging channels where available. Legal pages (Privacy Policy, Terms, Disclaimer) are in the site footer. The Disclaimer states clearly that FRELUX estimates are guides and professional confirmation is required before construction.

---

## 23. FRELUX API (For Developers)

If you want to connect your own tools to FRELUX's calculators and intelligence, visit **/developers** on the website. You can create a personal API key, read the endpoint documentation, and track your usage. Keys are shown once at creation — keep them safe. Calculation results through the API come from the same engines as the website calculators, with the same honesty: FRELUX never invents missing values or unobserved prices.
