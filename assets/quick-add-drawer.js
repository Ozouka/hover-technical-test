class QuickAddDrawer extends HTMLElement {
  #opener = null;

  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    this.body = this.querySelector('[data-drawer-body]');
    this.errorElement = this.querySelector('[data-drawer-error]');

    document.addEventListener('click', this.#onDocumentClick);
    this.dialog.addEventListener('click', this.#onDialogClick);
    this.dialog.addEventListener('cancel', this.#onCancel);
    this.body.addEventListener('change', this.#onColorChange);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.#onDocumentClick);
  }

  open(trigger) {
    const template = document.getElementById(trigger.dataset.template);
    if (!template) return;

    this.body.replaceChildren(template.content.cloneNode(true));
    this.#clearError();
    this.#selectDefaultColor();

    document.body.classList.add('overflow-hidden');
    this.dialog.showModal();
  }

  async close() {
    if (!this.dialog.open) return;

    this.dialog.classList.add('is-closing');
    await Promise.allSettled(this.dialog.getAnimations({ subtree: true }).map((animation) => animation.finished));
    this.dialog.classList.remove('is-closing');
    this.dialog.close();

    document.body.classList.remove('overflow-hidden');
    this.#opener?.focus({ preventScroll: true });
  }

  #onDocumentClick = (event) => {
    const trigger = event.target.closest('[data-quick-add]');
    if (!trigger || trigger.dataset.drawer !== this.id) return;

    this.#opener = trigger;

    if (trigger.dataset.variantId) {
      this.#addToCart(trigger.dataset.variantId, trigger);
      return;
    }
    this.open(trigger);
  };

  #onDialogClick = (event) => {
    if (event.target === this.dialog || event.target.closest('[data-drawer-close]')) {
      this.close();
      return;
    }

    const addButton = event.target.closest('[data-add-variant]');
    if (addButton) this.#addToCart(addButton.dataset.addVariant, addButton);
  };

  #onCancel = (event) => {
    event.preventDefault();
    this.close();
  };

  #onColorChange = (event) => {
    if (event.target.matches('input[name="color"]')) this.#showSizes(event.target.value);
  };

  #selectDefaultColor() {
    const radios = [...this.body.querySelectorAll('input[name="color"]')];
    const initial = radios.find((radio) => radio.dataset.available === 'true') ?? radios[0];
    if (initial) initial.checked = true;
    this.#showSizes(initial ? initial.value : 'all');
  }

  #showSizes(color) {
    this.body.querySelectorAll('[data-size-list]').forEach((list) => {
      list.hidden = list.dataset.color !== color;
    });
  }

  async #addToCart(variantId, button) {
    if (button.getAttribute('aria-busy') === 'true') return;
    button.setAttribute('aria-busy', 'true');
    this.#clearError();

    const cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');

    try {
      const response = await fetch(window.routes.cart_add_url, {
        ...fetchConfig('javascript'),
        body: JSON.stringify({
          id: variantId,
          quantity: 1,
          ...(cart && {
            sections: cart.getSectionsToRender().map((section) => section.id),
            sections_url: window.location.pathname,
          }),
        }),
      });
      const cartData = await response.json();

      if (cartData.status) {
        this.#showError(cartData.description || cartData.message);
        return;
      }

      await this.close();

      if (!cart) {
        window.location = window.routes.cart_url;
        return;
      }

      publish(PUB_SUB_EVENTS.cartUpdate, {
        source: 'quick-add-drawer',
        productVariantId: variantId,
        cartData,
      });
      cart.renderContents(cartData);
    } catch (error) {
      console.error(error);
      this.#showError(this.errorElement.dataset.fallbackMessage);
    } finally {
      button.removeAttribute('aria-busy');
    }
  }

  #showError(message) {
    this.errorElement.textContent = message;
    this.errorElement.hidden = false;
  }

  #clearError() {
    this.errorElement.textContent = '';
    this.errorElement.hidden = true;
  }
}

customElements.define('quick-add-drawer', QuickAddDrawer);