import { db } from "../src/lib/db";
import { businesses, users } from "../src/lib/db/schema";
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
    await db.insert(businesses).values({
        userId: user.id,
        slug,
        name: "amazon",
        type: "ecommerce",
        config: {
            persona: { name: "Amazon Bot", personality: "Helpful assistant" },
        },
        branding: { welcomeMessage: "Welcome to Amazon!" },
    });

    console.log("Re-seeding complete!");
    process.exit(0);
}

recreate().catch(console.error);

