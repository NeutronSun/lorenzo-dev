import { HTMLComponent } from '@theme/HTMLComponent';

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
 * @extends {HTMLComponent<LocalizationFormRefs>}
 */
class LocalizationForm extends HTMLComponent {
  static HTML_ENTITIES = Object.freeze({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  });
  static LANGUAGE_SELECTOR = '[data-localization-language]';
  static CLOSE_SELECTOR = '[data-localization-close]';

  constructor() {
    super();

    this.onClick = (event) => this.handleClick(event);
    this.onInput = (event) => this.handleInput(event);
  }

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('click', this.onClick);
    this.addEventListener('input', this.onInput);
    this.updateSelection();
    this.restoreSelectedCountry();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('input', this.onInput);
    super.disconnectedCallback();
  }

  handleClick(event) {
    const target = event.target;

    if (!(target instanceof Element)) return;

    const closeButton = target.closest(LocalizationForm.CLOSE_SELECTOR);

    if (closeButton && this.contains(closeButton)) {
      this.close();
      return;
    }

    const language = target.closest(LocalizationForm.LANGUAGE_SELECTOR);

    if (!(language instanceof HTMLButtonElement)) return;
    if (!this.contains(language)) return;

    this.select(language);
  }

  handleInput(event) {
    if (event.target !== this.refs.search) return;

    this.filter(this.refs.search.value);
  }

  select(language) {
    const countryCode = language.dataset.countryCode;
    const languageCode = language.dataset.languageCode;

    if (!countryCode || !languageCode) return;

    this.refs.countryInput.value = countryCode;
    this.refs.languageInput.value = languageCode;
    this.updateSelection();
  }

  filter(value) {
    const query = LocalizationForm.normalize(value);

    this.clearSearchState();

    if (!query) {
      this.restoreSelectedCountry();
      this.refs.empty.hidden = true;
      return;
    }

    const countryMatches = [];

    for (const country of this.refs.countries) {
      const countryName = LocalizationForm.normalize(country.dataset.countryName ?? '');

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

  updateLanguageMatches(country, query) {
    let hasMatches = false;

    for (const language of country.querySelectorAll(LocalizationForm.LANGUAGE_SELECTOR)) {
      if (!(language instanceof HTMLButtonElement)) continue;

      const languageName = LocalizationForm.normalize(language.dataset.languageName ?? '');
      const languageEndonym = LocalizationForm.normalize(language.dataset.languageEndonym ?? '');
      const matches = languageName.includes(query) || languageEndonym.includes(query);

      language.toggleAttribute('data-search-match', matches);
      this.updateLanguageLabel(language, query);
      hasMatches ||= matches;
    }

    return hasMatches;
  }

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

  updateLanguageLabel(language, query) {
    const label = language.querySelector('[data-language-label]');
    const endonym = language.dataset.languageEndonym ?? '';

    this.updateLabel(label, endonym, query);
  }

  updateCountryLabel(country, query) {
    const label = country.querySelector('[data-country-label]');
    const countryName = country.dataset.countryName ?? '';

    this.updateLabel(label, countryName, query);
  }

  updateLabel(label, value, query) {
    const matchIndex = LocalizationForm.normalize(value).indexOf(query);

    if (!(label instanceof HTMLElement)) return;

    if (!query || matchIndex < 0) {
      label.textContent = value;
      return;
    }

    const parts = [
      LocalizationForm.escapeHtml(value.slice(0, matchIndex)),
      `<mark>${LocalizationForm.escapeHtml(value.slice(matchIndex, matchIndex + query.length))}</mark>`,
      LocalizationForm.escapeHtml(value.slice(matchIndex + query.length)),
    ];

    label.innerHTML = parts.join('');
  }

  resetSearch() {
    this.refs.search.value = '';
    this.filter('');
  }

  restoreSelectedCountry() {
    const selectedCountryCode = this.refs.countryInput.value;

    for (const country of this.refs.countries) {
      country.open = country.dataset.countryCode === selectedCountryCode;
    }
  }

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

  close() {
    const dialog = this.closestTag('dialog-component');

    if (!dialog || typeof dialog.close !== 'function') return;

    dialog.close();
  }

  static normalize(value) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase();
  }

  static escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => LocalizationForm.HTML_ENTITIES[character]);
  }
}

if (!customElements.get('localization-form')) {
  customElements.define('localization-form', LocalizationForm);
}
