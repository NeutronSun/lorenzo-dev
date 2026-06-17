import { HTMLComponent } from "@theme/HTMLComponent";

/**
 * Dialog component.
 *
 * @typedef {Object} DialogComponentRefs
 * @property {HTMLDialogElement} dialog - The dialog element.
 */

/**
 * @extends {HTMLComponent<DialogComponentRefs>}
 */
export class DialogComponent extends HTMLComponent {
  static SELECTOR = 'dialog-component';
  static EVENT_OPEN = 'dialog:open';
  static EVENT_OPENED = 'dialog:opened';
  static EVENT_CLOSED = 'dialog:closed';

  /** @type {((event: CustomEvent<{ name: string }>) => void) | null} */
  onDialogOpen = null;
  /** @type {(() => void) | null} */
  onDialogClose = null;

  connectedCallback() {
    super.connectedCallback();

    this.name = this.getAttribute('name');
    this.onDialogOpen = (event) => {
      if (event.detail.name === this.name) {
        this.open();
        return;
      }

      if (!this.hasAttribute('persistent')) {
        this.close();
      }
    };
    this.onDialogClose = () => this.dispatch(DialogComponent.EVENT_CLOSED);

    document.addEventListener(DialogComponent.EVENT_OPEN, this.onDialogOpen);
    this.refs.dialog?.addEventListener('close', this.onDialogClose);
  }

  disconnectedCallback() {
    this.onDialogOpen && document.removeEventListener(DialogComponent.EVENT_OPEN, this.onDialogOpen);
    this.onDialogClose && this.refs.dialog?.removeEventListener('close', this.onDialogClose);
    this.onDialogOpen = null;
    this.onDialogClose = null;
    super.disconnectedCallback();
  }

  open() {
    if (!this.refs.dialog) return;
    if (this.refs.dialog.open) return;

    this.closeOthers();

    if (this.hasAttribute('non-modal')) {
      this.refs.dialog.show();
      this.dispatch(DialogComponent.EVENT_OPENED);
      return;
    }

    this.refs.dialog.showModal();
    this.dispatch(DialogComponent.EVENT_OPENED);
  }

  close() {
    this.refs.dialog?.open && this.refs.dialog.close();
  }

  closeOthers() {
    for (const dialog of document.querySelectorAll(DialogComponent.SELECTOR)) {
      if (!(dialog instanceof DialogComponent)) continue;
      if (dialog === this || dialog.hasAttribute('persistent')) continue;

      dialog.close();
    }
  }

  /**
   * @param {string} eventName
   */
  dispatch(eventName) {
    this.dispatchEvent(
      new CustomEvent(eventName, {
        bubbles: true,
        composed: true,
        detail: { name: this.name },
      })
    );
  }
}

if (!customElements.get('dialog-component')) {
  customElements.define('dialog-component', DialogComponent);
}

/**
 * @extends {HTMLComponent<{}>}
 */
class DialogOpener extends HTMLComponent {
  connectedCallback() {
    super.connectedCallback();
    this.name = this.getAttribute('name');
  }

  publish() {
    document.dispatchEvent(
      new CustomEvent(DialogComponent.EVENT_OPEN, {
        bubbles: true,
        composed: true,
        detail: { name: this.name },
      })
    );
  }
}

if (!customElements.get('dialog-opener')) {
  customElements.define('dialog-opener', DialogOpener);
}
