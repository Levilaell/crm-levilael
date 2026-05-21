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
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10 }}
            className="text-muted-foreground fill-current"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            className="text-muted-foreground fill-current"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
            width={50}
          />
          <Tooltip
            cursor={{ fill: 'rgba(212,162,62,0.1)' }}
            contentStyle={{
              backgroundColor: 'var(--color-popover)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--color-foreground)',
            }}
            labelStyle={{ color: 'var(--color-foreground)' }}
            formatter={(v) => [`R$ ${Number(v).toFixed(2)}`, 'Custo']}
          />
          <Bar dataKey="cost" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
