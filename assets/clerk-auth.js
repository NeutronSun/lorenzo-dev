import { HTMLComponent } from '@theme/HTMLComponent';
import {
  ClerkSignInProvider,
  ClerkSignUpProvider,
} from '@theme/ClerkAuthProvider';

class ClerkAuthRuntime {
  static CLERK_JS_VERSION = '6';
  static LOAD_TIMEOUT_MS = 15000;
  static DEFAULT_ERROR = 'Si è verificato un errore. Riprova.';
  static DEFAULT_LOGIN_PATH = '/customer_authentication/login';
  static DEFAULT_RETURN_TO = '/account';
  static MISSING_KEY_MESSAGE =
    'Clerk publishable key mancante nelle impostazioni della sezione.';
  static LOAD_FAILED_MESSAGE =
    'Impossibile caricare ClerkJS. Controlla la publishable key e la rete.';
  static SESSION_NOT_READY_MESSAGE =
    'Sessione Clerk non pronta. Riprova tra un momento.';
  static BRIDGE_NOT_AVAILABLE_MESSAGE =
    'Sincronizzazione Clerk-Shopify non disponibile.';
  static MISSING_LOGIN_HINT =
    'Email mancante per completare il login Shopify.';
  static clerkPromise = null;

  static noopNavigate() {}

  static getErrorMessage(error) {
    return (
      error?.errors?.[0]?.longMessage ||
      error?.errors?.[0]?.message ||
      error?.message ||
      ClerkAuthRuntime.DEFAULT_ERROR
    );
  }

  static deriveFrontendApi(publishableKey) {
    const parts = publishableKey.split('_');
    if (parts.length < 3) {
      throw new Error(ClerkAuthRuntime.MISSING_KEY_MESSAGE);
    }

    try {
      return atob(parts[2]).slice(0, -1);
    } catch {
      throw new Error(ClerkAuthRuntime.MISSING_KEY_MESSAGE);
    }
  }

  static getDatasetValue(element, key) {
    const ownValue = element?.dataset?.[key]?.trim();
    if (ownValue) return ownValue;

    const root = element?.closest?.('clerk-auth');
    return root?.dataset?.[key]?.trim() || '';
  }

  static getPublishableKey(element) {
    return ClerkAuthRuntime.getDatasetValue(element, 'clerkPublishableKey');
  }

  static getShopifyConfig(element) {
    return {
      loginPath: ClerkAuthRuntime.getDatasetValue(
        element,
        'shopifyLoginPath',
      ),
      returnTo: ClerkAuthRuntime.getDatasetValue(element, 'returnTo'),
    };
  }

  static async getClerk(publishableKey) {
    if (!publishableKey) {
      throw new Error(ClerkAuthRuntime.MISSING_KEY_MESSAGE);
    }

    if (window.Clerk?.client) return window.Clerk;
    if (ClerkAuthRuntime.clerkPromise) {
      return ClerkAuthRuntime.clerkPromise;
    }

    ClerkAuthRuntime.clerkPromise = ClerkAuthRuntime.loadClerk(
      publishableKey,
    ).catch((error) => {
      ClerkAuthRuntime.clerkPromise = null;
      throw error;
    });

    return ClerkAuthRuntime.clerkPromise;
  }

  static async loadClerk(publishableKey) {
    await ClerkAuthRuntime.injectClerkScript(publishableKey);

    let clerk = window.Clerk;
    if (!clerk) {
      throw new Error(ClerkAuthRuntime.LOAD_FAILED_MESSAGE);
    }

    if (typeof clerk === 'function') {
      clerk = new clerk(publishableKey);
      window.Clerk = clerk;
    }

    if (typeof clerk.load !== 'function') {
      throw new Error(ClerkAuthRuntime.LOAD_FAILED_MESSAGE);
    }

    // The custom form lives on the primary application. Account Portal URLs
    // must not be passed as signInUrl/signUpUrl here.
    await clerk.load();
    return clerk;
  }

