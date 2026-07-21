export class ClerkUtils {
  static LOAD_TIMEOUT_MS = 15000;
  static DEFAULT_LOGIN_PATH = '/customer_authentication/login';
  static DEFAULT_RETURN_TO = '/account';
  static AUTH_PATH = '/';
  static OAUTH_POPUP_NAME = 'clerkOAuth';
  static OAUTH_POPUP_FEATURES = 'width=600,height=800';
  static OAUTH_POPUP_CLOSE_GRACE_MS = 500;
  static OAUTH_POPUP_POLL_MS = 400;
  static OAUTH_RESULT_SESSION = 'session';
  static OAUTH_RESULT_CALLBACK = 'callback';
  static OAUTH_STRATEGY_PREFIX = 'oauth_';
  static OAUTH_PROVIDER_TOKEN = '{{provider}}';
  static OAUTH_RETURN_PARAMS = Object.freeze([
    '__clerk_status',
    '__clerk_created_session',
    'rotating_token_nonce',
    'intent',
    'sign_in_force_redirect_url',
    'sign_up_force_redirect_url',
  ]);

  static clerkPromise = null;

  static noopNavigate() {}

  /** @param {string} path */
  static t(path) {
    const parts = path.split('.');
    let value = window.Theme?.translations?.clerk;

    for (const part of parts) {
      value = value?.[part];
      if (value == null) return window.Theme?.translations?.clerk?.errors?.default || '';
    }

    return value;
  }

  static getDatasetValue(element, key) {
    const ownValue = element?.dataset?.[key]?.trim();
    if (ownValue) return ownValue;

    const root = element?.closest?.('clerk-auth');
    return root?.dataset?.[key]?.trim() || '';
  }

  static getPublishableKey(element) {
    return ClerkUtils.getDatasetValue(element, 'clerkPublishableKey');
  }

  static getShopifyConfig(element) {
    return {
      loginPath: ClerkUtils.getDatasetValue(element, 'shopifyLoginPath'),
      returnTo: ClerkUtils.getDatasetValue(element, 'returnTo'),
    };
  }

  static async getClerk(publishableKey) {
    if (!publishableKey) {
      throw new Error(ClerkUtils.t('errors.missing_key'));
    }

    if (window.Clerk?.client) return window.Clerk;
    if (ClerkUtils.clerkPromise) return ClerkUtils.clerkPromise;

    ClerkUtils.clerkPromise = ClerkUtils.loadClerk(publishableKey).catch((error) => {
      ClerkUtils.clerkPromise = null;
      throw error;
    });

    return ClerkUtils.clerkPromise;
  }

  /**
   * @param {string} selector
   * @param {() => boolean} isReady
   */
  static waitForScript(selector, isReady) {
    if (isReady()) return Promise.resolve();

    const script = document.querySelector(selector);
    if (!script) {
      return Promise.reject(new Error(ClerkUtils.t('errors.load_failed')));
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const timeoutId = setTimeout(() => settle(false), ClerkUtils.LOAD_TIMEOUT_MS);

      const settle = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        ok ? resolve() : reject(new Error(ClerkUtils.t('errors.load_failed')));
      };

      script.addEventListener('load', () => settle(isReady()), { once: true });
      script.addEventListener('error', () => settle(false), { once: true });
      isReady() && settle(true);
    });
  }

  static async waitForClerkScripts() {
    await ClerkUtils.waitForScript(
      'script[data-clerk-ui]',
      () => Boolean(window.__internal_ClerkUICtor),
    );
    await ClerkUtils.waitForScript(
      'script[data-clerk-js]',
      () => Boolean(window.Clerk),
    );
  }

  static async loadClerk(publishableKey) {
    await ClerkUtils.waitForClerkScripts();

    let clerk = window.Clerk;
    if (!clerk) {
      throw new Error(ClerkUtils.t('errors.load_failed'));
    }

    if (typeof clerk === 'function') {
      clerk = new clerk(publishableKey);
      window.Clerk = clerk;
    }

    if (typeof clerk.load !== 'function') {
      throw new Error(ClerkUtils.t('errors.load_failed'));
    }

    if (!window.__internal_ClerkUICtor) {
      throw new Error(ClerkUtils.t('errors.load_failed'));
    }

    await clerk.load({
      ui: { ClerkUI: window.__internal_ClerkUICtor },
    });
    return clerk;
  }

  static normalizeReturnTo(returnTo) {
    if (!returnTo) return ClerkUtils.DEFAULT_RETURN_TO;

    if (returnTo.startsWith('http://') || returnTo.startsWith('https://')) {
      const url = new URL(returnTo);
      return url.pathname + url.search || ClerkUtils.DEFAULT_RETURN_TO;
    }

    return returnTo.startsWith('/') ? returnTo : '/' + returnTo;
  }

  static normalizeLoginPath(loginPath) {
    const url = new URL(
      loginPath || ClerkUtils.DEFAULT_LOGIN_PATH,
      window.location.origin,
    );

    if (url.origin !== window.location.origin) {
      return ClerkUtils.DEFAULT_LOGIN_PATH;
    }

    return url.pathname + url.search;
  }

  static buildShopifyLoginUrl(email, config = {}) {
    const url = new URL(
      ClerkUtils.normalizeLoginPath(config.loginPath),
      window.location.origin,
    );

    url.searchParams.set('login_hint', email);
    url.searchParams.set(
      'return_to',
      ClerkUtils.normalizeReturnTo(config.returnTo),
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

  static getEnabledOAuthStrategies(clerk) {
    const social = clerk?.environment?.userSettings?.social || {};
    const enabled = [];

    for (const [key, config] of Object.entries(social)) {
      if (!config?.enabled || config.authenticatable === false) continue;

      const strategy =
        config.strategy ||
        (key.startsWith(ClerkUtils.OAUTH_STRATEGY_PREFIX)
          ? key
          : ClerkUtils.OAUTH_STRATEGY_PREFIX + key);

      strategy.startsWith(ClerkUtils.OAUTH_STRATEGY_PREFIX) &&
        enabled.push(strategy);
    }

    return enabled;
  }

  static getOAuthProviderName(strategy) {
    const provider = strategy
      .slice(ClerkUtils.OAUTH_STRATEGY_PREFIX.length)
      .replace(/^custom_/, '')
      .replace(/_/g, ' ')
      .trim();

    return provider.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  static getOAuthLabel(strategy) {
    const name = ClerkUtils.getOAuthProviderName(strategy);
    const template = ClerkUtils.t('oauth.continue_with');

    return template.includes(ClerkUtils.OAUTH_PROVIDER_TOKEN)
      ? template.replaceAll(ClerkUtils.OAUTH_PROVIDER_TOKEN, name)
      : template + ' ' + name;
  }

  static openOAuthPopup() {
    return window.open(
      'about:blank',
      ClerkUtils.OAUTH_POPUP_NAME,
      ClerkUtils.OAUTH_POPUP_FEATURES,
    );
  }

  static getOAuthReloadResource(url = window.location.href) {
    const intent = new URL(url, window.location.origin).searchParams.get(
      'intent',
    );
    return intent === 'signIn' || intent === 'signUp' ? intent : '';
  }

  /**
   * Clerk popup OAuth calls setActive/navigate back to the auth page; suppress
   * those same-origin navigations so the opener stays alive for Shopify bridge.
   * @param {object} clerk
   * @param {string} authPageUrl
   * @param {(url: URL) => void} onAuthNavigate
   */
  static suppressAuthPageNavigate(clerk, authPageUrl, onAuthNavigate) {
    const authUrl = new URL(authPageUrl, window.location.origin);
    const originalNavigate = clerk.__internal_windowNavigate.bind(clerk);

    clerk.__internal_windowNavigate = (to, opts) => {
      const url = new URL(to, window.location.href);
      if (
        url.origin === authUrl.origin &&
        url.pathname === authUrl.pathname
      ) {
        onAuthNavigate?.(url);
        return;
      }

      originalNavigate(to, opts);
    };

    return () => {
      clerk.__internal_windowNavigate = originalNavigate;
    };
  }

  /**
   * @param {object} clerk
   * @param {string} strategy
   * @param {string} redirectUrl
   * @param {Window} popup
   * @returns {Promise<{ type: string, session?: object, reloadResource?: string }>}
   */
  static async authenticateOAuth(clerk, strategy, redirectUrl, popup) {
    if (!popup || popup.closed) {
      throw new Error(ClerkUtils.t('errors.popup_blocked'));
    }

    if (typeof clerk.client?.signIn?.authenticateWithPopup !== 'function') {
      popup.close();
      throw new Error(ClerkUtils.t('errors.load_failed'));
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      let unsubscribe = null;
      let closeTimer = null;
      let closePoll = null;
      let restoreNavigate = null;

      const cleanup = () => {
        restoreNavigate?.();
        unsubscribe?.();
        closeTimer && clearTimeout(closeTimer);
        closePoll && clearInterval(closePoll);
      };

      const settle = (result) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };

      const fail = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        !popup.closed && popup.close();
        reject(error);
      };

      restoreNavigate = ClerkUtils.suppressAuthPageNavigate(
        clerk,
        redirectUrl,
        (url) => {
          const reloadResource = ClerkUtils.getOAuthReloadResource(url);
          reloadResource &&
            settle({
              type: ClerkUtils.OAUTH_RESULT_CALLBACK,
              reloadResource,
            });
        },
      );

      unsubscribe = clerk.addListener(({ session }) => {
        session &&
          settle({
            type: ClerkUtils.OAUTH_RESULT_SESSION,
            session,
          });
      }, { skipInitialEmit: true });

      closePoll = setInterval(() => {
        if (!popup.closed || settled) return;

        closeTimer && clearTimeout(closeTimer);
        closeTimer = setTimeout(() => {
          !settled && fail(new Error(ClerkUtils.t('errors.popup_closed')));
        }, ClerkUtils.OAUTH_POPUP_CLOSE_GRACE_MS);
      }, ClerkUtils.OAUTH_POPUP_POLL_MS);

      clerk.client.signIn
        .authenticateWithPopup({
          strategy,
          redirectUrl,
          redirectUrlComplete: redirectUrl,
          continueSignUp: true,
          popup,
        })
        .catch(fail);
    });
  }

  static hasOAuthReturnParams() {
    const url = new URL(window.location.href);
    return (
      ClerkUtils.OAUTH_RETURN_PARAMS.some((param) =>
        url.searchParams.has(param),
      ) || url.hash.includes('__clerk')
    );
  }

  static clearOAuthReturnParams() {
    const url = new URL(window.location.href);
    for (const param of ClerkUtils.OAUTH_RETURN_PARAMS) {
      url.searchParams.delete(param);
    }

    if (url.hash.includes('__clerk')) url.hash = '';

    window.history.replaceState(
      {},
      document.title,
      url.pathname + url.search + url.hash,
    );
  }

  static buildOAuthCallbackParams(authPageUrl, reloadResource = '') {
    return {
      continueSignUpUrl: authPageUrl,
      signInUrl: authPageUrl,
      signUpUrl: authPageUrl,
      firstFactorUrl: authPageUrl,
      secondFactorUrl: authPageUrl,
      signInForceRedirectUrl: authPageUrl,
      signUpForceRedirectUrl: authPageUrl,
      signInFallbackRedirectUrl: authPageUrl,
      signUpFallbackRedirectUrl: authPageUrl,
      ...(reloadResource ? { reloadResource } : {}),
    };
  }

  static async bridgeToShopify(clerk, email, config = {}, sessionId = '') {
    if (!clerk?.client || typeof clerk.setActive !== 'function') {
      throw new Error(ClerkUtils.t('errors.session_not_ready'));
    }

    const resolvedSessionId =
      sessionId ||
      clerk.session?.id ||
      clerk.client.lastActiveSessionId ||
      '';

    if (!resolvedSessionId) {
      throw new Error(ClerkUtils.t('errors.session_not_ready'));
    }

    await clerk.setActive({ session: resolvedSessionId });

    if (typeof clerk.client.fetch === 'function') {
      await clerk.client.fetch();
    }

    const persistedSession = clerk.client.sessions?.find(
      (currentSession) => currentSession.id === resolvedSessionId,
    );

    if (!persistedSession || persistedSession.currentTask) {
      throw new Error(ClerkUtils.t('errors.session_not_persisted'));
    }

    await persistedSession.getToken?.();

    const loginHint = ClerkUtils.getUserEmail(
      { session: persistedSession, user: persistedSession.user },
      email,
    );
    if (!loginHint) {
      throw new Error(ClerkUtils.t('errors.missing_login_hint'));
    }

    const redirectUrl = ClerkUtils.buildShopifyLoginUrl(loginHint, config);
    window.location.assign(redirectUrl.toString());
  }
}

