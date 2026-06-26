/**
 * Storefront API helper for product color siblings on cards and PDP variant picker.
 */

class ColorSibling {
  static CACHE_PREFIX = 'product-card-siblings:';
  static PDP_CACHE_PREFIX = 'pdp-siblings:v7:';
  static hasWarnedMissingConfig = false;

  static PDP_FRAGMENT = `
    id
    handle
    title
    onlineStoreUrl
    tags
    microCategory: metafield(namespace: "valeverce", key: "micro_category") {
      value
    }
    elasticMicroCategory: metafield(namespace: "elastick", key: "filter_microcategory") {
      value
    }
    pm: metafield(namespace: "valeverce", key: "pm") {
      value
    }
    featuredImage {
      url(transform: { maxWidth: 96, maxHeight: 96, crop: CENTER })
      altText
    }
  `;

  /**
   * Fetches sibling products for product card swatches.
   * @param {string} tag
   * @param {number} limit
   * @returns {Promise<Array<{ handle: string, title: string, url: string, image: string, imageAlt: string }>>}
   */
  static async fetch(tag, limit) {
    return ColorSibling.fetchQuery(
      tag,
      limit,
      ColorSibling.getCardQuery(tag, limit),
      ColorSibling.mapNode,
      ColorSibling.CACHE_PREFIX,
      'product card siblings',
    );
  }

  /**
   * Fetches sibling products with PDP metafields for the variant picker.
   * @param {string} tag
   * @param {number} limit
   * @returns {Promise<Array<{ id: string, handle: string, title: string, url: string, tags: string[], microCategory: string, pm: string, image: string, imageAlt: string }>>}
   */
  static async fetchPdp(tag, limit) {
    return ColorSibling.fetchQuery(
      tag,
      limit,
      ColorSibling.getPdpQuery(tag, limit),
      ColorSibling.mapPdpNode,
      ColorSibling.PDP_CACHE_PREFIX,
      'PDP siblings',
    );
  }

  /**
   * Shared Storefront API fetch with sessionStorage caching.
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

    if (cached) {
      const parsed = JSON.parse(cached);

      if (Array.isArray(parsed)) return parsed;
    }

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

    products.length && sessionStorage.setItem(cacheKey, JSON.stringify(products));

    return products;
  }

  /**
   * Builds the GraphQL query payload for product card siblings.
   * @param {string} tag
   * @param {number} limit
   * @returns {{ query: string, variables: { first: number, query: string } }}
   */
  static getCardQuery(tag, limit) {
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
   * Builds the GraphQL query payload for PDP siblings.
   * @param {string} tag
   * @param {number} limit
   * @returns {{ query: string, variables: { first: number, query: string } }}
   */
  static getPdpQuery(tag, limit) {
    return {
      query: `
        query PDPSiblings($first: Int!, $query: String!) {
          products(first: $first, query: $query) {
            edges {
              node {
                ${ColorSibling.PDP_FRAGMENT}
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
   * Maps a Storefront API product node to card swatch data.
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
   * Maps a Storefront API product node to PDP sibling data.
   * @param {any} node
   * @returns {{ id: string, handle: string, title: string, url: string, tags: string[], microCategory: string, pm: string, image: string, imageAlt: string }}
   */
  static mapPdpNode(node) {
    return {
      id: node.id,
      handle: node.handle,
      title: node.title,
      url: node.onlineStoreUrl || `/products/${node.handle}`,
      tags: node.tags || [],
      microCategory: node.microCategory?.value || node.elasticMicroCategory?.value || '',
      pm: node.pm?.value || '',
      image: node.featuredImage?.url || '',
      imageAlt: node.featuredImage?.altText || node.title,
    };
  }

  /**
   * Escapes a product tag for the Storefront API search query syntax.
   * @param {string} tag
   * @returns {string}
   */
  static getSearchQuery(tag) {
    return `tag:'${tag.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
}

export { ColorSibling };
