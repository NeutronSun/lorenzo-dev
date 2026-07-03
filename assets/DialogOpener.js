import { HTMLComponent } from '@theme/HTMLComponent';

class DialogOpener extends HTMLComponent {
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
