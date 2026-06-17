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
  /** @type {((event: CustomEvent<{ name: string }>) => void) | null} */
  onDialogOpen = null;

  connectedCallback() {
    super.connectedCallback();

    this.name = this.getAttribute('name');
    this.onDialogOpen = (event) => {
      if (event.detail.name === this.name) {
        this.open();
      }
    };

    document.addEventListener('dialog:open', this.onDialogOpen);
  }

  disconnectedCallback() {
    this.onDialogOpen && document.removeEventListener('dialog:open', this.onDialogOpen);
    this.onDialogOpen = null;
    super.disconnectedCallback();
  }

  open() {
    if (!this.refs.dialog) return;

    if (this.hasAttribute('non-modal')) {
      this.refs.dialog.show();
      return;
    }

    this.refs.dialog.showModal();
  }

  close() {
    this.refs.dialog?.close();
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
      new CustomEvent('dialog:open', {
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
