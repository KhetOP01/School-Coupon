import {
  hashPin,
  signMobileToken,
  verifyMobileToken,
  verifyPin,
} from '../mobile-auth';

describe('mobile-auth helpers', () => {
  it('hashes and verifies a 6-digit PIN with scrypt', () => {
    const hash = hashPin('123456');
    expect(hash.startsWith('scrypt:')).toBe(true);
    expect(verifyPin('123456', hash)).toBe(true);
    expect(verifyPin('654321', hash)).toBe(false);
    expect(verifyPin('123456', 'invalid-format')).toBe(false);
  });

  it('verifies the seeded demo scrypt hash for 123456', () => {
    const seededHash =
      'scrypt:a1b2c3d4e5f60718293a4b5c6d7e8f90:bf6bdd1693dc31289e14d0eca9d8dd21d9e5d6945a99a798b2bbd904873d4578962b2471595c04a15459dab8ff124511d0288e7e5d3c60b4a850d8211c4903db';
    expect(verifyPin('123456', seededHash)).toBe(true);
    expect(verifyPin('000000', seededHash)).toBe(false);
  });

  it('signs and verifies parent and merchant JWT tokens', () => {
    const parentToken = signMobileToken({
      sub: '1',
      role: 'parent',
      name: 'คุณสมศรี ใจดี',
    });
    const decodedParent = verifyMobileToken(parentToken);
    expect(decodedParent).toEqual({
      sub: '1',
      role: 'parent',
      name: 'คุณสมศรี ใจดี',
      merchantCode: undefined,
    });

    const merchantToken = signMobileToken({
      sub: '1',
      role: 'merchant',
      name: 'Pa Daeng Rice Shop',
      merchantCode: 'M-001',
    });
    const decodedMerchant = verifyMobileToken(merchantToken);
    expect(decodedMerchant).toEqual({
      sub: '1',
      role: 'merchant',
      name: 'Pa Daeng Rice Shop',
      merchantCode: 'M-001',
    });

    expect(verifyMobileToken('not-a-valid-token')).toBeNull();
  });
});
