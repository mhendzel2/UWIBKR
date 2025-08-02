import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Settings,
  Database,
  Bell,
  Shield,
  DollarSign,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  ExternalLink
} from "lucide-react";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    signalAlerts: true,
    riskWarnings: true,
    executionUpdates: true,
    dailyReports: false
  });

  const [riskSettings, setRiskSettings] = useState({
    maxPositionSize: "10000",
    maxDailyRisk: "5000", 
    stopLossPercent: "15",
    maxDrawdown: "20"
  });

  const [apiConnections, setApiConnections] = useState({
    unusualWhales: "Connected",
    ibkrTws: "Connected", 
    geminiAi: "Not Connected"
  });

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="risk">Risk Management</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="api">API Connections</TabsTrigger>
          <TabsTrigger value="trading">Trading</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Preferences</CardTitle>
              <CardDescription>Configure your platform preferences and display settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="est">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="est">Eastern Standard Time</SelectItem>
                      <SelectItem value="pst">Pacific Standard Time</SelectItem>
                      <SelectItem value="cst">Central Standard Time</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select defaultValue="dark">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="refreshRate">Data Refresh Rate</Label>
                <Select defaultValue="5000">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1000">1 second</SelectItem>
                    <SelectItem value="5000">5 seconds</SelectItem>
                    <SelectItem value="10000">10 seconds</SelectItem>
                    <SelectItem value="30000">30 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Risk Management Settings
              </CardTitle>
              <CardDescription>Configure risk controls and position limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxPosition">Max Position Size ($)</Label>
                  <Input
                    id="maxPosition"
                    value={riskSettings.maxPositionSize}
                    onChange={(e) => setRiskSettings(prev => ({ ...prev, maxPositionSize: e.target.value }))}
                    placeholder="10000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxDaily">Max Daily Risk ($)</Label>
                  <Input
                    id="maxDaily"
                    value={riskSettings.maxDailyRisk}
                    onChange={(e) => setRiskSettings(prev => ({ ...prev, maxDailyRisk: e.target.value }))}
                    placeholder="5000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stopLoss">Stop Loss (%)</Label>
                  <Input
                    id="stopLoss"
                    value={riskSettings.stopLossPercent}
                    onChange={(e) => setRiskSettings(prev => ({ ...prev, stopLossPercent: e.target.value }))}
                    placeholder="15"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxDrawdown">Max Drawdown (%)</Label>
                  <Input
                    id="maxDrawdown"
                    value={riskSettings.maxDrawdown}
                    onChange={(e) => setRiskSettings(prev => ({ ...prev, maxDrawdown: e.target.value }))}
                    placeholder="20"
                  />
                </div>
              </div>
              <Button className="w-full">Update Risk Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Configure when and how you receive alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Signal Alerts</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications for new trading signals</p>
                  </div>
                  <Switch
                    checked={notifications.signalAlerts}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, signalAlerts: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Risk Warnings</Label>
                    <p className="text-sm text-muted-foreground">Get alerts for risk threshold breaches</p>
                  </div>
                  <Switch
                    checked={notifications.riskWarnings}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, riskWarnings: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Execution Updates</Label>
                    <p className="text-sm text-muted-foreground">Notifications for trade executions</p>
                  </div>
                  <Switch
                    checked={notifications.executionUpdates}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, executionUpdates: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Daily Reports</Label>
                    <p className="text-sm text-muted-foreground">Daily performance summaries</p>
                  </div>
                  <Switch
                    checked={notifications.dailyReports}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, dailyReports: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                API Connections
              </CardTitle>
              <CardDescription>Manage external service connections and API keys</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold">Unusual Whales API</h3>
                      <p className="text-sm text-muted-foreground">Options flow data provider</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {apiConnections.unusualWhales}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold">Interactive Brokers TWS</h3>
                      <p className="text-sm text-muted-foreground">Trading and market data platform</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {apiConnections.ibkrTws}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Settings className="h-8 w-8 text-purple-600" />
                    <div>
                      <h3 className="font-semibold">Google Gemini AI</h3>
                      <p className="text-sm text-muted-foreground">AI analysis and sentiment processing</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {apiConnections.geminiAi}
                    </Badge>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trading" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trading Configuration</CardTitle>
              <CardDescription>Configure trading execution and automation settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Execute Signals</Label>
                    <p className="text-sm text-muted-foreground">Automatically execute approved signals</p>
                  </div>
                  <Switch defaultChecked={false} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Human Approval Required</Label>
                    <p className="text-sm text-muted-foreground">Require manual approval for all trades</p>
                  </div>
                  <Switch defaultChecked={true} />
                </div>
                <div className="space-y-2">
                  <Label>Default Order Type</Label>
                  <Select defaultValue="limit">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="market">Market</SelectItem>
                      <SelectItem value="limit">Limit</SelectItem>
                      <SelectItem value="stop">Stop</SelectItem>
                      <SelectItem value="stop-limit">Stop Limit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Position Size (%)</Label>
                  <Select defaultValue="2">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1% of portfolio</SelectItem>
                      <SelectItem value="2">2% of portfolio</SelectItem>
                      <SelectItem value="5">5% of portfolio</SelectItem>
                      <SelectItem value="10">10% of portfolio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}