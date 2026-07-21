class ClerkAttemptProvider {
  static EMAIL_CODE = 'email_code';
  static PHONE_CODE = 'phone_code';
  static TOTP = 'totp';
  static FIRST_FACTOR = 'first';
  static SECOND_FACTOR = 'second';
  static EMAIL_CODE_NOT_ENABLED_MESSAGE =
    'Il codice email non è abilitato per il login in Clerk.';
  static SECOND_FACTOR_NOT_SUPPORTED_MESSAGE =
    'Clerk richiede un secondo fattore non supportato da questa form.';

  constructor(clerk) {
    this.clerk = clerk;
  }

  throwIfError(result) {
    if (result?.error) {
      throw result.error;
    }
  }
}

export class ClerkSignInProvider extends ClerkAttemptProvider {
  constructor(clerk) {
    super(clerk);
    this.signIn = null;
    this.factor = ClerkAttemptProvider.FIRST_FACTOR;
    this.secondFactor = null;
  }

  async start(identifier) {
    this.reset();

    const signIn = await this.clerk.client.signIn.create({ identifier });
    this.throwIfError(signIn);
    this.signIn = signIn;

    const emailCodeFactor = this.signIn.supportedFirstFactors?.find(
      (factor) => factor.strategy === ClerkAttemptProvider.EMAIL_CODE,
    );
    if (!emailCodeFactor) {
      throw new Error(ClerkAttemptProvider.EMAIL_CODE_NOT_ENABLED_MESSAGE);
    }

    const preparedSignIn = await this.signIn.prepareFirstFactor({
      strategy: ClerkAttemptProvider.EMAIL_CODE,
      emailAddressId: emailCodeFactor.emailAddressId,
    });
    this.throwIfError(preparedSignIn);
    this.signIn = preparedSignIn;
    return this.signIn;
  }

  async verify(code) {
    if (!this.signIn) {
      throw new Error('Login Clerk non inizializzato.');
    }

    const signIn =
      this.factor === ClerkAttemptProvider.SECOND_FACTOR
        ? await this.signIn.attemptSecondFactor({
            strategy: this.secondFactor?.strategy || ClerkAttemptProvider.TOTP,
            code,
          })
        : await this.signIn.attemptFirstFactor({
            strategy: ClerkAttemptProvider.EMAIL_CODE,
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

  async resend() {
    if (!this.signIn) return;

    if (this.factor === ClerkAttemptProvider.SECOND_FACTOR) {
      if (this.secondFactor?.strategy !== ClerkAttemptProvider.PHONE_CODE) {
        throw new Error(
          ClerkAttemptProvider.SECOND_FACTOR_NOT_SUPPORTED_MESSAGE,
        );
      }

      const preparedSignIn = await this.signIn.prepareSecondFactor({
        strategy: ClerkAttemptProvider.PHONE_CODE,
        phoneNumberId: this.secondFactor.phoneNumberId,
      });
      this.throwIfError(preparedSignIn);
      this.signIn = preparedSignIn;
      return;
    }

    const emailCodeFactor = this.signIn.supportedFirstFactors?.find(
      (factor) => factor.strategy === ClerkAttemptProvider.EMAIL_CODE,
    );
    if (!emailCodeFactor) {
      throw new Error(ClerkAttemptProvider.EMAIL_CODE_NOT_ENABLED_MESSAGE);
    }

    const preparedSignIn = await this.signIn.prepareFirstFactor({
      strategy: ClerkAttemptProvider.EMAIL_CODE,
      emailAddressId: emailCodeFactor.emailAddressId,
    });
    this.throwIfError(preparedSignIn);
    this.signIn = preparedSignIn;
  }

  reset() {
    this.signIn = null;
    this.factor = ClerkAttemptProvider.FIRST_FACTOR;
    this.secondFactor = null;
    this.clerk.client.resetSignIn?.();
  }

  async prepareSecondFactor() {
    const factor = this.signIn.supportedSecondFactors?.find(
      (currentFactor) =>
        currentFactor.strategy === ClerkAttemptProvider.PHONE_CODE ||
        currentFactor.strategy === ClerkAttemptProvider.TOTP,
    );
    if (!factor) {
      throw new Error(
        ClerkAttemptProvider.SECOND_FACTOR_NOT_SUPPORTED_MESSAGE,
      );
    }

    this.factor = ClerkAttemptProvider.SECOND_FACTOR;
    this.secondFactor = factor;

    if (factor.strategy !== ClerkAttemptProvider.PHONE_CODE) return;

    const preparedSignIn = await this.signIn.prepareSecondFactor({
      strategy: ClerkAttemptProvider.PHONE_CODE,
      phoneNumberId: factor.phoneNumberId,
    });
    this.throwIfError(preparedSignIn);
    this.signIn = preparedSignIn;
  }
}

export class ClerkSignUpProvider extends ClerkAttemptProvider {
  constructor(clerk) {
    super(clerk);
    this.signUp = null;
  }

  async start({ firstName, lastName, emailAddress }) {
    this.reset();

    const signUp = await this.clerk.client.signUp.create({
      firstName,
      lastName,
      emailAddress,
    });
    this.throwIfError(signUp);
    this.signUp = signUp;

    const preparedSignUp =
      await this.signUp.prepareEmailAddressVerification({
        strategy: ClerkAttemptProvider.EMAIL_CODE,
      });
    this.throwIfError(preparedSignUp);
    this.signUp = preparedSignUp;
    return this.signUp;
  }

  async verify(code) {
    if (!this.signUp) {
      throw new Error('Registrazione Clerk non inizializzata.');
    }

    const signUp = await this.signUp.attemptEmailAddressVerification({ code });
    this.throwIfError(signUp);
    this.signUp = signUp;
    return this.signUp;
  }

  async resend() {
    if (!this.signUp) return;

    const preparedSignUp =
      await this.signUp.prepareEmailAddressVerification({
        strategy: ClerkAttemptProvider.EMAIL_CODE,
      });
    this.throwIfError(preparedSignUp);
    this.signUp = preparedSignUp;
  }

  async update(update) {
    if (!this.signUp) {
      throw new Error('Registrazione Clerk non inizializzata.');
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