export class ClerkErrorHandler {
  constructor(errorEl) {
    this.errorEl = errorEl;
  }

  static messageFrom(error) {
    if (typeof error === 'string') return error;

    return (
      error?.errors?.[0]?.longMessage ||
      error?.errors?.[0]?.message ||
      error?.message ||
      ClerkUtils.t('errors.default')
    );
  }

  show(errorOrMessage) {
    if (!this.errorEl) return;
    this.errorEl.textContent = ClerkErrorHandler.messageFrom(errorOrMessage);
    this.errorEl.hidden = false;
  }

  clear() {
    if (!this.errorEl) return;
    this.errorEl.textContent = '';
    this.errorEl.hidden = true;
  }
}

class ClerkAttemptApi {
  static EMAIL_CODE = 'email_code';
  static PHONE_CODE = 'phone_code';
  static TOTP = 'totp';
  static FIRST_FACTOR = 'first';
  static SECOND_FACTOR = 'second';

  constructor(clerk) {
    this.clerk = clerk;
  }

  throwIfError(result) {
    if (result?.error) throw result.error;
  }
}

export class ClerkLoginApi extends ClerkAttemptApi {
  constructor(clerk) {
    super(clerk);
    this.signIn = null;
    this.factor = ClerkAttemptApi.FIRST_FACTOR;
    this.secondFactor = null;
  }

