import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses, billingPlans, subscriptions } from "@/lib/db/schema";
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

// GET /api/billing — Get plans + current subscription
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.userId, session.user.id))
        .limit(1);

    if (!business) {
        return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    const plans = await db.select().from(billingPlans).where(eq(billingPlans.active, true));

    const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.businessId, business.id))
        .limit(1);

    return NextResponse.json({ plans, subscription: sub || null });
}

// POST /api/billing — Create checkout session or manage subscription
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.userId, session.user.id))
        .limit(1);

    if (!business) {
        return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    const body = await req.json();
    const { action, planId } = body;

    if (action === "checkout") {
        // Find plan
        const [plan] = await db.select().from(billingPlans).where(eq(billingPlans.id, planId)).limit(1);
        if (!plan || !plan.stripePriceId) {
            return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
        }

        // Check for existing Stripe customer
        const [existingSub] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.businessId, business.id))
            .limit(1);

        let customerId = existingSub?.stripeCustomerId;
        if (!customerId) {
            const customer = await getStripe().customers.create({
                email: session.user.email || undefined,
                metadata: { businessId: business.id, businessName: business.name },
            });
            customerId = customer.id;
        }

        const checkoutSession = await getStripe().checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            line_items: [{ price: plan.stripePriceId, quantity: 1 }],
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?cancelled=true`,
            metadata: { businessId: business.id, planId: plan.id },
        });

        return NextResponse.json({ url: checkoutSession.url });
    }

    if (action === "portal") {
        const [sub] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.businessId, business.id))
            .limit(1);

        if (!sub?.stripeCustomerId) {
            return NextResponse.json({ error: "No subscription found" }, { status: 404 });
        }

        const portalSession = await getStripe().billingPortal.sessions.create({
            customer: sub.stripeCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
        });

        return NextResponse.json({ url: portalSession.url });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
