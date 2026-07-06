/**
 * Shared theme utilities: CSS helpers, HTML safety, fetch, template cloning.
 */

import { HTMLComponent } from './HTMLComponent.js';

/** CSS layout and visibility helpers for sticky headers and scroll-driven UI. */
export class CSSUtils {
  static VAR = Object.freeze({
    SPACING: '--spacing',
    HEADER_HEIGHT: '--header-height',
    BREADCRUMB_HEIGHT: '--breadcrumb-height',
    PDP_CARD_HEIGHT: '--pdp-card-height',
    STICKY_TOP: '--sticky-top',
  });

  /**
   * Whether an element is currently stuck at its CSS `top` offset.
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  static isElementSticking(element) {
    if (!element) return false;
    const computedTop = parseFloat(getComputedStyle(element).top) || 0;
    return element.getBoundingClientRect().top <= computedTop;
  }

  /**
   * Reads a numeric CSS custom property from an element.
   * @param {string} property
   * @param {HTMLElement} [element]
   * @returns {string}
   */
  static getProperty(property, element = document.documentElement) {
    return getComputedStyle(element).getPropertyValue(property).trim().replace('px', '');
  }

  /**
   * @param {string} property
   * @param {HTMLElement} [element]
   * @param {number} [fallback]
   * @returns {number}
   */
  static getNumber(property, element = document.documentElement, fallback = 0) {
    const value = Number(CSSUtils.getProperty(property, element));

    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  /** @returns {number} */
  static getViewportHeight() {
    return window.visualViewport?.height || window.innerHeight;
  }

  /**
   * Sets a numeric CSS custom property on an element.
   * @param {string} property
   * @param {string | number} value
   * @param {HTMLElement} [element]
   */
  static setValue(property, value, element = document.documentElement) {
    element.style.setProperty(property, `${value}px`);
  }

  /**
   * Whether an element is fully inside the viewport.
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  static isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
}

/** HTML escaping and string normalization for safe rendering and search. */
export class HtmlUtils {
  static HTML_ENTITIES = Object.freeze({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  });

  /**
   * Escapes HTML-sensitive characters in a value.
   * @param {unknown} value
   * @returns {string}
   */
  static escape(value) {
    return String(value).replace(/[&<>"']/g, (character) => HtmlUtils.HTML_ENTITIES[character]);
  }

  /**
   * Normalizes a string for accent-insensitive, case-insensitive matching.
   * @param {string} value
   * @returns {string}
   */
  static normalize(value) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase();
  }
}

/** HTML template cloning, data-binding, and partial DOM replacement. */
export class TemplateHandler {
  /**
   * Fetches a URL and returns its response text, or an empty string on failure.
   * @param {string | URL} url
   * @param {RequestInit} [init]
   * @returns {Promise<string>}
   */
  static async fetchText(url, init) {
    const response = await fetch(url.toString(), init);

    if (!response.ok) return '';

    return await response.text();
  }

  /**
   * Fetches a URL and returns the first matching element from the response HTML.
   * @param {string | URL} url
   * @param {string} selector
   * @param {RequestInit} [init]
   * @returns {Promise<HTMLElement | null>}
   */
  static async fetch(url, selector, init = { headers: { Accept: 'text/html' } }) {
    const text = await TemplateHandler.fetchText(url, init);

    if (!text) return null;

    const node = TemplateHandler.parseHtml(text).querySelector(selector);

    return node instanceof HTMLElement ? node : null;
  }

  /**
   * Parses an HTML string into a document.
   * @param {string} text
   * @returns {Document}
   */
  static parseHtml(text) {
    return new DOMParser().parseFromString(text, 'text/html');
  }

  /**
   * Clones the root element of a template or HTMLElement.
   * @param {HTMLTemplateElement | Element} template
   * @returns {HTMLElement | null}
   */
  static clone(template) {
    if (template instanceof HTMLTemplateElement) {
      const node = template.content.firstElementChild;

      if (!(node instanceof HTMLElement)) return null;

      return /** @type {HTMLElement} */ (node.cloneNode(true));
    }

    if (template instanceof HTMLElement) {
      return /** @type {HTMLElement} */ (template.cloneNode(true));
    }

    return null;
  }

  /**
   * Binds data to nodes marked with `data-ref` and optional `data-bind`.
   * @param {HTMLElement} root
   * @param {Record<string, string | number | boolean | null | undefined>} data
   */
  static fill(root, data) {
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;

      const nodes = root.querySelectorAll(`[data-ref="${key}"]`);

      for (const node of nodes) {
        if (!(node instanceof HTMLElement)) continue;

        const bind = node.getAttribute('data-bind') || 'text';

        switch (bind) {
          case 'href':
            node instanceof HTMLAnchorElement && (node.href = String(value));
            break;
          case 'src':
            node instanceof HTMLImageElement && (node.src = String(value));
            break;
          case 'srcset':
            node instanceof HTMLImageElement && node.setAttribute('srcset', String(value));
            break;
          case 'alt':
            node instanceof HTMLImageElement && (node.alt = String(value));
            break;
          case 'aria-label':
            node.setAttribute('aria-label', String(value));
            break;
          case 'value':
            node instanceof HTMLInputElement && (node.value = String(value));
            break;
          case 'checked':
            node instanceof HTMLInputElement && (node.checked = Boolean(value));
            break;
          case 'attribute': {
            const attribute = node.getAttribute('data-attribute');

            attribute && node.setAttribute(attribute, String(value));
            break;
          }
          default:
            node.textContent = String(value);
        }
      }
    }
  }

  /**
   * Replaces named refs on a target element with matching refs from a source.
   * @param {HTMLElement} target
   * @param {HTMLElement} source
   * @param {readonly string[]} refNames
   */
  static replaceRefs(target, source, refNames) {
    if (target instanceof HTMLComponent) {
      target.replaceRefs(source, refNames);
      return;
    }

    const refs = HTMLComponent.getRefs(source);

    for (const name of refNames) {
      const current = HTMLComponent.getRefs(target)[name];
      const next = refs[name];

      if (!(current instanceof Element)) continue;
      if (!(next instanceof Element)) continue;

      current.replaceWith(next);
    }
  }

  /**
   * Copies inner HTML from a source node into a target element.
   * @param {HTMLElement} target
   * @param {ParentNode} source
   * @param {string} selector
   */
  static replaceInner(target, source, selector) {
    const next = source.querySelector(selector);

    if (!(next instanceof HTMLElement)) return;

    target.innerHTML = next.innerHTML;
  }
}

/** sessionStorage cache with JSON serialization and a global enable flag. */
export class CacheHandler {
  static ENABLED = true;

  /**
   * Reads and parses a cached value, or null when missing, disabled, or invalid.
   * @param {string} key
   * @returns {unknown}
   */
  static get(key) {
    if (!CacheHandler.ENABLED || !key) return null;

    try {
      const raw = sessionStorage.getItem(key);

      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Serializes and stores a value when caching is enabled.
   * @param {string} key
   * @param {unknown} value
   */
  static set(key, value) {
    if (!CacheHandler.ENABLED || !key) return;

    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota or serialization errors.
    }
  }
}

/** URL builders for Liquid partial views and section rendering. */
export class UrlUtils {
  /**
   * Adds or replaces the `view` search param on a URL.
   * @param {string | URL} url
   * @param {string} view
   * @returns {URL}
   */
  static withView(url, view) {
    const next = url instanceof URL ? new URL(url) : new URL(url, window.location.origin);

    next.searchParams.set('view', view);

    return next;
  }

  /**
   * Adds or replaces the `section_id` search param on a URL.
   * @param {string | URL} url
   * @param {string} sectionId
   * @returns {URL}
   */
  static withSectionId(url, sectionId) {
    const next = url instanceof URL ? new URL(url) : new URL(url, window.location.origin);

    next.searchParams.set('section_id', sectionId);

    return next;
  }

  /**
   * Replaces the search string on a URL with the given params.
   * @param {string | URL} url
   * @param {URLSearchParams} params
   * @returns {URL}
   */
  static withSearchParams(url, params) {
    const next = url instanceof URL ? new URL(url) : new URL(url, window.location.origin);

    next.search = params.toString();

    return next;
  }
}
