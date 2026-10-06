import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (!_stripe) {
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            // Pinned so an SDK upgrade never changes the API version silently; move it on purpose.
            apiVersion: '2026-09-30.endive',
            typescript: true,
        });
    }
    return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
    get(_target, prop: string | symbol) {
        const instance = getStripe();
        return instance[prop as keyof Stripe];
    },
});
