import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, billingPlans, businesses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

let _stripe: Stripe | null = null;
function getStripe() {
    if (!_stripe) {
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
            apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
        });
    }
    return _stripe;
}

// POST /api/billing/webhook — Stripe webhook handler
export async function POST(req: Request) {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = getStripe().webhooks.constructEvent(
            body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET || ""
        );
    } catch {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const businessId = session.metadata?.businessId;
            const planId = session.metadata?.planId;

            if (businessId && planId) {
                // Upsert subscription
                const [existing] = await db
                    .select()
                    .from(subscriptions)
                    .where(eq(subscriptions.businessId, businessId))
                    .limit(1);

                if (existing) {
                    await db.update(subscriptions).set({
                        planId,
                        stripeCustomerId: session.customer as string,
                        stripeSubscriptionId: session.subscription as string,
                        status: "active",
                    }).where(eq(subscriptions.id, existing.id));
                } else {
                    await db.insert(subscriptions).values({
                        businessId,
                        planId,
                        stripeCustomerId: session.customer as string,
                        stripeSubscriptionId: session.subscription as string,
                        status: "active",
                    });
                }
            }
            break;
        }

        case "customer.subscription.updated": {
            const sub = event.data.object as Stripe.Subscription;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const periodEnd = (sub as any).current_period_end;
            await db
                .update(subscriptions)
                .set({
                    status: sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "cancelled",
                    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
                })
                .where(eq(subscriptions.stripeSubscriptionId, sub.id));
            break;
        }

        case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription;
            await db
                .update(subscriptions)
                .set({ status: "cancelled" })
                .where(eq(subscriptions.stripeSubscriptionId, sub.id));
            break;
        }
    }

    return NextResponse.json({ received: true });
}
