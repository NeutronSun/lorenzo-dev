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