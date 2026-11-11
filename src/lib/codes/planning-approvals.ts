/**
 * Planning approvals and setback guide.
 *
 * What this file is: the permitting route for a building project in every
 * Nigerian state plus the FCT, and the equivalent route in each market
 * FRELUX serves. For each jurisdiction it records WHO issues the permit,
 * WHICH instrument governs it, and the stages a project passes through.
 *
 * What this file is not: a table of invented setback dimensions. Nigerian
 * state planning standards are issued as scheme statements and circulars
 * that most states do not publish online. Where a figure is not published
 * we say so and tell the reader to obtain it in writing from the authority
 * that will inspect the site. A wrong setback costs a demolition order, so
 * a confident guess here would be worse than no answer.
 *
 * Setback status vocabulary:
 *   "indicative"      the widely applied national planning norm, not a
 *                     published figure from this state. Confirm in writing.
 *   "set-by-scheme"   the jurisdiction sets values in its own scheme or
 *                     zoning instrument, which is not published as a
 *                     national table. The authority confirms per plot.
 *   "published"       a figure taken from a published instrument, with the
 *                     source recorded on the row.
 *
 * ADMIN NOTE: this library is versioned in git on purpose. Corrections from
 * a state planning authority should arrive as a diff, with the circular or
 * scheme reference in the sourceUrl field, so the change is auditable.
 */

export type SetbackStatus = "published" | "indicative" | "set-by-scheme";

export interface SetbackRule {
  /** What is being measured, for example "Front, residential". */
  label: string;
  /** The figure with its unit, for example "6 m". */
  value: string;
  /** Where the figure comes from. */
  basis: string;
}

export interface ApprovalStep {
  step: string;
  detail: string;
}

export interface PlanningJurisdiction {
  id: string;
  /** ISO 3166-1 alpha-2. */
  countryCode: string;
  country: string;
  /** State, province, emirate or county. Null for single tier countries. */
  region: string | null;
  /** The body that issues the permit. */
  authority: string;
  /**
   * "verified" means the issuing body was confirmed on its own portal on
   * verifiedOn, and sourceUrl points at that portal. "confirm-office" means
   * the office is described from the national planning framework but its
   * current name or portal was not confirmed, so the applicant must check
   * the name at the secretariat before submitting.
   */
  authorityStatus: "verified" | "confirm-office";
  /** The law, regulation or code the authority works under. */
  instruments: string[];
  setbackStatus: SetbackStatus;
  setbacks: SetbackRule[];
  /** The sentence that tells the reader what to do about the numbers. */
  setbackNote: string;
  approvals: ApprovalStep[];
  /** Anything that trips people up in this jurisdiction. */
  caution: string;
  sourceUrl?: string;
  verifiedOn?: string;
}

const NG_VERIFIED_ON = "2026-11-11";

/**
 * The approval chain that Nigerian planning law sets out, and that every
 * state authority in practice follows. Wording of the certificate changes
 * between states; the sequence does not.
 */
export const NG_APPROVAL_CHAIN: ApprovalStep[] = [
  {
    step: "Confirm the plot and the zoning",
    detail:
      "Take the survey plan and the title document (Certificate of Occupancy or governor's consent) to the planning authority and confirm the plot is zoned for what you intend to build. Building on a committed or acquired plot is the most common reason a project is sealed later.",
  },
  {
    step: "Planning information and pre-application enquiry",
    detail:
      "Ask the authority, in writing, for the setback, plot coverage, height and parking requirements that apply to your specific plot. Keep the reply. It is your defence if an inspector later disputes your layout.",
  },
  {
    step: "Prepare drawings with registered professionals",
    detail:
      "Architectural and structural drawings, signed and stamped by professionals registered with ARCON and COREN, plus a registered surveyor's plan. Unstamped drawings are rejected at submission in every state.",
  },
  {
    step: "Submit the development permit application",
    detail:
      "Development permit or building plan approval application, with drawings, survey plan, title, tax clearance and the prescribed fees. Most authorities issue an acknowledgement with a reference number, and nothing moves without that number.",
  },
  {
    step: "Technical review",
    detail:
      "The authority reviews planning compliance, structural adequacy, drainage, fire access and, in Lagos and the FCT, the structural calculations against the National Building Code and the relevant standards.",
  },
  {
    step: "Approval and fee assessment",
    detail:
      "On a favourable review the authority issues a provisional or full permit and assesses development levy and inspection fees. Work started before this point is unapproved work, whatever the fee receipt says.",
  },
  {
    step: "Setting out and stage inspections",
    detail:
      "The authority inspects and certifies the setting out on the ground, then attends stage inspections (foundation, frame, roof). Inspectors check the setbacks you were granted, not the ones you submitted.",
  },
  {
    step: "Certificate of completion and fitness for habitation",
    detail:
      "At completion the authority issues a completion certificate or certificate of fitness for habitation, which is what banks, insurers and buyers ask for. Handing over a building without it leaves the owner carrying the risk.",
  },
];

/**
 * The national planning norm most states apply to a standard residential
 * plot. Recorded as indicative everywhere, because no state we could reach
 * publishes its own table online, and the norm is not a substitute for the
 * authority's scheme statement for the plot in question.
 */
const NG_INDICATIVE_SETBACKS: SetbackRule[] = [
  {
    label: "Front, standard residential plot",
    value: "6 m",
    basis: "National planning norm applied by state authorities",
  },
  {
    label: "Front, substandard or corner plot",
    value: "9 m",
    basis: "National planning norm for plots below the standard size",
  },
  {
    label: "Side, both sides",
    value: "3 m",
    basis: "National planning norm, airspace either side",
  },
  {
    label: "Rear",
    value: "3 m",
    basis: "National planning norm",
  },
  {
    label: "Maximum plot coverage, residential",
    value: "50 to 60 percent",
    basis: "National planning norm, varies by scheme",
  },
];

const NG_INDICATIVE_NOTE =
  "These are the national planning norms that state authorities generally apply, not figures published for this state. Ask the authority named above for the setback and coverage that apply to your plot, and keep the written reply before you draw.";