  static injectClerkScript(publishableKey) {
    if (window.Clerk) return Promise.resolve();

    const frontendApi = ClerkAuthRuntime.deriveFrontendApi(publishableKey);
    const src =
      'https://' +
      frontendApi +
      '/npm/@clerk/clerk-js@' +
      ClerkAuthRuntime.CLERK_JS_VERSION +
      '/dist/clerk.browser.js';

    return new Promise((resolve, reject) => {
      const existing = document.querySelector(
        'script[data-clerk-auth-loader]',
      );
      if (existing) {
        if (window.Clerk) {
          resolve();
          return;
        }

        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener(
          'error',
          () => reject(new Error(ClerkAuthRuntime.LOAD_FAILED_MESSAGE)),
          { once: true },
        );
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error(ClerkAuthRuntime.LOAD_FAILED_MESSAGE));
      }, ClerkAuthRuntime.LOAD_TIMEOUT_MS);
      const script = document.createElement('script');

      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.clerkPublishableKey = publishableKey;
      script.dataset.clerkAuthLoader = '';
      script.onload = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(ClerkAuthRuntime.LOAD_FAILED_MESSAGE));
      };
      document.head.appendChild(script);
    });
  }

  static normalizeReturnTo(returnTo) {
    if (!returnTo) return ClerkAuthRuntime.DEFAULT_RETURN_TO;

    if (returnTo.startsWith('http://') || returnTo.startsWith('https://')) {
      const url = new URL(returnTo);
      return url.pathname + url.search || ClerkAuthRuntime.DEFAULT_RETURN_TO;
    }

    return returnTo.startsWith('/') ? returnTo : '/' + returnTo;
  }

  static normalizeLoginPath(loginPath) {
    const url = new URL(
      loginPath || ClerkAuthRuntime.DEFAULT_LOGIN_PATH,
      window.location.origin,
    );

    if (url.origin !== window.location.origin) {
      return ClerkAuthRuntime.DEFAULT_LOGIN_PATH;
    }

    return url.pathname + url.search;
  }

  static buildShopifyLoginUrl(email, config = {}) {
    const url = new URL(
      ClerkAuthRuntime.normalizeLoginPath(config.loginPath),
      window.location.origin,
    );

    url.searchParams.set('login_hint', email);
    url.searchParams.set(
      'return_to',
      ClerkAuthRuntime.normalizeReturnTo(config.returnTo),
    );
    return url;
  }

  static getUserEmail(clerk, fallback = '') {
    return (
      fallback ||
      clerk?.user?.primaryEmailAddress?.emailAddress ||
      clerk?.user?.emailAddresses?.[0]?.emailAddress ||
      clerk?.session?.user?.primaryEmailAddress?.emailAddress ||
      clerk?.session?.user?.emailAddresses?.[0]?.emailAddress ||
      ''
    );
  }

  static getSessionId(attempt) {
    return (
      attempt?.createdSessionId ||
      attempt?.sessionId ||
      attempt?.existingSessionId ||
      attempt?.existingSession?.sessionId ||
      ''
    );
  }

  static getActiveSession(clerk, sessionId = '') {
    if (clerk?.session?.id && (!sessionId || clerk.session.id === sessionId)) {
      return clerk.session;
    }

    const sessions = [
      ...(clerk?.client?.activeSessions || []),
      ...(clerk?.client?.signedInSessions || []),
    ];

    return (
      sessions.find((session) => session.id === sessionId) ||
      sessions[0] ||
      null
    );
  }

  static async activateSession(clerk, attempt, email, config = {}) {
    const sessionId = ClerkAuthRuntime.getSessionId(attempt);
    if (!sessionId || typeof clerk.setActive !== 'function') {
      throw new Error(ClerkAuthRuntime.SESSION_NOT_READY_MESSAGE);
    }

    await ClerkAuthRuntime.bridgeToShopify(
      clerk,
      email,
      config,
      sessionId,
    );
  }

  static async bridgeToShopify(
    clerk,
    email,
    config = {},
    sessionId = '',
  ) {
    if (!clerk?.client || typeof clerk.setActive !== 'function') {
      throw new Error(ClerkAuthRuntime.SESSION_NOT_READY_MESSAGE);
    }

    const resolvedSessionId =
      sessionId ||
      clerk.session?.id ||
      clerk.client.lastActiveSessionId ||
      '';

    if (!resolvedSessionId) {
      throw new Error(ClerkAuthRuntime.SESSION_NOT_READY_MESSAGE);
    }

    // Persist the exact session created by SignIn/SignUp first. Do not navigate
    // inside setActive(): Shopify must only be opened after Clerk confirms that
    // the session belongs to the server-side client represented by __client.
    await clerk.setActive({ session: resolvedSessionId });

    if (typeof clerk.client.fetch === 'function') {
      await clerk.client.fetch();
    }

    const persistedSession = clerk.client.sessions?.find(
      (currentSession) => currentSession.id === resolvedSessionId,
    );

    if (!persistedSession || persistedSession.currentTask) {
      throw new Error(
        'Clerk ha creato la sessione localmente, ma non l\'ha associata al client persistito.',
      );
    }

    await persistedSession.getToken?.();

    const loginHint = ClerkAuthRuntime.getUserEmail(
      { session: persistedSession, user: persistedSession.user },
      email,
    );
    if (!loginHint) {
      throw new Error(ClerkAuthRuntime.MISSING_LOGIN_HINT);
    }

    const redirectUrl = ClerkAuthRuntime.buildShopifyLoginUrl(
      loginHint,
      config,
    );
    
    //window.location.assign(redirectUrl.toString());
  }

  static hasOAuthReturnParams() {
    const url = new URL(window.location.href);
    return (
      ['__clerk_status', '__clerk_created_session', 'rotating_token_nonce'].some(
        (param) => url.searchParams.has(param),
      ) || url.hash.includes('__clerk')
    );
  }

  static clearOAuthReturnParams() {
    const url = new URL(window.location.href);
    for (const param of [
      '__clerk_status',
      '__clerk_created_session',
      'rotating_token_nonce',
    ]) {
      url.searchParams.delete(param);
    }

    if (url.hash.includes('__clerk')) url.hash = '';

    window.history.replaceState(
      {},
      document.title,
      url.pathname + url.search + url.hash,
    );
  }
}

