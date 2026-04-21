import { db } from "../src/lib/db";
import { billingPlans } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

async function seed() {
    console.log("Seeding billing plans...");

    const plans = [
        {
            name: "Free",
            monthlyPrice: 0,
            maxConversations: 500,
            maxApiKeys: 1,
            features: ["FAQ chatbot only", "No order tracking/returns", "Basic analytics", "Community support"],
        },
        {
            name: "Paid",
            monthlyPrice: 4900, // $49.00
            maxConversations: -1,
            maxApiKeys: 10,
            features: ["Fully customizable AI", "Order & payment integrations", "Return & refund processing", "Advanced analytics", "Priority support", "Remove Ryoku branding"],
        },
    ];

    for (const plan of plans) {
        const [existing] = await db
            .select()
            .from(billingPlans)
            .where(eq(billingPlans.name, plan.name))
            .limit(1);

        if (existing) {
            console.log(`Plan ${plan.name} already exists, updating...`);
            await db.update(billingPlans).set(plan).where(eq(billingPlans.id, existing.id));
        } else {
            console.log(`Creating plan ${plan.name}...`);
            await db.insert(billingPlans).values(plan);
        }
    }

    console.log("Seeding complete!");
    process.exit(0);
}

seed().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
