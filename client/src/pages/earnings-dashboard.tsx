import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiRequest } from '@/lib/queryClient';

interface Candidate {
  ticker: string;
  earningsDate: string;
  totalVolume: number;
  avg30Volume: number;
  putCallPremiumRatio: number;
  largeTrades: number;
  atmIV: number;
}

interface EarningsRecord {
  ticker: string;
  report_date: string;
  report_time: string;
  actual_eps: number;
  expected_move: number;
  expected_move_perc: number;
  pre_earnings_close: number;
  post_earnings_close: number;
  reaction: number;
  sector: string;
  marketcap: number;
  is_sp500: boolean;
  median_move_1d: number | null;
  q1_move_1d: number | null;
  q3_move_1d: number | null;
  long_straddle_median_1d: number | null;
  short_straddle_median_1d: number | null;
}

interface ScreenerResponse {
  candidates: Candidate[];
}

export default function EarningsDashboardPage() {
  const { data } = useQuery<ScreenerResponse>({
    queryKey: [
      '/api/options/earnings-screener?days=14&minVolume=500&exchanges=NASDAQ,NYSE',
    ],
  });

  const [gex, setGex] = useState<Record<string, number>>({});

  const { data: earnings } = useQuery<{ data: EarningsRecord[] }>({
    queryKey: ['/api/earnings/latest'],
  });

  async function fetchGex() {
    if (!data?.candidates) return;
    const updates: Record<string, number> = {};
    for (const c of data.candidates) {
      try {
        const res = await apiRequest('GET', `/api/gex/levels?symbol=${c.ticker}`);
        const json = await res.json();
        if (typeof json?.netGamma === 'number') {
          updates[c.ticker] = json.netGamma;
        }
      } catch {
        // ignore errors for individual tickers
      }
    }
    setGex(updates);
  }

  useEffect(() => {
    fetchGex();
    const id = setInterval(fetchGex, 60 * 60 * 1000); // hourly
    return () => clearInterval(id);
  }, [data]);

  const rows =
    data?.candidates.filter((c) => new Date(c.earningsDate) > new Date()) || [];

  function expectedMoveClass(row: EarningsRecord) {
    if (row.q1_move_1d == null || row.q3_move_1d == null) return '';
    if (row.expected_move_perc > row.q3_move_1d) return 'text-red-600';
    if (row.expected_move_perc < row.q1_move_1d) return 'text-green-600';
    return 'text-yellow-600';
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Recent Earnings Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead className="text-right">Market Cap</TableHead>
                <TableHead className="text-center">S&P 500</TableHead>
                <TableHead>Report Time</TableHead>
                <TableHead className="text-right">Actual EPS</TableHead>
                <TableHead className="text-right">Exp Move $</TableHead>
                <TableHead className="text-right">Exp Move %</TableHead>
                <TableHead className="text-right">Pre Close</TableHead>
                <TableHead className="text-right">Post Close</TableHead>
                <TableHead className="text-right">Reaction %</TableHead>
                <TableHead className="text-right">Hist Median Move%</TableHead>
                <TableHead className="text-right">Long Straddle 1d</TableHead>
                <TableHead className="text-right">Short Straddle 1d</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {earnings?.data.map((r) => (
                <TableRow key={`${r.ticker}-${r.report_date}`}>
                  <TableCell className="font-medium">{r.ticker}</TableCell>
                  <TableCell>{r.sector}</TableCell>
                  <TableCell className="text-right">
                    {r.marketcap.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.is_sp500 ? 'Yes' : 'No'}
                  </TableCell>
                  <TableCell>{r.report_time}</TableCell>
                  <TableCell className="text-right">
                    {r.actual_eps?.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.expected_move?.toFixed(2)}
                  </TableCell>
                  <TableCell className={`text-right ${expectedMoveClass(r)}`}>
                    {(r.expected_move_perc * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {r.pre_earnings_close?.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.post_earnings_close?.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {(r.reaction * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {r.median_move_1d != null
                      ? (r.median_move_1d * 100).toFixed(2)
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.long_straddle_median_1d != null
                      ? r.long_straddle_median_1d.toFixed(4)
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.short_straddle_median_1d != null
                      ? r.short_straddle_median_1d.toFixed(4)
                      : 'N/A'}
                  </TableCell>
                </TableRow>
              )) || (
                <TableRow>
                  <TableCell colSpan={14} className="text-center">
                    No data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Earnings Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead>Earnings Date</TableHead>
                <TableHead className="text-right">Volume</TableHead>
                <TableHead className="text-right">Put/Call Premium</TableHead>
                <TableHead className="text-right">Large Trades</TableHead>
                <TableHead className="text-right">ATM IV%</TableHead>
                <TableHead className="text-right">Net GEX</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.ticker}>
                  <TableCell className="font-medium">{c.ticker}</TableCell>
                  <TableCell>{c.earningsDate}</TableCell>
                  <TableCell className="text-right">
                    {c.totalVolume.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.putCallPremiumRatio.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">{c.largeTrades}</TableCell>
                  <TableCell className="text-right">{c.atmIV.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {gex[c.ticker]?.toFixed(0) ?? 'N/A'}
                  </TableCell>
                </TableRow>
              )) || (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No candidates found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