class OAuthProvider {
  static REGISTRY = new Map();
  static STRATEGY = '';

  get strategy() {
    return this.constructor.STRATEGY;
  }

  static register(ProviderClass) {
    OAuthProvider.REGISTRY.set(ProviderClass.STRATEGY, new ProviderClass());
  }

  static get(strategy) {
    return OAuthProvider.REGISTRY.get(strategy);
  }

  async authenticate(clerk, redirectUrl) {
    await clerk.client.signIn.authenticateWithRedirect({
      strategy: this.strategy,
      redirectUrl,
      redirectUrlComplete: redirectUrl,
      continueSignUp: true,
    });
  }
}

class GoogleOAuthProvider extends OAuthProvider {
  static STRATEGY = 'oauth_google';
}

class GitHubOAuthProvider extends OAuthProvider {
  static STRATEGY = 'oauth_github';
}

class DiscordOAuthProvider extends OAuthProvider {
  static STRATEGY = 'oauth_discord';
}

OAuthProvider.register(GoogleOAuthProvider);
OAuthProvider.register(GitHubOAuthProvider);
OAuthProvider.register(DiscordOAuthProvider);

class ClerkAuth extends HTMLComponent {
  static AUTH_PATH = '/';

  constructor() {
    super();
    this.clerk = null;
    this.isRedirecting = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.oauthButtons = this.refs.oauthButtons || [];
    this.errorEl = this.refs.rootError;
    this.bootstrap();
  }

  async bootstrap() {
    try {
      this.clerk = await ClerkAuthRuntime.getClerk(
        ClerkAuthRuntime.getPublishableKey(this),
      );

      if (ClerkAuthRuntime.hasOAuthReturnParams()) {
        await this.finishOAuthReturn();
      }
    } catch (error) {
      this.showError(ClerkAuthRuntime.getErrorMessage(error));
    }
  }

  getConfig() {
    return ClerkAuthRuntime.getShopifyConfig(this);
  }

  getAuthPageUrl() {
    return (
      window.location.origin +
      (ClerkAuthRuntime.getDatasetValue(this, 'authPath') ||
        ClerkAuth.AUTH_PATH)
    );
  }

  async onOAuthClick(event, button) {
    if (this.isRedirecting || !button?.dataset.oauth) return;

    try {
      this.setOAuthLoading(true);
      const provider = OAuthProvider.get(button.dataset.oauth);
      if (!provider) {
        this.setOAuthLoading(false);
        return;
      }

      this.clerk =
        this.clerk ||
        (await ClerkAuthRuntime.getClerk(
          ClerkAuthRuntime.getPublishableKey(this),
        ));
      await provider.authenticate(this.clerk, this.getAuthPageUrl());
      this.isRedirecting = true;
    } catch (error) {
      this.setOAuthLoading(false);
      this.showError(ClerkAuthRuntime.getErrorMessage(error));
    }
  }

