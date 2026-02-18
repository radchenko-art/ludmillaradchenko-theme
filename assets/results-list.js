import { mediaQueryLarge, requestIdleCallback, startViewTransition } from '@theme/utilities';
import PaginatedList from '@theme/paginated-list';

/**
 * A custom element that renders a pagniated results list
 */
export default class ResultsList extends PaginatedList {
  connectedCallback() {
    super.connectedCallback();

    mediaQueryLarge.addEventListener('change', this.#handleMediaQueryChange);
    this.setAttribute('initialized', '');
    this.#observeGridForNewCards();
  }

  disconnectedCallback() {
    mediaQueryLarge.removeEventListener('change', this.#handleMediaQueryChange);
    this.#gridObserver?.disconnect();
  }

  /**
   * When in rows view, new cards (e.g. infinite scroll) must get the text wrapper.
   */
  #observeGridForNewCards() {
    const { grid } = this.refs;
    if (!grid) return;
    this.#gridObserver = new MutationObserver(() => {
      if (grid.classList.contains('product-grid--rows')) {
        this.#wrapCardTextBlocks(grid);
      }
    });
    this.#gridObserver.observe(grid, { childList: true, subtree: true });
  }

  #gridObserver = null;

  /**
   * Updates the layout.
   *
   * @param {Event} event
   */
  updateLayout({ target }) {
    if (!(target instanceof HTMLInputElement)) return;

    this.#animateLayoutChange(target.value);
  }

  /**
   * Sets the layout.
   *
   * @param {string} value
   */
  #animateLayoutChange = async (value) => {
    const { grid } = this.refs;

    if (!grid) return;

    await startViewTransition(() => this.#setLayout(value), ['product-grid']);

    requestIdleCallback(() => {
      const viewport = mediaQueryLarge.matches ? 'desktop' : 'mobile';
      sessionStorage.setItem(`product-grid-view-${viewport}`, value);
    });
  };

  /**
   * Animates the layout change.
   *
   * @param {string} value
   */
  #setLayout(value) {
    const { grid } = this.refs;
    if (!grid) return;
    grid.setAttribute('product-grid-view', value);
    if (value === 'rows') {
      grid.classList.add('product-grid--rows');
      this.#wrapCardTextBlocks(grid);
    } else {
      this.#unwrapCardTextBlocks(grid);
      grid.classList.remove('product-grid--rows');
    }
  }

  /**
   * In rows view: wrap all card children except .card-gallery in one column container.
   * Move quick-add (add to cart) from card-gallery into the text block, before wishlist.
   * @param {Element} grid
   */
  #wrapCardTextBlocks(grid) {
    for (const card of grid.querySelectorAll('.product-grid__card')) {
      if (card.querySelector('.product-grid__card-text')) continue;
      const nonGallery = [...card.children].filter((el) => !el.classList.contains('card-gallery'));
      if (nonGallery.length === 0) continue;
      const wrapper = document.createElement('div');
      wrapper.className = 'product-grid__card-text';
      nonGallery.forEach((el) => wrapper.appendChild(el));

      const gallery = card.querySelector('.card-gallery');
      const quickAdd = gallery?.querySelector('quick-add-component');
      const wishlist = wrapper.querySelector('.wishlist-button-block');
      if (quickAdd) {
        if (wishlist) {
          wrapper.insertBefore(quickAdd, wishlist);
        } else {
          wrapper.appendChild(quickAdd);
        }
      }

      const compare = wrapper.querySelector('.compare-button-block');
      const quickAddInWrapper = wrapper.querySelector('quick-add-component');
      const wishlistInWrapper = wrapper.querySelector('.wishlist-button-block');
      if (compare || quickAddInWrapper || wishlistInWrapper) {
        const actionsWrapper = document.createElement('div');
        actionsWrapper.className = 'product-grid__card-actions';
        [quickAddInWrapper, compare, wishlistInWrapper].filter(Boolean).forEach((el) => actionsWrapper.appendChild(el));
        wrapper.appendChild(actionsWrapper);
      }

      card.appendChild(wrapper);
    }
  }

  /**
   * Restore card structure when leaving rows view.
   * Move quick-add back into .card-gallery, then unwrap the rest.
   * @param {Element} grid
   */
  #unwrapCardTextBlocks(grid) {
    for (const card of grid.querySelectorAll('.product-grid__card')) {
      const wrapper = card.querySelector('.product-grid__card-text');
      if (!wrapper) continue;

      const gallery = card.querySelector('.card-gallery');
      const actionsWrapper = wrapper.querySelector('.product-grid__card-actions');
      if (actionsWrapper) {
        const quickAdd = actionsWrapper.querySelector('quick-add-component');
        if (gallery && quickAdd) {
          gallery.appendChild(quickAdd);
        }
        while (actionsWrapper.firstChild) {
          wrapper.insertBefore(actionsWrapper.firstChild, actionsWrapper);
        }
        actionsWrapper.remove();
      } else {
        const quickAdd = wrapper.querySelector('quick-add-component');
        if (gallery && quickAdd) {
          gallery.appendChild(quickAdd);
        }
      }

      while (wrapper.firstChild) {
        card.insertBefore(wrapper.firstChild, wrapper);
      }
      wrapper.remove();
    }
  }

  /**
   * Handles the media query change event.
   *
   * @param {MediaQueryListEvent} event
   */
  #handleMediaQueryChange = (event) => {
    const targetElement = event.matches
      ? this.querySelector('[data-grid-layout="desktop-default-option"]')
      : this.querySelector('[data-grid-layout="mobile-option"]');

    if (!(targetElement instanceof HTMLInputElement)) return;

    targetElement.checked = true;
    this.#setLayout('default');
  };
}

if (!customElements.get('results-list')) {
  customElements.define('results-list', ResultsList);
}
