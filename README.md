# YT-DLP Wrapper
A small wrapper for basic usage of the yt-dlp project with JavaScript/TypeScript.

**NOTE:** This package is still in development and may not work as expected. Additional 
features such as download options will be added in the very near future.

## Features
- Download videos (single or playlist)
- Get video details (single or playlist)

## Installation
```bash
npm install yt-dlp-wrapper
```

## Getting Started
The package can be imported with both CommonJS and ES6.
```js
// CommonJS
const { download, getDetails } = require('yt-dlp-wrapper');

// ES6
import { download, getDetails } from 'yt-dlp-wrapper';
```

## Usage
### Download
```ts
import { download } from 'yt-dlp-wrapper';
import { DownloadProgress } from 'yt-dlp-wrapper/events/DownloadEventEmitter';

const stream = download('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

// Handle events
stream.on('progress', (progress: DownloadProgress) => {
  console.log(progress);
});
stream.on('error', (error: Error) => {
  console.error(error);
});
stream.on('complete', () => {
  console.log('Download finished!');
});
```

### Get Details
```ts
import { getDetails, VideoDetails } from 'yt-dlp-wrapper';

getDetails('https://www.youtube.com/watch?v=dQw4w9WgXcQ').then((details: VideoDetails[]) => {
  console.log(details);
});
```
