import { NextRequest } from "next/server";
import { eventBus } from "@floras/shared";
import type { SSEEvent } from "@floras/shared";

export const dynamic = "force-dynamic";

/** GET /api/runs/:id/events — SSE stream for live updates */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const runId = params.id;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (event: SSEEvent) => {
        // Only send events for this run
        if ("data" in event && "runId" in (event.data as Record<string, unknown>)) {
          const eventRunId = (event.data as Record<string, string>).runId;
          if (eventRunId !== runId) return;
        }

        try {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`));
        } catch {
          // Controller might be closed
        }
      };

      const unsubscribe = eventBus.subscribe(send);

      // Send initial heartbeat
      controller.enqueue(encoder.encode(`event: connected\ndata: {"runId":"${runId}"}\n\n`));

      // Heartbeat every 15s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 15000);

      // Clean up on close
      _req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
