/**
 * Dialog custom elements: modal drawer host and declarative open triggers.
 */

import { HTMLComponent } from '@theme/HTMLComponent';
import { OnDialogClosedEvent, OnDialogOpenEvent, OnDialogOpenedEvent } from '@theme/events';

/**
 * @typedef {Object} DialogComponentRefs
 * @property {HTMLDialogElement} dialog
 */

/**
 * Modal and non-modal dialog host with global open/close coordination.
 * @extends {HTMLComponent<DialogComponentRefs>}
 */
export class DialogComponent extends HTMLComponent {
  static SELECTOR = 'dialog-component, search-dialog';
  static HEADER_SELECTOR = '.uyn-header';

  /** @returns {string} Dialog name used by open events. */
  get name() {
    return this.getAttribute('name') || '';
  }

  constructor() {
    super();

    this.onDialogOpen = (event) => {
      if (event.name === this.name) {
        this.open();
        return;
      }

      if (!this.hasAttribute('persistent')) {
        this.close();
      }
    };

    this.onDialogClose = () => this.dispatchClosed();

    this.onDialogKeydown = (event) => {
      if (event.key !== 'Escape') return;
      if (!this.refs.dialog?.open) return;

      event.preventDefault();
      this.close();
    };

    this.onDocumentClick = (event) => {
      if (!this.refs.dialog?.open) return;
      if (this.hasAttribute('persistent')) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(DialogComponent.HEADER_SELECTOR)) return;

      const matchingOpener = target.closest('dialog-opener');
      if (matchingOpener?.getAttribute('name') === this.name) return;

      const dialog = this.refs.dialog;
      if (dialog.contains(target)) return;

      this.close();
    };
  }

  connectedCallback() {
    super.connectedCallback();

    document.addEventListener(OnDialogOpenEvent.TYPE, this.onDialogOpen);
    document.addEventListener('keydown', this.onDialogKeydown);
    document.addEventListener('click', this.onDocumentClick, true);
    this.refs.dialog?.addEventListener('close', this.onDialogClose);
  }

  disconnectedCallback() {
    this.onDialogOpen && document.removeEventListener(OnDialogOpenEvent.TYPE, this.onDialogOpen);
    this.onDialogKeydown && document.removeEventListener('keydown', this.onDialogKeydown);
    this.onDocumentClick && document.removeEventListener('click', this.onDocumentClick, true);
    this.onDialogClose && this.refs.dialog?.removeEventListener('close', this.onDialogClose);
    this.onDialogOpen = null;
    this.onDialogClose = null;
    this.onDialogKeydown = null;
    this.onDocumentClick = null;
    super.disconnectedCallback();
  }

  /** Opens the dialog, closing other non-persistent dialogs first. */
  open() {
    if (!this.refs.dialog) return;
    if (this.refs.dialog.open) return;

    this.closeOthers();

    if (this.hasAttribute('non-modal')) {
      this.refs.dialog.show();
      this.dispatchOpened();
      return;
    }

    this.refs.dialog.showModal();
    this.dispatchOpened();
  }

  /** Closes the dialog when it is open. */
  close() {
    this.refs.dialog?.open && this.refs.dialog.close();
  }

  /** Closes other open dialogs before opening this one. */
  closeOthers() {
    for (const dialog of document.querySelectorAll(DialogComponent.SELECTOR)) {
      if (!(dialog instanceof DialogComponent)) continue;
      if (dialog === this || dialog.hasAttribute('persistent')) continue;

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

/**
 * Declarative trigger that dispatches dialog:open by name.
 * @extends {HTMLComponent<{}>}
 */
class DialogOpener extends HTMLComponent {
  /** @returns {string} Target dialog name. */
  get name() {
    return this.getAttribute('name') || '';
  }

  /** Dispatches dialog:open for this opener name. */
  publish() {
    document.dispatchEvent(
      new OnDialogOpenEvent({
        name: this.name,
      })
    );
  }
}

if (!customElements.get('dialog-opener')) {
  customElements.define('dialog-opener', DialogOpener);
}
