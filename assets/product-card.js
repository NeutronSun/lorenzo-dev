import { HTMLComponent } from "@theme/HTMLComponent";

class ColorSibling {
  static CACHE_PREFIX = 'product-card-siblings:';
  static hasWarnedMissingConfig = false;

  /**
   * @param {string} tag
   * @param {number} limit
   * @returns {Promise<Array<{ handle: string, title: string, url: string, image: string, imageAlt: string }>>}
   */
  static async fetch(tag, limit) {
    const storefront = window.storefront;

    if (!storefront?.apiUrl || !storefront?.accessToken) {
      if (!ColorSibling.hasWarnedMissingConfig) {
        console.warn('Storefront API config missing: product card siblings cannot be fetched.');
        ColorSibling.hasWarnedMissingConfig = true;
      }

      return [];
    }

    const cacheKey = `${ColorSibling.CACHE_PREFIX}${tag}:${limit}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) return JSON.parse(cached);

    const response = await fetch(storefront.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefront.accessToken,
      },
      body: JSON.stringify(ColorSibling.getQuery(tag, limit)),
    });
    const json = await response.json();

    if (json.errors?.length) {
      console.warn('Product card siblings GraphQL error:', json.errors);
      return [];
    }

    const siblings = (json.data?.products?.edges || []).map(({ node }) => ({
      handle: node.handle,
      title: node.title,
      url: node.onlineStoreUrl || `/products/${node.handle}`,
      image: node.featuredImage?.url || '',
      imageAlt: node.featuredImage?.altText || node.title,
    }));

    sessionStorage.setItem(cacheKey, JSON.stringify(siblings));

    return siblings;
  }

  /**
   * @param {string} tag
   * @param {number} limit
   * @returns {{ query: string, variables: { first: number, query: string } }}
   */
  static getQuery(tag, limit) {
    return {
      query: `
        query ProductCardSiblings($first: Int!, $query: String!) {
          products(first: $first, query: $query) {
            edges {
              node {
                handle
                title
                onlineStoreUrl
                featuredImage {
                  url(transform: { maxWidth: 80, maxHeight: 80, crop: CENTER })
                  altText
                }
              }
            }
          }
        }
      `,
      variables: {
        first: limit,
        query: ColorSibling.getSearchQuery(tag),
      },
    };
  }

  /**
   * @param {string} tag
   * @returns {string}
   */
  static getSearchQuery(tag) {
    return `tag:'${tag.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
}

/**
 * @typedef {Object} ProductCardSiblingsRefs
 * @property {HTMLFieldSetElement} fieldset
 * @property {HTMLInputElement[]} input
 */

/**
 * @extends {HTMLComponent<ProductCardSiblingsRefs>}
 */
class ProductCardSiblings extends HTMLComponent {
  /**
   * @param {{ handle: string, title: string, url: string, image: string, imageAlt: string }} sibling
   * @param {string} name
   * @param {string} activeHandle
   * @returns {string}
   */
  static build(sibling, name, activeHandle) {
    const checked = sibling.handle === activeHandle ? ' checked' : '';
    const image = sibling.image
      ? `<img src="${ProductCardSiblings.escape(sibling.image)}" alt="${ProductCardSiblings.escape(sibling.imageAlt)}" loading="lazy" width="40" height="40">`
      : '';

    return `
      <label class="product-card-sibling">
        <input
          ref="input[]"
          type="radio"
          name="${ProductCardSiblings.escape(name)}"
          value="${ProductCardSiblings.escape(sibling.handle)}"
          data-handle="${ProductCardSiblings.escape(sibling.handle)}"
          data-url="${ProductCardSiblings.escape(sibling.url)}"
          on:change="select"
          ${checked}
        >
        <span aria-label="${ProductCardSiblings.escape(sibling.title)}">
          ${image}
        </span>
      </label>
    `;
  }

