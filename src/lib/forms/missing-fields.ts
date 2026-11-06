/**
 * Which fields a reader has left empty, named the way the field is named.
 *
 * Calculators used to answer an incomplete form with a single sentence, or with
 * nothing at all, and the reader had to hunt for the box they missed. This reads
 * the form that is already on the page rather than asking every calculator to
 * restate its own validation: a field is required when the markup says so, and a
 * field is missing when the value a reader would have typed is empty.
 *
 * The markup contract is deliberately small and works with markup that already
 * exists:
 *   - `required` (native), `aria-required="true"` or `data-required="true"`
 *   - `data-field-label="Length"` overrides the label that is read off the page
 *
 * Radios and checkboxes are missing when nothing is selected, so a group of
 * choices reports the group's own label rather than each option.
 */

const REQUIRED_ATTRIBUTES = [
  "[required]",
  '[aria-required="true"]',
  '[data-required="true"]',
];

const FIELD_TAGS = ["input", "select", "textarea"];

/** `input[required], select[required], ...` built rather than hand written, so a
 * new required convention cannot silently apply to only one control type. */
const REQUIRED_SELECTOR = FIELD_TAGS.flatMap((tag) =>
  REQUIRED_ATTRIBUTES.map((attribute) => `${tag}${attribute}`),
).join(", ");

export interface MissingField {
  /** DOM id of the control, when it has one. Used to focus it again. */
  id: string;
  /** The name a reader knows the field by, cleaned of hint text. */
  label: string;
  /** The control itself, so the caller can focus and scroll to it. */
  element: HTMLElement;
}

export function isFieldEmpty(element: Element): boolean {
  if (element instanceof HTMLInputElement) {
    const type = (element.type || "text").toLowerCase();
    if (type === "checkbox" || type === "radio") return !element.checked;
    if (type === "hidden" || type === "submit" || type === "button")
      return false;
    return element.value.trim() === "";
  }
  if (element instanceof HTMLSelectElement) {
    return element.value.trim() === "" || element.selectedIndex < 0;
  }
  if (element instanceof HTMLTextAreaElement) {
    return element.value.trim() === "";
  }
  // Unknown element type: fall back to the attribute, which is what a form
  // control of any kind exposes.
  const value = (element as HTMLInputElement).value;
  return typeof value === "string" ? value.trim() === "" : true;
}

/** Collapse the whitespace an inline label picks up from JSX formatting. */
export function cleanLabelText(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/**
 * The text of the part of a label that names the field.
 *
 * Inline fields on these pages wrap the input in a label that also carries a
 * hint ("Gate width (m)" plus "0 if the wall has no opening"). Reading the whole
 * label would put the hint in the notice, so the first block-level child is used
 * when there is one, which is how every field on the site is written.
 */
function labelTextFromLabelElement(label: Element | null): string {
  if (!label) return "";
  const first = label.firstElementChild;
  const firstText = cleanLabelText(first?.textContent);
  if (firstText) return firstText;
  return cleanLabelText(label.textContent);
}

function humaniseAttribute(value: string): string {
  const spaced = value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  if (!spaced) return "";
  // "slabThickness" should read as a phrase, not as a title.
  return spaced
    .split(" ")
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word.toLowerCase(),
    )
    .join(" ");
}

/**
 * The name of a field, in order of how deliberate each source is: an explicit
 * label, an accessible name, its own label element, then its name or id.
 */
export function fieldLabel(element: Element): string {
  const explicit = cleanLabelText(element.getAttribute("data-field-label"));
  if (explicit) return explicit;

  const aria = cleanLabelText(element.getAttribute("aria-label"));
  if (aria) return aria;

  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const owner = element.ownerDocument?.getElementById(
      labelledBy.split(/\s+/)[0],
    );
    const text = labelTextFromLabelElement(owner);
    if (text) return text;
  }

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement
  ) {
    const labels = element.labels;
    if (labels && labels.length > 0) {
      const text = labelTextFromLabelElement(labels[0]);
      if (text) return text;
    }
  }

  const wrapping = element.closest("label");
  const wrappedText = labelTextFromLabelElement(wrapping);
  if (wrappedText) return wrappedText;

  const named = humaniseAttribute(element.getAttribute("name") ?? "");
  if (named) return named;

  return humaniseAttribute(element.id);
}

function radioGroupName(element: Element): string {
  if (!(element instanceof HTMLInputElement)) return "";
  if ((element.type || "").toLowerCase() !== "radio") return "";
  return element.name;
}

/**
 * Every required field inside `container` that has no value, in the order it
 * appears on the page, with each radio group reported once.
 */
export function findMissingFields(
  container: ParentNode | null | undefined,
): MissingField[] {
  if (!container || typeof container.querySelectorAll !== "function") return [];

  const found: MissingField[] = [];
  const seenGroups = new Set<string>();

  for (const element of Array.from(
    container.querySelectorAll<HTMLElement>(REQUIRED_SELECTOR),
  )) {
    const required =
      element.hasAttribute("required") ||
      element.getAttribute("aria-required") === "true" ||
      element.getAttribute("data-required") === "true";
    if (!required) continue;

    const group = radioGroupName(element);
    if (group) {
      const groupKey = `radio:${group}`;
      if (seenGroups.has(groupKey)) continue;
      seenGroups.add(groupKey);
      const groupInputs = Array.from(
        container.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
      ).filter((input) => input.name === group);
      if (groupInputs.some((input) => input.checked)) continue;
      found.push({
        id: element.id || group,
        label: fieldLabel(element) || humaniseAttribute(group),
        element,
      });
      continue;
    }

    if (!isFieldEmpty(element)) continue;

    found.push({
      id: element.id || fieldLabel(element),
      label: fieldLabel(element) || "This field",
      element,
    });
  }

  return found;
}

/**
 * Put the cursor on the first field that needs attention, and scroll it clear of
 * the floating header. Returns the focused field, or null when the element
 * cannot take focus.
 */
export function focusMissingField(
  field: MissingField | undefined,
  options: { offset?: number } = {},
): MissingField | null {
  if (!field) return null;
  const element = field.element;
  try {
    element.focus({ preventScroll: true });
  } catch {
    // Focus is a courtesy. Reporting the field still stands.
  }
  if (typeof element.scrollIntoView === "function") {
    element.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }
  return field;
}
