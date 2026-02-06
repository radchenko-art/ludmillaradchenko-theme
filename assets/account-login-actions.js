import { Component } from '@theme/component';

/**
 * A custom element that manages the account login actions.
 *
 * @extends {Component}
 */
class AccountLoginActions extends Component {
  /**
   * @type {Element | null}
   */
  shopLoginButton = null;

  connectedCallback() {
    super.connectedCallback();
    this.shopLoginButton = this.querySelector('shop-login-button');

    if (this.shopLoginButton) {
      this.shopLoginButton.setAttribute('full-width', 'true');
      this.shopLoginButton.setAttribute('persist-after-sign-in', 'true');
      this.shopLoginButton.setAttribute('analytics-context', 'loginWithShopSelfServe');
      this.shopLoginButton.setAttribute('flow-version', 'account-actions-popover');
      this.shopLoginButton.setAttribute('return-uri', window.location.href);

      this.shopLoginButton.addEventListener('completed', () => {
        window.location.reload();
      });
    }

    const bindCustomTrigger = () => {
      const customTrigger =
        this.parentElement?.querySelector('[data-shop-login-trigger]') ||
        document.querySelector('.account-actions__sign-in-shop-wrap [data-shop-login-trigger]');

      if (!customTrigger) return;
      if (!this.shopLoginButton) {
        customTrigger.style.display = 'none';
        return;
      }

      customTrigger.addEventListener('click', () => {
        const inner =
          this.shopLoginButton.shadowRoot?.querySelector(
            'button, [role="button"], a, [tabindex="0"]'
          ) ?? null;
        console.log('[account-login-actions] inner in shadowRoot:', inner);
        if (inner) {
          inner.click();
        } else {
          this.shopLoginButton.click();
        }
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindCustomTrigger);
    } else {
      requestAnimationFrame(bindCustomTrigger);
    }
  }
}

if (!customElements.get('account-login-actions')) {
  customElements.define('account-login-actions', AccountLoginActions);
}
