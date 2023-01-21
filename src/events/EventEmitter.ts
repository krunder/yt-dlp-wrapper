import { EventEmitter as BaseEventEmitter } from 'events';

type Events = Record<string | symbol, (...args: any) => void>;

export declare interface EventEmitter<E extends Events> {
  on<U extends keyof E>(event: U, listener: E[U]): this;
  emit<U extends keyof E>(event: U, ...args: Parameters<E[U]>): boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class EventEmitter<E extends Events> extends BaseEventEmitter {}
