import { execFile } from 'child_process';

export async function getChannelSignals(tickers: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const args = ['-m', 'trading.main', ...tickers];
    execFile('python', args, { cwd: process.cwd(), maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }
      try {
        const data = JSON.parse(stdout.toString());
        resolve(data);
      } catch (e) {
        reject(e);
      }
    });
  });
}
