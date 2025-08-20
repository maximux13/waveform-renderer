// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class EventEmitter<Events extends Record<string, any>> {
  private events = new Map<keyof Events, Array<(args: Events[keyof Events & string]) => void>>();

  public off<E extends keyof Events>(event: E, callback: (args: Events[E]) => void): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback as (args: Events[keyof Events]) => void);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.events.delete(event);
      }
    }
  }

  public on<E extends keyof Events>(event: E, callback: (args: Events[E]) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    const callbacks = this.events.get(event)!;
    callbacks.push(callback as (args: Events[keyof Events]) => void);
  }

  public once<E extends keyof Events>(event: E, callback: (args: Events[E]) => void): void {
    const onceCallback = ((args: Events[E]) => {
      this.off(event, onceCallback);
      callback(args);
    }) as (args: Events[keyof Events]) => void;

    this.on(event, onceCallback);
  }

  public removeAllListeners<E extends keyof Events>(event?: E): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  protected emit<E extends keyof Events>(event: E, args: Events[E]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      (callbacks as Array<(args: Events[E]) => void>).forEach(callback => callback(args));
    }
  }

  protected hasListeners<E extends keyof Events>(event: E): boolean {
    const callbacks = this.events.get(event);
    return callbacks ? callbacks.length > 0 : false;
  }
}
