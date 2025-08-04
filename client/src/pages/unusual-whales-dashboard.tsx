import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnusualWhalesDashboardPage() {
  const { data: oiDelta } = useQuery<any>({ queryKey: ['/api/unusual-whales/open-interest-delta'] });
  const { data: darkPool } = useQuery<any>({ queryKey: ['/api/unusual-whales/dark-pool-scans'] });
  const { data: multileg } = useQuery<any>({ queryKey: ['/api/unusual-whales/multileg'] });
  const { data: sectorRotation } = useQuery<any>({ queryKey: ['/api/unusual-whales/sector-rotation'] });
  const { data: volStats } = useQuery<any>({ queryKey: ['/api/unusual-whales/volatility/stats', 'SPY'] });
  const { data: volTerm } = useQuery<any>({ queryKey: ['/api/unusual-whales/volatility/term-structure', 'SPY'] });

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">Unusual Whales Data</h1>

      <Card>
        <CardHeader><CardTitle>Open Interest Delta</CardTitle></CardHeader>
        <CardContent>
          <pre className="overflow-auto text-xs">{JSON.stringify(oiDelta, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dark Pool Scans</CardTitle></CardHeader>
        <CardContent>
          <pre className="overflow-auto text-xs">{JSON.stringify(darkPool, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Multileg Strategies</CardTitle></CardHeader>
        <CardContent>
          <pre className="overflow-auto text-xs">{JSON.stringify(multileg, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sector Rotation</CardTitle></CardHeader>
        <CardContent>
          <pre className="overflow-auto text-xs">{JSON.stringify(sectorRotation, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Volatility Stats (SPY)</CardTitle></CardHeader>
        <CardContent>
          <pre className="overflow-auto text-xs">{JSON.stringify(volStats, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Volatility Term Structure (SPY)</CardTitle></CardHeader>
        <CardContent>
          <pre className="overflow-auto text-xs">{JSON.stringify(volTerm, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
