import YTDLPEventEmitter, { EventsWithProgress } from './YTDLPEventEmitter.js';

export interface DownloadProgress {
  startIndex: number;
  endIndex: number;
  percent: number;
  size: {
    current: number;
    total: number;
  };
  speed: number;
  estimatedTime: string;
}

class VideoDownloadEventEmitter extends YTDLPEventEmitter<EventsWithProgress<DownloadProgress>> {}

export default VideoDownloadEventEmitter;
