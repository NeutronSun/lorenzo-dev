/**
 * Theme-wide custom events for dialogs, cart, filters, and product siblings.
 */

/**
 * Base theme event with bubbling and composed dispatch defaults.
 */
class ThemeEvent extends Event {
  static OPTIONS = {
    bubbles: true,
    composed: true,
  };
}

/** Trigger event that requests opening a named dialog. */
export class OnDialogOpenEvent extends ThemeEvent {
  static TYPE = 'dialog:open';

  /**
   * @param {{ name: string }} detail
   */
  constructor(detail) {
    super(OnDialogOpenEvent.TYPE, ThemeEvent.OPTIONS);

    this.name = detail.name;
  }
}

/** Trigger event that requests closing a named dialog. */
export class OnDialogCloseEvent extends ThemeEvent {
  static TYPE = 'dialog:close';

  /**
   * @param {{ name: string }} detail
   */
  constructor(detail) {
    super(OnDialogCloseEvent.TYPE, ThemeEvent.OPTIONS);

    this.name = detail.name;
  }
}

/** Dispatched after a named dialog has opened. */
export class OnDialogOpenedEvent extends ThemeEvent {
  static TYPE = 'dialog:opened';

  /**
   * @param {{ name: string }} detail
   */
  constructor(detail) {
    super(OnDialogOpenedEvent.TYPE, ThemeEvent.OPTIONS);

    this.name = detail.name;
  }
}

/** Dispatched after a named dialog has closed. */
export class OnDialogClosedEvent extends ThemeEvent {
  static TYPE = 'dialog:closed';

  /**
   * @param {{ name: string }} detail
   */
  constructor(detail) {
    super(OnDialogClosedEvent.TYPE, ThemeEvent.OPTIONS);

    this.name = detail.name;
  }
}

/** @import {ShopifyCart} from '@theme/Cart' */

/** Dispatched while a cart Ajax request is in flight. */
export class OnCartLoadingEvent extends ThemeEvent {
  static TYPE = 'cart:loading';

  /**
   * @param {{
   *   action: 'get' | 'add' | 'change' | 'update' | 'clear',
   *   cart: ShopifyCart | null,
   *   key?: string,
   *   quantity?: number,
   *   updates?: Record<string, number>
   * }} detail
   */
  constructor(detail) {
    super(OnCartLoadingEvent.TYPE, ThemeEvent.OPTIONS);

    this.action = detail.action;
    this.cart = detail.cart;
    this.key = detail.key;
    this.quantity = detail.quantity;
    this.updates = detail.updates;
  }
}

/** Dispatched after a successful cart Ajax mutation. */
export class OnCartUpdateEvent extends ThemeEvent {
  static TYPE = 'cart:update';

  /**
   * @param {{
   *   action: 'get' | 'add' | 'change' | 'update' | 'clear',
   *   cart: ShopifyCart,
   *   key?: string,
   *   quantity?: number,
   *   updates?: Record<string, number>
   * }} detail
   */
  constructor(detail) {
    super(OnCartUpdateEvent.TYPE, ThemeEvent.OPTIONS);

    this.action = detail.action;
    this.cart = detail.cart;
    this.key = detail.key;
    this.quantity = detail.quantity;
    this.updates = detail.updates;
  }
}

/** Dispatched when a cart Ajax request fails. */
export class OnCartErrorEvent extends ThemeEvent {
  static TYPE = 'cart:error';

  /**
   * @param {{
   *   action: 'get' | 'add' | 'change' | 'update' | 'clear',
   *   error: unknown,
   *   cart: ShopifyCart | null,
   *   key?: string,
   *   quantity?: number,
   *   updates?: Record<string, number>
   * }} detail
   */
  constructor(detail) {
    super(OnCartErrorEvent.TYPE, ThemeEvent.OPTIONS);

    this.action = detail.action;
    this.error = detail.error;
    this.cart = detail.cart;
    this.key = detail.key;
    this.quantity = detail.quantity;
    this.updates = detail.updates;
  }
}

/** Dispatched when collection filters are applied or cleared. */
export class OnFiltersApplyEvent extends ThemeEvent {
  static TYPE = 'filters:apply';

  /**
   * @param {{ params: URLSearchParams }} detail
   */
  constructor(detail) {
    super(OnFiltersApplyEvent.TYPE, ThemeEvent.OPTIONS);

    this.params = detail.params;
  }
}

/** Dispatched when a variant picker completes a full variant selection. */
export class OnVariantSelectedEvent extends ThemeEvent {
  static TYPE = 'variant:selected';

  /**
   * @param {{ variant: { id: number, available: boolean }, source: string }} detail
   */
  constructor(detail) {
    super(OnVariantSelectedEvent.TYPE, ThemeEvent.OPTIONS);

    this.variant = detail.variant;
    this.source = detail.source;
  }
}

/** Dispatched when a product card color sibling is selected. */
export class OnSiblingChangeEvent extends ThemeEvent {
  static TYPE = 'sibling:change';

  /**
   * @param {{ cardId: string, handle: string, url: string }} detail
   */
  constructor(detail) {
    super(OnSiblingChangeEvent.TYPE, ThemeEvent.OPTIONS);

    this.cardId = detail.cardId;
    this.handle = detail.handle;
    this.url = detail.url;
  }
}
