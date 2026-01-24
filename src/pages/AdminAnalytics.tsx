import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users, TrendingUp, BarChart3, MapPin, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

interface AnalyticsData {
  totalRegistrations: number;
  totalAttendances: number;
  attendanceRate: number;
  repeatRate: number;
  repeatUsers: number;
  totalActiveUsers: number;
  byRegion: { region: string; registrations: number; attendances: number }[];
  byCategory: { category: string; registrations: number; attendances: number }[];
  monthlyTrend: { month: string; registrations: number; attendances: number }[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--info))", "hsl(var(--secondary))"];

const CATEGORY_LABELS: Record<string, string> = {
  "active_ageing": "Active Ageing",
  "social": "Social",
  "health_education": "Health Education",
  "digital_literacy": "Digital Literacy"
};

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"30" | "90" | "365">("30");
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    const startDateStr = startDate.toISOString();

    try {
      // Fetch signups with programme details
      const { data: signups, error: signupsError } = await supabase
        .from("user_programme_signups")
        .select(`
          id,
          kiosk_user_id,
          status,
          signed_up_at,
          attended_at,
          programme_id,
          community_programmes (
            category,
            region
          )
        `)
        .gte("signed_up_at", startDateStr);

      if (signupsError) throw signupsError;

      // Calculate metrics
      const totalRegistrations = signups?.length || 0;
      const attended = signups?.filter(s => s.status === "attended") || [];
      const totalAttendances = attended.length;
      const attendanceRate = totalRegistrations > 0 
        ? Math.round((totalAttendances / totalRegistrations) * 100) 
        : 0;

      // Repeat rate: users with 2+ attendances in period
      const userAttendanceCounts: Record<string, number> = {};
      attended.forEach(s => {
        userAttendanceCounts[s.kiosk_user_id] = (userAttendanceCounts[s.kiosk_user_id] || 0) + 1;
      });
      const repeatUsers = Object.values(userAttendanceCounts).filter(count => count >= 2).length;
      const totalActiveUsers = Object.keys(userAttendanceCounts).length;
      const repeatRate = totalActiveUsers > 0 
        ? Math.round((repeatUsers / totalActiveUsers) * 100) 
        : 0;

      // By region
      const regionMap: Record<string, { registrations: number; attendances: number }> = {};
      signups?.forEach(s => {
        const region = (s.community_programmes as any)?.region || "Unknown";
        if (!regionMap[region]) regionMap[region] = { registrations: 0, attendances: 0 };
        regionMap[region].registrations++;
        if (s.status === "attended") regionMap[region].attendances++;
      });
      const byRegion = Object.entries(regionMap).map(([region, stats]) => ({
        region,
        ...stats
      }));

      // By category
      const categoryMap: Record<string, { registrations: number; attendances: number }> = {};
      signups?.forEach(s => {
        const category = (s.community_programmes as any)?.category || "other";
        if (!categoryMap[category]) categoryMap[category] = { registrations: 0, attendances: 0 };
        categoryMap[category].registrations++;
        if (s.status === "attended") categoryMap[category].attendances++;
      });
      const byCategory = Object.entries(categoryMap).map(([category, stats]) => ({
        category: CATEGORY_LABELS[category] || category,
        ...stats
      }));

      // Monthly trend (last 6 months)
      const monthlyMap: Record<string, { registrations: number; attendances: number }> = {};
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      signups?.forEach(s => {
        const date = new Date(s.signed_up_at);
        const monthKey = `${months[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
        if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { registrations: 0, attendances: 0 };
        monthlyMap[monthKey].registrations++;
        if (s.status === "attended") monthlyMap[monthKey].attendances++;
      });
      const monthlyTrend = Object.entries(monthlyMap)
        .map(([month, stats]) => ({ month, ...stats }))
        .slice(-6);

      setData({
        totalRegistrations,
        totalAttendances,
        attendanceRate,
        repeatRate,
        repeatUsers,
        totalActiveUsers,
        byRegion,
        byCategory,
        monthlyTrend
      });
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const chartConfig = {
    registrations: { label: "Registrations", color: "hsl(var(--primary))" },
    attendances: { label: "Attendances", color: "hsl(var(--success))" }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Impact Analytics</h1>
              <p className="text-sm text-muted-foreground">Programme performance and engagement metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as "30" | "90" | "365")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchAnalytics} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Registrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                {loading ? "..." : data?.totalRegistrations.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Attendance Rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-success">
                {loading ? "..." : `${data?.attendanceRate}%`}
              </p>
              <p className="text-xs text-muted-foreground">
                {data?.totalAttendances} attended
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Repeat Rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-warning">
                {loading ? "..." : `${data?.repeatRate}%`}
              </p>
              <p className="text-xs text-muted-foreground">
                {data?.repeatUsers} of {data?.totalActiveUsers} users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Regions Active
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-info">
                {loading ? "..." : data?.byRegion.length}
              </p>
              <p className="text-xs text-muted-foreground">
                of 5 CCN regions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="region" className="space-y-4">
          <TabsList>
            <TabsTrigger value="region">By Region</TabsTrigger>
            <TabsTrigger value="category">By Category</TabsTrigger>
            <TabsTrigger value="trend">Monthly Trend</TabsTrigger>
          </TabsList>

          <TabsContent value="region">
            <Card>
              <CardHeader>
                <CardTitle>Uptake by Region</CardTitle>
                <CardDescription>Registrations and attendances across CCN regions</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.byRegion.length ? (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={data.byRegion} layout="vertical">
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="region" width={80} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="registrations" fill="hsl(var(--primary))" radius={4} />
                      <Bar dataKey="attendances" fill="hsl(var(--success))" radius={4} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">No data for selected period</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="category">
            <Card>
              <CardHeader>
                <CardTitle>Uptake by Category</CardTitle>
                <CardDescription>Programme participation by type</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.byCategory.length ? (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={data.byCategory}>
                      <XAxis dataKey="category" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="registrations" fill="hsl(var(--primary))" radius={4} />
                      <Bar dataKey="attendances" fill="hsl(var(--success))" radius={4} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">No data for selected period</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trend</CardTitle>
                <CardDescription>Registration and attendance over time</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.monthlyTrend.length ? (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <LineChart data={data.monthlyTrend}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="registrations" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="attendances" 
                        stroke="hsl(var(--success))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--success))" }}
                      />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12">No data for selected period</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>Regional Breakdown</CardTitle>
            <CardDescription>Detailed metrics per region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Region</th>
                    <th className="text-right py-3 px-2 font-medium">Registrations</th>
                    <th className="text-right py-3 px-2 font-medium">Attendances</th>
                    <th className="text-right py-3 px-2 font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.byRegion.map((row) => (
                    <tr key={row.region} className="border-b border-border/50">
                      <td className="py-3 px-2">{row.region}</td>
                      <td className="text-right py-3 px-2">{row.registrations}</td>
                      <td className="text-right py-3 px-2">{row.attendances}</td>
                      <td className="text-right py-3 px-2 text-success font-medium">
                        {row.registrations > 0 
                          ? Math.round((row.attendances / row.registrations) * 100) 
                          : 0}%
                      </td>
                    </tr>
                  ))}
                  {(!data?.byRegion.length) && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-muted-foreground">
                        No data for selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminAnalytics;
