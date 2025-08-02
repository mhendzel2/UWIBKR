import { Router } from 'express';

/**
 * Earnings-based options screener.
 *
 * Implements multi-step process:
 * 1. Fetch upcoming earnings within a window.
 * 2. For each ticker, fetch options flow summary and filter by minimum volume and other criteria.
 * 3. For tickers passing step 2, check short-dated ATM implied volatility.
 *
 * All external requests use the Unusual Whales API and require
 * `process.env.UNUSUAL_WHALES_API_KEY` to be defined.
 */

interface EarningsEvent {
  ticker?: string;
  symbol?: string;
  report_date?: string;
  earnings_date?: string;
}

interface OptionsTrade {
  premium?: number;
}

interface OptionsSummary {
  total_volume?: number;
  avg_30day_volume?: number;
  put_call_premium_ratio?: number;
  trades?: OptionsTrade[];
}

interface ChainOption {
  expiration: string;
  strike: number;
  implied_volatility?: number;
}

interface ChainResponse {
  expirations?: string[];
  options?: ChainOption[];
  underlying_price?: number;
}

interface Candidate {
  ticker: string;
  earningsDate: string;
  totalVolume: number;
  avg30Volume: number;
  putCallPremiumRatio: number;
  largeTrades: number;
  atmIV: number;
}

const router = Router();

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

router.get('/earnings-screener', async (req, res) => {
  const {
    days = '5',
    minVolume = '1000',
    minLargeTrades = '5',
    largeTradePremium = '50000',
    volumeMultiplier = '3',
    minIvPercent = '90',
    bearishRatio = '2',
    bullishRatio = '0.5',
  } = req.query as Record<string, string>;

  const start = new Date();
  const end = new Date(start.getTime() + parseInt(days) * 24 * 60 * 60 * 1000);

  try {
    // Step 1: fetch upcoming earnings
    const earningsResp = await fetch(
      `https://api.unusualwhales.com/api/reference/earnings_calendar?start=${formatDate(start)}&end=${formatDate(end)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const earningsData = (await earningsResp.json()) as {
      data?: EarningsEvent[];
    };
    const events = earningsData.data ?? [];

    const candidates: Candidate[] = [];

    for (const event of events) {
      const ticker = event.ticker || event.symbol;
      if (!ticker) continue;

      // Step 2: options summary for ticker
      const summaryResp = await fetch(
        `https://api.unusualwhales.com/api/options/summary_for_ticker/${ticker}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!summaryResp.ok) continue;
      const summary = (await summaryResp.json()) as OptionsSummary;

      const totalVolume = summary.total_volume ?? 0;
      const avg30 = summary.avg_30day_volume ?? 0;
      const putCallRatio = summary.put_call_premium_ratio ?? 0;
      const trades = summary.trades ?? [];

      const largeTrades = trades.filter(
        (t: OptionsTrade) => (t.premium ?? 0) >= parseFloat(largeTradePremium),
      );

      const volumeOk =
        totalVolume > parseInt(minVolume) &&
        totalVolume > parseFloat(volumeMultiplier) * avg30;
      const ratioOk =
        putCallRatio < parseFloat(bullishRatio) ||
        putCallRatio > parseFloat(bearishRatio);
      const largeTradesOk = largeTrades.length >= parseInt(minLargeTrades);

      if (!volumeOk || !ratioOk || !largeTradesOk) continue;

      // Step 3: check implied volatility
      const chainResp = await fetch(
        `https://api.unusualwhales.com/api/options/chain/${ticker}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (!chainResp.ok) continue;
      const chain = (await chainResp.json()) as ChainResponse;

      let earningsDate: Date | null = null;
      if (event.report_date && !isNaN(new Date(event.report_date).getTime())) {
        earningsDate = new Date(event.report_date);
      } else if (event.earnings_date && !isNaN(new Date(event.earnings_date).getTime())) {
        earningsDate = new Date(event.earnings_date);
      } else {
        continue; // Skip if no valid date
      }
      const expirations = chain.expirations ?? [];
      const targetExp = expirations
        .map((e) => new Date(e))
        .filter((d) => d >= earningsDate!)
        .sort((a, b) => a.getTime() - b.getTime())[0];
      if (!targetExp) continue;

      const options = chain.options ?? [];
      const underlying = chain.underlying_price ?? 0;
      let atmIV = 0;
      let bestDiff = Infinity;
      for (const opt of options) {
        if (opt.expiration !== formatDate(targetExp)) continue;
        const diff = Math.abs(opt.strike - underlying);
        if (diff < bestDiff) {
          bestDiff = diff;
          atmIV = opt.implied_volatility ?? 0;
        }
      }

      if (atmIV * 100 < parseFloat(minIvPercent)) continue;

      candidates.push({
        ticker,
        earningsDate: formatDate(earningsDate),
        totalVolume,
        avg30Volume: avg30,
        putCallPremiumRatio: putCallRatio,
        largeTrades: largeTrades.length,
        atmIV: atmIV * 100,
      });
    }

    res.json({ success: true, total: candidates.length, candidates });
  } catch (err) {
    console.error('earnings screener error', err);
    res.status(500).json({
      success: false,
      error: 'Failed to run earnings screener',
      details: err instanceof Error ? { name: err.name, message: err.message } : String(err),
    });
  }
});

export default router;

