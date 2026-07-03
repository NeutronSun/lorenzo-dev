import { HTMLComponent } from '@theme/HTMLComponent';
import { DialogComponent } from '@theme/DialogComponent';
import { OnFiltersApplyEvent } from '@theme/events';
import { TemplateHandler, UrlUtils } from '@theme/utilities';
import { CollectionPartial } from '@theme/CollectionPartial';

/**
 * @typedef {Object} FiltersRefs
 * @property {HTMLInputElement[]} persistent
 */

/**
 * Collection filter form with async partial refresh.
 * @extends {HTMLComponent<FiltersRefs>}
 */
class Filters extends HTMLComponent {
  constructor() {
    super();

    this.onFiltersApply = this.onFiltersApply.bind(this);
    this.onPopState = this.onPopState.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(OnFiltersApplyEvent.TYPE, this.onFiltersApply);
    window.addEventListener('popstate', this.onPopState);
  }

  disconnectedCallback() {
    document.removeEventListener(OnFiltersApplyEvent.TYPE, this.onFiltersApply);
    window.removeEventListener('popstate', this.onPopState);
    super.disconnectedCallback();
  }

  /**
   * @param {OnFiltersApplyEvent} event
   */
  onFiltersApply(event) {
    if (!event.params) return;

    this.dataset.variant === 'drawer' && this.render(event.params);
    this.dataset.variant === 'toolbar' && this.syncChecked(event.params);
  }

  onPopState() {
    const params = new URLSearchParams(window.location.search);

    this.dataset.variant === 'drawer' && this.render(params);
    this.dataset.variant === 'toolbar' && this.syncChecked(params);
  }

  /**
   * Applies filters on form submit and closes the filter dialog.
   * @param {SubmitEvent} event
   * @param {Element} element
   */
  handleSubmit(event, element) {
    if (!(element instanceof HTMLFormElement)) return;

    event.preventDefault();
    this.publish(this.getSearchParams(element));
    this.closeDialog();
  }

  /**
   * Applies filters on input change.
   * @param {Event} event
   * @param {Element} element
   */
  handleChange(event, element) {
    if (!(element instanceof HTMLFormElement)) return;

    this.publish(this.getSearchParams(element));
  }

  /**
   * Clears the filter form while preserving persistent params.
   * @param {Event} event
   * @param {Element} element
   */
  clear(event, element) {
    const form = element.closest('form');

    if (!(form instanceof HTMLFormElement)) return;

    event.preventDefault();
    form.reset();
    this.publish(this.getPersistentSearchParams(form));
  }

  /**
   * Closes the parent filter dialog.
   * @param {Event} event
   * @param {Element} element
   */
  close(event, element) {
    event.preventDefault();
    this.closeDialog();
  }

  closeDialog() {
    const host = this.closestTag('dialog-component');

    if (!(host instanceof HTMLElement)) return;

    const name = host.getAttribute('name');

    name && DialogComponent.requestClose(name);
  }

  /**
   * @param {HTMLFormElement} form
   * @returns {URLSearchParams}
   */
  getSearchParams(form) {
    const params =
      this.dataset.variant === 'toolbar'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();

    for (const element of form.elements) {
      if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLSelectElement)) continue;

      element.name && params.delete(element.name);
    }

    const formData = new FormData(form);

    for (const [key, value] of formData.entries()) {
      if (!value) continue;

      params.append(key, value.toString());
    }

    return params;
  }

  /**
   * @param {HTMLFormElement} form
   * @returns {URLSearchParams}
   */
  getPersistentSearchParams(form) {
    const params = new URLSearchParams();

    for (const input of this.refs.persistent || []) {
      if (!(input instanceof HTMLInputElement)) continue;
      if (!input.value) continue;

      params.append(input.name, input.value);
    }

    return params;
  }

  /**
   * @param {URLSearchParams} params
   */
  publish(params) {
    document.dispatchEvent(
      new OnFiltersApplyEvent({
        params,
      })
    );
  }

  /**
   * @param {URLSearchParams} params
   */
  syncChecked(params) {
    const form = this.querySelector('form');

    if (!(form instanceof HTMLFormElement)) return;

    for (const input of form.querySelectorAll('input[type="radio"]')) {
      if (!(input instanceof HTMLInputElement) || !input.name) continue;

      const values = params.getAll(input.name);

      input.checked = values.includes(input.value) || (!input.value && !values.length);
    }
  }

  /**
   * @param {URLSearchParams} params
   */
  async render(params) {
    const url = CollectionPartial.buildUrl(params, CollectionPartial.VIEW.FILTERS);
    const nextFilters = await TemplateHandler.fetch(url, CollectionPartial.SELECTOR.FILTERS);

    if (!(nextFilters instanceof HTMLElement)) return;

    const form = this.querySelector('form');

    if (!(form instanceof HTMLFormElement)) return;

    TemplateHandler.replaceInner(form, nextFilters, 'form');
    this.updateRefs();
  }
}

if (!customElements.get('collection-filters')) {
  customElements.define('collection-filters', Filters);
}
