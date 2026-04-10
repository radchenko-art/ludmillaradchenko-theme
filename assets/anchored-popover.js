import { Component } from '@theme/component';
import { debounce, requestIdleCallback } from '@theme/utilities';

/**
 * A custom element that manages the popover + popover trigger relationship for anchoring.
 * Calculates the trigger position and inlines custom properties on the popover element
 * that can be consumed by CSS for positioning.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} popover – The popover element.
 * @property {HTMLElement} trigger – The popover trigger element.
 *
 * @extends Component<Refs>
 *
 * @example
 * ```html
 * <anchored-popover-component data-close-on-resize>
 *   <button data-ref="trigger" popovertarget="menu">Open Menu</button>
 *   <div data-ref="popover" id="menu" popover>Menu content</div>
 * </anchored-popover-component>
 * ```
 *
 * @property {string[]} requiredRefs - Required refs: 'popover' and 'trigger'
 * @property {number} [interaction_delay] - The delay in milliseconds for the hover interaction
 * @property {string} [data-close-on-resize] - When present, closes popover on window resize
 * @property {string} [data-hover-triggered] - When present, makes the popover function via pointerenter/leave
 * @property {number | null} [popoverTrigger] - The timeout for the popover trigger
 */
export class AnchoredPopoverComponent extends Component {
  requiredRefs = ['popover', 'trigger'];
  interaction_delay = 200;
  #popoverTrigger = /** @type {number | null} */ (null);

  #isHoverPanel = () => this.hasAttribute('data-hover-triggered');