  async startEmailCode(email) {
    this.reset();

    const signIn = await this.clerk.client.signIn.create({ identifier: email });
    this.throwIfError(signIn);
    this.signIn = signIn;

    const emailCodeFactor = this.signIn.supportedFirstFactors?.find(
      (factor) => factor.strategy === ClerkAttemptApi.EMAIL_CODE,
    );
    if (!emailCodeFactor) {
      throw new Error(ClerkUtils.t('errors.email_code_disabled'));
    }

    const preparedSignIn = await this.signIn.prepareFirstFactor({
      strategy: ClerkAttemptApi.EMAIL_CODE,
      emailAddressId: emailCodeFactor.emailAddressId,
    });
    this.throwIfError(preparedSignIn);
    this.signIn = preparedSignIn;
    return this.signIn;
  }

  async verifyEmailCode(code) {
    if (!this.signIn) {
      throw new Error(ClerkUtils.t('errors.login_not_initialized'));
    }

    const signIn =
      this.factor === ClerkAttemptApi.SECOND_FACTOR
        ? await this.signIn.attemptSecondFactor({
            strategy: this.secondFactor?.strategy || ClerkAttemptApi.TOTP,
            code,
          })
        : await this.signIn.attemptFirstFactor({
            strategy: ClerkAttemptApi.EMAIL_CODE,
            code,
          });
    this.throwIfError(signIn);
    this.signIn = signIn;

    if (
      this.signIn.status === 'needs_second_factor' ||
      this.signIn.status === 'needs_client_trust'
    ) {
      await this.prepareSecondFactor();
    }

    return this.signIn;
  }

