// =========================================================
// Worldwide country catalogue
//
// Every country FRELUX can name, with its currency and the conventions we can
// derive safely. Countries with a curated row elsewhere keep their researched
// trade detail; everything here fills in currency, measurement system and
// number separators so no visitor is told their country is unsupported.
//
// Rows are a compact table rather than 190 object literals: easier to audit,
// harder to mistype, and parsed once at module load.
// =========================================================

/** code|name|currency, ISO 3166-1 alpha-2 and ISO 4217. */
const ROWS = `
AF|Afghanistan|AFN
AL|Albania|ALL
DZ|Algeria|DZD
AD|Andorra|EUR
AO|Angola|AOA
AG|Antigua and Barbuda|XCD
AR|Argentina|ARS
AM|Armenia|AMD
AU|Australia|AUD
AT|Austria|EUR
AZ|Azerbaijan|AZN
BS|Bahamas|BSD
BH|Bahrain|BHD
BD|Bangladesh|BDT
BB|Barbados|BBD
BY|Belarus|BYN
BE|Belgium|EUR
BZ|Belize|BZD
BJ|Benin|XOF
BT|Bhutan|BTN
BO|Bolivia|BOB
BA|Bosnia and Herzegovina|BAM
BW|Botswana|BWP
BR|Brazil|BRL
BN|Brunei|BND
BG|Bulgaria|BGN
BF|Burkina Faso|XOF
BI|Burundi|BIF
CV|Cabo Verde|CVE
KH|Cambodia|KHR
CM|Cameroon|XAF
CF|Central African Republic|XAF
TD|Chad|XAF
CL|Chile|CLP
CO|Colombia|COP
KM|Comoros|KMF
CG|Congo|XAF
CD|Congo, Democratic Republic|CDF
CR|Costa Rica|CRC
CI|Cote d'Ivoire|XOF
HR|Croatia|EUR
CU|Cuba|CUP
CY|Cyprus|EUR
CZ|Czechia|CZK
DK|Denmark|DKK
DJ|Djibouti|DJF
DM|Dominica|XCD
DO|Dominican Republic|DOP
EC|Ecuador|USD
EG|Egypt|EGP
SV|El Salvador|USD
GQ|Equatorial Guinea|XAF
ER|Eritrea|ERN
EE|Estonia|EUR
SZ|Eswatini|SZL
ET|Ethiopia|ETB
FJ|Fiji|FJD
FI|Finland|EUR
GA|Gabon|XAF
GM|Gambia|GMD
GE|Georgia|GEL
GH|Ghana|GHS
GR|Greece|EUR
GD|Grenada|XCD
GT|Guatemala|GTQ
GN|Guinea|GNF
GW|Guinea-Bissau|XOF
GY|Guyana|GYD
HT|Haiti|HTG
HN|Honduras|HNL
HK|Hong Kong|HKD
HU|Hungary|HUF
IS|Iceland|ISK
IN|India|INR
ID|Indonesia|IDR
IR|Iran|IRR
IQ|Iraq|IQD
IE|Ireland|EUR
IL|Israel|ILS
IT|Italy|EUR
JM|Jamaica|JMD
JP|Japan|JPY
JO|Jordan|JOD
KZ|Kazakhstan|KZT
KE|Kenya|KES
KI|Kiribati|AUD
KW|Kuwait|KWD
KG|Kyrgyzstan|KGS
LA|Laos|LAK
LV|Latvia|EUR
LB|Lebanon|LBP
LS|Lesotho|LSL
LR|Liberia|LRD
LY|Libya|LYD
LI|Liechtenstein|CHF
LT|Lithuania|EUR
LU|Luxembourg|EUR
MO|Macao|MOP
MG|Madagascar|MGA
MW|Malawi|MWK
MY|Malaysia|MYR
MV|Maldives|MVR
ML|Mali|XOF
MT|Malta|EUR
MH|Marshall Islands|USD
MR|Mauritania|MRU
MU|Mauritius|MUR
FM|Micronesia|USD
MD|Moldova|MDL
MC|Monaco|EUR
MN|Mongolia|MNT
ME|Montenegro|EUR
MA|Morocco|MAD
MZ|Mozambique|MZN
MM|Myanmar|MMK
NA|Namibia|NAD
NR|Nauru|AUD
NP|Nepal|NPR
NL|Netherlands|EUR
NZ|New Zealand|NZD
NI|Nicaragua|NIO
NE|Niger|XOF
MK|North Macedonia|MKD
NO|Norway|NOK
OM|Oman|OMR
PK|Pakistan|PKR
PW|Palau|USD
PA|Panama|PAB
PG|Papua New Guinea|PGK
PY|Paraguay|PYG
PE|Peru|PEN
PH|Philippines|PHP
PL|Poland|PLN
PT|Portugal|EUR
PR|Puerto Rico|USD
QA|Qatar|QAR
RO|Romania|RON
RU|Russia|RUB
RW|Rwanda|RWF
KN|Saint Kitts and Nevis|XCD
LC|Saint Lucia|XCD
VC|Saint Vincent and the Grenadines|XCD
WS|Samoa|WST
SM|San Marino|EUR
ST|Sao Tome and Principe|STN
SA|Saudi Arabia|SAR
SN|Senegal|XOF
RS|Serbia|RSD
SC|Seychelles|SCR
SL|Sierra Leone|SLE
SG|Singapore|SGD
SK|Slovakia|EUR
SI|Slovenia|EUR
SB|Solomon Islands|SBD
SO|Somalia|SOS
KR|South Korea|KRW
SS|South Sudan|SSP
ES|Spain|EUR
LK|Sri Lanka|LKR
SD|Sudan|SDG
SR|Suriname|SRD
SE|Sweden|SEK
CH|Switzerland|CHF
SY|Syria|SYP
TW|Taiwan|TWD
TJ|Tajikistan|TJS
TZ|Tanzania|TZS
TH|Thailand|THB
TL|Timor-Leste|USD
TG|Togo|XOF
TO|Tonga|TOP
TT|Trinidad and Tobago|TTD
TN|Tunisia|TND
TR|Turkiye|TRY
TM|Turkmenistan|TMT
TV|Tuvalu|AUD
UG|Uganda|UGX
UA|Ukraine|UAH
UY|Uruguay|UYU
UZ|Uzbekistan|UZS
VU|Vanuatu|VUV
VA|Vatican City|EUR
VE|Venezuela|VES
VN|Vietnam|VND
YE|Yemen|YER
ZM|Zambia|ZMW
ZW|Zimbabwe|USD
`;

