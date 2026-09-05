// Test-only Stripe responses. Loaded exclusively by the required E2E network guard.
export function paymentReturnMock(path) {
  const match = /^\/v1\/checkout\/sessions\/cs_e2e_([A-Za-z0-9_-]+)(?:\?.*)?$/.exec(path || '');
  if (!match) return null;
  try {
    const data = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'));
    if (![data.u, data.p, data.i].every((id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,36}$/.test(id))
      || !['course', 'bundle'].includes(data.t) || !Number.isSafeInteger(data.a) || data.a <= 0) return null;
    return { status: 200, headers: { 'content-type': 'application/json', 'x-e2e-provider-mock': 'stripe' }, body: JSON.stringify({
      id: `cs_e2e_${match[1]}`, object: 'checkout.session', status: 'complete', payment_status: 'paid',
      amount_total: data.a, currency: 'thb', payment_intent: `pi_e2e_${data.p}`,
      metadata: { paymentId: data.p, userId: data.u, type: data.t, ...(data.t === 'course' ? { courseId: data.i } : { bundleId: data.i }) },
    }) };
  } catch { return null; }
}
