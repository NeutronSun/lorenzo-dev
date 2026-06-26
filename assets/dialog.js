/**
 * Dialog custom elements: modal drawer host and declarative open triggers.
 */

import { HTMLComponent } from '@theme/HTMLComponent';
import { OnDialogClosedEvent, OnDialogOpenedEvent } from '@theme/events';

/**
 * @typedef {Object} DialogComponentRefs
 * @property {HTMLDialogElement} dialog
 */

/**
 * Modal dialog host with theme event sync.
 * Open/close via `commandfor` + `command` is native when supported; otherwise handled by click fallback.
 * @extends {HTMLComponent<DialogComponentRefs>}
 */
export class DialogComponent extends HTMLComponent {
  static SELECTOR = 'dialog-component, search-dialog';
  static INVOKER_SELECTOR = 'button[commandfor][command]';
  static COMMAND_SHOW_MODAL = 'show-modal';
  static COMMAND_REQUEST_CLOSE = 'request-close';
  static COMMAND_CLOSE = 'close';

  /** @returns {string} Dialog name used by theme events. */
  get name() {
    return this.getAttribute('name') || '';
  }

  constructor() {
    super();

    this.onDialogToggle = (event) => {
      if (!(event instanceof ToggleEvent)) return;

      if (event.newState === 'open') {
        this.closeOthers();
        this.dispatchOpened();
        return;
      }

      this.dispatchClosed();
    };
  }

  connectedCallback() {
    super.connectedCallback();

    this.bindDialogToggle();
  }

  disconnectedCallback() {
    this.unbindDialogToggle();
    super.disconnectedCallback();
  }

  updateRefs() {
    super.updateRefs();
    this.bindDialogToggle();
  }

  /** @returns {HTMLDialogElement | null} */
  getDialogNode() {
    if (this.refs.dialog instanceof HTMLDialogElement) return this.refs.dialog;

    const name = this.name;

    return name ? DialogComponent.getDialogElement(name) : null;
  }

  bindDialogToggle() {
    this.unbindDialogToggle();

    const dialog = this.getDialogNode();

    if (!(dialog instanceof HTMLDialogElement)) return;

    this.boundDialog = dialog;
    dialog.addEventListener('toggle', this.onDialogToggle);
  }

  unbindDialogToggle() {
    this.boundDialog instanceof HTMLDialogElement && this.boundDialog.removeEventListener('toggle', this.onDialogToggle);
    this.boundDialog = null;
  }

  /**
   * @param {string} name
   * @returns {HTMLDialogElement | null}
   */
  static getDialogElement(name) {
    const dialog = document.getElementById(name);

    return dialog instanceof HTMLDialogElement ? dialog : null;
  }

  /**
   * Opens a dialog by id for programmatic flows (add-to-cart, search shortcut).
   * @param {string} name
   */
  static showModal(name) {
    const dialog = DialogComponent.getDialogElement(name);

    if (!dialog || dialog.open) return;

    dialog.showModal();
  }

  /**
   * Closes a dialog by id for programmatic flows.
   * @param {string} name
   */
  static requestClose(name) {
    const dialog = DialogComponent.getDialogElement(name);

    dialog?.open && dialog.close();
  }

  /** Whether the browser supports Invoker Commands on buttons. */
  static supportsInvokerCommands() {
    return 'commandForElement' in HTMLButtonElement.prototype;
  }

  /**
   * Fallback for browsers without Invoker Commands, or when native handling does not run.
   * Runs in capture: if the dialog is still closed, open/close via the Dialog API.
   * @param {MouseEvent} event
   */
  static handleInvokerClick(event) {
    if (event.defaultPrevented || event.button !== 0) return;

    const target = event.target;

    if (!(target instanceof Element)) return;

    const invoker = target.closest(DialogComponent.INVOKER_SELECTOR);

    if (!(invoker instanceof HTMLButtonElement)) return;

    const targetId = invoker.getAttribute('commandfor');
    const command = invoker.getAttribute('command');

    if (!targetId || !command) return;

    const dialog = DialogComponent.getDialogElement(targetId);

    if (!dialog) return;

    switch (command) {
      case DialogComponent.COMMAND_SHOW_MODAL:
        if (dialog.open) return;

        event.preventDefault();
        dialog.showModal();
        break;
      case DialogComponent.COMMAND_REQUEST_CLOSE:
      case DialogComponent.COMMAND_CLOSE:
        if (!dialog.open) return;

        event.preventDefault();
        dialog.close();
        break;
    }
  }

  /** Closes other open dialogs before opening this one. */
  closeOthers() {
    const currentDialog = this.getDialogNode();

    for (const host of document.querySelectorAll(DialogComponent.SELECTOR)) {
      if (host === this || host.hasAttribute('persistent')) continue;

      const dialog = host instanceof DialogComponent
        ? host.getDialogNode()
        : host.querySelector('dialog');

      if (!(dialog instanceof HTMLDialogElement) || !dialog.open) continue;
      if (dialog === currentDialog) continue;

      dialog.close();
    }
  }

  /** Dispatches dialog:opened for this dialog name. */
  dispatchOpened() {
    this.dispatchEvent(
      new OnDialogOpenedEvent({
        name: this.name,
      })
    );
  }

  /** Dispatches dialog:closed for this dialog name. */
  dispatchClosed() {
    this.dispatchEvent(
      new OnDialogClosedEvent({
        name: this.name,
      })
    );
  }
}

if (!customElements.get('dialog-component')) {
  customElements.define('dialog-component', DialogComponent);
}

document.addEventListener('click', DialogComponent.handleInvokerClick, true);

/**
 * Declarative trigger for header menu (no native dialog target).
 * @extends {HTMLComponent<{}>}
 */
class DialogOpener extends HTMLComponent {
  /** @returns {string} Target dialog name. */
  get name() {
    return this.getAttribute('name') || '';
  }

  /** Toggles the associated checkbox/radio control. */
  publish() {
    const label = this.querySelector('label[for]');

    if (!(label instanceof HTMLLabelElement)) return;

    const control = label.control;

    if (!(control instanceof HTMLInputElement)) return;

    control.type === 'checkbox' ? (control.checked = !control.checked) : (control.checked = true);
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

if (!customElements.get('dialog-opener')) {
  customElements.define('dialog-opener', DialogOpener);
}

export { DialogOpener };
