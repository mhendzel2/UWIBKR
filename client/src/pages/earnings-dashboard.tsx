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

  return (
    <div className="p-6 space-y-4">
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