interface NgStateSeed {
  region: string;
  authority: string;
  town: string;
  extraInstrument?: string;
  extraInstrument2?: string;
  authorityStatus?: "verified" | "confirm-office";
  sourceUrl?: string;
  /** Set only where the state publishes something we could read. */
  setbackStatus?: SetbackStatus;
  setbacks?: SetbackRule[];
  setbackNote?: string;
  caution?: string;
}

const NG_STATES: NgStateSeed[] = [
  {
    region: "Abia",
    authority:
      "Abia State Ministry of Lands, Survey and Urban Development, Umuahia",
    town: "Umuahia",
  },
  {
    region: "Adamawa",
    authority: "Adamawa State Ministry of Lands and Survey, Yola",
    town: "Yola",
  },
  {
    region: "Akwa Ibom",
    authority: "Akwa Ibom State Ministry of Lands and Town Planning, Uyo",
    town: "Uyo",
  },
  {
    region: "Anambra",
    authority: "Anambra State Ministry of Lands, Awka",
    town: "Awka",
  },
  {
    region: "Bauchi",
    authority: "Bauchi State Ministry of Lands and Survey, Bauchi",
    town: "Bauchi",
  },
  {
    region: "Bayelsa",
    authority: "Bayelsa State Ministry of Lands and Survey, Yenagoa",
    town: "Yenagoa",
  },
  {
    region: "Benue",
    authority:
      "Benue State Ministry of Lands, Survey and Solid Minerals, Makurdi",
    town: "Makurdi",
  },
  {
    region: "Borno",
    authority: "Borno State Ministry of Lands and Survey, Maiduguri",
    town: "Maiduguri",
  },
  {
    region: "Cross River",
    authority:
      "Cross River State Ministry of Lands and Urban Development, Calabar",
    town: "Calabar",
  },
  {
    region: "Delta",
    authority:
      "Delta State Ministry of Lands, Survey and Urban Development, Asaba",
    town: "Asaba",
  },
  {
    region: "Ebonyi",
    authority: "Ebonyi State Ministry of Lands and Survey, Abakaliki",
    town: "Abakaliki",
  },
  {
    region: "Edo",
    authority:
      "Edo State Ministry of Physical Planning and Urban Development, with Edo Geographic Information Service (EDOGIS), Benin City",
    town: "Benin City",
  },
  {
    region: "Ekiti",
    authority:
      "Ekiti State Ministry of Lands, Housing and Urban Development, Ado Ekiti",
    town: "Ado Ekiti",
  },
  {
    region: "Enugu",
    authority: "Enugu State Ministry of Lands and Urban Development, Enugu",
    town: "Enugu",
  },
  {
    region: "Gombe",
    authority: "Gombe State Ministry of Lands and Survey, Gombe",
    town: "Gombe",
  },
  {
    region: "Imo",
    authority: "Imo State Ministry of Lands, Survey and Urban Planning, Owerri",
    town: "Owerri",
  },
  {
    region: "Jigawa",
    authority: "Jigawa State Ministry of Lands and Survey, Dutse",
    town: "Dutse",
  },
  {
    region: "Kaduna",
    authority:
      "Kaduna State Urban Planning and Development Authority (KASUPDA), Kaduna",
    town: "Kaduna",
    extraInstrument:
      "Kaduna State urban planning and development authority law",
    authorityStatus: "verified",
    sourceUrl: "https://kasupda.kdsg.gov.ng",
  },
  {
    region: "Kano",
    authority: "Kano State Ministry of Land and Physical Planning, Kano",
    town: "Kano",
  },
  {
    region: "Katsina",
    authority: "Katsina State Ministry of Lands and Survey, Katsina",
    town: "Katsina",
  },
  {
    region: "Kebbi",
    authority: "Kebbi State Ministry of Lands and Housing, Birnin Kebbi",
    town: "Birnin Kebbi",
  },
  {
    region: "Kogi",
    authority:
      "Kogi State Ministry of Lands, Housing and Urban Development, Lokoja",
    town: "Lokoja",
  },
  {
    region: "Kwara",
    authority: "Kwara State Ministry of Lands and Housing, Ilorin",
    town: "Ilorin",
  },
  {
    region: "Lagos",
    authority:
      "Lagos State Physical Planning Permit Authority (LASPPPA), with the Lagos State Building Control Agency for site enforcement",
    town: "Ikeja",
    extraInstrument:
      "Lagos State Urban and Regional Planning and Development Law 2019",
    extraInstrument2: "Lagos State Physical Planning Permit Regulations 2019",
    authorityStatus: "verified",
    sourceUrl: "https://lagosppa.gov.ng",
    caution:
      "Lagos runs planning and building control as two agencies. LASPPPA issues the planning permit, the building control agency inspects the site and can seal it. A permit from one is not a permit from the other, and district offices apply district specific standards, so the Ikeja headquarters answer and the district answer are not always the same document.",
  },
  {
    region: "Nasarawa",
    authority: "Nasarawa State Ministry of Lands and Urban Development, Lafia",
    town: "Lafia",
  },
  {
    region: "Niger",
    authority: "Niger State Ministry of Lands and Housing, Minna",
    town: "Minna",
  },
  {
    region: "Ogun",
    authority:
      "Ogun State Ministry of Physical Planning and Urban Development, with the state planning permit authority, Abeokuta",
    town: "Abeokuta",
  },
  {
    region: "Ondo",
    authority: "Ondo State Ministry of Lands and Infrastructure, Akure",
    town: "Akure",
  },
  {
    region: "Osun",
    authority: "Osun State Ministry of Lands and Physical Planning, Osogbo",
    town: "Osogbo",
  },
  {
    region: "Oyo",
    authority:
      "Oyo State Ministry of Lands, Housing and Urban Development, Ibadan",
    town: "Ibadan",
  },
  {
    region: "Plateau",
    authority:
      "Plateau State Ministry of Physical Planning and Urban Development, with the Jos Metropolitan Development Board (JMDB), Jos",
    town: "Jos",
  },
  {
    region: "Rivers",
    authority:
      "Rivers State Ministry of Physical Planning and Urban Development, Port Harcourt",
    town: "Port Harcourt",
  },
  {
    region: "Sokoto",
    authority: "Sokoto State Ministry of Lands and Housing, Sokoto",
    town: "Sokoto",
  },
  {
    region: "Taraba",
    authority: "Taraba State Ministry of Lands and Survey, Jalingo",
    town: "Jalingo",
  },
  {
    region: "Yobe",
    authority: "Yobe State Ministry of Lands and Survey, Damaturu",
    town: "Damaturu",
  },
  {
    region: "Zamfara",
    authority: "Zamfara State Ministry of Lands and Housing, Gusau",
    town: "Gusau",
  },
];

