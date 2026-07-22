import { HTMLComponent } from '@theme/HTMLComponent';
import { HtmlUtils } from '@theme/utilities';
import {
  ClerkUtils,
  ClerkErrorHandler,
  ClerkLoginApi,
  ClerkSignUpApi,
} from '@theme/clerk-auth-provider';

class ClerkProvider extends HTMLComponent {
  static RESEND_DISABLE_MS = 3000;

  constructor() {
    super();
    this.clerk = null;
    this.api = null;
    this.email = '';
    this.isRedirecting = false;
    this.resendTimer = null;
    this.buttonLabels = new WeakMap();
    this.errors = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.errors = new ClerkErrorHandler(this.refs.error);
    this.bootstrap();
  }

  disconnectedCallback() {
    this.resendTimer && clearTimeout(this.resendTimer);
    this.resendTimer = null;
    super.disconnectedCallback();
  }

  buildApi() {
    return null;
  }

  collectStartPayload() {
    return null;
  }

  get forms() {
    return [this.refs.startForm, this.refs.verifyForm].filter(Boolean);
  }

  async bootstrap() {
    try {
      this.clerk = await ClerkUtils.getClerk(ClerkUtils.getPublishableKey(this));
      this.api = this.buildApi();
      this.showStartForm();
    } catch (error) {
      this.errors.show(error);
    }
  }

  async onSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !this.contains(form)) return;

    event.preventDefault();
    event.stopPropagation();
    this.errors.clear();

    if (form === this.refs.startForm) {
      await this.startEmailCode(form);
      return;
    }

    if (form === this.refs.verifyForm) {
      await this.verifyEmailCode(form);
      return;
    }

    form === this.refs.completeForm && (await this.handleComplete(form));
  }

  async startEmailCode(form) {
    const payload = this.collectStartPayload(form);
    if (!payload) return;

    try {
      this.setLoading(true, form);
      this.email =
        typeof payload === 'string'
          ? payload
          : payload.emailAddress || payload.email || '';
      const attempt = await this.api.startEmailCode(payload);
      await this.afterStartEmailCode(attempt);
    } catch (error) {
      this.errors.show(error);
    } finally {
      !this.isRedirecting && this.setLoading(false, form);
    }
  }

  async afterStartEmailCode() {
    this.showVerifyForm();
  }

  async verifyEmailCode(form) {
    const code = String(new FormData(form).get('code') || '').trim();
    if (!code) {
      this.errors.show(ClerkUtils.t('errors.missing_code'));
      return;
    }

    try {
      this.setLoading(true, form);
      const attempt = await this.api.verifyEmailCode(code);
      await this.afterVerifyEmailCode(attempt, form);
    } catch (error) {
      this.errors.show(error);
    } finally {
      !this.isRedirecting && this.setLoading(false, form);
    }
  }

  async afterVerifyEmailCode(attempt) {
    if (attempt.status === 'complete') {
      await this.finishWithShopify(attempt);
      return;
    }

    throw new Error(ClerkUtils.t('errors.incomplete'));
  }

  async handleComplete() {}

  async finishWithShopify(attempt) {
    const sessionId = ClerkUtils.getSessionId(attempt);
    await ClerkUtils.bridgeToShopify(
      this.clerk,
      this.email,
      ClerkUtils.getShopifyConfig(this),
      sessionId,
    );
    this.isRedirecting = true;
  }

  async onResendClick() {
    this.errors.clear();

    try {
      this.setButtonLoading(this.refs.resendButton, true);
      this.refs.resendButton && (this.refs.resendButton.disabled = true);
      await this.api.resendEmailCode();

      this.resendTimer && clearTimeout(this.resendTimer);
      this.resendTimer = setTimeout(() => {
        if (!this.refs.resendButton || this.isRedirecting) return;
        this.refs.resendButton.disabled = false;
        this.setButtonLoading(this.refs.resendButton, false);
      }, ClerkProvider.RESEND_DISABLE_MS);
    } catch (error) {
      this.errors.show(error);
      if (this.refs.resendButton && !this.isRedirecting) {
        this.refs.resendButton.disabled = false;
        this.setButtonLoading(this.refs.resendButton, false);
      }
    }
  }

  onBack() {
    this.api?.reset();
    this.email = '';
    this.refs.startForm?.reset();
    this.refs.verifyForm?.reset();
    this.refs.completeForm?.reset();
    this.showStartForm();
  }

  showStartForm() {
    this.showForm(this.refs.startForm);
  }

  showVerifyForm() {
    this.showForm(this.refs.verifyForm);
  }

  showCompleteForm() {
    this.showForm(this.refs.completeForm);
  }

  showForm(form) {
    for (const currentForm of this.forms) {
      currentForm.hidden = currentForm !== form;
    }
  }

  setLoading(isLoading, form = null) {
    if (this.isRedirecting) return;

    const forms = form ? [form] : this.forms;
    for (const currentForm of forms) {
      if (!currentForm) continue;

      const submit = currentForm.querySelector('[data-submit]');
      submit && this.setButtonLoading(submit, isLoading);
      submit && (submit.disabled = isLoading);

      for (const input of currentForm.querySelectorAll(
        'input, select, button',
      )) {
        input !== this.refs.resendButton && (input.disabled = isLoading);
      }
    }
  }

  setButtonLoading(button, isLoading) {
    if (!button || this.isRedirecting) return;

    !this.buttonLabels.has(button) &&
      this.buttonLabels.set(button, button.textContent);
    button.textContent = isLoading
      ? ClerkUtils.t('errors.loading')
      : this.buttonLabels.get(button);
  }
}

