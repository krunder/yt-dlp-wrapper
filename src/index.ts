import path from 'path';
import { cwd } from 'process';
import { ChildProcessWithoutNullStreams, spawn, exec } from 'child_process';
import kill from 'tree-kill';
import { EOL } from 'os';
import PQueue from 'p-queue';
import DownloadEventEmitter, { DownloadProgress } from './events/DownloadEventEmitter.js';
import { EventEmitter } from './events/EventEmitter.js';

interface SpawnProcessOptions {
  onError?: (message: string, data?: Buffer) => void
  onOutput?: (data: Buffer, stream: ChildProcessWithoutNullStreams) => void;
  onComplete?: (stream: ChildProcessWithoutNullStreams) => void;
}

const CHUNK_SIZE = 5;

const PROGRESS_REGEX = /^\[download\]\s*([0-9]+\.?[0-9]*)%\s*of\s*([0-9]+\.?[0-9]*)([a-zA-Z]+)\s*at\s*([0-9]+\.?[0-9]*)([a-zA-Z]+)\/s\s*ETA\s*([0-9]+:?[0-9]*)$/;
const ALREADY_DOWNLOADED_REGEX = /^\[download\]\s*(.+)\s*has\s*already\s*been\s*downloaded\s*$/

const defaultParams = [
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

const getVideoCount = (url: string): Promise<number> => {
  const params = [
    '--simulate',
    '-O',
    `%(playlist_count)s`,
    url,
  ];

  let count = 0;

  return new Promise((resolve, reject): void => {
    const onOutput = (data: Buffer, process: ChildProcessWithoutNullStreams): void => {
      count = Number(data.toString().trim()) || 1;

      if (process.pid) {
        kill(process.pid, 'SIGINT');
      }
    };

    const onError = (message: string): void => reject(message);
    const onComplete = (): void => resolve(count);

    spawnProcess(params, { onOutput, onError, onComplete });
  });
};

const download = (url: string): DownloadEventEmitter => {
  const emitter = new DownloadEventEmitter();

  // TODO: Remove requirement of loading the video count before downloading
  getVideoCount(url)
    .then((count: number): void => {
      const queue = new PQueue({
        concurrency: 1,
        autoStart: false,
      });

      for (let i = 1; i <= count; i++) {
        queue.add(async (): Promise<void> => {
          try {
            await downloadChunk(url, i, i);
          } catch (err: any) {
            console.error(err);
            throw new Error(err);
          }
        });
      }

      queue.start();

      queue.on('idle', (): void => {});
    })
    .catch((err: any): void => { console.log(err); });

  return emitter;
};

const getInfo = (url: string): Promise<any> => {
  // TODO: Remove requirement of loading the video count before retrieving info
  return getVideoCount(url)
    .then((count: number): Promise<any> => {
      let info: any[] = [];

      const queue = new PQueue({
        concurrency: 5,
        autoStart: false,
      });

      const maxTasks = count / CHUNK_SIZE;

      for (let i = 0; i < maxTasks; i++) {
        const startIndex = (i * CHUNK_SIZE) + 1;
        const endIndex = (i + 1) * CHUNK_SIZE;

        queue.add(async (): Promise<void> => {
          const infoChunk = await getInfoChunk(url, startIndex, endIndex);
          info = [...info, ...infoChunk];
        });
      }

      queue.start();

      return new Promise((resolve, reject): void => {
        queue.on('idle', (): void => resolve(info));
      });
    });
};

const downloadChunk = (url: string, startIndex: number = 1, endIndex: number = 0): Promise<void> => {
  const params = [
    ...defaultParams,
    '--playlist-start',
    startIndex.toString(),
    '--playlist-end',
    (endIndex > 0 ? endIndex.toString() : 'last'),
    '-o',
    path.join(cwd(), 'tmp', '%(title)s.%(ext)s'),
    url,
  ];

  return new Promise((resolve, reject): void => {
    const onOutput = (data: Buffer): void => {
      const lines: string[] = data.toString().split(/(?:\r\n|\r|\n)/g);

      for (let line of lines) {
        const matches = PROGRESS_REGEX.exec(line.trim());

        if (matches) {
          const event = {
            percent: Number(matches[1]),
            totalSize: Number(matches[2]),
            totalSizeUnit: matches[3],
            currentRate: Number(matches[4]),
            currentRateUnit: matches[5],
            estimatedTime: matches[6],
          };

          console.log(event);
        }
      }
    };

    spawnProcess(params, {
      onOutput,
      onComplete: (): void => resolve(),
      onError: (message: string, data?: Buffer): void => reject(data.toString()),
    });
  });
};

const getInfoChunk = (url: string, startIndex: number = 1, endIndex: number = 0): Promise<any[]> => {
  const info: any[] = [];

  const params = [
    '--simulate',
    '--dump-json',
    '--playlist-start',
    startIndex.toString(),
    '--playlist-end',
    (endIndex > 0 ? endIndex.toString() : 'last'),
    url,
  ];

  return new Promise((resolve, reject): void => {
    const onOutput = (data: Buffer): void => {
      const json = JSON.parse(data.toString().trim());
      info.push(json);
    };

    spawnProcess(params, {
      onOutput,
      onComplete: (): void => resolve(info),
      onError: (message: string, data?: Buffer): void => reject(message),
    });
  });
};

const spawnProcess = (params: any, options: SpawnProcessOptions = {}): ChildProcessWithoutNullStreams => {
  const process = spawn(executablePath, [...defaultParams, ...params]);

  const { onError, onOutput, onComplete } = options;

  process.stdout.on('data', (data: Buffer): void => {
    if (typeof onOutput === 'function') {
      onOutput(data, process);
    }
  });

  process.stderr.on('data', (data: Buffer): void => {
    process.stdin.end();

    if (typeof onError === 'function') {
      onError('Process failed due to unknown error.', data);
    }
  });

  process.on('exit', (code: number): void => {
    process.stdin.end();

    // TODO: Investigate alternatives to having exit code 1 returned when kill() is used
    if ([0, 1].indexOf(code) !== -1) {
      if (typeof onComplete === 'function') {
        onComplete(process);
      }
    } else {
      if (typeof onError === 'function') {
        onError(`Process exited with code ${code}.`);
      }
    }
  });

  return process;
};

// https://www.youtube.com/playlist?list=PLlrATfBNZ98dudnM48yfGUldqGD0S4FFb - 101 items
// https://www.youtube.com/playlist?list=PLrLBbJnregxdViIXPShNRphM2DPNYn5o6 - 8 items
// https://www.youtube.com/watch?v=6NVCkSZf91c - 1 item
download('https://www.youtube.com/playlist?list=PLlrATfBNZ98dudnM48yfGUldqGD0S4FFb');

//const stream = download('https://www.youtube.com/watch?v=6NVCkSZf91c');

/*stream.on('progress', (progress: DownloadProgress): void => {
  console.log(progress);
});*/
