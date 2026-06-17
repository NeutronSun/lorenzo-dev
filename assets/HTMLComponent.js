/**
 * @typedef {Record<string, Element | Element[]>} Refs
 */

/**
 * Base class for lightweight custom elements.
 *
 * Provides:
 * - automatic refs through `[ref]`
 * - array refs through `[ref="items[]"]`
 * - delegated event handlers through `[on:click="methodName"]`
 * - automatic refs refresh when the component DOM changes
 * 
 * @template {Refs} T
 * @extends {HTMLElement}
 */
export class HTMLComponent extends HTMLElement {
  /**
   * References collected from children with the `ref` attribute.
   *
   * @type {T}
   */
  refs = /** @type {T} */ ({});

  /**
   * Event handlers currently bound on the component.
   *
   * @type {Map<string, EventListener>}
   */
  boundEvents = new Map();

  /**
   * Keeps refs in sync when the component content changes,
   * for example after Shopify Section Rendering.
   *
   * @type {MutationObserver}
   */
  observer = new MutationObserver(() => {
    this.updateRefs();
  });

  /**
   * Collects refs from a root element.
   *
   * @param {ParentNode} root
   * @returns {Refs}
   */
  static getRefs(root) {
    const refs = /** @type any */ ({});

    for (const element of root.querySelectorAll('[ref]')) {
      const name = element.getAttribute('ref');

      if (!name) continue;

      if (name.endsWith('[]')) {
        const key = name.slice(0, -2);

        refs[key] ??= [];
        refs[key].push(element);

        continue;
      }

      refs[name] = element;
    }

    return refs;
  }

  /**
   * Initializes refs, delegated events and DOM observation.
   */
  connectedCallback() {
    this.updateRefs();
    this.bindEvents();
    this.bindGlobalEvents();
    this.observe();
  }

  /**
   * Cleans up event listeners and observers.
   */
  disconnectedCallback() {
    this.unbindEvents();
    this.unbindGlobalEvents();
    this.observer.disconnect();
  }

  bindGlobalEvents() {
    if (this.onScroll !== HTMLComponent.prototype.onScroll) {

      const handler = () => this.onScroll();

      this.boundEvents.set('window:scroll', handler);

      window.addEventListener('scroll', handler, { passive: true });

    }

    if (this.onResize !== HTMLComponent.prototype.onResize) {

      const handler = () => this.onResize();

      this.boundEvents.set('window:resize', handler);

      window.addEventListener('resize', handler);

    }
  }

  unbindGlobalEvents() {
    window.removeEventListener('scroll', this.boundEvents.get('window:scroll') ?? (() => {}));
    window.removeEventListener('resize', this.boundEvents.get('window:resize') ?? (() => {}));
  }

  /**
   * Collects all descendants with a `ref` attribute.
   *
   * Single refs:
   * `<div ref="title"></div>` becomes `this.refs.title`.
   *
   * Array refs:
   * `<div ref="items[]"></div>` becomes `this.refs.items`.
   */
  updateRefs() {
    this.refs = /** @type {T} */ (HTMLComponent.getRefs(this));
  }

  /**
   * Starts observing DOM changes inside the component.
   */
  observe() {
    this.observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['ref'],
    });
  }

  /**
   * Binds delegated event listeners on the component.
   *
   * Supported syntax:
   * `<button on:click="addToCart"></button>`
   */
  bindEvents() {
    const events = ['click', 'change', 'input', 'submit', 'keydown', 'keyup'];

    for (const eventName of events) {
      if (this.boundEvents.has(eventName)) continue;

      /** @type {EventListener} */
      const handler = (event) => this.handleDelegatedEvent(eventName, event);

      this.boundEvents.set(eventName, handler);
      this.addEventListener(eventName, handler);
    }
  }

  /**
   * Removes all delegated event listeners from the component.
   */
  unbindEvents() {
    for (const [eventName, handler] of this.boundEvents) {
      this.removeEventListener(eventName, handler);
    }

    this.boundEvents.clear();
  }

  /**
   * Finds the closest `[on:event]` element and calls the matching class method.
   *
   * @param {string} eventName
   * @param {Event} event
   */
  handleDelegatedEvent(eventName, event) {
    const target = event.target;

    if (!(target instanceof Element)) return;

    const element = target.closest(`[on\\:${eventName}]`);

    if (!element || !this.contains(element)) return;

    const methodName = element.getAttribute(`on:${eventName}`);

    if (!methodName) return;

    const method = /** @type {Record<string, unknown>} */ (

      /** @type {unknown} */ (this)
  
    )[methodName];

    if (typeof method !== 'function') {
      console.warn(`Method "${methodName}" not found in ${this.tagName.toLowerCase()}`);
      return;
    }

    method.call(this, event, element);
  }

  onScroll() {
  }

  onResize() {
  }

  /**
   * Replaces a child node from a matching child in a source element.
   *
   * @param {string} selector
   * @param {HTMLElement | Document} source
   */
  update(selector, source) {
    const next = source.querySelector(selector);
    const current = this.querySelector(selector);

    if (!next || !current) return;

    current.replaceWith(next);
  }

  /**
   * Replaces a ref with a matching ref in a source component.
   *
   * @param {string} name
   * @param {HTMLElement} source
   */
  updateRef(name, source) {
    const current = this.refs[name];
    const next = HTMLComponent.getRefs(source)[name];

    if (!(current instanceof Element)) return;
    if (!(next instanceof Element)) return;

    current.replaceWith(next);
  }

  /**
   * Finds the nearest ancestor by tag name.
   *
   * @param {string} tagName
   * @returns {Element | null}
   */
  closestTag(tagName) {
    let element = this.parentElement;
    const normalizedTagName = tagName.toLowerCase();

    while (element) {
      if (element.localName === normalizedTagName) return element;

      element = element.parentElement;
    }

    return null;
  }
}