export interface CatalogCountry {
  code: string;
  name: string;
  currencyCode: string;
}

export const COUNTRY_CATALOG: CatalogCountry[] = ROWS.trim()
  .split("\n")
  .map((line) => line.split("|"))
  .filter((parts) => parts.length === 3)
  .map(([code, name, currencyCode]) => ({ code, name, currencyCode }));

/**
 * Countries that measure day to day in feet and pounds. Myanmar and Liberia
 * are the two non-US cases that still do in practice; the UK is mixed and is
 * handled by its curated row instead.
 */
export const IMPERIAL_COUNTRIES = new Set(["US", "LR", "MM"]);

/** Countries whose written decimal separator is a comma. */
export const DECIMAL_COMMA_COUNTRIES = new Set([
  "AL",
  "AD",
  "AO",
  "AR",
  "AT",
  "AZ",
  "BY",
  "BE",
  "BO",
  "BA",
  "BR",
  "BG",
  "CV",
  "CL",
  "CO",
  "CR",
  "HR",
  "CU",
  "CY",
  "CZ",
  "DK",
  "DO",
  "EC",
  "EE",
  "SV",
  "FI",
  "FR",
  "GE",
  "DE",
  "GR",
  "GT",
  "GW",
  "HN",
  "HU",
  "IS",
  "ID",
  "IT",
  "KZ",
  "LV",
  "LT",
  "LU",
  "MK",
  "MG",
  "ML",
  "MT",
  "MR",
  "MD",
  "ME",
  "MA",
  "MZ",
  "NL",
  "NI",
  "NE",
  "NO",
  "PY",
  "PE",
  "PL",
  "PT",
  "RO",
  "RU",
  "SM",
  "ST",
  "RS",
  "SK",
  "SI",
  "ES",
  "SR",
  "SE",
  "CH",
  "TJ",
  "TN",
  "TR",
  "TM",
  "UA",
  "UY",
  "UZ",
  "VE",
  "VN",
  // Francophone and Lusophone Africa and the CFA zones keep the comma too.
  "BJ",
  "BF",
  "CM",
  "CF",
  "TD",
  "KM",
  "CG",
  "CD",
  "CI",
  "GQ",
  "GA",
  "GN",
  "LU",
  "SN",
  "TG",
]);

/** Countries that group thousands with a space rather than a comma or dot. */
export const SPACE_GROUP_COUNTRIES = new Set([
  "FR",
  "SE",
  "NO",
  "DK",
  "FI",
  "PL",
  "RU",
  "CZ",
  "SK",
  "IS",
  "LV",
  "EE",
  "LT",
  "UA",
  "CH",
  "BE",
]);

/** Currencies with no minor unit in everyday use. */
export const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

/**
 * Countries where FRELUX publishes its own market pricing today (32 profiles).
 * A country outside this set still gets a settings row, but its prices come
 * from the reference market, and the interface says so instead of implying a
 * local price book exists.
 */
export const MARKET_COUNTRY_CODES = new Set([
  "NG",
  "US",
  "GB",
  "CA",
  "AU",
  "DE",
  "IN",
  "GH",
  "KE",
  "ZA",
  "JP",
  "FR",
  "BR",
  "SA",
  "AE",
  "CN",
  "ID",
  "MX",
  "KR",
  "IT",
  "ET",
  "EG",
  "TZ",
  "CI",
  "ES",
  "NL",
  "PL",
  "SE",
  "CH",
  "SG",
  "TR",
  "NZ",
]);
