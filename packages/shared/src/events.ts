import type { SSEEvent } from "./types";

// ============================================================
// In-process event bus for SSE broadcasting
// ============================================================

type Listener = (event: SSEEvent) => void;

class EventBus {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: SSEEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Don't let one broken listener take down the bus
      }
    }
  }
}

/** Singleton event bus shared across the app */
export const eventBus = new EventBus();