  async finishOAuthReturn() {
    const authPageUrl = this.getAuthPageUrl();
    await this.clerk.handleRedirectCallback(
      {
        continueSignUpUrl: authPageUrl,
        signInUrl: authPageUrl,
        signUpUrl: authPageUrl,
        firstFactorUrl: authPageUrl,
        secondFactorUrl: authPageUrl,
        signInForceRedirectUrl: authPageUrl,
        signUpForceRedirectUrl: authPageUrl,
        signInFallbackRedirectUrl: authPageUrl,
        signUpFallbackRedirectUrl: authPageUrl,
      },
      ClerkAuthRuntime.noopNavigate,
    );

    ClerkAuthRuntime.clearOAuthReturnParams();

    if (!this.clerk.session) {
      const signUp = this.clerk.client.signUp;
      const signUpElement = this.querySelector('clerk-sign-up');
      if (signUp?.status === 'missing_requirements' && signUpElement) {
        await signUpElement.continueOAuth(signUp);
        return;
      }

      throw new Error(ClerkAuthRuntime.DEFAULT_ERROR);
    }

    await ClerkAuthRuntime.bridgeToShopify(
      this.clerk,
      ClerkAuthRuntime.getUserEmail(this.clerk),
      this.getConfig(),
    );
  }

  setOAuthLoading(isLoading) {
    for (const button of this.oauthButtons) button.disabled = isLoading;
  }

  showError(message) {
    if (!this.errorEl) return;
    this.errorEl.textContent = message;
    this.errorEl.hidden = false;
  }
}

class ClerkFlowComponent extends HTMLComponent {
  static LOADING_LABEL = 'Caricamento...';
  static MISSING_EMAIL_MESSAGE = 'Inserisci un indirizzo email valido.';
  static MISSING_CODE_MESSAGE = 'Inserisci il codice ricevuto via email.';
  static RESEND_DISABLE_MS = 3000;

  constructor() {
    super();
    this.clerk = null;
    this.provider = null;
    this.email = '';
    this.isRedirecting = false;
    this.resendTimer = null;
    this.buttonLabels = new WeakMap();
  }

  connectedCallback() {
    super.connectedCallback();
    this.cacheElements();
    this.bootstrap();
  }

  disconnectedCallback() {
    this.resendTimer && clearTimeout(this.resendTimer);
    this.resendTimer = null;
    super.disconnectedCallback();
  }

  async getClerk() {
    if (this.clerk?.client) return this.clerk;

    this.clerk = await ClerkAuthRuntime.getClerk(
      ClerkAuthRuntime.getPublishableKey(this),
    );
    return this.clerk;
  }

  getConfig() {
    return ClerkAuthRuntime.getShopifyConfig(this);
  }

  async activateSession(attempt) {
    await ClerkAuthRuntime.activateSession(
      this.clerk,
      attempt,
      this.email,
      this.getConfig(),
    );
    this.isRedirecting = true;
  }

  clearError() {
    if (!this.errorEl) return;
    this.errorEl.textContent = '';
    this.errorEl.hidden = true;
  }

  showError(message) {
    if (!this.errorEl || this.isRedirecting) return;
    this.errorEl.textContent = message;
    this.errorEl.hidden = false;
  }

  setLoading(isLoading, form = null) {
    if (this.isRedirecting) return;

    const forms = form ? [form] : this.forms;
    for (const currentForm of forms) {
      if (!currentForm) continue;

      const submit = currentForm.querySelector('[data-submit]');
      submit && this.setButtonLoading(submit, isLoading);
      submit && (submit.disabled = isLoading);

      for (const input of currentForm.querySelectorAll('input, button')) {
        input !== this.resendButton && (input.disabled = isLoading);
      }
    }
  }

