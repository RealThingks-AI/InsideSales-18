import { useMemo } from 'react';
import { format, subDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { Task } from '@/types/task';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ListTodo,
  Calendar,
} from 'lucide-react';

interface TaskAnalyticsDashboardProps {
  tasks: Task[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#6b7280'];
const PRIORITY_COLORS = { high: '#ef4444', medium: '#eab308', low: '#22c55e' };

export const TaskAnalyticsDashboard = ({ tasks }: TaskAnalyticsDashboardProps) => {
  const analytics = useMemo(() => {
    const today = startOfDay(new Date());
    const last7Days = subDays(today, 7);
    const last30Days = subDays(today, 30);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const openTasks = tasks.filter(t => t.status === 'open').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const deferredTasks = tasks.filter(t => t.status === 'deferred').length;

    const overdueTasks = tasks.filter(t => {
      if (!t.due_date || t.status === 'completed') return false;
      return isBefore(new Date(t.due_date), today);
    }).length;

    const completedLast7Days = tasks.filter(t => 
      t.completed_at && isAfter(new Date(t.completed_at), last7Days)
    ).length;

    const completedLast30Days = tasks.filter(t => 
      t.completed_at && isAfter(new Date(t.completed_at), last30Days)
    ).length;

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Tasks by status for pie chart
    const statusData = [
      { name: 'Open', value: openTasks, color: '#3b82f6' },
      { name: 'In Progress', value: inProgressTasks, color: '#8b5cf6' },
      { name: 'Completed', value: completedTasks, color: '#22c55e' },
      { name: 'Deferred', value: deferredTasks, color: '#6b7280' },
    ].filter(d => d.value > 0);

    // Tasks by priority
    const priorityData = [
      { name: 'High', value: tasks.filter(t => t.priority === 'high').length, color: '#ef4444' },
      { name: 'Medium', value: tasks.filter(t => t.priority === 'medium').length, color: '#eab308' },
      { name: 'Low', value: tasks.filter(t => t.priority === 'low').length, color: '#22c55e' },
    ].filter(d => d.value > 0);

    // Tasks by linked entity
    const entityData = [
      { name: 'Leads', count: tasks.filter(t => t.lead_id).length },
      { name: 'Contacts', count: tasks.filter(t => t.contact_id).length },
      { name: 'Deals', count: tasks.filter(t => t.deal_id).length },
      { name: 'Accounts', count: tasks.filter(t => t.account_id).length },
      { name: 'Unlinked', count: tasks.filter(t => !t.lead_id && !t.contact_id && !t.deal_id && !t.account_id).length },
    ];

    return {
      totalTasks,
      completedTasks,
      openTasks,
      inProgressTasks,
      overdueTasks,
      completionRate,
      completedLast7Days,
      completedLast30Days,
      statusData,
      priorityData,
      entityData,
    };
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-blue-500" />
              Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.openTasks} open, {analytics.inProgressTasks} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.completionRate.toFixed(1)}%</div>
            <Progress value={analytics.completionRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Overdue Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{analytics.overdueTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Completed (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.completedLast7Days}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.completedLast30Days} in last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Task Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {analytics.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Task Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {analytics.priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tasks by Entity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tasks by Linked Entity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.entityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
