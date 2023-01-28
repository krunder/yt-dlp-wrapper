import { VideoDetails } from '../index';
import YTDLPEventEmitter, { EventsWithoutProgress } from './YTDLPEventEmitter.js';

class DetailsEventEmitter extends YTDLPEventEmitter<EventsWithoutProgress<[VideoDetails[]]>> {}

export default DetailsEventEmitter;
