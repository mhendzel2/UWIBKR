import { appendFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const filePath = path.join(dataDir, 'ml-training.jsonl');

function ensureFile() {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  if (!existsSync(filePath)) {
    appendFileSync(filePath, '');
  }
}

export function storeSignal(signal: any) {
  ensureFile();
  appendFileSync(filePath, JSON.stringify({ type: 'signal', data: signal, timestamp: new Date().toISOString() }) + '\n');
}

export function storeTicker(ticker: any) {
  ensureFile();
  appendFileSync(filePath, JSON.stringify({ type: 'ticker', data: ticker, timestamp: new Date().toISOString() }) + '\n');
}

export function storeTrade(trade: any) {
  ensureFile();
  appendFileSync(filePath, JSON.stringify({ type: 'trade', data: trade, timestamp: new Date().toISOString() }) + '\n');
}
