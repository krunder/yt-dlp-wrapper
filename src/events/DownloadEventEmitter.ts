import { EventEmitter } from './EventEmitter.js';

export interface DownloadProgress {
  percent: number;

  size: {
    total: number;

    totalUnit: string;
  },

  speed: number;

  speedUnit: string;

  estimatedTime: string;
}

type DownloadEvents = {
  progress: (progress: DownloadProgress) => void;
}

class DownloadEventEmitter extends EventEmitter<DownloadEvents> {
}

export default DownloadEventEmitter;
