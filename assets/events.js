class ThemeEvent extends Event {
  static OPTIONS = {
    bubbles: true,
    composed: true,
  };
}

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

export class OnCartLoadingEvent extends ThemeEvent {
  static TYPE = 'cart:loading';

  /**
   * @param {{
   *   action: 'get' | 'add' | 'change' | 'update' | 'clear',
   *   cart: Object | null,
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

export class OnCartUpdateEvent extends ThemeEvent {
  static TYPE = 'cart:update';

  /**
   * @param {{
   *   action: 'get' | 'add' | 'change' | 'update' | 'clear',
   *   cart: Object,
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

export class OnCartErrorEvent extends ThemeEvent {
  static TYPE = 'cart:error';

  /**
   * @param {{
   *   action: 'get' | 'add' | 'change' | 'update' | 'clear',
   *   error: unknown,
   *   cart: Object | null,
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
