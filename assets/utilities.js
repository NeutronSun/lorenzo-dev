export class NavigationUtils {
  /**
   * Cross-document View Transition is reliable on Chromium; Safari iOS falls back to CSS morph.
   * @returns {boolean}
   */
  static supportsCrossDocumentViewTransition() {
    if (typeof CSS === 'undefined' || !CSS.supports('view-transition-name', 'none')) return false;

    const ua = navigator.userAgent;
    const isSafari = /Safari/.test(ua) && !/Chrom|CriOS|Edg|OPR|FxiOS/.test(ua);

    return !isSafari;
  }

  /**
   * Warms the browser cache for an upcoming same-origin navigation.
   * @param {string} href
   */
  static prefetchPage(href) {
    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;

      const canonicalHref = url.href;

      const existingPrefetch = [...document.head.querySelectorAll('link[rel="prefetch"]')]
        .some((link) => link.href === canonicalHref);

      if (!existingPrefetch) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = canonicalHref;
        link.as = 'document';
        document.head.append(link);
      }

      fetch(canonicalHref, {
        credentials: 'same-origin',
        priority: 'high',
      }).catch(() => {});
    } catch {
      // invalid href
    }
  }
}

export class CSSUtils {


  /**
   * 
   * @param {HTMLElement} element 
   * @returns {boolean}
   */
  static isElementSticking(element) {
    if (!element) return false;
    const computedTop = parseFloat(getComputedStyle(element).top) || 0;
    return element.getBoundingClientRect().top <= computedTop;
  }

  /**
   * 
   * @param {string} property 
   * @param {HTMLElement} element 
   * @returns {string}
   */
  static getProperty(property, element = document.documentElement) {
    return getComputedStyle(element).getPropertyValue(property).trim().replace('px','');
  }

  /**
   * 
   * @param {string} property 
   * @param {string} value 
   * @param {HTMLElement} element 
   * @returns {void}
   */
  static setValue(property, value, element = document.documentElement) {
    element.style.setProperty(property, value + 'px');
  } 
  
  /**
   * 
   * @param {HTMLElement} element 
   * @returns {boolean}
   */
  static isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
}