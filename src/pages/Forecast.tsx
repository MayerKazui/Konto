import { useMemo } from 'react';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { addDays, addMonths, differenceInDays, format, isBefore, startOfDay } from 'date-fns';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useTranslation } from 'react-i18next';

export const Forecast = () => {
    const { t } = useTranslation();
    const { recurringTransactions, getBalance } = useBudgetStore();

    const forecastData = useMemo(() => {
        const today = startOfDay(new Date());
        const endDate = addMonths(today, 6); // Forecast 6 months out
        let currentBalance = getBalance();

        const data = [];

        const days = differenceInDays(endDate, today);

        for (let i = 0; i <= days; i++) {
            const date = addDays(today, i);

            recurringTransactions.forEach(rt => {
                const start = new Date(rt.startDate);
                if (isBefore(date, start)) return;

                if (rt.frequency === 'monthly' && date.getDate() === start.getDate()) {
                    currentBalance += (rt.type === 'income' ? rt.amount : -rt.amount);
                }
                if (rt.frequency === 'weekly' && date.getDay() === start.getDay()) {
                    currentBalance += (rt.type === 'income' ? rt.amount : -rt.amount);
                }
            });

            data.push({
                date: format(date, 'MMM d'),
                balance: currentBalance,
            });
        }

        return data;
    }, [recurringTransactions, getBalance]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{t('forecast.title')}</h2>
                <p className="text-slate-500 dark:text-slate-400">{t('forecast.subtitle')}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('forecast.graphTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={forecastData}>
                                <defs>
                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    interval={30}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value} €`}
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                />
                                <Tooltip
                                    formatter={(value: any) => [`${Number(value).toFixed(2)} €`, t('transactions.currentBalance')]} // Reusing "Solde Actuel" or similar? Maybe just "Solde"
                                    labelStyle={{ color: '#1e293b' }}
                                    contentStyle={{
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        backgroundColor: 'var(--color-bg-popover, white)',
                                        color: '#1e293b'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="balance"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorBalance)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {recurringTransactions.length === 0 && (
                <div className="text-center p-8 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    <p>{t('forecast.emptyState')}</p>
                </div>
            )}
        </div>
    );
};
