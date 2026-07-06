/**
 * Storefront API helper for product color siblings.
 */

import { GraphQL } from '@theme/GraphQL';
import { CacheHandler } from '@theme/utilities';

/**
 * @typedef {Object} Sibling
 * @property {string} id
 * @property {string} handle
 * @property {string} title
 * @property {string} url
 * @property {string[]} tags
 * @property {string} microCategory
 * @property {string} pm
 * @property {string} image
 * @property {string} imageAlt
 */

class ColorSibling {
  static CACHE_PREFIX = "siblings:v8:";
  static IMAGE_SIZE = 96;

  /**
   * @param {string} tag
   * @param {number} limit
   * @returns {Promise<Sibling[]>}
   */
  static async get(tag, limit) {
    const cacheKey = ColorSibling.getKey(tag, limit);
    const cached = CacheHandler.get(cacheKey);

    if (Array.isArray(cached)) return cached;

    const result = await GraphQL.request(ColorSibling.query(tag, limit));

    if (!result) return [];

    const products = ColorSibling.buildNodes(result);
    products.length && CacheHandler.set(cacheKey, products);

    return products;
  }

  /**
   * @param {string} tag
   * @param {number} limit
   * @returns {string}
   */
  static getKey(tag, limit) {
    return `${ColorSibling.CACHE_PREFIX}${tag}:${limit}`;
  }

  /**
   * @param {string} tag
   * @param {number} limit
   * @returns {{ query: string, variables: { first: number, query: string } }}
   */
  static query(tag, limit) {
    const size = ColorSibling.IMAGE_SIZE;

    return {
      query: `
        query Siblings($first: Int!, $query: String!) {
          products(first: $first, query: $query) {
            edges {
              node {
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
                  url(transform: { maxWidth: ${size}, maxHeight: ${size}, crop: CENTER })
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
   * @param {any} result
   * @returns {Sibling[]}
   */
  static buildNodes(result) {
    return (result.data?.products?.edges || []).map(({ node }) => {
      return {
        id: node.id,
        handle: node.handle,
        title: node.title,
        url: node.onlineStoreUrl || `/products/${node.handle}`,
        tags: node.tags || [],
        microCategory:
        node.microCategory?.value || node.elasticMicroCategory?.value || "",
        pm: node.pm?.value || "",
        image: node.featuredImage?.url || "",
        imageAlt: node.featuredImage?.altText || node.title,
      };
    });
  }

  /**
   * @param {string} tag
   * @returns {string}
   */
  static getSearchQuery(tag) {
    return `tag:'${tag.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  }
}

export { ColorSibling };
