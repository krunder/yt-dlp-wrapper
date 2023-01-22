import path from 'path';
import { cwd } from 'process';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import kill from 'tree-kill';
import bytes from 'bytes';
import PQueue from 'p-queue';
import DownloadEventEmitter, { DownloadProgress } from './events/DownloadEventEmitter.js';

interface SpawnProcessOptions {
  onError?: (message: string, data?: Buffer) => void
  onOutput?: (data: Buffer, stream: ChildProcessWithoutNullStreams) => void;
  onComplete?: (stream: ChildProcessWithoutNullStreams) => void;
}

interface YTDLPVersion {
  version: string;
  current_git_head: string | null;
  release_git_head: string | null;
  repository: string;
}

interface VideoFormatFragment {
  url: string;
  duration: number;
}

interface HTTPHeaders {
  [key: string]: string;
}

interface VideoDownloaderOptions {
  http_chunk_size?: number;
}

interface VideoFormat {
  format_id: string;
  format_note: string;
  ext: string;
  protocol: string;
  acodec: string;
  vcodec: string;
  url: string;
  width: number;
  height: number;
  fps: number;
  rows: number;
  columns: number;
  fragments: VideoFormatFragment[];
  audio_ext: string;
  video_ext: string;
  format: string;
  resolution: string;
  aspect_ratio: number;
  http_headers: HTTPHeaders;
}

interface VideoRequestedFormat extends VideoFormat {
  asr: number | null;
  filesize: number;
  source_preference: number;
  audio_channels: number | null;
  quality: number;
  has_drm: boolean;
  tbr: number;
  language: string | null;
  language_preference: number;
  preference: number | null;
  dynamic_range: string;
  vbr: number;
  downloader_options: VideoDownloaderOptions;
  container: string;
}

interface VideoThumbnail {
  url: string;
  preference: number;
  id: string;
}

interface VideoSubtitle {
  ext: string;
  url: string;
  name: string;
}

interface VideoSubtitles {
  [key: string]: VideoSubtitle[];
}

interface VideoChapter {
  start_time: number;
  end_time: number;
  title: string;
}

export interface VideoDetails {
  id: string;
  title: string;
  formats: VideoFormat[];
  thumbnails: VideoThumbnail[];
  thumbnail: string;
  description: string;
  uploader: string;
  uploader_id: string;
  uploader_url: string;
  channel_id: string;
  channel_url: string;
  duration: number;
  view_count: number;
  average_rating: number | null;
  age_limit: number;
  webpage_url: string;
  categories: string[];
  tags: string[];
  playable_in_embed: boolean;
  live_status: string;
  release_timestamp: number | null;
  _format_sort_fields: string[];
  automatic_captions: VideoSubtitles,
  subtitles: VideoSubtitles,
  comment_count: number;
  chapters: VideoChapter[];
  like_count: number;
  channel: string;
  channel_follower_count: number;
  upload_date: string;
  availability: string;
  original_url: string;
  webpage_url_basename: string;
  webpage_url_domain: string;
  extractor: string;
  extractor_key: string;
  playlist_count: number;
  playlist: string;
  playlist_id: string;
  playlist_title: string;
  playlist_uploader: string;
  playlist_uploader_id: string;
  n_entries: number;
  playlist_index: number;
  __last_playlist_index: number;
  playlist_autonumber: number;
  display_id: string;
  fulltitle: string;
  duration_string: string;
  is_live: boolean;
  was_live: boolean;
  requested_subtitles: VideoSubtitles,
  _has_drm: boolean | null;
  requested_formats: VideoRequestedFormat[];
  format: string;
  format_id: string;
  ext: string;
  protocol: string;
  language: string | null;
  format_note: string;
  filesize_approx: number;
  tbr: number;
  width: number;
  height: number;
  resolution: string;
  fps: number;
  dynamic_range: string;
  vcodec: string;
  vbr: number;
  stretched_ratio: number | null;
  aspect_ratio: number | null;
  acodec: string;
  abr: number;
  asr: number;
  audio_channels: number;
  epoch: number;
  _filename: string;
  filename: string;
  urls: string;
  _type: string;
  _version: YTDLPVersion;
}

const CHUNK_SIZE = 5;

