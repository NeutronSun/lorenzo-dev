class ColorSibling {
  static CACHE_PREFIX = 'product-card-siblings:';
  static hasWarnedMissingConfig = false;

  /**
   * @param {string} tag
   * @param {number} limit
   * @returns {Promise<Array<{ handle: string, title: string, url: string, image: string, imageAlt: string }>>}
   */
  static async fetch(tag, limit) {
    return ColorSibling.fetchQuery(tag, limit, ColorSibling.getQuery(tag, limit), ColorSibling.mapNode, ColorSibling.CACHE_PREFIX, 'product card siblings');
  }

  /**
   * @template T
   * @param {string} tag
   * @param {number} limit
   * @param {{ query: string, variables: { first: number, query: string } }} query
   * @param {(node: any) => T} mapNode
   * @param {string} cachePrefix
   * @param {string} label
   * @returns {Promise<T[]>}
   */
  static async fetchQuery(tag, limit, query, mapNode, cachePrefix, label) {
    const storefront = window.storefront;

    if (!storefront?.apiUrl || !storefront?.accessToken) {
      if (!ColorSibling.hasWarnedMissingConfig) {
        console.warn(`Storefront API config missing: ${label} cannot be fetched.`);
        ColorSibling.hasWarnedMissingConfig = true;
      }

      return [];
    }

    const cacheKey = `${cachePrefix}${tag}:${limit}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) return JSON.parse(cached);

    const response = await fetch(storefront.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefront.accessToken,
      },
      body: JSON.stringify(query),
    });
    const result = await response.json();

    if (result.errors?.length) {
      console.warn(`${label} GraphQL error:`, result.errors);
      return [];
    }

    const products = (result.data?.products?.edges || []).map(({ node }) => mapNode(node));

    sessionStorage.setItem(cacheKey, JSON.stringify(products));

    return products;
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
   * @param {any} node
   * @returns {{ handle: string, title: string, url: string, image: string, imageAlt: string }}
   */
  static mapNode(node) {
    return {
      handle: node.handle,
      title: node.title,
      url: node.onlineStoreUrl || `/products/${node.handle}`,
      image: node.featuredImage?.url || '',
      imageAlt: node.featuredImage?.altText || node.title,
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

export { ColorSibling };
