/**
 * Localization drawer form: country/language search, selection, and dialog close.
 */

import { DialogComponent } from '@theme/dialog';
import { HTMLComponent } from '@theme/HTMLComponent';
import { HtmlUtils } from '@theme/utilities';

/**
 * @typedef {Object} LocalizationFormRefs
 * @property {HTMLInputElement} countryInput
 * @property {HTMLInputElement} languageInput
 * @property {HTMLInputElement} search
 * @property {HTMLElement} empty
 * @property {HTMLDetailsElement[]} countries
 * @property {HTMLButtonElement[]} languages
 */

/**
 * Localization drawer form with country and language search.
 * @extends {HTMLComponent<LocalizationFormRefs>}
 */
class LocalizationForm extends HTMLComponent {
  static LANGUAGE_SELECTOR = '.localization-language';

  connectedCallback() {
    super.connectedCallback();
    this.updateSelection();
    this.restoreSelectedCountry();
  }

  /**
   * Stores the selected country and language in hidden inputs.
   * @param {Event} event
   * @param {Element} element
   */
  select(event, element) {
    if (!(element instanceof HTMLButtonElement)) return;

    const countryCode = element.dataset.countryCode;
    const languageCode = element.dataset.languageCode;

    if (!countryCode || !languageCode) return;

    this.refs.countryInput.value = countryCode;
    this.refs.languageInput.value = languageCode;
    this.updateSelection();
  }

  /**
   * Filters countries and languages while typing in the search field.
   * @param {Event} event
   * @param {Element} element
   */
  handleInput(event, element) {
    if (!(element instanceof HTMLInputElement)) return;

    this.filter(element.value);
  }

  /**
   * Closes the parent localization dialog.
   * @param {Event} event
   * @param {Element} element
   */
  close(event, element) {
    const dialog = this.closestTag('dialog-component');

    if (!(dialog instanceof DialogComponent)) return;

    dialog.close();
  }

  /**
   * Filters visible countries and languages by normalized query.
   * @param {string} value
   */
  filter(value) {
    const query = HtmlUtils.normalize(value);

    this.clearSearchState();

    if (!query) {
      this.restoreSelectedCountry();
      this.refs.empty.hidden = true;
      return;
    }

    const countryMatches = [];

    for (const country of this.refs.countries) {
      const countryName = HtmlUtils.normalize(country.dataset.countryName ?? '');

      if (countryName.includes(query)) countryMatches.push(country);
    }

    if (countryMatches.length > 0) {
      for (const country of this.refs.countries) {
        const matches = countryMatches.includes(country);

        country.hidden = !matches;
        country.open = matches;
        country.toggleAttribute('data-search-match', matches);

        if (matches) {
          this.updateCountryLabel(country, query);
          this.updateLanguageMatches(country, query);
        }
      }

      this.refs.empty.hidden = true;
      return;
    }

    let hasLanguageMatches = false;

    for (const country of this.refs.countries) {
      const countryHasMatch = this.updateLanguageMatches(country, query);

      country.hidden = !countryHasMatch;
      country.open = countryHasMatch;
      hasLanguageMatches ||= countryHasMatch;
    }

    this.refs.empty.hidden = hasLanguageMatches;
  }

  /**
   * Toggles language match state inside a country block.
   * @param {HTMLDetailsElement} country
   * @param {string} query
   * @returns {boolean}
   */
  updateLanguageMatches(country, query) {
    let hasMatches = false;

    for (const language of country.querySelectorAll(LocalizationForm.LANGUAGE_SELECTOR)) {
      if (!(language instanceof HTMLButtonElement)) continue;

      const languageName = HtmlUtils.normalize(language.dataset.languageName ?? '');
      const languageEndonym = HtmlUtils.normalize(language.dataset.languageEndonym ?? '');
      const matches = languageName.includes(query) || languageEndonym.includes(query);

      language.toggleAttribute('data-search-match', matches);
      this.updateLanguageLabel(language, query);
      hasMatches ||= matches;
    }

    return hasMatches;
  }

  /** Resets search match state on all countries and languages. */
  clearSearchState() {
    for (const country of this.refs.countries) {
      country.hidden = false;
      country.removeAttribute('data-search-match');
      this.updateCountryLabel(country, '');
    }

    for (const language of this.refs.languages) {
      language.removeAttribute('data-search-match');
      this.updateLanguageLabel(language, '');
    }
  }

  /**
   * @param {HTMLButtonElement} language
   * @param {string} query
   */
  updateLanguageLabel(language, query) {
    const label = language.querySelector('[data-language-label]');
    const endonym = language.dataset.languageEndonym ?? '';

    this.updateLabel(label, endonym, query);
  }

  /**
   * @param {HTMLDetailsElement} country
   * @param {string} query
   */
  updateCountryLabel(country, query) {
    const label = country.querySelector('[data-country-label]');
    const countryName = country.dataset.countryName ?? '';

    this.updateLabel(label, countryName, query);
  }

  /**
   * @param {Element | null} label
   * @param {string} value
   * @param {string} query
   */
  updateLabel(label, value, query) {
    const matchIndex = HtmlUtils.normalize(value).indexOf(query);

    if (!(label instanceof HTMLElement)) return;

    if (!query || matchIndex < 0) {
      label.textContent = value;
      return;
    }

    const parts = [
      HtmlUtils.escape(value.slice(0, matchIndex)),
      `<mark>${HtmlUtils.escape(value.slice(matchIndex, matchIndex + query.length))}</mark>`,
      HtmlUtils.escape(value.slice(matchIndex + query.length)),
    ];

    label.innerHTML = parts.join('');
  }

  /** Clears the search field and restores the default country list. */
  resetSearch() {
    this.refs.search.value = '';
    this.filter('');
  }

  /** Reopens the currently selected country details block. */
  restoreSelectedCountry() {
    const selectedCountryCode = this.refs.countryInput.value;

    for (const country of this.refs.countries) {
      country.open = country.dataset.countryCode === selectedCountryCode;
    }
  }

  /** Syncs selected country and language aria state in the form. */
  updateSelection() {
    const selectedCountryCode = this.refs.countryInput.value;
    const selectedLanguageCode = this.refs.languageInput.value;

    for (const country of this.refs.countries) {
      country.toggleAttribute('data-selected', country.dataset.countryCode === selectedCountryCode);
    }

    for (const language of this.refs.languages) {
      const selected = language.dataset.countryCode === selectedCountryCode
        && language.dataset.languageCode === selectedLanguageCode;

      language.setAttribute('aria-pressed', String(selected));
    }
  }
}

if (!customElements.get('localization-form')) {
  customElements.define('localization-form', LocalizationForm);
}