class ClerkLogin extends ClerkProvider {
  buildApi() {
    return new ClerkLoginApi(this.clerk);
  }

  collectStartPayload(form) {
    const email = String(new FormData(form).get('email') || '').trim();
    if (!email) {
      this.errors.show(ClerkUtils.t('errors.missing_email'));
      return null;
    }

    return email;
  }

  async afterVerifyEmailCode(attempt, form) {
    if (attempt.status === 'complete') {
      await this.finishWithShopify(attempt);
      return;
    }

    if (
      attempt.status === 'needs_second_factor' ||
      attempt.status === 'needs_client_trust'
    ) {
      form.reset();
      return;
    }

    throw new Error(ClerkUtils.t('errors.incomplete'));
  }
}

class ClerkSignUp extends ClerkProvider {
  static GENDERS = Object.freeze([
    'male',
    'female',
    'other',
    'prefer_not_to_say',
  ]);
  static PREFERRED_PMS = Object.freeze(['davide', 'valerio', 'simone']);

  get forms() {
    return [
      this.refs.startForm,
      this.refs.verifyForm,
      this.refs.completeForm,
    ].filter(Boolean);
  }

  buildApi() {
    return new ClerkSignUpApi(this.clerk);
  }

  collectStartPayload(form) {
    const formData = new FormData(form);
    const firstName = String(formData.get('firstName') || '').trim();
    const lastName = String(formData.get('lastName') || '').trim();
    const emailAddress = String(formData.get('email') || '').trim();
    const gender = String(formData.get('gender') || '').trim();
    const preferredPm = String(formData.get('preferredPm') || '').trim();
    const privacyAccepted = formData.get('privacy') === '1';

    if (!firstName || !lastName) {
      this.errors.show(ClerkUtils.t('errors.missing_name'));
      return null;
    }

    if (!emailAddress) {
      this.errors.show(ClerkUtils.t('errors.missing_email'));
      return null;
    }

    if (!ClerkSignUp.GENDERS.includes(gender)) {
      this.errors.show(ClerkUtils.t('errors.missing_gender'));
      return null;
    }

    if (!ClerkSignUp.PREFERRED_PMS.includes(preferredPm)) {
      this.errors.show(ClerkUtils.t('errors.missing_preferred_pm'));
      return null;
    }

    if (!privacyAccepted) {
      this.errors.show(ClerkUtils.t('errors.missing_privacy'));
      return null;
    }

    return {
      firstName,
      lastName,
      emailAddress,
      unsafeMetadata: {
        gender,
        preferredPm,
        privacyAccepted: true,
        privacyAcceptedAt: new Date().toISOString(),
        userMetadata: ClerkUtils.buildUserMetadataTags({
          gender,
          preferredPm,
          privacyAccepted: true,
        }),
      },
    };
  }