  async resendEmailCode() {
    if (!this.signIn) return;

    if (this.factor === ClerkAttemptApi.SECOND_FACTOR) {
      if (this.secondFactor?.strategy !== ClerkAttemptApi.PHONE_CODE) {
        throw new Error(ClerkUtils.t('errors.second_factor_unsupported'));
      }

      const preparedSignIn = await this.signIn.prepareSecondFactor({
        strategy: ClerkAttemptApi.PHONE_CODE,
        phoneNumberId: this.secondFactor.phoneNumberId,
      });
      this.throwIfError(preparedSignIn);
      this.signIn = preparedSignIn;
      return;
    }

    const emailCodeFactor = this.signIn.supportedFirstFactors?.find(
      (factor) => factor.strategy === ClerkAttemptApi.EMAIL_CODE,
    );
    if (!emailCodeFactor) {
      throw new Error(ClerkUtils.t('errors.email_code_disabled'));
    }

    const preparedSignIn = await this.signIn.prepareFirstFactor({
      strategy: ClerkAttemptApi.EMAIL_CODE,
      emailAddressId: emailCodeFactor.emailAddressId,
    });
    this.throwIfError(preparedSignIn);
    this.signIn = preparedSignIn;
  }

  async prepareSecondFactor() {
    const factor = this.signIn.supportedSecondFactors?.find(
      (currentFactor) =>
        currentFactor.strategy === ClerkAttemptApi.PHONE_CODE ||
        currentFactor.strategy === ClerkAttemptApi.TOTP,
    );
    if (!factor) {
      throw new Error(ClerkUtils.t('errors.second_factor_unsupported'));
    }

    this.factor = ClerkAttemptApi.SECOND_FACTOR;
    this.secondFactor = factor;

    if (factor.strategy !== ClerkAttemptApi.PHONE_CODE) return;

    const preparedSignIn = await this.signIn.prepareSecondFactor({
      strategy: ClerkAttemptApi.PHONE_CODE,
      phoneNumberId: factor.phoneNumberId,
    });
    this.throwIfError(preparedSignIn);
    this.signIn = preparedSignIn;
  }

