import { db } from "../src/lib/db";
import { businesses, billingPlans, subscriptions } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function assignFree() {
    console.log("Assigning Free plan to existing businesses...");

    const [freePlan] = await db
        .select()
        .from(billingPlans)
        .where(eq(billingPlans.name, "Free"))
        .limit(1);

    if (!freePlan) {
        console.error("Free plan not found. Run seed script first.");
        process.exit(1);
    }

    const allBusinesses = await db.select().from(businesses);

    for (const biz of allBusinesses) {
        const [existing] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.businessId, biz.id))
            .limit(1);

        if (!existing) {
            console.log(`Assigning Free plan to ${biz.name} (${biz.slug})...`);
            await db.insert(subscriptions).values({
                businessId: biz.id,
                planId: freePlan.id,
                status: "active",
            });
        }
    }

    console.log("Assignment complete!");
    process.exit(0);
}

assignFree().catch((err) => {
    console.error("Assignment failed:", err);
    process.exit(1);
});
