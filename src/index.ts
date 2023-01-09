import path from 'path';
import { cwd } from 'process';
import { spawn } from 'child_process';
import { EOL } from 'os';
import DownloadEventEmitter, { DownloadProgress } from './events/DownloadEventEmitter';
import { EventEmitter } from './events/EventEmitter';

const PROGRESS_REGEX = /^\[download\]\s*([0-9]+\.?[0-9]*)%\s*of\s*([0-9]+\.?[0-9]*)([a-zA-Z]+)\s*at\s*([0-9]+\.?[0-9]*)([a-zA-Z]+)\/s\s*ETA\s*([0-9]+:?[0-9]*)$/;
const ALREADY_DOWNLOADED_REGEX = /^\[download\]\s*(.+)\s*has\s*already\s*been\s*downloaded\s*$/

const params = [
  '-f',
  'bv[height<=1080]+ba',
  '--merge-output-format',
  'mp4',
  '--embed-subs',
  '--embed-thumbnail',
  '--embed-chapters',
  '--embed-metadata',
];

const executablePath = path.join(process.cwd(), 'bin', 'yt-dlp.exe');

const download = (url: string): DownloadEventEmitter => {
  const emitter = new DownloadEventEmitter();

  const stream = spawn(executablePath, [
    ...params,
    '-o',
    path.join(cwd(), 'tmp', '%(title)s.%(ext)s'),
    url,
  ]);

  stream.stdout.on('data', (data: Buffer): void => {
    const lines: string[] = data.toString().split(/(?:\r\n|\r|\n)/g);

    for (let line of lines) {
      const matches = PROGRESS_REGEX.exec(line.trim());

      if (matches) {
        /*const event: DownloadProgress = {
          percent: Number(matches[1]),
          totalSize: Number(matches[2]),
          totalSizeUnit: matches[3],
          currentRate: Number(matches[4]),
          currentRateUnit: matches[5],
          estimatedTime: matches[6],
        };

        emitter.emit('progress', event);*/
      }
    }
  });

  return emitter;
};

const getApproxSize = (url: string): Promise<number> => {
  return new Promise((resolve, reject): void => {
    const stream = spawn(executablePath, [
      ...params,
      '-O',
      '%(filesize,filesize_approx)s',
      url,
    ]);

    let totalBytes = 0;

    stream.stdout.on('data', (data: Buffer): void => {
      const lines: string[] = data.toString().split(/(?:\r\n|\r|\n)/g);

      for (let line of lines) {
        const bytes = Number(line);

        if (!isNaN(bytes)) {
          totalBytes += bytes;
        }
      }
    });

    stream.stderr.on('data', (data: Buffer): void => {
      reject(data.toString());
      stream.stdin.end();
    });

    stream.on('exit', (code: number): void => {
      if (code === 0) {
        console.log((totalBytes / 1000000) + 'MB');

        resolve(totalBytes);
      } else {
        reject(`Process exited with code ${code}.`);
        stream.stdin.end();
      }
    });
  });
};

getApproxSize('https://www.youtube.com/watch?v=6NVCkSZf91c').then((bytes: number): void => {
  console.log(`Approximate size: ${bytes}`);
}).catch((err): void => {
  console.error(err);
});

//const stream = download('https://www.youtube.com/watch?v=6NVCkSZf91c');

/*stream.on('progress', (progress: DownloadProgress): void => {
  console.log(progress);
});*/
