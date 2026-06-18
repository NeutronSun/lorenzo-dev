import { HTMLComponent } from "@theme/HTMLComponent";
import { OnDialogClosedEvent, OnDialogOpenEvent, OnDialogOpenedEvent } from "@theme/events";

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

  /** @type {((event: OnDialogOpenEvent) => void) | null} */
  onDialogOpen = null;
  /** @type {(() => void) | null} */
  onDialogClose = null;
  /** @type {((event: KeyboardEvent) => void) | null} */
  onDialogKeydown = null;

  connectedCallback() {
    super.connectedCallback();

    this.name = this.getAttribute('name');
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

    document.addEventListener(OnDialogOpenEvent.TYPE, this.onDialogOpen);
    document.addEventListener('keydown', this.onDialogKeydown);
    this.refs.dialog?.addEventListener('close', this.onDialogClose);
  }

  disconnectedCallback() {
    this.onDialogOpen && document.removeEventListener(OnDialogOpenEvent.TYPE, this.onDialogOpen);
    this.onDialogKeydown && document.removeEventListener('keydown', this.onDialogKeydown);
    this.onDialogClose && this.refs.dialog?.removeEventListener('close', this.onDialogClose);
    this.onDialogOpen = null;
    this.onDialogClose = null;
    this.onDialogKeydown = null;
    super.disconnectedCallback();
  }

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

  dispatchOpened() {
    this.dispatchEvent(
      new OnDialogOpenedEvent({
        name: this.name,
      })
    );
  }

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
 * @extends {HTMLComponent<{}>}
 */
class DialogOpener extends HTMLComponent {
  connectedCallback() {
    super.connectedCallback();
    this.name = this.getAttribute('name');
  }

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
