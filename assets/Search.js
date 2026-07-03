/**
 * Predictive search dialog and query normalization for collection/search forms.
 */

import { DialogComponent } from '@theme/Dialog';
import { HTMLComponent } from '@theme/HTMLComponent';

class SearchQuery {
  static TERM_SEPARATOR = /\s+/;

  /** @param {string} query */
  static toPrefix(query) {
    const parts = [];

    for (const term of query.split(SearchQuery.TERM_SEPARATOR)) {
      const normalizedTerm = term.trim();

      if (!normalizedTerm) continue;

      parts.push(normalizedTerm.endsWith('*') ? normalizedTerm : `${normalizedTerm}*`);
    }

    return parts.join(' ');
  }
}

/**
 * @typedef {import('@theme/Dialog').DialogComponentRefs & {
 *   input: HTMLInputElement,
 *   suggestions: HTMLElement,
 *   products: HTMLElement
 * }} SearchDialogRefs
 */

/**
 * @typedef {Object} SearchPartial
 * @property {string} html
 * @property {number} count
 */

/**
 * @typedef {Object} SearchData
 * @property {SearchPartial} products
 * @property {SearchPartial} suggestions
 * @property {number} count
 */

/**
 * @extends {DialogComponent}
 */
class SearchDialog extends DialogComponent {
  static DEBOUNCE_DELAY = 250;
  static RESULT_LIMIT = 5;
  static OPTION_SELECTOR = '[data-search-option]';
  static PRODUCTS_SELECTOR = '[data-search-products]';
  static SUGGESTIONS_SELECTOR = '[data-search-suggestions]';

  static STATE = Object.freeze({
    IDLE: 'idle',
    LOADING: 'loading',
    FILLED: 'filled',
    EMPTY: 'empty',
  });

  get isIdle() {
    return this.dataset.state === SearchDialog.STATE.IDLE;
  }

  get isLoading() {
    return this.dataset.state === SearchDialog.STATE.LOADING;
  }

  get isFilled() {
    return this.dataset.state === SearchDialog.STATE.FILLED;
  }

  get isEmpty() {
    return this.dataset.state === SearchDialog.STATE.EMPTY;
  }

  get options() {
    return Array.from(this.querySelectorAll(SearchDialog.OPTION_SELECTOR)).filter((option) => {
      return option instanceof HTMLElement && option.offsetParent !== null;
    });
  }

  constructor() {
    super();
    this.searchTimer = 0;
    this.activeIndex = -1;
    this.onSearchShortcut = null;
  }

  connectedCallback() {
    super.connectedCallback();

    this.onSearchDialogToggle = (event) => {
      if (!(event instanceof ToggleEvent) || event.newState !== 'open') return;

      this.onDialogOpen();
      window.requestAnimationFrame(() => this.refs.input?.focus());
    };

    this.refs.dialog?.addEventListener('toggle', this.onSearchDialogToggle);

    this.onSearchShortcut = (event) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.altKey || event.key.toLowerCase() !== 'f') return;

      event.preventDefault();

      if (this.refs.dialog?.open) {
        this.refs.input?.focus();
        return;
      }

