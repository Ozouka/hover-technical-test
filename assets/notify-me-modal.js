class NotifyMeModal extends HTMLElement {
  #opener = null;
  #lockedScroll = false;

  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    this.form = this.querySelector('form');
    this.titleElement = this.querySelector('[data-notify-title]');
    this.sizeField = this.querySelector('[data-notify-size-field]');
    this.sizeSelect = this.querySelector('[data-notify-size]');
    this.emailInput = this.querySelector('[data-notify-email]');
    this.errorElement = this.querySelector('[data-notify-error]');
    this.submitButton = this.querySelector('[data-notify-submit]');
    this.successElement = this.querySelector('[data-notify-success]');

    document.addEventListener('click', this.#onDocumentClick);
    this.dialog.addEventListener('click', this.#onDialogClick);
    this.dialog.addEventListener('close', this.#onClose);
    this.form.addEventListener('submit', this.#onSubmit);
    this.emailInput.addEventListener('input', () => this.#setError(''));
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.#onDocumentClick);
  }

  open(trigger) {
    const source = document.getElementById(trigger.dataset.source);
    if (!source) return;

    const product = JSON.parse(source.textContent);
    this.#opener = trigger;
    this.#fill(product, trigger.dataset.variantId);

    this.#lockedScroll = !document.body.classList.contains('overflow-hidden');
    if (this.#lockedScroll) document.body.classList.add('overflow-hidden');

    this.dialog.showModal();
  }

  close() {
    this.dialog.close();
  }

  #fill(product, preselectedVariantId) {
    this.titleElement.textContent = product.title;

    const soldOutVariants = product.variants.filter((variant) => !variant.available);
    this.sizeSelect.replaceChildren(
      ...soldOutVariants.map((variant) => new Option(variant.title, variant.id, false, String(variant.id) === preselectedVariantId))
    );

    const hasChoice = product.variants.length > 1;
    this.sizeField.hidden = !hasChoice;
    this.sizeSelect.disabled = !hasChoice;
    if (!hasChoice) this.sizeSelect.value = soldOutVariants[0]?.id ?? '';
  }

  #onDocumentClick = (event) => {
    const trigger = event.target.closest('[data-notify-me]');
    if (trigger && trigger.dataset.modal === this.id) this.open(trigger);
  };

  #onDialogClick = (event) => {
    if (event.target === this.dialog || event.target.closest('[data-notify-close]')) this.close();
  };

  #onClose = () => {
    if (this.#lockedScroll) document.body.classList.remove('overflow-hidden');
    this.form.reset();
    this.form.hidden = false;
    this.successElement.hidden = true;
    this.#setError('');
    this.#opener?.focus({ preventScroll: true });
  };

  #onSubmit = async (event) => {
    event.preventDefault();
    if (!this.#validate()) return;

    this.submitButton.disabled = true;
    this.submitButton.setAttribute('aria-busy', 'true');

    await new Promise((resolve) => setTimeout(resolve, 600));

    this.querySelector('[data-notify-success-email]').textContent = this.emailInput.value;
    this.form.hidden = true;
    this.successElement.hidden = false;
    this.submitButton.disabled = false;
    this.submitButton.removeAttribute('aria-busy');
  };

  #validate() {
    const isValid = this.emailInput.checkValidity();
    this.#setError(isValid ? '' : this.emailInput.dataset.errorMessage);
    if (!isValid) this.emailInput.focus();
    return isValid;
  }

  #setError(message) {
    this.errorElement.textContent = message;
    this.errorElement.hidden = !message;
    this.emailInput.setAttribute('aria-invalid', String(Boolean(message)));
  }
}

customElements.define('notify-me-modal', NotifyMeModal);