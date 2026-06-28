/**
 * @typedef {string} Handle
 * @typedef {string} URL
 * @typedef {string} Color
 */

/**
 * @typedef {Object} Rarity
 * @property {string} [label]
 * @property {string} name
 * @property {Color} color
 * @property {Handle} handle
 */

/**
 * @typedef {Object} Theme
 * @property {string} name
 * @property {URL} icon
 * @property {Handle} handle
 */

/**
 * @typedef {Object} MetaJSON
 * @property {Record<Handle, Rarity>} rarity
 * @property {Record<Handle, Theme>} theme
 */

export class MetaobjectsHandler {

  /**
   * @type {MetaJSON}
   */
  static json = window.metaobjects || null;

  /**
   * @param {Handle} handle
   * @returns {Rarity | undefined}
   */
  static getRarity(handle) {
    return this.json?.rarity?.[handle];
  }

  /**
   * Get theme by handle
   * @param {Handle} handle
   * @returns {Theme | undefined}
   */
  static getTheme(handle) {
    const theme = this.json?.theme?.[handle];

    if (!theme) return undefined;

    return {
      ...theme,
      icon: theme.icon?.startsWith("//")
        ? `https:${theme.icon}`
        : theme.icon
    };
  }
}