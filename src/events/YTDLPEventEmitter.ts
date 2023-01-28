import { EventEmitter as BaseEventEmitter } from 'events';

type Events = Record<string | symbol, (...args: any) => void>;

export type EventsWithProgress<P, C extends any[] = [void]> = {
  progress: (progress: P) => void;
  error: (error: Error | string) => void;
  complete: (...args: C) => void;
};
export type EventsWithoutProgress<C extends any[] = [void]> = Omit<EventsWithProgress<void, C>, 'progress'>;

export declare interface YTDLPEventEmitter<E extends Events> {
  on<U extends keyof E>(event: U, listener: E[U]): this;
  emit<U extends keyof E>(event: U, ...args: Parameters<E[U]>): boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class YTDLPEventEmitter<E extends Events> extends BaseEventEmitter {}

export default YTDLPEventEmitter;