  connectedCallback() {
    try {
      super.connectedCallback();
      this.render();
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * @param {Event} event
   * @param {Element} element
   */
  async select(event, element) {
    if (!(element instanceof HTMLInputElement)) return;
    if (!element.checked) return;

    const card = this.closestTag('product-card');
    const group = this.closestTag('product-card-swatches');

    if (!(card instanceof ProductCard)) return;
    if (!(group instanceof ProductCardSiblings)) return;

    event.preventDefault();
    event.stopPropagation();

    await group.publish(card, element);
  }

  async render() {
    const tag = this.dataset.matchTag;
    const limit = Number(this.dataset.limit || 10);
    const card = this.closestTag('product-card');

    if (!tag) return;
    if (!(card instanceof ProductCard)) return;
    if (!this.refs.fieldset) return;

    try {
      const siblings = await ColorSibling.fetch(tag, limit);

      if (!siblings.length) return;

      this.refs.fieldset.innerHTML = siblings
        .map((sibling) => ProductCardSiblings.build(sibling, this.name, card.handle))
        .join('');
    } catch (error) {
      console.error(error);
    }
  }

  get name() {
    return `product-card-sibling-${this.dataset.matchTag || 'default'}`;
  }

  /**
   * @param {ProductCard} card
   * @param {HTMLInputElement} input
   */
  async publish(card, input) {
    const handle = input.dataset.handle;
    const productUrl = input.dataset.url;

    if (!handle) return;
    if (!productUrl) return;

    await card.changeSibling(handle, productUrl);
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  static escape(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

/**
 * @typedef {Object} ProductCardRefs
 */

/**
 * @extends {HTMLComponent<ProductCardRefs>}
 */
class ProductCard extends HTMLComponent {
  static CACHE_PREFIX = 'product-card:';
  static TEMPLATE_VIEW = 'card';

  get handle() {
    return this.dataset.handle || '';
  }

  get isLoading() {
    return this.classList.contains('is-loading');
  }

  set isLoading(value) {
    this.classList.toggle('is-loading', value);
  }

  /**
   * @param {string} handle
   * @param {string} productUrl
   */
  async changeSibling(handle, productUrl) {
    if (handle === this.handle) return;
    if (this.isLoading) return;

    try {
      this.isLoading = true;

      const html = await this.fetchCard(handle, productUrl);
      const nextCard = this.getCard(html);

      if (!(nextCard instanceof HTMLElement)) return;

      this.render(nextCard);
    } catch (error) {
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * @param {string} handle
   * @param {string} productUrl
   * @returns {Promise<Document>}
   */
  async fetchCard(handle, productUrl) {
    const cacheKey = `${ProductCard.CACHE_PREFIX}${handle}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) return new DOMParser().parseFromString(cached, 'text/html');

    const url = this.getCardUrl(productUrl);
    const response = await fetch(url.toString());
    const text = await response.text();

    sessionStorage.setItem(cacheKey, text);

    return new DOMParser().parseFromString(text, 'text/html');
  }

  /**
   * @param {string} productUrl
   * @returns {URL}
   */
  getCardUrl(productUrl) {
    const url = new URL(productUrl, window.location.origin);

    url.searchParams.set('view', ProductCard.TEMPLATE_VIEW);

    return url;
  }

  /**
   * @param {Document} html
   * @returns {Element | undefined}
   */
  getCard(html) {
    return Array.from(html.body.children).find((element) => element.localName === 'product-card');
  }

  /**
   * @param {HTMLElement} nextCard
   */
  render(nextCard) {
    this.updateRef('media', nextCard);
    this.updateRef('details', nextCard);
    this.updateRef('link', nextCard);
    this.dataset.handle = nextCard.dataset.handle || this.handle;
  }
}

if (!customElements.get('product-card')) {
  customElements.define('product-card', ProductCard);
}

if (!customElements.get('product-card-swatches')) {
  customElements.define('product-card-swatches', ProductCardSiblings);
}
