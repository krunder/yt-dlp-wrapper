import { EventEmitter as BaseEventEmitter } from 'events';

type Events = Record<string | symbol, (...args: any) => void>;

type EventsWithProgress<P> = {
  progress: (progress: P) => void;
  error: (error: Error | string) => void;
  complete: () => void;
};
type EventsWithoutProgress = Omit<EventsWithProgress<void>, 'progress'>;

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

export declare interface YTDLPEventEmitter<E extends Events> {
  on<U extends keyof E>(event: U, listener: E[U]): this;
  emit<U extends keyof E>(event: U, ...args: Parameters<E[U]>): boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class YTDLPEventEmitter<E> extends BaseEventEmitter {
}

export type DownloadEventEmitter = YTDLPEventEmitter<EventsWithProgress<DownloadProgress>>;
export type TotalVideosEventEmitter = YTDLPEventEmitter<EventsWithoutProgress>;
