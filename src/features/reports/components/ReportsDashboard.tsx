import React from 'react';
import { useReportsStore } from '../store/reportsStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../../shared/components/ui/Card';
import { IndianRupee, TrendingUp, TrendingDown, PieChart as PieChartIcon } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];

export function ReportsDashboard() {
  const { metrics, salesTrend, expenseBreakdown } = useReportsStore();

  if (!metrics) return <div className="rounded-xl border border-[#ebd5da] bg-white p-6 text-[#800000]">No verified financial metrics have been recorded for this restaurant. Reports will appear once actual data is available.</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Today's Revenue" 
          value={`₹${metrics.todaySales.toLocaleString('en-IN')}`}
          icon={<IndianRupee className="w-5 h-5 text-indigo-500" />}
        />
        <StatCard 
          title="Gross Profit" 
          value={`₹${metrics.grossProfit.toLocaleString('en-IN')}`}
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
        />
        <StatCard 
          title="Food Cost" 
          value={`${metrics.foodCostPercentage.toFixed(1)}%`}
          icon={<TrendingDown className="w-5 h-5 text-amber-500" />}
        />
        <StatCard 
          title="Net Profit" 
          value={`₹${metrics.netProfit.toLocaleString('en-IN')}`}
          icon={<PieChartIcon className="w-5 h-5 text-blue-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Sales Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" tickFormatter={(value) => `₹${value/1000}k`} />
                  <RechartsTooltip 
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                    labelStyle={{ color: '#0f172a' }}
                  />
                  <Line type="monotone" dataKey="grossRevenue" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="amount"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
            {icon}
          </div>
        </div>
        <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white truncate">{value}</h3>
      </CardContent>
    </Card>
  );
}
