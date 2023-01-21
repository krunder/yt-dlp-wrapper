import { EventEmitter } from './EventEmitter.js';

export interface DownloadProgress {
  currentIndex: number;

  percent: number;

  size: {
    current: number;
    total: number;
  }

  speed: number;

  estimatedTime: string;
}

type DownloadEvents = {
  progress: (progress: DownloadProgress) => void;
}

class DownloadEventEmitter extends EventEmitter<DownloadEvents> {
}

export default DownloadEventEmitter;
