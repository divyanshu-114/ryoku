import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const ALLOWED_FILES: Record<string, string> = {
    "ryoku-chat.umd.js": "application/javascript",
    "types.d.ts": "application/javascript",
};

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const file = searchParams.get("file") || "ryoku-chat.umd.js";

    const contentType = ALLOWED_FILES[file];
    if (!contentType) {
        return new NextResponse("Not found", { status: 404 });
    }

    const filePath = path.join(process.cwd(), "public", "sdk", file);

    if (!fs.existsSync(filePath)) {
        return new NextResponse("Not found", { status: 404 });
    }

    const content = fs.readFileSync(filePath, "utf-8");

    return new NextResponse(content, {
        headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000",
        },
    });
}