  reset() {
    this.signIn = null;
    this.factor = ClerkAttemptApi.FIRST_FACTOR;
    this.secondFactor = null;
    this.clerk.client.resetSignIn?.();
  }
}

export class ClerkSignUpApi extends ClerkAttemptApi {
  constructor(clerk) {
    super(clerk);
    this.signUp = null;
  }

  async startEmailCode({
    firstName,
    lastName,
    emailAddress,
    unsafeMetadata,
  }) {
    this.reset();

    const signUp = await this.clerk.client.signUp.create({
      firstName,
      lastName,
      emailAddress,
      ...(unsafeMetadata ? { unsafeMetadata } : {}),
    });
    this.throwIfError(signUp);
    this.signUp = signUp;

    const preparedSignUp = await this.signUp.prepareEmailAddressVerification({
      strategy: ClerkAttemptApi.EMAIL_CODE,
    });
    this.throwIfError(preparedSignUp);
    this.signUp = preparedSignUp;
    return this.signUp;
  }

  async verifyEmailCode(code) {
    if (!this.signUp) {
      throw new Error(ClerkUtils.t('errors.sign_up_not_initialized'));
    }

    const signUp = await this.signUp.attemptEmailAddressVerification({ code });
    this.throwIfError(signUp);
    this.signUp = signUp;
    return this.signUp;
  }

  async resendEmailCode() {
    if (!this.signUp) return;

    const preparedSignUp = await this.signUp.prepareEmailAddressVerification({
      strategy: ClerkAttemptApi.EMAIL_CODE,
    });
    this.throwIfError(preparedSignUp);
    this.signUp = preparedSignUp;
  }

  async update(update) {
    if (!this.signUp) {
      throw new Error(ClerkUtils.t('errors.sign_up_not_initialized'));
    }

    const signUp = await this.signUp.update(update);
    this.throwIfError(signUp);
    this.signUp = signUp;
    return this.signUp;
  }

  setAttempt(signUp) {
    this.signUp = signUp;
  }

  reset() {
    this.signUp = null;
    this.clerk.client.resetSignUp?.();
  }
}
