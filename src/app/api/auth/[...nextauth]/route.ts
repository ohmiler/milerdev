import type { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";

function normalizeGoogleIssuer(request: NextRequest): NextRequest {
    const url = new URL(request.url);
    const isGoogleCallback = url.pathname.endsWith("/api/auth/callback/google");
    const issuer = url.searchParams.get("iss");

    if (!isGoogleCallback || issuer !== "accounts.google.com") {
        return request;
    }

    url.searchParams.set("iss", "https://accounts.google.com");
    const nextUrl = request.nextUrl.clone();
    nextUrl.searchParams.set("iss", "https://accounts.google.com");

    return new Proxy(request, {
        get(target, prop, receiver) {
            if (prop === "url") {
                return url.toString();
            }

            if (prop === "nextUrl") {
                return nextUrl;
            }

            return Reflect.get(target, prop, receiver);
        },
    }) as NextRequest;
}

export async function GET(request: NextRequest) {
    return handlers.GET(normalizeGoogleIssuer(request));
}

export async function POST(request: NextRequest) {
    return handlers.POST(normalizeGoogleIssuer(request));
}
