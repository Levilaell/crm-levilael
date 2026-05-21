'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface Props {
  data: Array<{ day: string; cost: number }>;
}

export function AIUsageChart({ data }: Props) {
  const formatted = data.map((d) => ({
    day: d.day.slice(5), // MM-DD
    cost: d.cost,
  }));

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: '#a1a1aa' }}
            tickLine={false}
            axisLine={{ stroke: '#3f3f46' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#a1a1aa' }}
            tickLine={false}
            axisLine={{ stroke: '#3f3f46' }}
            tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
            width={50}
          />
          <Tooltip
            cursor={{ fill: 'rgba(167,139,250,0.1)' }}
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: '#fafafa' }}
            formatter={(v) => [`R$ ${Number(v).toFixed(2)}`, 'Custo']}
          />
          <Bar dataKey="cost" fill="#a78bfa" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
