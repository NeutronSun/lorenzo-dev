import { HTMLComponent } from '@theme/HTMLComponent';

export class VariantPicker extends HTMLComponent {
  /** @type {('option1' | 'option2' | 'option3')[]} */
  static OPTION_KEYS = ["option1", "option2", "option3"];

  get selectedValues() {
    return this.refs.options
      .map((fieldset) => fieldset.querySelector("input:checked")?.value || null)
      .filter(Boolean);
  }

  constructor() {
    super();
    /** @type {ProductVariant[]} */
    this.variants = [];
  }

  connectedCallback() {
    super.connectedCallback();

    if (this.refs.variants instanceof HTMLScriptElement) {
      this.variants = JSON.parse(this.refs.variants.textContent || '[]');
    }

    this.updateOptionStates();
  }

  onChange() {
    this.updateOptionStates();

    const variant = this.getSelectedVariant();
    if (!variant) return;

    document.dispatchEvent(
      new CustomEvent("variant-selected", {
        detail: {
          variant: variant,
          source: "variant-picker",
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  updateOptionStates() {
    const fieldsets = this.refs.options;
    const selected = this.selectedValues;

    for (const fieldset of fieldsets) {
      const optionIndex = Number(fieldset.dataset.option) - 1;

      for (const label of fieldset.querySelectorAll("label.tab")) {
        const input = label.querySelector('input[type="radio"]');

        const combo = selected.slice();
        combo[optionIndex] = input.value;

        label.dataset.optionState = this.getOptionState(combo);
      }
    }
  }

  /** @returns {ProductVariant | undefined} */
  getSelectedVariant() {
    const [option1, option2, option3] = this.selectedValues;

    const option3Fallback = this.variants.find((variant) => variant.option1 === option1 && variant.option2 === option2 && variant.option3 === option3);
    if (option3Fallback) 
      return option3Fallback;

    const option2Fallback = this.variants.find((variant) => variant.option1 === option1 && variant.option2 === option2);
    if (option2Fallback) 
      return option2Fallback;

    const option1Fallback = this.variants.find((variant) => variant.option1 === option1);
    if (option1Fallback) 
      return option1Fallback;
  }

  /**
   * @param {(string | null)[]} combo
   * @returns {string}
   */
  getOptionState(combo) {
    const matches = this.variants.filter((variant) =>
      VariantPicker.OPTION_KEYS.every(
        (key, i) => !combo[i] || variant[key] === combo[i],
      ),
    );

    if (!matches.length) return "unavailable";
    return matches.some((variant) => variant.available)
      ? "available"
      : "sold-out";
  }
}

if (!customElements.get('variant-picker')) {
  customElements.define('variant-picker', VariantPicker);
}
