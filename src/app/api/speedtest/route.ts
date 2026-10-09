import { randomFillSync } from "node:crypto";
import { type NextRequest } from "next/server";
import { MAX_DOWNLOAD_BYTES } from "@/lib/wifi";

// One random block reused for every response; random bytes keep any proxy from compressing them.
const BLOCK = randomFillSync(Buffer.alloc(1024 * 1024));

const HEADERS = {
  "Content-Type": "application/octet-stream",
  "Cache-Control": "no-store, no-transform",
  "Content-Encoding": "identity",
};

/** Download sample for the Wi-Fi test (F12). `?bytes=0` is the ping. */
export function GET(request: NextRequest) {
  const bytes = Math.min(Math.max(Number(request.nextUrl.searchParams.get("bytes")) || 0, 0), MAX_DOWNLOAD_BYTES);
  if (bytes === 0) return new Response(null, { status: 204, headers: HEADERS });

  let sent = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const n = Math.min(BLOCK.length, bytes - sent);
      controller.enqueue(new Uint8Array(BLOCK.buffer, BLOCK.byteOffset, n));
      sent += n;
      if (sent >= bytes) controller.close();
    },
  });
  return new Response(stream, { headers: { ...HEADERS, "Content-Length": String(bytes) } });
}
