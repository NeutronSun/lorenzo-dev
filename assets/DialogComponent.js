/**
 * Dialog custom elements: dialog host (modal or non-modal) and declarative open triggers.
 */

import { HTMLComponent } from '@theme/HTMLComponent';
import { OnDialogClosedEvent, OnDialogOpenedEvent, OnDialogOpenEvent, OnDialogCloseEvent } from '@theme/events';

/**
 * @typedef {Object} DialogComponentRefs
 * @property {HTMLDialogElement} dialog
 */

/**
 * Dialog host. Opens modal by default, or non-modal (page stays interactive) with the `non-modal` attribute.
 * Open/close route through `open()`/`close()`, reached from the native invoker `command` event or from the
 * `dialog:open` / `dialog:close` trigger events. Opening one dialog closes any other open one via `dialog:opened`.
 * @extends {HTMLComponent<DialogComponentRefs>}
 */
export class DialogComponent extends HTMLComponent {
  get name() {
    return this.getAttribute('name') || '';
  }

  get isModal() {
    return !this.hasAttribute('non-modal');
  }

  constructor() {
    super();

    /** @param {Event} event */
    this.onToggle = (event) => {
      if (!(event instanceof ToggleEvent)) return;

      event.newState === 'open' ? this.dispatchOpened() : this.dispatchClosed();
    };

    /** @param {Event & { command?: string }} event */
    this.onInvokerEvent = (event) => {
      if (event.command !== 'show-modal') return;

      event.preventDefault();
      this.open();
    };

    /** @param {OnDialogOpenEvent} event */
    this.onDialogOpenEvent = (event) => {
      event.name === this.name && this.open();
    };

    /** @param {OnDialogCloseEvent} event */
    this.onDialogCloseEvent = (event) => {
      event.name === this.name && this.close();
    };

    /** @param {OnDialogOpenedEvent} event */
    this.onSiblingOpened = (event) => {
      event.name !== this.name && !this.hasAttribute('persistent') && this.close();
    };

    /** @param {KeyboardEvent} event */
    this.onEscape = (event) => {
      event.key === 'Escape' && !this.isModal && this.close();
    };
  }

  connectedCallback() {
    super.connectedCallback();

    this.refs.dialog.addEventListener('toggle', this.onToggle);
    this.refs.dialog.addEventListener('command', this.onInvokerEvent);
    document.addEventListener(OnDialogOpenEvent.TYPE, this.onDialogOpenEvent);
    document.addEventListener(OnDialogCloseEvent.TYPE, this.onDialogCloseEvent);
    document.addEventListener(OnDialogOpenedEvent.TYPE, this.onSiblingOpened);
    document.addEventListener('keydown', this.onEscape);
  }

  disconnectedCallback() {
    this.refs.dialog.removeEventListener('toggle', this.onToggle);
    this.refs.dialog.removeEventListener('command', this.onInvokerEvent);

    document.removeEventListener(OnDialogOpenEvent.TYPE, this.onDialogOpenEvent);
    document.removeEventListener(OnDialogCloseEvent.TYPE, this.onDialogCloseEvent);
    document.removeEventListener(OnDialogOpenedEvent.TYPE, this.onSiblingOpened);
    document.removeEventListener('keydown', this.onEscape);
    super.disconnectedCallback();
  }

  open() {
    this.isModal ? this.refs.dialog.showModal() : this.refs.dialog.show();
  }

  close() {
    this.refs.dialog.open && this.refs.dialog.close();
  }

  dispatchOpened() {
    this.dispatchEvent(new OnDialogOpenedEvent({ name: this.name }));
  }

  dispatchClosed() {
    this.dispatchEvent(new OnDialogClosedEvent({ name: this.name }));
  }

  /**
   * @param {string} name
   * @returns {HTMLDialogElement | null}
   */
  static getDialogElement(name) {
    const dialog = document.getElementById(name);

    return dialog instanceof HTMLDialogElement ? dialog : null;
  }

  /** @param {string} name */
  static showModal(name) {
    document.dispatchEvent(new OnDialogOpenEvent({ name }));
  }

  /** @param {string} name */
  static requestClose(name) {
    document.dispatchEvent(new OnDialogCloseEvent({ name }));
  }
}

if (!customElements.get('dialog-component')) {
  customElements.define('dialog-component', DialogComponent);
}
