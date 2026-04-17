import { mediaQueryLarge, requestIdleCallback, startViewTransition } from '@theme/utilities';
import PaginatedList from '@theme/paginated-list';
import { sectionRenderer } from '@theme/section-renderer';

/**
 * A custom element that renders a pagniated results list
 */
export default class ResultsList extends PaginatedList {
  connectedCallback() {
    super.connectedCallback();

    mediaQueryLarge.addEventListener('change', this.#handleMediaQueryChange);
    this.setAttribute('initialized', '');
    this.#observeGridForNewCards();
    this.#sortNewProductsAcrossCollection();
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

  async #sortNewProductsAcrossCollection() {
    if (this.dataset.sortNewFirst !== 'true') return;

    const { grid } = this.refs;
    if (!grid) return;

    const totalPages = Number(grid.dataset.lastPage || 1);
    if (!Number.isFinite(totalPages) || totalPages < 1) return;

    const currentPage = this.#getCurrentPage();
    const cardsByPage = new Map();
    cardsByPage.set(currentPage, Array.from(grid.querySelectorAll(':scope > [ref="cards[]"]')));

    for (let page = 1; page <= totalPages; page++) {
      if (page === currentPage) continue;

      const url = new URL(window.location.href);
      url.searchParams.set('page', String(page));
      url.hash = '';

      const pageHTML = await sectionRenderer.getSectionHTML(this.sectionId, true, url);
      const parsedPage = new DOMParser().parseFromString(pageHTML, 'text/html');
      const pageGrid = parsedPage.querySelector('[ref="grid"]');
      const pageCards = pageGrid ? Array.from(pageGrid.querySelectorAll(':scope > [ref="cards[]"]')) : [];
      cardsByPage.set(page, pageCards);
    }

    const allCards = [];
    const pageSizes = [];
    for (let page = 1; page <= totalPages; page++) {
      const pageCards = cardsByPage.get(page) || [];
      pageSizes.push(pageCards.length);
      allCards.push(...pageCards);
    }

    if (allCards.length === 0) return;

    const newCards = [];
    const regularCards = [];
    for (const card of allCards) {
      if (card.dataset.isNew === 'true') {
        newCards.push(card);
      } else {
        regularCards.push(card);
      }
    }

    const sortedCards = [...newCards, ...regularCards];
    const isInfiniteScroll = this.getAttribute('infinite-scroll') !== 'false';

    if (isInfiniteScroll) {
      if (this.infinityScrollObserver) this.infinityScrollObserver.disconnect();
      this.refs.viewMorePrevious?.remove();
      this.refs.viewMoreNext?.remove();
      grid.replaceChildren(...sortedCards);
      return;
    }

    const pageSize = this.#getPageSize(pageSizes, sortedCards.length);
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    grid.replaceChildren(...sortedCards.slice(start, end));
  }

  #getCurrentPage() {
    const urlPage = Number(new URL(window.location.href).searchParams.get('page') || '1');
    if (Number.isFinite(urlPage) && urlPage > 0) return urlPage;

    const firstCard = this.refs.cards?.[0];
    const cardPage = Number(firstCard?.dataset.page || '1');
    if (Number.isFinite(cardPage) && cardPage > 0) return cardPage;

    return 1;
  }

  #getPageSize(pageSizes, totalCards) {
    const validSizes = pageSizes.filter((size) => Number.isFinite(size) && size > 0);
    if (validSizes.length > 0) return Math.max(...validSizes);
    return totalCards;
  }

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
