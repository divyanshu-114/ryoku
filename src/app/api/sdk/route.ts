import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const file = searchParams.get("file") || "ryoku-chat.umd.js";
    
    const publicDir = path.join(process.cwd(), "public", "sdk");
    const filePath = path.join(publicDir, file);
    
    if (!fs.existsSync(filePath)) {
        return new NextResponse("Not found", { status: 404 });
    }
    
    const content = fs.readFileSync(filePath, "utf-8");
    const ext = path.extname(file);
    const contentType = ext === ".js" ? "application/javascript" : ext === ".d.ts" ? "application/javascript" : "text/plain";
    
    return new NextResponse(content, {
        headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000",
        },
    });
}