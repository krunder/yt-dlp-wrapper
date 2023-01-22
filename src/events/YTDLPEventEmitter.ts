import { EventEmitter as BaseEventEmitter } from 'events';

type Events<P> = {
  progress: (progress: P) => void;
  error: (error: Error | string) => void;
  complete: () => void;
} & Record<string | symbol, (...args: any) => void>;

export interface DownloadProgress {
  currentIndex: number;
  percent: number;
  size: {
    current: number;
    total: number;
  };
  speed: number;
  estimatedTime: string;
}

export declare interface YTDLPEventEmitter<P, E extends Events<P> = Events<P>> {
  on<U extends keyof E>(event: U, listener: E[U]): this;
  emit<U extends keyof E>(event: U, ...args: Parameters<E[U]>): boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class YTDLPEventEmitter<P, E extends Events<P>> extends BaseEventEmitter {}

export type DownloadEventEmitter = YTDLPEventEmitter<DownloadProgress>;
