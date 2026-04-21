
import { db } from "./src/lib/db";
import { conversations, messages } from "./src/lib/db/schema";
import { count } from "drizzle-orm";

async function main() {
    try {
        const convoCount = await db.select({ value: count() }).from(conversations);
        const msgCount = await db.select({ value: count() }).from(messages);
        
        console.log("Conversations count:", convoCount[0].value);
        console.log("Messages count:", msgCount[0].value);

        if (convoCount[0].value > 0) {
            const recentConvos = await db.select().from(conversations).limit(5);
            console.log("\nRecent Conversations:", JSON.stringify(recentConvos, null, 2));
        }
    } catch (error) {
        console.error("Error querying database:", error);
    } finally {
        process.exit(0);
    }
}

main();
