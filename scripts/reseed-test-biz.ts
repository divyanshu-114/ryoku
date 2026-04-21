import { db } from "../src/lib/db";
import { businesses, subscriptions, billingPlans, users } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function recreate() {
    console.log("Re-seeding test business...");

    let [user] = await db.select().from(users).limit(1);
    if (!user) {
        console.log("No user found, creating test user...");
        [user] = await db.insert(users).values({
            name: "Test User",
            email: "test@example.com",
        }).returning();
    }

    const slug = "alu";
    const [existing] = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
    
    if (existing) {
        console.log("Business alu already exists.");
        process.exit(0);
    }

    console.log("Creating business alu...");
    const [biz] = await db.insert(businesses).values({
        userId: user.id,
        slug,
        name: "amazon",
        type: "ecommerce",
        config: {
            persona: { name: "Amazon Bot", personality: "Helpful assistant" },
            canLookupOrders: "Yes",
            canProcessReturns: "Yes",
        },
        branding: { welcomeMessage: "Welcome to Amazon!" },
    }).returning();

    const [freePlan] = await db.select().from(billingPlans).where(eq(billingPlans.name, "Free")).limit(1);
    
    if (!freePlan) {
        console.error("Free plan not found. Run seed-plans.ts first.");
        process.exit(1);
    }

    console.log("Assigning Free plan to alu...");
    await db.insert(subscriptions).values({
        businessId: biz.id,
        planId: freePlan.id,
        status: "active",
    });

    console.log("Re-seeding complete!");
    process.exit(0);
}

recreate().catch(console.error);
