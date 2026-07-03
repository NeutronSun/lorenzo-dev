/**
 * Viewport-deferred section loader with skeleton state.
 */

import { HTMLComponent } from '@theme/HTMLComponent';
import { TemplateHandler } from '@theme/utilities';

/**
 * @typedef {Object} DeferredSectionRefs
 * @property {HTMLElement} skeleton
 * @property {HTMLElement} mount
 */

/**
 * @extends {HTMLComponent<DeferredSectionRefs>}
 */
class DeferredSection extends HTMLComponent {
  static OBSERVER_ROOT_MARGIN = '200px 0px';
  static CONTENT_SELECTOR = '[data-deferred-content]';
  static MOUNT_SELECTOR = '.deferred-section__mount';

  requestId = 0;
  observer = null;

  get url() {
    return this.dataset.url || '';
  }

  get sectionId() {
    return this.dataset.sectionId || '';
  }

  connectedCallback() {
    super.connectedCallback();

    if (DeferredSection.isNested(this)) return;

    this.dataset.loaded === 'true' ? this.showMount() : this.observe();
  }

  disconnectedCallback() {
    this.observer?.disconnect();
    this.observer = null;
    super.disconnectedCallback();
  }

  /** Starts observing viewport entry to trigger the deferred fetch. */
  observe() {
    if (!this.url) return;

    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.isIntersecting && this.load();
      }
    }, {
      rootMargin: DeferredSection.OBSERVER_ROOT_MARGIN,
    });

    this.observer.observe(this);
  }

  /** Shows skeleton and fetches remote section markup. */
  async load() {
    if (!this.url || this.dataset.loaded === 'true' || this.dataset.loading === 'true') return;

    this.dataset.loading = 'true';
    this.observer?.disconnect();
    this.observer = null;

    this.showSkeleton();

    const requestId = ++this.requestId;
    const text = await TemplateHandler.fetchText(this.url);

    if (!this.isConnected || requestId !== this.requestId) return;

    delete this.dataset.loading;

    if (!text) {
      this.finishEmpty();
      return;
    }

    const parsed = TemplateHandler.parseHtml(text);
    const content = DeferredSection.extractContent(parsed, this.sectionId);

    if (!DeferredSection.isValidContent(content)) {
      this.finishEmpty();
      return;
    }

    if (!(this.refs.mount instanceof HTMLElement)) return;

    this.refs.mount.innerHTML = content.innerHTML;
    DeferredSection.activateScripts(this.refs.mount);
    this.dataset.loaded = 'true';
    this.showMount();
  }

  /** Hides the host after a terminal empty or invalid response. */
  finishEmpty() {
    this.dataset.loaded = 'true';
    this.hidden = true;
  }

  showSkeleton() {
    this.toggleAttribute('loading', true);
    this.refs.skeleton instanceof HTMLElement && (this.refs.skeleton.hidden = false);
    this.refs.mount instanceof HTMLElement && (this.refs.mount.hidden = true);
  }

  showMount() {
    this.toggleAttribute('loading', false);
    this.refs.skeleton instanceof HTMLElement && (this.refs.skeleton.hidden = true);
    this.refs.mount instanceof HTMLElement && (this.refs.mount.hidden = false);
  }

  /**
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  static isNested(element) {
    const mount = element.parentElement?.closest(DeferredSection.MOUNT_SELECTOR);

    return mount instanceof HTMLElement && mount !== element;
  }

  /**
   * @param {HTMLElement | null} content
   * @returns {boolean}
   */
  static isValidContent(content) {
    if (!(content instanceof HTMLElement) || !content.innerHTML.trim()) return false;
    if (content.querySelector('deferred-section')) return false;

    return true;
  }

  /**
   * @param {Document} parsed
   * @param {string} sectionId
   * @returns {HTMLElement | null}
   */
  static extractContent(parsed, sectionId) {
    const section = sectionId
      ? parsed.querySelector(`#shopify-section-${sectionId}`)
      : null;
    const root = section instanceof HTMLElement ? section : parsed.body;

    if (!(root instanceof HTMLElement)) return null;

    const content = root.querySelector(DeferredSection.CONTENT_SELECTOR);

    if (content instanceof HTMLElement) return content;

    return null;
  }

  /**
   * Re-executes script tags injected through innerHTML.
   * @param {HTMLElement} root
   */
  static activateScripts(root) {
    for (const script of root.querySelectorAll('script')) {
      const next = document.createElement('script');

      for (const attribute of script.attributes) {
        next.setAttribute(attribute.name, attribute.value);
      }

      next.textContent = script.textContent;
      script.replaceWith(next);
    }
  }
}

if (!customElements.get('deferred-section')) {
  customElements.define('deferred-section', DeferredSection);
}

export { DeferredSection };