  #onTriggerEnter = () => {
    const { trigger, popover } = this.refs;
    trigger.dataset.hoverActive = 'true';
    if (this.#isHoverPanel()) {
      if (!popover.classList.contains('is-open')) {
        this.#popoverTrigger = setTimeout(() => {
          if (trigger.matches('[data-hover-active]')) {
            this.#updatePosition();
            popover.classList.add('is-open');
          }
        }, this.interaction_delay);
      }
    } else if (!popover.matches(':popover-open')) {
      this.#popoverTrigger = setTimeout(() => {
        if (trigger.matches('[data-hover-active]')) {
          this.#updatePosition();
          popover.showPopover();
        }
      }, this.interaction_delay);
    }
  };

  #onTriggerLeave = () => {
    const { trigger, popover } = this.refs;
    delete trigger.dataset.hoverActive;
    if (this.#popoverTrigger) clearTimeout(this.#popoverTrigger);
    if (this.#isHoverPanel()) {
      if (popover.classList.contains('is-open')) {
        this.#popoverTrigger = setTimeout(() => {
          popover.classList.remove('is-open');
        }, this.interaction_delay);
      }
    } else if (popover.matches(':popover-open')) {
      this.#popoverTrigger = setTimeout(() => {
        popover.hidePopover();
      }, this.interaction_delay);
    }
  };

  #onPopoverEnter = () => {
    if (this.#popoverTrigger) clearTimeout(this.#popoverTrigger);
  };

  #onPopoverLeave = () => {
    const { popover } = this.refs;
    this.#popoverTrigger = setTimeout(() => {
      if (this.#isHoverPanel()) popover.classList.remove('is-open');
      else popover.hidePopover();
    }, this.interaction_delay);
  };

  /**
   * Updates the popover position by calculating trigger element bounds
   * and setting CSS custom properties on the popover element.
   *
   * - Hover: panel stays in DOM, position absolute relative to component → scrolls with page.
   * - Modal: panel is in top layer (viewport = containing block) → use fixed + viewport coords,
   *   and we update position on scroll so the panel follows the trigger.
   */
  #updatePosition = () => {
    const { popover, trigger } = this.refs;
    if (!popover || !trigger) return;
    const rect = trigger.getBoundingClientRect();
    const parentRect = this.getBoundingClientRect();
    popover.style.setProperty('--anchor-top', `${rect.top}`);
    popover.style.setProperty('--anchor-right', `${window.innerWidth - rect.right}`);
    popover.style.setProperty('--anchor-bottom', `${window.innerHeight - rect.bottom}`);
    popover.style.setProperty('--anchor-left', `${rect.left}`);
    popover.style.setProperty('--anchor-height', `${rect.height}`);
    popover.style.setProperty('--anchor-width', `${rect.width}`);
    const gap = 8;
    const rightFromParent = parentRect.right - rect.right;
    if (this.#isHoverPanel()) {
      const topFromParent = rect.bottom - parentRect.top + gap;
      popover.style.setProperty('position', 'absolute');
      popover.style.setProperty('top', `${topFromParent}px`);
      popover.style.setProperty('right', `${rightFromParent}px`);
      popover.style.removeProperty('left');
    } else if (this.classList.contains('region-selector-popover')) {
      const leftViewport = rect.left;
      popover.style.setProperty('position', 'fixed', 'important');
      popover.style.setProperty('inset', 'auto', 'important');
      popover.style.setProperty('top', `${rect.bottom + gap}px`, 'important');
      popover.style.setProperty('left', `${leftViewport}px`, 'important');
      popover.style.setProperty('right', 'auto', 'important');
      popover.style.setProperty('bottom', 'auto', 'important');
      popover.style.setProperty('margin', '0', 'important');
    } else if (this.classList.contains('account-popover')) {
      const rightViewport = window.innerWidth - rect.right;
      popover.style.setProperty('position', 'fixed', 'important');
      popover.style.setProperty('inset', 'auto', 'important');
      popover.style.setProperty('top', `${rect.bottom + gap}px`, 'important');
      popover.style.setProperty('right', `${rightViewport}px`, 'important');
      popover.style.setProperty('bottom', 'auto', 'important');
      popover.style.setProperty('left', 'auto', 'important');
      popover.style.setProperty('margin', '0', 'important');
    }
  };

  #scrollListener = () => {
    if (this.refs.popover?.matches(':popover-open')) this.#updatePosition();
  };

  /**
   * Debounced resize handler that optionally closes the popover
   * when the window is resized, based on the data-close-on-resize attribute.
   */
  #resizeListener = debounce(() => {
    const popover = /** @type {HTMLElement} */ (this.refs.popover);
    if (!popover) return;
    if (this.#isHoverPanel()) {
      if (popover.classList.contains('is-open')) popover.classList.remove('is-open');
    } else if (popover.matches(':popover-open')) {
      popover.hidePopover();
    }
  }, 100);

  /**
   * Component initialization - sets up event listeners for resize and popover toggle events.
   */
  connectedCallback() {
    super.connectedCallback();
    const { popover, trigger } = this.refs;
    if (this.hasAttribute('data-hover-triggered')) {
      trigger.addEventListener('pointerenter', this.#onTriggerEnter);
      trigger.addEventListener('pointerleave', this.#onTriggerLeave);
      popover.addEventListener('pointerenter', this.#onPopoverEnter);
      popover.addEventListener('pointerleave', this.#onPopoverLeave);
      if (this.dataset.closeOnResize) {
        window.addEventListener('resize', this.#resizeListener);
      }
    } else {
      if (this.dataset.closeOnResize) {
        popover.addEventListener('beforetoggle', (event) => {
          const evt = /** @type {ToggleEvent} */ (event);
          window[evt.newState === 'open' ? 'addEventListener' : 'removeEventListener']('resize', this.#resizeListener);
        });
      }
    }
    if (!this.hasAttribute('data-hover-triggered')) {
      if (!CSS.supports('position-anchor: --trigger')) {
        popover.addEventListener('beforetoggle', () => {
          this.#updatePosition();
        });
        requestIdleCallback(() => {
          this.#updatePosition();
        });
      }
      // Top-layer popovers: fixed + viewport coords; on scroll we follow the trigger
      if (this.classList.contains('account-popover') || this.classList.contains('region-selector-popover')) {
        popover.addEventListener('beforetoggle', (event) => {
          const evt = /** @type {ToggleEvent} */ (event);
          if (evt.newState === 'open') {
            this.#updatePosition();
            requestAnimationFrame(() => this.#updatePosition());
            window.addEventListener('scroll', this.#scrollListener, { passive: true });
          } else {
            window.removeEventListener('scroll', this.#scrollListener);
          }
        });
      }
    }
  }

  /**
   * Component cleanup - removes resize event listener.
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.#resizeListener);
    window.removeEventListener('scroll', this.#scrollListener);
  }
}

if (!customElements.get('anchored-popover-component')) {
  customElements.define('anchored-popover-component', AnchoredPopoverComponent);
}