const PROGRESS_REGEX = /^\[download\]\s*([0-9]+\.?[0-9]*)%\s*of\s*([0-9]+\.?[0-9]*)([a-zA-Z]+)\s*at\s*([0-9]+\.?[0-9]*)([a-zA-Z]+)\/s\s*ETA\s*([0-9]+:?[0-9]*)$/;
// const ALREADY_DOWNLOADED_REGEX = /^\[download\]\s*(.+)\s*has\s*already\s*been\s*downloaded\s*$/

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

const spawnProcess = (
  params: string[],
  options: SpawnProcessOptions = {},
): ChildProcessWithoutNullStreams => {
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
    } else if (typeof onError === 'function') {
      onError(`Process exited with code ${code}.`);
    }
  });

  return process;
};

const getVideoCount = (url: string): Promise<number> => {
  const params = [
    '--simulate',
    '-O',
    '%(playlist_count)s',
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

const downloadChunk = (
  url: string,
  emitter: DownloadEventEmitter,
  startIndex: number = 1,
  endIndex: number = 0,
): Promise<void> => {
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

  const onOutput = (data: Buffer): void => {
    const lines: string[] = data.toString().split(/(?:\r\n|\r|\n)/g);

    for (let i = 0; i < lines.length; i += 1) {
      const matches = PROGRESS_REGEX.exec(lines[i].trim());

      if (matches) {
        const totalSize = matches[2] + matches[3];
        const totalSizeBytes = bytes(totalSize.replace('i', ''));

        const speed = matches[4] + matches[5];

        const event: DownloadProgress = {
          currentIndex: endIndex,
          percent: Number(matches[1]),
          size: {
            current: totalSizeBytes * (Number(matches[1]) / 100),
            total: totalSizeBytes,
          },
          speed: bytes(speed.replace('i', '')),
          estimatedTime: matches[6],
        };

        emitter.emit('progress', event);
      }
    }
  };

  return new Promise((resolve, reject): void => {
    spawnProcess(params, {
      onOutput,
      onComplete: (): void => resolve(),
      onError: (message: string): void => reject(message),
    });
  });
};

const getDetailsChunk = (
  url: string,
  startIndex: number = 1,
  endIndex: number = 0,
): Promise<VideoDetails[]> => {
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

  const onOutput = (data: Buffer): void => {
    const json = JSON.parse(data.toString().trim());
    info.push(json);
  };

  return new Promise((resolve, reject): void => {
    spawnProcess(params, {
      onOutput,
      onComplete: (): void => resolve(info),
      onError: (message: string): void => reject(message),
    });
  });
};

export const download = (url: string): DownloadEventEmitter => {
  const emitter = new DownloadEventEmitter();

  getVideoCount(url)
    .then((count: number): void => {
      const queue = new PQueue({
        concurrency: 1,
        autoStart: false,
      });

      for (let i = 1; i <= count; i += 1) {
        queue.add(async (): Promise<void> => {
          try {
            await downloadChunk(url, emitter, i, i);
          } catch (err: any) {
            emitter.emit('error', err);
          }
        });
      }

      queue.start();

      queue.on('idle', (): void => {
        emitter.emit('complete');
      });
    })
    .catch((err: Error): void => { emitter.emit('error', err); });

  return emitter;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getDetails = (url: string): Promise<any> => {
  let details: VideoDetails[] = [];

  return getVideoCount(url)
    .then((count: number): Promise<VideoDetails[]> => {
      const queue = new PQueue({
        concurrency: 5,
        autoStart: false,
      });

      const maxTasks = count / CHUNK_SIZE;

      for (let i = 0; i < maxTasks; i += 1) {
        const startIndex = (i * CHUNK_SIZE) + 1;
        const endIndex = (i + 1) * CHUNK_SIZE;

        queue.add(async (): Promise<void> => {
          const chunk = await getDetailsChunk(url, startIndex, endIndex);
          details = [...details, ...chunk];
        });
      }

      queue.start();

      return new Promise((resolve, reject): void => {
        queue.on('idle', (): void => resolve(details));
        queue.on('error', (err: Error): void => reject(err));
      });
    });
};

// https://www.youtube.com/playlist?list=PLlrATfBNZ98dudnM48yfGUldqGD0S4FFb - 101 items
// https://www.youtube.com/playlist?list=PLrLBbJnregxdViIXPShNRphM2DPNYn5o6 - 8 items
// https://www.youtube.com/watch?v=6NVCkSZf91c - 1 item
download('https://www.youtube.com/playlist?list=PLlrATfBNZ98dudnM48yfGUldqGD0S4FFb');