  async afterStartEmailCode(attempt) {
    if (attempt.status === 'complete') {
      await this.finishWithShopify(attempt);
      return;
    }

    if (attempt.unverifiedFields?.includes('email_address')) {
      this.showVerifyForm();
      return;
    }

    if (attempt.status === 'missing_requirements') {
      this.showCompleteForm();
      return;
    }

    throw new Error(ClerkUtils.t('errors.incomplete'));
  }

  async afterVerifyEmailCode(attempt) {
    if (attempt.status === 'complete') {
      await this.finishWithShopify(attempt);
      return;
    }

    if (attempt.status === 'missing_requirements') {
      this.showCompleteForm();
      return;
    }

    throw new Error(ClerkUtils.t('errors.incomplete'));
  }

  async handleComplete(form) {
    const signUp = this.api.signUp;
    if (!signUp) {
      this.errors.show(ClerkUtils.t('errors.requirements'));
      return;
    }

    const formData = new FormData(form);
    const firstName = String(formData.get('firstName') || '').trim();
    const lastName = String(formData.get('lastName') || '').trim();
    const missingFields = signUp.missingFields || [];
    const update = {};

    if (
      (!missingFields.length ||
        missingFields.includes('first_name') ||
        missingFields.includes('firstName')) &&
      firstName
    ) {
      update.firstName = firstName;
    }

    if (
      (!missingFields.length ||
        missingFields.includes('last_name') ||
        missingFields.includes('lastName')) &&
      lastName
    ) {
      update.lastName = lastName;
    }

    if (!Object.keys(update).length) {
      this.errors.show(ClerkUtils.t('errors.requirements'));
      return;
    }

    try {
      this.setLoading(true, form);
      const updatedSignUp = await this.api.update(update);
      if (updatedSignUp.status === 'complete') {
        await this.finishWithShopify(updatedSignUp);
        return;
      }

      this.errors.show(ClerkUtils.t('errors.requirements'));
    } catch (error) {
      this.errors.show(error);
    } finally {
      !this.isRedirecting && this.setLoading(false, form);
    }
  }

  async continueOAuth(signUp) {
    this.clerk =
      this.clerk ||
      (await ClerkUtils.getClerk(ClerkUtils.getPublishableKey(this)));
    this.api = this.api || new ClerkSignUpApi(this.clerk);
    this.api.setAttempt(signUp);
    this.email = ClerkUtils.getUserEmail(this.clerk, signUp.emailAddress);
    this.showCompleteForm();
  }
}

class ClerkAuth extends HTMLComponent {
  static VIEW_LOGIN = 'login';
  static VIEW_SIGN_UP = 'sign-up';

  constructor() {
    super();
    this.clerk = null;
    this.isRedirecting = false;
    this.errors = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.errors = new ClerkErrorHandler(this.refs.rootError);
    !this.dataset.view && (this.dataset.view = ClerkAuth.VIEW_LOGIN);
    this.bootstrap();
  }

  async bootstrap() {
    try {
      this.clerk = await ClerkUtils.getClerk(ClerkUtils.getPublishableKey(this));
      this.syncOAuthButtons();

      ClerkUtils.hasOAuthReturnParams() && (await this.finishOAuthReturn());
    } catch (error) {
      this.errors.show(error);
    }
  }

