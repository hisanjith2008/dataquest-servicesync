import { AppEvent, EventType } from '../types';

export type EventCallback = (event: AppEvent) => void;

class EventBus {
  private subscribers: Map<EventType | '*', Set<EventCallback>> = new Map();
  private history: AppEvent[] = [];
  private maxHistory: number = 200;

  constructor() {
    this.subscribers.set('*', new Set());
  }

  public subscribe(eventType: EventType | '*', callback: EventCallback): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(callback);

    // Unsubscribe helper
    return () => {
      this.subscribers.get(eventType)?.delete(callback);
    };
  }

  public publish(
    type: EventType,
    summary: string,
    actor: string,
    payload: Record<string, any>
  ): AppEvent {
    const event: AppEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      type,
      actor,
      summary,
      payload,
    };

    // Keep history
    this.history.unshift(event);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    // Notify specific type subscribers
    const specificSubscribers = this.subscribers.get(type);
    if (specificSubscribers) {
      specificSubscribers.forEach((cb) => {
        try {
          cb(event);
        } catch (err) {
          console.error(`Error in event subscriber for ${type}:`, err);
        }
      });
    }

    // Notify wildcard subscribers
    const wildcardSubscribers = this.subscribers.get('*');
    if (wildcardSubscribers) {
      wildcardSubscribers.forEach((cb) => {
        try {
          cb(event);
        } catch (err) {
          console.error(`Error in wildcard subscriber:`, err);
        }
      });
    }

    return event;
  }

  public getHistory(): AppEvent[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
  }
}

export const eventBus = new EventBus();
