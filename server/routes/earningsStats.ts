import { Router } from 'express';
import { UnusualWhalesService } from '../services/unusualWhales';

const router = Router();
const uw = new UnusualWhalesService();

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function quantile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

router.get('/latest', async (req, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date : undefined;
  try {
    const [afterhours, premarket] = await Promise.all([
      uw.getEarningsAfterhours({ date }),
      uw.getEarningsPremarket({ date }),
    ]);

    const combined = [
      ...afterhours.map((r: any) => ({ ...r, report_time: r.report_time || 'postmarket' })),
      ...premarket.map((r: any) => ({ ...r, report_time: r.report_time || 'premarket' })),
    ];

    const results: any[] = [];
    for (const item of combined) {
      const ticker = item.symbol;
      const history = await uw.getHistoricalEarnings(ticker);
      const moves = history
        .map((h: any) => parseFloat(h.post_earnings_move_1d))
        .filter((n: number) => Number.isFinite(n));
      const longStr = history
        .map((h: any) => parseFloat(h.long_straddle_1d))
        .filter((n: number) => Number.isFinite(n));
      const shortStr = history
        .map((h: any) => parseFloat(h.short_straddle_1d))
        .filter((n: number) => Number.isFinite(n));

      results.push({
        ticker,
        report_date: item.report_date,
        report_time: item.report_time,
        actual_eps: parseFloat(item.actual_eps),
        expected_move: parseFloat(item.expected_move),
        expected_move_perc: parseFloat(item.expected_move_perc),
        pre_earnings_close: parseFloat(item.pre_earnings_close),
        post_earnings_close: parseFloat(item.post_earnings_close),
        reaction: parseFloat(item.reaction),
        sector: item.sector,
        marketcap: parseFloat(item.marketcap),
        is_sp500: item.is_s_p_500,
        median_move_1d: median(moves),
        q1_move_1d: quantile(moves, 0.25),
        q3_move_1d: quantile(moves, 0.75),
        long_straddle_median_1d: median(longStr),
        short_straddle_median_1d: median(shortStr),
      });
    }

    res.json({ data: results });
  } catch (err) {
    console.error('Failed to fetch earnings stats', err);
    res.status(500).json({ error: 'Failed to fetch earnings stats' });
  }
});

export default router;
