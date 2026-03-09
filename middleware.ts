import { NextRequest, NextResponse } from "next/server";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const LOCAL_IPS = new Set(["127.0.0.1", "::1", "[::1]", "::ffff:127.0.0.1"]);

export function middleware(request: NextRequest) {
  if (process.env.REPO_SCANNER_ALLOW_REMOTE === "true") {
    return NextResponse.next();
  }

  if (isLocalRequest(request)) {
    return NextResponse.next();
  }

  return new NextResponse(
    "Repo Scanner blocks remote access by default because it renders sensitive local machine data. Use localhost or set REPO_SCANNER_ALLOW_REMOTE=true behind your own auth boundary.",
    {
      status: 403,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    }
  );
}

function isLocalRequest(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  if (!LOCAL_HOSTS.has(hostname) && !hostname.endsWith(".localhost")) {
    return false;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) {
    return true;
  }

  return forwardedFor
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .every((entry) => LOCAL_IPS.has(entry));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
