import { UrlUtils } from '@theme/utilities';

/** URL builders for collection filter and grid Liquid partials. */
export class CollectionPartial {
  static VIEW = Object.freeze({
    FILTERS: 'filters',
  });

  static SELECTOR = Object.freeze({
    FILTERS: 'collection-filters',
    GRID: 'product-grid',
  });

  /**
   * Builds a collection filter partial URL with search params and view name.
   * @param {URLSearchParams} params
   * @param {string} view
   * @returns {URL}
   */
  static buildUrl(params, view) {
    const url = UrlUtils.withSearchParams(window.location.href, params);

    return UrlUtils.withView(url, view);
  }

  /**
   * Builds a collection grid partial URL via section rendering.
   * @param {URLSearchParams} params
   * @param {string} sectionId
   * @returns {URL}
   */
  static buildGridUrl(params, sectionId) {
    const url = UrlUtils.withSearchParams(window.location.href, params);

    return UrlUtils.withSectionId(url, sectionId);
  }
}
