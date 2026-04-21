import { db } from "./db";
import { subscriptions, billingPlans } from "./db/schema";
import { eq } from "drizzle-orm";

export async function getBusinessPlan(businessId: string) {
    try {
        const [sub] = await db
            .select({
                planName: billingPlans.name,
            })
            .from(subscriptions)
            .innerJoin(billingPlans, eq(subscriptions.planId, billingPlans.id))
            .where(eq(subscriptions.businessId, businessId))
            .limit(1);

        return sub?.planName?.toLowerCase() || "free";
    } catch (error) {
        console.error("[Billing Utility] Error fetching plan:", error);
        return "free"; // Default to safest
    }
}