  async onResendClick() {
    this.clearError();

    try {
      this.setButtonLoading(this.resendButton, true);
      this.resendButton && (this.resendButton.disabled = true);
      await this.provider.resend();

      this.resendTimer && clearTimeout(this.resendTimer);
      this.resendTimer = setTimeout(() => {
        if (!this.resendButton || this.isRedirecting) return;
        this.resendButton.disabled = false;
        this.setButtonLoading(this.resendButton, false);
      }, ClerkFlowComponent.RESEND_DISABLE_MS);
    } catch (error) {
      this.showError(ClerkAuthRuntime.getErrorMessage(error));
      if (this.resendButton && !this.isRedirecting) {
        this.resendButton.disabled = false;
        this.setButtonLoading(this.resendButton, false);
      }
    }
  }

  setButtonLoading(button, isLoading) {
    if (!button || this.isRedirecting) return;

    !this.buttonLabels.has(button) &&
      this.buttonLabels.set(button, button.textContent);
    button.textContent = isLoading
      ? ClerkFlowComponent.LOADING_LABEL
      : this.buttonLabels.get(button);
  }

  showForm(form) {
    for (const currentForm of this.forms) {
      currentForm.hidden = currentForm !== form;
    }
  }
}

class ClerkSignIn extends ClerkFlowComponent {
  static INCOMPLETE_STATUS_MESSAGE =
    'Autenticazione incompleta. Completa i passaggi richiesti e riprova.';

  async bootstrap() {
    try {
      this.clerk = await this.getClerk();
      this.provider = new ClerkSignInProvider(this.clerk);
      this.showForm(this.startForm);
    } catch (error) {
      this.showError(ClerkAuthRuntime.getErrorMessage(error));
    }
  }

  cacheElements() {
    this.startForm = this.refs.startForm;
    this.verifyForm = this.refs.verifyForm;
    this.forms = [this.startForm, this.verifyForm];
    this.errorEl = this.refs.error;
    this.resendButton = this.refs.resendButton;
  }

  async onSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !this.contains(form)) return;

    event.preventDefault();
    event.stopPropagation();
    this.clearError();

    if (form === this.startForm) {
      await this.handleStart(form);
      return;
    }

    await this.handleVerify(form);
  }

  async handleStart(form) {
    const email = String(new FormData(form).get('email') || '').trim();
    if (!email) {
      this.showError(ClerkFlowComponent.MISSING_EMAIL_MESSAGE);
      return;
    }

    try {
      this.setLoading(true, form);
      this.email = email;
      await this.provider.start(email);
      this.showForm(this.verifyForm);
    } catch (error) {
      this.showError(ClerkAuthRuntime.getErrorMessage(error));
    } finally {
      !this.isRedirecting && this.setLoading(false, form);
    }
  }

  async handleVerify(form) {
    const code = String(new FormData(form).get('code') || '').trim();
    if (!code) {
      this.showError(ClerkFlowComponent.MISSING_CODE_MESSAGE);
      return;
    }

    try {
      this.setLoading(true, form);
      const signIn = await this.provider.verify(code);
      if (signIn.status === 'complete') {
        await this.activateSession(signIn);
        return;
      }

      if (
        signIn.status === 'needs_second_factor' ||
        signIn.status === 'needs_client_trust'
      ) {
        form.reset();
        return;
      }

      throw new Error(ClerkSignIn.INCOMPLETE_STATUS_MESSAGE);
    } catch (error) {
      this.showError(ClerkAuthRuntime.getErrorMessage(error));
    } finally {
      !this.isRedirecting && this.setLoading(false, form);
    }
  }

  onBack() {
    this.provider?.reset();
    this.email = '';
    this.startForm?.reset();
    this.verifyForm?.reset();
    this.showForm(this.startForm);
  }
}

class ClerkSignUp extends ClerkFlowComponent {
  static INCOMPLETE_STATUS_MESSAGE =
    'Autenticazione incompleta. Completa i passaggi richiesti e riprova.';
  static MISSING_NAME_MESSAGE = 'Inserisci nome e cognome per registrarti.';
  static REQUIREMENTS_MESSAGE =
    'Completa i dati richiesti per terminare la registrazione.';

  async bootstrap() {
    try {
      this.clerk = await this.getClerk();
      this.provider = new ClerkSignUpProvider(this.clerk);
      this.showForm(this.startForm);
    } catch (error) {
      this.showError(ClerkAuthRuntime.getErrorMessage(error));
    }
  }

