import { HTMLComponent } from '@theme/HTMLComponent';
import { MetaobjectsHandler } from '@theme/MetaobjectsHandler';
import { HtmlUtils } from '@theme/utilities';

/** @extends {HTMLComponent<{}>} */
class ProductCardLabels extends HTMLComponent {
  get newIn() {
    return this.hasAttribute('data-new-in');
  }

  get soldOut() {
    return this.hasAttribute('data-sold-out');
  }

  get rarityHandle() {
    return this.dataset.rarityHandle || '';
  }

  get themeHandle() {
    return this.dataset.themeHandle || '';
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
  }

  render() {
    const stackHtml = this.buildLabelsStackHtml();
    const themeHtml = ProductCardLabels.buildThemeLogo(this.themeHandle);
    const hasContent = stackHtml.length > 0 || themeHtml.length > 0;

    this.hidden = !hasContent;
    this.innerHTML = hasContent ? `${stackHtml}${themeHtml}` : '';
    hasContent && this.updateRefs();
  }

  /** @returns {string} */
  buildLabelsStackHtml() {
    const parts = [];

    this.newIn && parts.push(ProductCardLabels.buildNewInLabel());
    this.soldOut && parts.push(ProductCardLabels.buildSoldOutLabel());
    this.rarityHandle && parts.push(ProductCardLabels.buildRarityLabel(this.rarityHandle));

    const labels = parts.filter(Boolean);

    return labels.length
      ? `<div data-labels-stack ref="labelsStack">${labels.join('')}</div>`
      : '';
  }

  /** @returns {string} */
  static buildNewInLabel() {
    return '<span data-label data-new-in>New in</span>';
  }

  /** @returns {string} */
  static buildSoldOutLabel() {
    return `<span data-label data-sold-out>
      <span data-swatch></span>
      Sold out
    </span>`;
  }

  /** @param {string} handle @returns {string} */
  static buildRarityLabel(handle) {
    const rarity = MetaobjectsHandler.getRarity(handle);

    if (!rarity) return '';

    const label = HtmlUtils.escape(rarity.label || rarity.name || 'Rarity');

    return `<span data-label data-rarity style="--rarity-color: var(--rarity-${handle});">
      <span data-swatch></span>
      ${label}
    </span>`;
  }

  /** @param {string} handle @returns {string} */
  static buildThemeLogo(handle) {
    if (!handle) return '';

    const theme = MetaobjectsHandler.getTheme(handle);

    if (!theme?.icon) return '';

    return `<img
      data-theme-logo
      src="${HtmlUtils.escape(theme.icon)}"
      alt="${HtmlUtils.escape(theme.name)}"
      width="48"
      height="48"
      loading="lazy"
    >`;
  }
}

if (!customElements.get('product-card-labels')) {
  customElements.define('product-card-labels', ProductCardLabels);
}
