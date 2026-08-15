/**
 * Child-process helper with abort support and PID reporting.
 *
 * Cancellation matters here: encodes take seconds (measured ~11s for a 10s 720p
 * capture), so a user who discards mid-encode must not leave orphaned children
 * chewing CPU. Windows and POSIX differ in how a process tree is killed, so the
 * platform split is explicit rather than assumed.
 */
import { spawn } from 'node:child_process';
import { AbortError, EncodeError } from './types.js';

export interface RunResult {
  stdout: string;
  stderr: string;
}

/** PIDs spawned by the in-flight encode, exposed so tests can assert they die. */
export const livePids = new Set<number>();

function killTree(pid: number): void {
  try {
    if (process.platform === 'win32') {
      // Windows has no process groups; taskkill walks the tree instead.
      spawn('taskkill', ['/pid', String(pid), '/f', '/t'], { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGKILL');
    }
  } catch {
    // Already dead — the only outcome we wanted anyway.
  }
}

export function run(
  binary: string,
  args: string[],
  opts: { signal?: AbortSignal; label: string } = { label: 'process' },
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) {
      reject(new AbortError());
      return;
    }

    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let aborted = false;

    if (child.pid !== undefined) livePids.add(child.pid);

    const onAbort = () => {
      aborted = true;
      if (child.pid !== undefined) killTree(child.pid);
    };
    opts.signal?.addEventListener('abort', onAbort, { once: true });

    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });

    const finish = () => {
      if (child.pid !== undefined) livePids.delete(child.pid);
      opts.signal?.removeEventListener('abort', onAbort);
    };

    child.on('error', (err) => {
      finish();
      reject(new EncodeError(`${opts.label} failed to start: ${err.message}`, stderr, null));
    });

    child.on('close', (code) => {
      finish();
      if (aborted) {
        reject(new AbortError());
      } else if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new EncodeError(`${opts.label} exited with code ${code}`, stderr, code));
      }
    });
  });
}