  cacheElements() {
    this.startForm = this.refs.startForm;
    this.verifyForm = this.refs.verifyForm;
    this.completeForm = this.refs.completeForm;
    this.forms = [this.startForm, this.verifyForm, this.completeForm];
    this.errorEl = this.refs.error;
    this.resendButton = this.refs.resendButton;
  }

  async onSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !this.contains(form)) return;

    event.preventDefault();
    event.stopPropagation();
    this.clearError();

    if (form === this.startForm) {
      await this.handleStart(form);
      return;
    }

    if (form === this.verifyForm) {
      await this.handleVerify(form);
      return;
    }

    await this.handleComplete(form);
  }

  async handleStart(form) {
    const formData = new FormData(form);
    const firstName = String(formData.get('firstName') || '').trim();
    const lastName = String(formData.get('lastName') || '').trim();
    const emailAddress = String(formData.get('email') || '').trim();
    if (!firstName || !lastName) {
      this.showError(ClerkSignUp.MISSING_NAME_MESSAGE);
      return;
    }
    if (!emailAddress) {
      this.showError(ClerkFlowComponent.MISSING_EMAIL_MESSAGE);
      return;
    }

    try {
      this.setLoading(true, form);
      this.email = emailAddress;
      const signUp = await this.provider.start({
        firstName,
        lastName,
        emailAddress,
      });

      if (signUp.status === 'complete') {
        await this.activateSession(signUp);
        return;
      }

      if (signUp.unverifiedFields?.includes('email_address')) {
        this.showForm(this.verifyForm);
        return;
      }

      if (signUp.status === 'missing_requirements') {
        this.showForm(this.completeForm);
        return;
      }

      throw new Error(ClerkSignUp.INCOMPLETE_STATUS_MESSAGE);
    } catch (error) {
      this.showError(ClerkAuthRuntime.getErrorMessage(error));
    } finally {
      !this.isRedirecting && this.setLoading(false, form);
    }
  }

  async handleVerify(form) {
    const code = String(new FormData(form).get('code') || '').trim();
    if (!code) {
      this.showError(ClerkFlowComponent.MISSING_CODE_MESSAGE);
      return;
    }

    try {
      this.setLoading(true, form);
      const signUp = await this.provider.verify(code);
      if (signUp.status === 'complete') {
        await this.activateSession(signUp);
        return;
      }

      if (signUp.status === 'missing_requirements') {
        this.showForm(this.completeForm);
        return;
      }

      throw new Error(ClerkSignUp.INCOMPLETE_STATUS_MESSAGE);
    } catch (error) {
      this.showError(ClerkAuthRuntime.getErrorMessage(error));
    } finally {
      !this.isRedirecting && this.setLoading(false, form);
    }
  }

  async handleComplete(form) {
    const signUp = this.provider.signUp;
    if (!signUp) {
      this.showError(ClerkSignUp.REQUIREMENTS_MESSAGE);
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
      this.showError(ClerkSignUp.REQUIREMENTS_MESSAGE);
      return;
    }

    try {
      this.setLoading(true, form);
      const updatedSignUp = await this.provider.update(update);
      if (updatedSignUp.status === 'complete') {
        await this.activateSession(updatedSignUp);
        return;
      }

      this.showError(ClerkSignUp.REQUIREMENTS_MESSAGE);
    } catch (error) {
      this.showError(ClerkAuthRuntime.getErrorMessage(error));
    } finally {
      !this.isRedirecting && this.setLoading(false, form);
    }
  }

  async continueOAuth(signUp) {
    this.clerk = await this.getClerk();
    this.provider = this.provider || new ClerkSignUpProvider(this.clerk);
    this.provider.setAttempt(signUp);
    this.email = ClerkAuthRuntime.getUserEmail(this.clerk, signUp.emailAddress);
    this.showForm(this.completeForm);
  }

  onBack() {
    this.provider?.reset();
    this.email = '';
    this.startForm?.reset();
    this.verifyForm?.reset();
    this.completeForm?.reset();
    this.showForm(this.startForm);
  }
}

if (!customElements.get('clerk-auth')) {
  customElements.define('clerk-auth', ClerkAuth);
}

if (!customElements.get('clerk-sign-in')) {
  customElements.define('clerk-sign-in', ClerkSignIn);
}

if (!customElements.get('clerk-sign-up')) {
  customElements.define('clerk-sign-up', ClerkSignUp);
}
