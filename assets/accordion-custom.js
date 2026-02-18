import { mediaQueryLarge, isMobileBreakpoint } from '@theme/utilities';

// Accordion
// Still extends HTMLElement over Component so that refs are still available to parent components (e.g. SortingFilterComponent)
class AccordionCustom extends HTMLElement {
  /** @type {HTMLDetailsElement} */
  get details() {
    const details = this.querySelector('details');

    if (!(details instanceof HTMLDetailsElement)) throw new Error('Details element not found');

    return details;
  }

  /** @type {HTMLElement} */
  get summary() {
    const summary = this.details.querySelector('summary');

    if (!(summary instanceof HTMLElement)) throw new Error('Summary element not found');

    return summary;
  }

  get #disableOnMobile() {
    return this.dataset.disableOnMobile === 'true';
  }

  get #disableOnDesktop() {
    return this.dataset.disableOnDesktop === 'true';
  }

  get #closeWithEscape() {
    return this.dataset.closeWithEscape === 'true';
  }

  #controller = new AbortController();

  connectedCallback() {
    const { signal } = this.#controller;

    this.#setDefaultOpenState();

    this.details.addEventListener('toggle', this.#handleToggle, { signal });
    this.addEventListener('keydown', this.#handleKeyDown, { signal });
    this.summary.addEventListener('click', this.handleClick, { signal });
    mediaQueryLarge.addEventListener('change', this.#handleMediaQueryChange, { signal });
  }

  /**
   * Handles the disconnect event.
   */
  disconnectedCallback() {
    // Disconnect all the event listeners
    this.#controller.abort();
  }

  /**
   * When this item opens, close all other accordion items in the same accordion group (only one open at a time).
   * Preserves scroll position so the page doesn't jump when opening/closing items.
   */
  #handleToggle = () => {
    if (!this.details.open) return;
    const accordionGroup = this.closest('.accordion');
    if (!accordionGroup) return;

    const scrollX = this._savedScrollX ?? window.scrollX;
    const scrollY = this._savedScrollY ?? window.scrollY;

    const siblings = accordionGroup.querySelectorAll('accordion-custom');
    siblings.forEach((el) => {
      if (el !== this && el.details) el.details.open = false;
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(scrollX, scrollY);
      });
    });
  };

  /**
   * Handles the click event.
   * Saves scroll position before toggle so we can restore it and prevent page jump.
   * @param {Event} event - The event.
   */
  handleClick = (event) => {
    const isMobile = isMobileBreakpoint();
    const isDesktop = !isMobile;

    // Stop default behaviour from the browser
    if ((isMobile && this.#disableOnMobile) || (isDesktop && this.#disableOnDesktop)) {
      event.preventDefault();
      return;
    }

    this._savedScrollX = window.scrollX;
    this._savedScrollY = window.scrollY;
  };

  /**
   * Handles the media query change event.
   */
  #handleMediaQueryChange = () => {
    this.#setDefaultOpenState();
  };

  /**
   * Sets the default open state of the accordion based on the `open-by-default-on-mobile` and `open-by-default-on-desktop` attributes.
   */
  #setDefaultOpenState() {
    const isMobile = isMobileBreakpoint();

    this.details.open =
      (isMobile && this.hasAttribute('open-by-default-on-mobile')) ||
      (!isMobile && this.hasAttribute('open-by-default-on-desktop'));
  }

  /**
   * Handles keydown events for the accordion
   *
   * @param {KeyboardEvent} event - The keyboard event.
   */
  #handleKeyDown(event) {
    // Close the accordion when used as a menu
    if (event.key === 'Escape' && this.#closeWithEscape) {
      event.preventDefault();

      this.details.open = false;
      this.summary.focus();
    }
  }
}

if (!customElements.get('accordion-custom')) {
  customElements.define('accordion-custom', AccordionCustom);
}
