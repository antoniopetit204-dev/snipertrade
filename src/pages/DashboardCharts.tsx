import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { getUser } from '@/lib/store';
import { LineChart as LineChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const generateChartData = () => {
  const data = [];
  let price = 1.0870;
  for (let i = 0; i < 50; i++) {
    price += (Math.random() - 0.48) * 0.002;
    data.push({
      time: `${String(Math.floor(i / 2) + 10).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
      price: Number(price.toFixed(4)),
      volume: Math.floor(Math.random() * 1000 + 200),
    });
  }
  return data;
};

const DashboardCharts = () => {
  const navigate = useNavigate();
  const user = getUser();
  const [data] = useState(generateChartData);

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <header className="border-b border-border px-6 py-3">
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-primary" /> Charts
          </h1>
        </header>

        <div className="p-6 space-y-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">EUR/USD Price Action</h2>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(47, 97%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(47, 97%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 20%)" />
                <XAxis dataKey="time" tick={{ fill: 'hsl(218, 12%, 55%)', fontSize: 11 }} axisLine={{ stroke: 'hsl(220, 10%, 20%)' }} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: 'hsl(218, 12%, 55%)', fontSize: 11 }} axisLine={{ stroke: 'hsl(220, 10%, 20%)' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(220, 14%, 11%)', border: '1px solid hsl(220, 10%, 20%)', borderRadius: '8px', color: 'hsl(220, 20%, 93%)' }}
                  labelStyle={{ color: 'hsl(218, 12%, 55%)' }}
                />
                <Area type="monotone" dataKey="price" stroke="hsl(47, 97%, 60%)" fill="url(#priceGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Volume</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 20%)" />
                <XAxis dataKey="time" tick={{ fill: 'hsl(218, 12%, 55%)', fontSize: 11 }} axisLine={{ stroke: 'hsl(220, 10%, 20%)' }} />
                <YAxis tick={{ fill: 'hsl(218, 12%, 55%)', fontSize: 11 }} axisLine={{ stroke: 'hsl(220, 10%, 20%)' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(220, 14%, 11%)', border: '1px solid hsl(220, 10%, 20%)', borderRadius: '8px', color: 'hsl(220, 20%, 93%)' }}
                />
                <Line type="monotone" dataKey="volume" stroke="hsl(160, 85%, 43%)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardCharts;