const NG_FCT: PlanningJurisdiction = {
  id: "ng-fct",
  countryCode: "NG",
  country: "Nigeria",
  region: "Federal Capital Territory",
  authority:
    "FCT Development Control Department, under the Federal Capital Territory Administration, Abuja",
  authorityStatus: "verified",
  instruments: [
    "FCT Act 1976 and the FCT planning regulations made under it",
    "National Building Code (Nigeria), 2006 edition",
    "FCT Development Control standards for plot coverage, setbacks and height",
  ],
  setbackStatus: "set-by-scheme",
  setbacks: [
    {
      label: "Front, residential",
      value: "Set by district scheme",
      basis:
        "FCT development control standard, confirmed per plot at application",
    },
    {
      label: "Side and rear",
      value: "Set by district scheme",
      basis:
        "FCT development control standard, confirmed per plot at application",
    },
    {
      label: "Height and coverage",
      value: "Set by district scheme",
      basis: "Varies between districts of the territory",
    },
  ],
  setbackNote:
    "The FCT applies different standards across districts of the territory, and the district scheme controls. Ask Development Control for the standard for your plot number before you draw. Figures quoted on social media for Abuja are not the scheme.",
  approvals: NG_APPROVAL_CHAIN,
  sourceUrl: "https://fcta.gov.ng",
  caution:
    "Development Control can stop work on an unapproved site without a court order, and the territory enforces the district scheme strictly on setback and plot coverage. Land allocated under a statutory right of occupancy still needs the development permit.",
  verifiedOn: NG_VERIFIED_ON,
};

/** Every Nigerian jurisdiction, FCT first, then states alphabetically. */
export const NG_JURISDICTIONS: PlanningJurisdiction[] = [
  NG_FCT,
  ...NG_STATES.map<PlanningJurisdiction>((s) => ({
    id: `ng-${s.region.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    countryCode: "NG",
    country: "Nigeria",
    region: s.region,
    authority: s.authority,
    authorityStatus: s.authorityStatus ?? "confirm-office",
    instruments: [
      `State planning law of ${s.region} State governing development control`,
      "National Building Code (Nigeria), 2006 edition, as adopted by the state",
      ...(s.extraInstrument ? [s.extraInstrument] : []),
      ...(s.extraInstrument2 ? [s.extraInstrument2] : []),
    ],
    setbackStatus: s.setbackStatus ?? "indicative",
    setbacks: s.setbacks ?? NG_INDICATIVE_SETBACKS,
    setbackNote: s.setbackNote ?? NG_INDICATIVE_NOTE,
    approvals: NG_APPROVAL_CHAIN,
    caution:
      s.caution ??
      `Approval is issued by the ${s.authority.split(",")[0]}, and inspection is handled by the same office in ${s.town}. Fees and turnaround change with the state's current tariff, so ask for the current schedule in writing rather than budgeting from an old quotation.`,
    sourceUrl: s.sourceUrl,
    verifiedOn: s.sourceUrl ? NG_VERIFIED_ON : undefined,
  })),
];

// ---------------------------------------------------------------------------
// Other markets
// ---------------------------------------------------------------------------

interface MarketSeed {
  countryCode: string;
  country: string;
  authority: string;
  instruments: string[];
  setbackStatus: SetbackStatus;
  setbackNote: string;
  setbacks?: SetbackRule[];
  approvals: ApprovalStep[];
  caution: string;
  sourceUrl?: string;
  authorityStatus?: "verified" | "confirm-office";
}

