export class PasswordSecurityError extends Error {
  constructor(
    public readonly kind: 'policy' | 'compromised' | 'screening_unavailable',
    message: string,
  ) {
    super(message);
    this.name = 'PasswordSecurityError';
  }

  get status() { return this.kind === 'screening_unavailable' ? 503 : 400; }
}