      DialogComponent.showModal('search');
    };

    document.addEventListener('keydown', this.onSearchShortcut);
  }

  disconnectedCallback() {
    this.clearTimer();
    this.onSearchDialogToggle && this.refs.dialog?.removeEventListener('toggle', this.onSearchDialogToggle);
    this.onSearchShortcut && document.removeEventListener('keydown', this.onSearchShortcut);
    this.onSearchDialogToggle = null;
    this.onSearchShortcut = null;
    super.disconnectedCallback();
  }

  /** @param {string} state */
  setState(state) {
    this.dataset.state = state;

    const input = this.refs.input;

    if (!input) return;

    input.toggleAttribute('aria-busy', this.isLoading);
    input.setAttribute('aria-expanded', this.isFilled ? 'true' : 'false');
    !this.isFilled && input.removeAttribute('aria-activedescendant');
  }

  clearTimer() {
    this.searchTimer && window.clearTimeout(this.searchTimer);
    this.searchTimer = 0;
  }

  clearInput() {
    const input = this.refs.input;

    if (!input) return;

    input.value = '';
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-busy', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  clearResults() {
    if (this.refs.suggestions) this.refs.suggestions.innerHTML = '';
    if (this.refs.products) this.refs.products.innerHTML = '';
  }

  /** @param {string} query */
  isCurrentQuery(query) {
    return this.isConnected && this.refs.input?.value.trim() === query;
  }

  onDialogOpen() {
    this.clearTimer();
    this.setState(SearchDialog.STATE.IDLE);
    this.clearInput();
    this.clearResults();
    this.activeIndex = -1;
  }

  onInputEmpty() {
    this.clearTimer();
    this.setState(SearchDialog.STATE.IDLE);
    this.clearResults();
    this.activeIndex = -1;
  }

  /** @param {Event} event */
  handleInput(event) {
    const input = event.target;

    if (!(input instanceof HTMLInputElement)) return;

    this.clearTimer();

    const query = input.value.trim();

    if (!query) {
      this.onInputEmpty();
      return;
    }

    this.setState(SearchDialog.STATE.LOADING);
    this.searchTimer = window.setTimeout(() => this.search(query), SearchDialog.DEBOUNCE_DELAY);
  }

  /** @param {SubmitEvent} event */
  handleSubmit(event) {
    if (!this.refs.input) return;

    this.refs.input.value = SearchQuery.toPrefix(this.refs.input.value);
  }

  /** @param {KeyboardEvent} event */
  handleKeydown(event) {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        this.moveActiveOption(event);
        break;
    }
  }

  /** @param {KeyboardEvent} event */
  moveActiveOption(event) {
    const options = this.options;

    if (!options.length) return;

    event.preventDefault();

    const focusedIndex = options.indexOf(document.activeElement);
    const currentIndex = focusedIndex >= 0 ? focusedIndex : this.activeIndex;

    if (event.key === 'ArrowDown') {
      this.activeIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
    } else {
      this.activeIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
    }

    const option = options[this.activeIndex];

    if (!(option instanceof HTMLElement)) return;

    option.focus();
    option.id ||= `search-option-${this.activeIndex}`;
    this.refs.input?.setAttribute('aria-activedescendant', option.id);
  }

  /** @param {string} query */
  async search(query) {
    const data = await SearchDialog.fetch(query, this);

    if (!this.isCurrentQuery(query)) return;

    this.render(data);
    this.setState(data.count > 0 ? SearchDialog.STATE.FILLED : SearchDialog.STATE.EMPTY);
  }

  /**
   * @param {string} query
   * @param {SearchDialog} dialog
   * @returns {Promise<SearchData>}
   */
  static async fetch(query, dialog) {
    const [productsResponse, suggestionsResponse] = await Promise.all([
      fetch(dialog.getProductsUrl(query)),
      fetch(dialog.getSuggestionsUrl(query)),
    ]);

    const [products, suggestions] = await Promise.all([
      SearchDialog.parsePartial(productsResponse, SearchDialog.PRODUCTS_SELECTOR),
      SearchDialog.parsePartial(suggestionsResponse, SearchDialog.SUGGESTIONS_SELECTOR),
    ]);

    return {
      products,
      suggestions,
      count: products.count + suggestions.count,
    };
  }

  /**
   * @param {Response} response
   * @param {string} selector
   * @returns {Promise<SearchPartial>}
   */
  static async parsePartial(response, selector) {
    if (!response.ok) return { html: '', count: 0 };

    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const content = parsed.querySelector(selector);

    if (!(content instanceof HTMLElement)) return { html: '', count: 0 };

    return {
      html: content.innerHTML,
      count: Number(content.dataset.count) || 0,
    };
  }

  /** @param {SearchData} data */
  render(data) {
    if (this.refs.products) this.refs.products.innerHTML = data.products.html;
    if (this.refs.suggestions) this.refs.suggestions.innerHTML = data.suggestions.html;
    this.activeIndex = -1;
  }

  /** @param {string} query */
  getProductsUrl(query) {
    const url = new URL(window.Theme.routes.search_url, window.location.origin);

    url.searchParams.set('view', 'predictive');
    url.searchParams.set('type', 'product');
    url.searchParams.set('q', SearchQuery.toPrefix(query));
    url.searchParams.set('options[prefix]', 'last');

    return url;
  }

  /** @param {string} query */
  getSuggestionsUrl(query) {
    const url = new URL(window.Theme.routes.predictive_search_url, window.location.origin);

    url.searchParams.set('q', query);
    url.searchParams.set('resources[type]', 'collection');
    url.searchParams.set('resources[limit]', SearchDialog.RESULT_LIMIT.toString());
    url.searchParams.set('section_id', this.getAttribute('section-id') ?? '');

    return url;
  }
}

if (!customElements.get('search-dialog')) {
  customElements.define('search-dialog', SearchDialog);
}

/**
 * @typedef {Object} SearchFormRefs
 * @property {HTMLInputElement} query
 */

/** @extends {HTMLComponent<SearchFormRefs>} */
class SearchForm extends HTMLComponent {
  /** @param {SubmitEvent} event */
  handleSubmit(event) {
    if (!this.refs.query) return;

    this.refs.query.value = SearchQuery.toPrefix(this.refs.query.value);
  }
}

if (!customElements.get('search-form')) {
  customElements.define('search-form', SearchForm);
}