const MARKET_SEEDS: MarketSeed[] = [
  {
    countryCode: "GB",
    country: "United Kingdom",
    authority:
      "Local planning authority (the district, borough or unitary council), plus building control",
    instruments: [
      "Town and Country Planning Act 1990 and the local development plan",
      "Building Regulations 2010, via local authority building control or a registered building inspector",
      "Party Wall etc. Act 1996 for work on shared boundaries",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "There is no national setback figure. The local development plan and design guidance set distances, and permitted development rights decide whether you need planning permission at all.",
    approvals: [
      {
        step: "Check permitted development rights",
        detail:
          "Many domestic extensions and outbuildings fall within permitted development. Confirm with the council before assuming it.",
      },
      {
        step: "Pre-application advice",
        detail:
          "Paid pre-application advice from the council gives the officers' view before you commit to drawings.",
      },
      {
        step: "Planning application",
        detail:
          "Submit through the Planning Portal with drawings, site plan and the fee. Neighbour consultation runs alongside.",
      },
      {
        step: "Building control approval",
        detail:
          "Separate from planning. Submit a full plans application or a building notice, and expect inspections at defined stages.",
      },
      {
        step: "Completion certificate",
        detail:
          "The building control body issues the certificate at the end. A planning consent alone does not make the building lawful.",
      },
    ],
    caution:
      "Planning permission and building regulations approval are two separate permissions. Getting one and not the other is the classic UK mistake, and the enforcement period for unauthorised work is long.",
  },
  {
    countryCode: "US",
    country: "United States",
    authority:
      "The municipal or county building department, with zoning administered by the local planning department",
    instruments: [
      "State and locally adopted model codes, usually the International Residential Code or International Building Code",
      "Local zoning ordinance and subdivision regulations",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks are set by the local zoning ordinance and can change street by street. There is no national figure, and state law rarely supplies one.",
    approvals: [
      {
        step: "Zoning check",
        detail:
          "Confirm the zoning district, the permitted use and the setback and height limits in the ordinance before design.",
      },
      {
        step: "Building permit application",
        detail:
          "Submit drawings, plot plan and structural calculations to the local building department.",
      },
      {
        step: "Plan review",
        detail:
          "Reviewers check code compliance, energy provisions and, in some jurisdictions, separate trade permits for electrical, plumbing and mechanical.",
      },
      {
        step: "Inspections and certificate of occupancy",
        detail:
          "Staged inspections, then a certificate of occupancy before the building is used.",
      },
    ],
    caution:
      "Zoning and building permits are separate approvals from separate departments, and some jurisdictions add design review, tree or stormwater permits. Check the local checklist rather than a state one.",
  },
  {
    countryCode: "CA",
    country: "Canada",
    authority:
      "The municipality, with the provincial building code adopted locally",
    instruments: [
      "Provincial building code adopted by the municipality, for example the Ontario Building Code or the BC Building Code",
      "Municipal zoning by-law",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks and height come from the municipal zoning by-law, and minor variance is possible through the committee of adjustment or board of variance.",
    approvals: [
      {
        step: "Zoning review and survey",
        detail:
          "A current survey of the lot is the basis of the zoning review. Confirm coverage, setbacks and height in the by-law.",
      },
      {
        step: "Building permit application",
        detail:
          "Drawings, schedules and, where required, engineered structural design go to the municipal building department.",
      },
      {
        step: "Variance if needed",
        detail:
          "Where the design cannot meet the by-law, a minor variance application goes to the committee of adjustment, with notice to neighbours.",
      },
      {
        step: "Inspections and occupancy",
        detail: "Staged inspections and an occupancy permit at the end.",
      },
    ],
    caution:
      "Provincial codes control construction, municipal by-laws control siting. A design that satisfies the code can still be refused on siting.",
  },
  {
    countryCode: "AU",
    country: "Australia",
    authority:
      "The local council for planning, a private or council certifier for construction",
    instruments: [
      "State planning legislation and the local planning scheme",
      "National Construction Code, with state variations",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks come from the local planning scheme and the state residential design code. There is no national numeric standard.",
    approvals: [
      {
        step: "Development application",
        detail:
          "Submit a DA to council where the scheme requires it, with plans, site analysis and the fee.",
      },
      {
        step: "Construction certificate",
        detail:
          "A certifier issues the construction certificate once engineering and compliance are confirmed. It is separate from the DA.",
      },
      {
        step: "Appointment of principal certifier",
        detail:
          "The certifier is appointed before work starts and carries the inspection obligations.",
      },
      {
        step: "Occupation certificate",
        detail:
          "Issued at completion. Occupying before it is issued breaches the approval.",
      },
    ],
    caution:
      "Development consent and a construction certificate are two documents, and the certifier can be private. Complying development may avoid the DA but only if every condition is met.",
  },
  {
    countryCode: "NZ",
    country: "New Zealand",
    authority: "The territorial authority (city or district council)",
    instruments: [
      "Resource Management Act 1991, through the district plan",
      "Building Act 2004 and the New Zealand Building Code",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Yards, height and coverage are set in the district plan, and the plan states the standards for each zone. The building code does not address siting.",
    approvals: [
      {
        step: "District plan check",
        detail:
          "Confirm whether the proposal is permitted, controlled or discretionary under the district plan for that zone.",
      },
      {
        step: "Resource consent if required",
        detail:
          "Activity that breaches a district plan standard needs resource consent, with assessment against the plan objectives.",
      },
      {
        step: "Building consent",
        detail:
          "Submit plans and specifications for building consent, including producer statements from designers and suppliers.",
      },
      {
        step: "Inspections and code compliance certificate",
        detail:
          "Council inspects at nominated stages and issues the code compliance certificate at completion.",
      },
    ],
    caution:
      "Resource consent and building consent are separate and are applied for from the same council but assessed by different teams. Neither substitutes for the other.",
  },
  {
    countryCode: "AE",
    country: "United Arab Emirates",
    authority:
      "The emirate municipality, for example Dubai Municipality, or the Abu Dhabi Department of Municipalities and Transport",
    instruments: [
      "Emirate building regulations, for example the Dubai Building Code",
      "Municipal building permit system, submitted through the emirate's online platform",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Each emirate publishes its own setback and plot coverage rules, and they differ. Ask the municipality for the plot specific standard, since plot lines are fixed on the emirate's master plan.",
    approvals: [
      {
        step: "Plot and consultant registration",
        detail:
          "The consultant must be registered with the municipality, and the plot details are checked against the emirate master plan.",
      },
      {
        step: "Building permit application",
        detail:
          "Drawings and calculations submitted through the municipal platform, with the structural and MEP design checked by the municipality or a nominated reviewer.",
      },
      {
        step: "Approval and site supervision",
        detail:
          "Work proceeds under the appointed consultant, with municipal inspections at defined stages.",
      },
      {
        step: "Completion certificate",
        detail:
          "Issued after final inspection, and needed before utilities are connected and the unit is occupied.",
      },
    ],
    caution:
      "The emirates run separate systems. A Dubai approval means nothing in Abu Dhabi, and free zone or developer held land can add a second layer of approval from the master developer.",
  },
  {
    countryCode: "SA",
    country: "Saudi Arabia",
    authority:
      "The municipality (amanah) for building permits, with the Saudi Building Code enforced through it",
    instruments: [
      "Saudi Building Code (SBC), adopted nationally",
      "Municipal building regulations and the Baladi platform for permit submission",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks and coverage are set by the municipal regulations for the plot, and the permit platform states them at submission.",
    approvals: [
      {
        step: "Design and code compliance",
        detail:
          "Design against the Saudi Building Code, with a code compliance report that the reviewer expects to see.",
      },
      {
        step: "Permit application",
        detail:
          "Submit through the Baladi platform with drawings, structural design and the consultant's registration.",
      },
      {
        step: "Inspections",
        detail:
          "Municipal inspections at defined stages, with the supervising consultant responsible for conformity.",
      },
      {
        step: "Occupation certificate",
        detail:
          "Issued after final inspection and needed before the building is used.",
      },
    ],
    caution:
      "The consultant must be registered and carries supervision duties. Submitting without a supervising engineer is rejected.",
  },
  {
    countryCode: "KE",
    country: "Kenya",
    authority:
      "The county government, through its physical planning and development control department",
    instruments: [
      "Physical and Land Use Planning Act 2019",
      "County building code and development control guidelines",
      "National Construction Authority registration for the contractor",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks are in the county development control guidelines and the zoning for the plot. Counties differ, so the county planner confirms per plot.",
    approvals: [
      {
        step: "Land and zoning check",
        detail:
          "Confirm zoning and the approved development for the area at the county planning department.",
      },
      {
        step: "Development permission application",
        detail:
          "Submit architectural and structural drawings, survey and the development application to the county.",
      },
      {
        step: "Approval and inspection",
        detail:
          "The county approves and inspects at stages. Construction should not begin before approval is granted.",
      },
      {
        step: "Occupation certificate",
        detail:
          "The county issues a certificate of occupation or compliance at completion.",
      },
    ],
    caution:
      "The contractor must be registered with the National Construction Authority, and the project must be registered with it before work starts.",
  },
  {
    countryCode: "TZ",
    country: "Tanzania",
    authority: "The local government authority (municipal or district council)",
    instruments: [
      "Urban Planning Act 2007 and the local authority building rules",
      "National Environmental Management Council requirements for larger projects",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks come from the local authority planning scheme for the area. Confirm with the council's planning officer before design.",
    approvals: [
      {
        step: "Plot and scheme check",
        detail:
          "Confirm the planning scheme and the plot boundaries with the council and the licensed surveyor.",
      },
      {
        step: "Building permit application",
        detail:
          "Submit drawings and structural details to the council for approval.",
      },
      {
        step: "Inspection and completion",
        detail:
          "Council inspectors attend stages, and completion is recorded before occupation.",
      },
    ],
    caution:
      "Councils apply the planning scheme unevenly between urban and peri urban land. A permit for a neighbouring plot is not evidence of what your plot allows.",
  },
  {
    countryCode: "ZA",
    country: "South Africa",
    authority: "The local municipality, through its building control officer",
    instruments: [
      "National Building Regulations and Building Standards Act 1977, with SANS 10400",
      "Municipal town planning scheme",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Building lines and coverage are in the municipal town planning scheme for the zone. The scheme, not the national regulations, fixes the numbers.",
    approvals: [
      {
        step: "Scheme and building line check",
        detail:
          "Confirm zoning and building lines in the town planning scheme, and whether a departure is needed.",
      },
      {
        step: "Plan submission",
        detail:
          "Submit plans for approval to the municipality, with competent person declarations where SANS 10400 requires them.",
      },
      {
        step: "Approval and construction",
        detail:
          "Work starts after plan approval, with the appointed competent persons responsible for the regulated aspects.",
      },
      {
        step: "Occupation certificate",
        detail:
          "Issued at completion. Lending institutions and insurers ask for it.",
      },
    ],
    caution:
      "Exceeding a building line needs a departure approved by the municipality before construction, not after.",
  },
  {
    countryCode: "GH",
    country: "Ghana",
    authority:
      "The district assembly, through its physical planning and works departments",
    instruments: [
      "Land Use and Spatial Planning Act 2016 (Act 925)",
      "District assembly building regulations and the Ghana Building Code",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks are set in the district planning scheme prepared under Act 925. Confirm with the district physical planning officer for the specific plot.",
    approvals: [
      {
        step: "Land title and zoning",
        detail:
          "Confirm the land is properly registered and zoned for the intended use at the district assembly and the lands commission.",
      },
      {
        step: "Development and building permit",
        detail:
          "Apply to the district assembly with drawings and the development application. The assembly consults its physical planning department.",
      },
      {
        step: "Technical review and approval",
        detail:
          "The works department reviews structural and drainage provisions before the permit is issued.",
      },
      {
        step: "Inspection and completion",
        detail:
          "Assembly officers inspect at stages, and a completion certificate supports occupation and utility connection.",
      },
    ],
    caution:
      "Development permits are issued by the district assembly, while land registration sits with the Lands Commission. Both matter, and site selling without registration is a common trap.",
  },
  {
    countryCode: "CI",
    country: "Cote d'Ivoire",
    authority:
      "The commune or the Ministry of Construction, depending on project scale",
    instruments: [
      "Code de la construction et de l'habitat",
      "Permis de construire regulations administered by the commune",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks are controlled by the urban master plan (plan d'urbanisme) for the commune. The municipal technical service confirms the plot standard.",
    approvals: [
      {
        step: "Certificat d'urbanisme",
        detail:
          "Obtain the urbanism certificate, which states the rules that apply to the plot.",
      },
      {
        step: "Permis de construire",
        detail:
          "Submit the building permit application with architectural drawings from a registered architect.",
      },
      {
        step: "Inspection and conformite",
        detail:
          "After completion, apply for the certificate of conformity before occupation.",
      },
    ],
    caution:
      "The urbanism certificate is the document that fixes what the plot allows. Applying for the permit without it risks a refusal that costs months.",
  },
  {
    countryCode: "ET",
    country: "Ethiopia",
    authority:
      "The city administration building permit authority, for example the Addis Ababa Construction Authority",
    instruments: [
      "Ethiopian Building Code Standard and city building regulations",
      "City master plan and structural design review requirements",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks follow the city master plan and the plot's zoning. The permit authority states the requirement at submission.",
    approvals: [
      {
        step: "Plot and plan check",
        detail:
          "Confirm the plot against the city master plan and the cadastral record.",
      },
      {
        step: "Design review",
        detail:
          "Architectural and structural drawings are reviewed for code compliance by the authority.",
      },
      {
        step: "Permit and supervision",
        detail:
          "The permit is issued with a supervising professional, and inspections follow stages.",
      },
      {
        step: "Completion certificate",
        detail:
          "Required before the building is occupied or utilities are connected.",
      },
    ],
    caution:
      "Supervision by a licensed professional is a condition of the permit, not an optional extra.",
  },
  {
    countryCode: "IN",
    country: "India",
    authority:
      "The local municipal corporation or panchayat, through its town planning department",
    instruments: [
      "State town and country planning acts",
      "Municipal building bye-laws, commonly modelled on the Model Building Bye-laws with state amendments",
      "National Building Code of India 2016 as the technical reference",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks are set in the municipal bye-laws and depend on plot size, height and abutting road width. Each urban local body publishes its own table.",
    approvals: [
      {
        step: "Zoning and road width check",
        detail:
          "Confirm the zoning and the sanctioned road width, since setbacks and permissible height both follow the road width.",
      },
      {
        step: "Sanction of building plan",
        detail:
          "Submit the plan for sanction with structural drawings and the owner and architect declarations.",
      },
      {
        step: "Commencement and stage inspections",
        detail:
          "The sanctioned plan is displayed at site, and the local body inspects at stages.",
      },
      {
        step: "Occupancy certificate",
        detail:
          "Applied for after completion. Without it, water and electricity connections can be refused.",
      },
    ],
    caution:
      "Deviating from the sanctioned plan is the most common compliance failure in India, and regularisation of major deviations is not guaranteed.",
  },
  {
    countryCode: "ID",
    country: "Indonesia",
    authority:
      "The regency or city government through the one stop investment service, with the building permit issued locally",
    instruments: [
      "Building Law 28/2002 and the building permit (PBG) regulations",
      "Local spatial plan (RTRW) and detailed spatial plan",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks, floor area ratio and coverage follow the local spatial plan and the building technical plan approved with the permit.",
    approvals: [
      {
        step: "Spatial plan check",
        detail:
          "Confirm the plot is inside the zone allowed for your use in the local spatial plan.",
      },
      {
        step: "Building approval and permit",
        detail:
          "Obtain the building technical approval and then the building permit through the local one stop service.",
      },
      {
        step: "Inspection and function worthiness",
        detail:
          "The building must be certified fit for function before occupation.",
      },
    ],
    caution:
      "The spatial plan, not the neighbour's practice, controls what can be built. A permit for a different use in the same street does not carry over.",
  },
  {
    countryCode: "SG",
    country: "Singapore",
    authority:
      "Urban Redevelopment Authority for planning permission, Building and Construction Authority for building plan approval",
    instruments: [
      "Planning Act 1998 and the Master Plan",
      "Building Control Act and its regulations",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks and plot ratio come from the Master Plan and the development control guidelines published by the planning authority.",
    approvals: [
      {
        step: "Development control check",
        detail:
          "Confirm the land use, plot ratio and setback against the Master Plan and the development control guidelines.",
      },
      {
        step: "Planning permission",
        detail:
          "Apply for planning permission or submit under the accepted plan where the scheme allows.",
      },
      {
        step: "Building plan approval",
        detail:
          "Separate submission to the building authority, with structural and fire safety submissions.",
      },
      {
        step: "TOP and CSC",
        detail:
          "Temporary occupation permit for early occupation, certificate of statutory completion for full occupation.",
      },
    ],
    caution:
      "Planning permission and building plan approval are separate, and both are needed before work starts.",
  },
  {
    countryCode: "JP",
    country: "Japan",
    authority:
      "The local building official, with design review through a private confirmation body for most buildings",
    instruments: [
      "Building Standard Law",
      "Local ordinance and the city planning zone rules",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks follow the zoning district and the road width rules. Setback requirements are strict about the ratio of road width to building height.",
    approvals: [
      {
        step: "Zoning and road check",
        detail:
          "Confirm the use district, the road type and the road width, since the road sets the buildable envelope.",
      },
      {
        step: "Building confirmation",
        detail:
          "Obtain building confirmation from a designated confirmation body or the building official before construction.",
      },
      {
        step: "Interim and final inspection",
        detail:
          "Interim inspection at defined stages and a completion inspection at the end.",
      },
    ],
    caution:
      "The road width rule surprises foreign developers. A building may be set back further than the plot line suggests.",
  },
  {
    countryCode: "KR",
    country: "South Korea",
    authority: "The local government (si or gun) building department",
    instruments: [
      "Building Act and the National Land Planning and Utilisation Act",
      "Local urban planning ordinance",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks, coverage and floor area ratio follow the use zone and the local ordinance. The zone, not the plot, sets the limits.",
    approvals: [
      {
        step: "Zone check",
        detail:
          "Confirm the use zone and the permitted building coverage and floor area ratio.",
      },
      {
        step: "Building permit",
        detail:
          "Apply with architectural and structural drawings and the site plan.",
      },
      {
        step: "Inspection and completion",
        detail: "Inspections at stages, then completion inspection before use.",
      },
    ],
    caution:
      "The permitted use depends on the zone, and the permit application is judged against the zone rules rather than the neighbouring buildings.",
  },
  {
    countryCode: "CN",
    country: "China",
    authority:
      "The municipal natural resources and planning bureau, with construction permits from the housing and construction bureau",
    instruments: [
      "Urban and Rural Planning Law",
      "Building construction permit regulations and local planning rules",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks, height and coverage are set in the regulatory detailed plan for the parcel, and the planning conditions issued with the land.",
    approvals: [
      {
        step: "Land and planning conditions",
        detail:
          "The land grant carries planning conditions that fix use, coverage, height and setbacks.",
      },
      {
        step: "Construction land planning permit",
        detail:
          "Then the construction land planning permit, which records the approved scheme.",
      },
      {
        step: "Construction work permit",
        detail:
          "The housing and construction authority issues the work permit after design and supervision are in place.",
      },
      {
        step: "Completion acceptance",
        detail: "Joint acceptance at completion before occupation.",
      },
    ],
    caution:
      "The planning conditions on the land grant are the controlling document. Design against them, not against a similar building nearby.",
  },
  {
    countryCode: "TR",
    country: "Turkiye",
    authority:
      "The municipality, through the building permit (yapi ruhsati) system",
    instruments: [
      "Turkish Building Earthquake Code and the zoning law",
      "Municipal zoning plan (imar plani) and local regulations",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks, coverage and floor area ratio come from the imar plani for the parcel, and the plan notation on the title is authoritative.",
    approvals: [
      {
        step: "Zoning status certificate",
        detail:
          "Obtain the zoning status document, which states the plan notation and what may be built.",
      },
      {
        step: "Building permit",
        detail:
          "Apply with architectural and structural drawings, with design against the earthquake code.",
      },
      {
        step: "Supervision and occupancy",
        detail:
          "Supervision is by contracted professionals, and an occupancy permit is required before use.",
      },
    ],
    caution:
      "Earthquake code compliance is enforced through the permitted design and supervision records, not only at inspection.",
  },
  {
    countryCode: "EG",
    country: "Egypt",
    authority:
      "The municipality or the New Urban Communities Authority, depending on the land",
    instruments: [
      "Egyptian Building Law 119 of 2008 and its executive regulations",
      "Municipal or new city building conditions",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks and heights are fixed by the building conditions for the plot, which differ between old city districts and new urban communities.",
    approvals: [
      {
        step: "Building conditions",
        detail:
          "Obtain the building conditions (shurut al bina) for the plot from the authority.",
      },
      {
        step: "Building permit",
        detail: "Apply with drawings that match those conditions exactly.",
      },
      {
        step: "Inspection and completion",
        detail:
          "Inspections during construction, then a completion certificate.",
      },
    ],
    caution:
      "New urban communities on desert land are governed by a different authority from the old city, with tighter design control.",
  },
  {
    countryCode: "FR",
    country: "France",
    authority:
      "The commune (mairie), with the departement for some larger projects",
    instruments: [
      "Code de l'urbanisme, with the plan local d'urbanisme",
      "Code de la construction et de l'habitation, and the RE2020 energy rules",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks come from the plan local d'urbanisme and the national rules on distance from the road and from neighbours. The mairie confirms for the plot.",
    approvals: [
      {
        step: "Certificate of urbanism",
        detail:
          "The certificat d'urbanisme states the rules and the services affecting the plot.",
      },
      {
        step: "Permis de construire",
        detail:
          "Submit the permit application, displayed at the site during the two month consultation.",
      },
      {
        step: "Declaration of completion",
        detail:
          "Declare completion and, where required, obtain the certificate of conformity before occupation.",
      },
    ],
    caution:
      "The declaration of opening a building site and the permit are different steps. Starting work before the permit is final is an offence.",
  },
  {
    countryCode: "DE",
    country: "Germany",
    authority:
      "The municipality (Gemeinde) building authority, with the Land building code",
    instruments: [
      "The Land building code (Landesbauordnung)",
      "Binding land use plan (Bebauungsplan) and the federal building code (BauGB)",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks are set by the Bebauungsplan, and where none exists the Land code applies its own distance rules. The Bauamt confirms for the plot.",
    approvals: [
      {
        step: "Planning law check",
        detail:
          "Ask the Bauamt whether the plot is inside a Bebauungsplan and what it permits.",
      },
      {
        step: "Building application",
        detail:
          "Submit the Bauantrag with drawings and the structural and energy verification.",
      },
      {
        step: "Building permit and supervision",
        detail:
          "The permit is issued with the required inspections, and completion is reported to the authority.",
      },
    ],
    caution:
      "Where no Bebauungsplan exists, the project is judged on whether it fits the surrounding development pattern. That assessment is a matter of judgement, not arithmetic.",
  },
  {
    countryCode: "IT",
    country: "Italy",
    authority: "The comune, through its technical office (ufficio tecnico)",
    instruments: [
      "Testo unico dell'edilizia (DPR 380/2001)",
      "Comune planning instruments (piano regolatore) and building regulations",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Distances from boundaries and the road come from the comune building regulations and the civil code minimums. The ufficio tecnico confirms.",
    approvals: [
      {
        step: "Title for the works",
        detail:
          "Establish whether the works need a full building permit, a certified notification, or fall under free building activity.",
      },
      {
        step: "Submission",
        detail:
          "Submit the project with the professional's stamp and the calculation report.",
      },
      {
        step: "Completion notice",
        detail:
          "Notify completion and obtain the certificate of usability before occupation.",
      },
    ],
    caution:
      "The land registry and the urban planning status of a property can disagree. Check both before buying or building.",
  },
  {
    countryCode: "ES",
    country: "Spain",
    authority:
      "The ayuntamiento (municipality), with the regional building law",
    instruments: [
      "Ley de Ordenacion de la Edificacion and the Codigo Tecnico de la Edificacion",
      "Municipal planning scheme (PGOU) and municipal ordinance",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks, coverage and height come from the PGOU for the plot's zoning class. The municipal technical office states the standard.",
    approvals: [
      {
        step: "Planning check",
        detail:
          "Confirm the zoning class and the applicable standards at the municipal technical office.",
      },
      {
        step: "Building permit",
        detail:
          "Major works need licencia de obra mayor with a full project from a registered architect.",
      },
      {
        step: "Completion and first occupation",
        detail:
          "Declare completion and obtain the licence of first occupation before use.",
      },
    ],
    caution:
      "Rural and protected land carries stricter limits than urban land, and enforcement on protected land can require demolition.",
  },
  {
    countryCode: "NL",
    country: "Netherlands",
    authority:
      "The municipality (gemeente), through the environmental permit system",
    instruments: [
      "Environment and Planning Act (Omgevingswet) from 2024",
      "Municipal environmental plan (omgevingsplan)",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "The municipal environmental plan states setbacks and permitted uses. The municipality confirms whether a permit is needed at all.",
    approvals: [
      {
        step: "Permit check",
        detail:
          "Check the environmental plan to see whether the work is permit free, notification only, or requires a permit.",
      },
      {
        step: "Permit application",
        detail:
          "Submit through the national permit portal with drawings and construction safety documentation.",
      },
      {
        step: "Construction and completion",
        detail:
          "Supervision is by the contractor and the qualified person, with a completion notification.",
      },
    ],
    caution:
      "The permit system changed with the Environment and Planning Act. Advice written before 2024 uses the old terms and can mislead.",
  },
  {
    countryCode: "PL",
    country: "Poland",
    authority:
      "The county building supervision authority (powiatowy inspektorat nadzoru budowlanego) with the municipality for zoning",
    instruments: [
      "Construction Law (Prawo budowlane)",
      "Local spatial development plan (plan miejscowy)",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks are in the local spatial development plan. Where no plan exists, a decision on building conditions is issued for the plot.",
    approvals: [
      {
        step: "Plan or conditions",
        detail:
          "Confirm the plan, or obtain the decision on building conditions where none covers the plot.",
      },
      {
        step: "Building permit",
        detail: "Apply with the project and the required technical opinions.",
      },
      {
        step: "Construction log and completion",
        detail:
          "The site log is a legal document, and completion is notified before use.",
      },
    ],
    caution:
      "Building without a permit or without notifying the start is an administrative offence with a regularisation cost.",
  },
  {
    countryCode: "SE",
    country: "Sweden",
    authority: "The municipal building committee (byggnadsnamnd)",
    instruments: [
      "Planning and Building Act (Plan- och bygglagen)",
      "Detailed development plan (detaljplan)",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks come from the detaljplan and the municipal plan provisions. Where no plan exists, the committee assesses the plot.",
    approvals: [
      {
        step: "Plan and permit check",
        detail:
          "Check whether the measure needs a building permit or only a notification.",
      },
      {
        step: "Building permit",
        detail:
          "Submit drawings and the control plan with a certified building inspector.",
      },
      {
        step: "Final certificate",
        detail:
          "The final certificate confirms the building is complete and may be used.",
      },
    ],
    caution:
      "A control plan with a certified inspector is required for most work. Skipping it stalls the final certificate.",
  },
  {
    countryCode: "CH",
    country: "Switzerland",
    authority:
      "The canton and the commune, through the cantonal building authority",
    instruments: [
      "Cantonal building law and the cantonal spatial planning law",
      "Federal Spatial Planning Act",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks and height limits come from the cantonal and communal zoning plan. Each canton sets its own distances.",
    approvals: [
      {
        step: "Zoning check",
        detail:
          "Confirm the zone and the building windows for the plot with the commune.",
      },
      {
        step: "Building application",
        detail:
          "The application is publicly displayed for neighbours to object, and the canton decides.",
      },
      {
        step: "Completion notice",
        detail:
          "Report completion and obtain the authorisation to use the building.",
      },
    ],
    caution:
      "Neighbour objection rights are real in Switzerland. Shortening the objection window is not possible by private agreement.",
  },
  {
    countryCode: "MX",
    country: "Mexico",
    authority:
      "The municipality (municipio), through its public works or urban development office",
    instruments: [
      "Municipal building regulations (reglamento de construcciones)",
      "State urban development law and local urban programme",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks and coverage come from the municipal building regulations and the urban programme for the area, and they vary by municipality.",
    approvals: [
      {
        step: "Land use certificate",
        detail:
          "Obtain the land use certificate confirming the plot permits the intended use.",
      },
      {
        step: "Building licence",
        detail:
          "Apply for the licence with drawings signed by a registered director of the work.",
      },
      {
        step: "Inspection and completion",
        detail:
          "Works are supervised by the responsible professional, with a completion notice at the end.",
      },
    ],
    caution:
      "A registered director of the works is legally responsible for the construction, and that responsibility does not transfer to the owner.",
  },
  {
    countryCode: "BR",
    country: "Brazil",
    authority:
      "The municipality (prefeitura), through its works or urban licensing department",
    instruments: [
      "Municipal building code and the director plan (plano diretor)",
      "State and municipal construction licensing requirements",
    ],
    setbackStatus: "set-by-scheme",
    setbackNote:
      "Setbacks, occupancy ratio and floor area ratio come from the municipal zoning law for the lot. Each city publishes its own parameters.",
    approvals: [
      {
        step: "Zoning and lot check",
        detail:
          "Confirm the zoning, the lot dimensions and whether the lot is regularised in the land registry.",
      },
      {
        step: "Construction approval",
        detail:
          "Submit the project for construction approval (alvara de construcao) with the responsible engineer or architect named.",
      },
      {
        step: "Completion and habite-se",
        detail:
          "The habite-se certificate is required to occupy and to register the built area.",
      },
    ],
    caution:
      "Land regularisation and building licensing are separate problems. Many plots are still unregistered after occupation.",
  },
];

export const INTERNATIONAL_JURISDICTIONS: PlanningJurisdiction[] =
  MARKET_SEEDS.map((m) => ({
    id: `ww-${m.countryCode.toLowerCase()}`,
    countryCode: m.countryCode,
    country: m.country,
    region: null,
    authority: m.authority,
    authorityStatus: m.authorityStatus ?? "confirm-office",
    instruments: m.instruments,
    setbackStatus: m.setbackStatus,
    setbacks: m.setbacks ?? [],
    setbackNote: m.setbackNote,
    approvals: m.approvals,
    caution: m.caution,
    sourceUrl: m.sourceUrl,
    verifiedOn: m.sourceUrl ? NG_VERIFIED_ON : undefined,
  }));

export const ALL_JURISDICTIONS: PlanningJurisdiction[] = [
  ...NG_JURISDICTIONS,
  ...INTERNATIONAL_JURISDICTIONS,
];

/** Countries that have at least one jurisdiction in the guide. */
export const PLANNING_COUNTRIES: Array<{
  code: string;
  name: string;
  count: number;
}> = Array.from(
  ALL_JURISDICTIONS.reduce((map, j) => {
    const entry = map.get(j.countryCode) ?? {
      code: j.countryCode,
      name: j.country,
      count: 0,
    };
    entry.count += 1;
    map.set(j.countryCode, entry);
    return map;
  }, new Map<string, { code: string; name: string; count: number }>()),
)
  .map(([, v]) => v)
  .sort((a, b) => {
    if (a.code === "NG") return -1;
    if (b.code === "NG") return 1;
    return a.name.localeCompare(b.name);
  });

export function getJurisdictionsByCountry(
  countryCode: string,
): PlanningJurisdiction[] {
  return ALL_JURISDICTIONS.filter(
    (j) => j.countryCode === countryCode.toUpperCase(),
  ).sort((a, b) => (a.region ?? "").localeCompare(b.region ?? ""));
}

export function findJurisdiction(id: string): PlanningJurisdiction | undefined {
  return ALL_JURISDICTIONS.find((j) => j.id === id);
}

export const SETBACK_STATUS_LABEL: Record<SetbackStatus, string> = {
  published: "Published figure",
  indicative: "National norm, confirm in writing",
  "set-by-scheme": "Set by the local scheme",
};
