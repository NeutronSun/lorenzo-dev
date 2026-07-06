/**
 * Storefront GraphQL client: config, headers, fetch and error handling.
 */

class GraphQL {
  static hasWarnedMissingConfig = false;

  /**
   * @returns {{ apiUrl: string, accessToken: string } | null}
   */
  static getConfig() {
    const storefront = window.storefront;

    if (!storefront?.apiUrl || !storefront?.accessToken) return null;

    return storefront;
  }

  /**
   * @param {{ query: string, variables?: Record<string, unknown> }} payload
   * @returns {Promise<any | null>}
   */
  static async request(payload) {
    const storefront = GraphQL.getConfig();

    if (!storefront) {
      return null;
    }

    const response = await fetch(storefront.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefront.accessToken,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) return null;

    const result = await response.json();

    if (result.errors?.length) {
      console.warn(`GraphQL error:`, result.errors);
      return null;
    }

    return result;
  }
}

export { GraphQL };