  syncOAuthButtons() {
    const panel = this.refs.oauthPanel;
    if (!panel) return;

    const enabled = ClerkUtils.getEnabledOAuthStrategies(this.clerk);
    const parts = [];

    for (const strategy of enabled) {
      parts.push(
        `<button type="button" class="clerk-auth__oauth-btn" data-oauth="${HtmlUtils.escape(strategy)}" ref="oauthButtons[]" on:click="onOAuthClick">${HtmlUtils.escape(ClerkUtils.getOAuthLabel(strategy))}</button>`,
      );
    }

    panel.innerHTML = parts.join('');
    this.updateRefs();

    const hasOAuth = enabled.length > 0;
    panel.hidden = !hasOAuth;
    this.refs.oauthDivider && (this.refs.oauthDivider.hidden = !hasOAuth);
  }

  onViewClick(event, button) {
    const view = button?.dataset.view;
    if (!view) return;

    this.dataset.view = view;

    for (const tab of this.refs.viewTabs || []) {
      tab.setAttribute(
        'aria-pressed',
        tab.dataset.view === view ? 'true' : 'false',
      );
    }
  }

  getAuthPageUrl() {
    return (
      window.location.origin +
      (ClerkUtils.getDatasetValue(this, 'authPath') || ClerkUtils.AUTH_PATH)
    );
  }

  async onOAuthClick(event, button) {
    if (this.isRedirecting || !button?.dataset.oauth) return;

    const popup = ClerkUtils.openOAuthPopup();
    if (!popup) {
      this.errors.show(ClerkUtils.t('errors.popup_blocked'));
      return;
    }

    try {
      this.setOAuthLoading(true);
      this.errors.clear();
      this.clerk =
        this.clerk ||
        (await ClerkUtils.getClerk(ClerkUtils.getPublishableKey(this)));

      const result = await ClerkUtils.authenticateOAuth(
        this.clerk,
        button.dataset.oauth,
        this.getAuthPageUrl(),
        popup,
      );

      await this.finishOAuthResult(result);
    } catch (error) {
      !popup.closed && popup.close();
      this.setOAuthLoading(false);
      this.errors.show(error);
    }
  }

  async finishOAuthResult(result) {
    if (result?.type === ClerkUtils.OAUTH_RESULT_SESSION) {
      await ClerkUtils.bridgeToShopify(
        this.clerk,
        ClerkUtils.getUserEmail(this.clerk),
        ClerkUtils.getShopifyConfig(this),
        result.session?.id,
      );
      this.isRedirecting = true;
      return;
    }

    await this.finishOAuthReturn(result?.reloadResource);
  }

  async finishOAuthReturn(reloadResource = '') {
    const authPageUrl = this.getAuthPageUrl();
    const intent =
      reloadResource || ClerkUtils.getOAuthReloadResource() || undefined;
    const restoreNavigate = ClerkUtils.suppressAuthPageNavigate(
      this.clerk,
      authPageUrl,
    );

    try {
      await this.clerk.handleRedirectCallback(
        ClerkUtils.buildOAuthCallbackParams(authPageUrl, intent),
        ClerkUtils.noopNavigate,
      );

      ClerkUtils.clearOAuthReturnParams();

      if (!this.clerk.session) {
        const signUp = this.clerk.client.signUp;
        const signUpElement = this.querySelector('clerk-sign-up');
        if (signUp?.status === 'missing_requirements' && signUpElement) {
          this.dataset.view = ClerkAuth.VIEW_SIGN_UP;
          this.setOAuthLoading(false);
          await signUpElement.continueOAuth(signUp);
          return;
        }

        throw new Error(ClerkUtils.t('errors.default'));
      }

      await ClerkUtils.bridgeToShopify(
        this.clerk,
        ClerkUtils.getUserEmail(this.clerk),
        ClerkUtils.getShopifyConfig(this),
      );
      this.isRedirecting = true;
    } finally {
      restoreNavigate();
    }
  }

  setOAuthLoading(isLoading) {
    for (const button of this.refs.oauthButtons || []) {
      button.disabled = isLoading;
    }
  }
}

if (!customElements.get('clerk-auth')) {
  customElements.define('clerk-auth', ClerkAuth);
}

if (!customElements.get('clerk-login')) {
  customElements.define('clerk-login', ClerkLogin);
}

if (!customElements.get('clerk-sign-up')) {
  customElements.define('clerk-sign-up', ClerkSignUp);
}
