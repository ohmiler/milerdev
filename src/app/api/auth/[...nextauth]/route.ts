import type { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import { normalizeGoogleCallbackIssuer } from "@/lib/auth-google";

function normalizeGoogleIssuer(request: NextRequest): NextRequest {
    const url = new URL(request.url);

    if (!normalizeGoogleCallbackIssuer(url)) {
        return request;
    }

    const nextUrl = request.nextUrl.clone();
    nextUrl.searchParams.set("iss", url.searchParams.get("iss")!);

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
