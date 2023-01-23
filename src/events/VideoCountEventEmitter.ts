import YTDLPEventEmitter, { EventsWithoutProgress } from './YTDLPEventEmitter.js';

class VideoCountEventEmitter extends YTDLPEventEmitter<EventsWithoutProgress<[number]>> {}

export default VideoCountEventEmitter;
