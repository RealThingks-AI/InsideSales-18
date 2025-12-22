import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, Briefcase, TrendingUp, Activity, DollarSign, BarChart3, PieChart as PieChartIcon, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
interface Account {
  id: string;
  company_name: string;
  status?: string;
  segment?: string;
  score?: number;
  industry?: string;
  region?: string;
}
export const AccountAnalyticsDashboard = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchAccounts();
  }, []);
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('accounts').select('id, company_name, status, segment, score, industry, region').order('company_name');
      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalAccounts = accounts.length;
    const avgScore = accounts.length > 0 ? Math.round(accounts.reduce((sum, a) => sum + (a.score || 0), 0) / accounts.length) : 0;
    const activeAccounts = accounts.filter(a => a.status === 'Active').length;
    const newAccounts = accounts.filter(a => a.status === 'New').length;
    return {
      totalAccounts,
      avgScore,
      activeAccounts,
      newAccounts
    };
  }, [accounts]);

  // Segment distribution
  const segmentData = useMemo(() => {
    const segments: Record<string, number> = {};
    accounts.forEach(a => {
      const seg = a.segment || 'Prospect';
      segments[seg] = (segments[seg] || 0) + 1;
    });
    return Object.entries(segments).map(([name, value]) => ({
      name,
      value
    }));
  }, [accounts]);

  // Industry distribution
  const industryData = useMemo(() => {
    const industries: Record<string, number> = {};
    accounts.forEach(a => {
      const ind = a.industry || 'Unknown';
      industries[ind] = (industries[ind] || 0) + 1;
    });
    return Object.entries(industries).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [accounts]);

  // Score distribution
  const scoreData = useMemo(() => {
    const ranges = [{
      range: '0-20',
      min: 0,
      max: 20,
      count: 0
    }, {
      range: '21-40',
      min: 21,
      max: 40,
      count: 0
    }, {
      range: '41-60',
      min: 41,
      max: 60,
      count: 0
    }, {
      range: '61-80',
      min: 61,
      max: 80,
      count: 0
    }, {
      range: '81-100',
      min: 81,
      max: 100,
      count: 0
    }];
    accounts.forEach(a => {
      const score = a.score || 0;
      const range = ranges.find(r => score >= r.min && score <= r.max);
      if (range) range.count++;
    });
    return ranges.map(r => ({
      name: r.range,
      count: r.count
    }));
  }, [accounts]);

  // Status distribution
  const statusData = useMemo(() => {
    const statuses: Record<string, number> = {};
    accounts.forEach(a => {
      const status = a.status || 'New';
      statuses[status] = (statuses[status] || 0) + 1;
    });
    return Object.entries(statuses).map(([name, value]) => ({
      name,
      value
    }));
  }, [accounts]);
  const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#ec4899', '#06b6d4', '#f97316'];
  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>;
  }
  return <div className="space-y-6">
      {/* Header */}
      

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Accounts</p>
                <p className="text-2xl font-bold">{stats.totalAccounts}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Accounts</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeAccounts}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Accounts</p>
                <p className="text-2xl font-bold text-blue-600">{stats.newAccounts}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold">{stats.avgScore}/100</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Segment Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Accounts by Segment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {segmentData.length > 0 ? <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={segmentData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" label={({
                name,
                percent
              }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {segmentData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }} />
                </PieChart>
              </ResponsiveContainer> : <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No data available
              </div>}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Accounts by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" label={({
                name,
                percent
              }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }} />
                </PieChart>
              </ResponsiveContainer> : <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No data available
              </div>}
          </CardContent>
        </Card>
      </div>

      {/* Industry & Score Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Industry Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Top Industries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {industryData.length > 0 ? <ResponsiveContainer width="100%" height={250}>
                <BarChart data={industryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                  <Tooltip contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer> : <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No data available
              </div>}
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={scoreData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>;
};