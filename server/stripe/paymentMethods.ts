import type Stripe from "stripe";
import { getStripe } from "./client";

/** Explicit APM types we may pass to Checkout (wallets like Apple/Google Pay ride on `card`). */
const EXPLICIT_METHODS = ["alipay", "wechat_pay", "paypal", "link"] as const;

let cachedTypes: {
  at: number;
  methods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
} | null = null;

let cachedStatus: { at: number; status: PaymentMethodsStatus } | null = null;

export type PaymentMethodsStatus = {
  card: boolean;
  alipay: boolean;
  wechatPay: boolean;
  applePay: boolean;
  googlePay: boolean;
  paypal: boolean;
  link: boolean;
  note?: string;
};

async function readPmc() {
  const stripe = getStripe();
  const { data } = await stripe.paymentMethodConfigurations.list({ limit: 1 });
  return data[0];
}

function available(
  cfg: Awaited<ReturnType<typeof readPmc>>,
  key: string
): boolean {
  const entry = cfg?.[key as keyof NonNullable<typeof cfg>] as
    | { available?: boolean }
    | undefined;
  return Boolean(entry?.available);
}

function preferenceOn(
  cfg: Awaited<ReturnType<typeof readPmc>>,
  key: string
): boolean {
  const entry = cfg?.[key as keyof NonNullable<typeof cfg>] as
    | { display_preference?: { value?: string; preference?: string } }
    | undefined;
  const pref = entry?.display_preference;
  return pref?.value === "on" || pref?.preference === "on";
}

/** Checkout payment_method_types for a currency (card + eligible APMs). */
export async function getCheckoutPaymentMethodTypes(
  currency: string
): Promise<Stripe.Checkout.SessionCreateParams.PaymentMethodType[]> {
  const now = Date.now();
  if (cachedTypes && now - cachedTypes.at < 5 * 60_000) {
    return cachedTypes.methods;
  }

  const types: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = ["card"];
  const cur = currency.toLowerCase();

  try {
    const cfg = await readPmc();
    for (const method of EXPLICIT_METHODS) {
      if (!available(cfg, method)) continue;
      // Alipay / WeChat: CNY presentment
      if ((method === "alipay" || method === "wechat_pay") && cur !== "cny") continue;
      // PayPal: not typically with CNY via Stripe
      if (method === "paypal" && cur === "cny") continue;
      types.push(method);
    }
  } catch (err) {
    console.warn("[Stripe] payment method config lookup failed:", err);
    if (cur === "cny") types.push("alipay");
  }

  cachedTypes = { at: now, methods: types };
  return types;
}

export async function getPaymentMethodsStatus(): Promise<PaymentMethodsStatus> {
  const now = Date.now();
  if (cachedStatus && now - cachedStatus.at < 5 * 60_000) {
    return cachedStatus.status;
  }

  const status: PaymentMethodsStatus = {
    card: true,
    alipay: false,
    wechatPay: false,
    applePay: false,
    googlePay: false,
    paypal: false,
    link: false,
  };

  try {
    const cfg = await readPmc();
    status.alipay = available(cfg, "alipay");
    status.wechatPay = available(cfg, "wechat_pay");
    status.applePay = available(cfg, "apple_pay");
    status.googlePay = available(cfg, "google_pay");
    status.paypal = available(cfg, "paypal");
    // Link is a card wallet: Dashboard "enabled" = display_preference on.
    // PMC `available` can stay false even when Link autofill works on Checkout.
    status.link = preferenceOn(cfg, "link") || available(cfg, "link");
    status.card = available(cfg, "card") || true;

    if (!status.paypal) {
      status.note =
        "PayPal via Stripe is only for EU/UK accounts; this US account cannot enable it.";
    }
  } catch (err) {
    console.warn("[Stripe] payment methods status failed:", err);
    status.alipay = true;
  }

  cachedStatus = { at: now, status };
  return status;
}

export function checkoutPaymentMethodOptions(
  types: Stripe.Checkout.SessionCreateParams.PaymentMethodType[]
): Stripe.Checkout.SessionCreateParams.PaymentMethodOptions | undefined {
  if (!types.includes("wechat_pay")) return undefined;
  return { wechat_pay: { client: "web" } };
}
