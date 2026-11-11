import { Inject, Injectable } from '@nestjs/common';
import type { Configuration } from 'openid-client';
import {
  InvalidOidcResponseError,
  OidcProviderUnavailableError,
  STAFF_ADMIN_AUTH_CONFIG,
  StaffAdminAuthConfig,
  StaffOidcCallbackInput,
  StaffOidcClient,
  VerifiedStaffIdentity,
} from '../auth.tokens';

type OpenIdClientModule = typeof import('openid-client');

function loadOpenIdClient(): Promise<OpenIdClientModule> {
  return eval('import("openid-client")');
}

@Injectable()
export class OpenIdStaffClient implements StaffOidcClient {
  private configuration?: Promise<Configuration>;

  constructor(
    @Inject(STAFF_ADMIN_AUTH_CONFIG)
    private readonly authConfig: StaffAdminAuthConfig,
  ) {}

  async authorizationUrl(input: {
    state: string;
    nonce: string;
    codeVerifier: string;
  }): Promise<URL> {
    const openid = await loadOpenIdClient();
    const codeChallenge = await openid.calculatePKCECodeChallenge(input.codeVerifier);
    return openid.buildAuthorizationUrl(await this.getConfiguration(), {
      redirect_uri: this.authConfig.redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state: input.state,
      nonce: input.nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
  }

  async verifyCallback(input: StaffOidcCallbackInput): Promise<VerifiedStaffIdentity> {
    const openid = await loadOpenIdClient();
    const callbackUrl = new URL(this.authConfig.redirectUri);
    callbackUrl.searchParams.set('code', input.code);
    callbackUrl.searchParams.set('state', input.state);

    let tokens: Awaited<ReturnType<typeof openid.authorizationCodeGrant>>;
    try {
      tokens = await openid.authorizationCodeGrant(
        await this.getConfiguration(),
        callbackUrl,
        {
          expectedState: input.state,
          expectedNonce: input.nonce,
          pkceCodeVerifier: input.codeVerifier,
          idTokenExpected: true,
        },
      );
    } catch (error) {
      if (error instanceof OidcProviderUnavailableError) {
        throw error;
      }
      if (error instanceof TypeError) {
        throw new OidcProviderUnavailableError();
      }
      throw new InvalidOidcResponseError();
    }

    const claims = tokens.claims();
    if (
      !claims ||
      typeof claims.iss !== 'string' ||
      typeof claims.sub !== 'string' ||
      typeof claims.exp !== 'number'
    ) {
      throw new InvalidOidcResponseError();
    }

    return {
      issuer: claims.iss,
      subject: claims.sub,
      expiresAt: new Date(claims.exp * 1000),
      claims: { ...claims },
    };
  }

  private getConfiguration(): Promise<Configuration> {
    if (!this.configuration) {
      this.configuration = this.discoverConfiguration();
    }
    return this.configuration;
  }

  private async discoverConfiguration(): Promise<Configuration> {
    const openid = await loadOpenIdClient();
    const discoveryOptions =
      this.authConfig.testOnlyAllowInsecureIssuer
        ? { execute: [openid.allowInsecureRequests] }
        : undefined;

    try {
      return await openid.discovery(
        new URL(this.authConfig.issuer),
        this.authConfig.clientId,
        { client_secret: this.authConfig.clientSecret },
        openid.ClientSecretPost(this.authConfig.clientSecret),
        discoveryOptions,
      );
    } catch {
      throw new OidcProviderUnavailableError();
    }
  }
}
