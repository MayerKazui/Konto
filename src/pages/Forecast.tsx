import { useMemo, useState } from 'react';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { addDays, addMonths, differenceInDays, format, isBefore, startOfDay } from 'date-fns';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useTranslation } from 'react-i18next';
import { fr, enUS, es, it, de } from 'date-fns/locale';
import type { Locale } from 'date-fns';

export const Forecast = () => {
    const { t, i18n } = useTranslation();
    const { recurringTransactions, getBalance, selectedAccountId } = useBudgetStore();

    const [forecastRange, setForecastRange] = useState(6);

    const locales: Record<string, Locale> = {
        fr,
        en: enUS,
        es,
        it,
        de
    };
    const currentLocale = locales[i18n.resolvedLanguage || 'fr'] || fr;

    const forecastData = useMemo(() => {
        const today = startOfDay(new Date());
        const endDate = addMonths(today, forecastRange); // Forecast 6 months out
        let currentBalance = getBalance();

        const data = [];

        const days = differenceInDays(endDate, today);

        for (let i = 0; i <= days; i++) {
            const date = addDays(today, i);

            recurringTransactions.forEach(rt => {
                const start = new Date(rt.startDate);
                if (isBefore(date, start)) return;

                // Determine effective frequency match
                let matchesDate = false;
                if (rt.frequency === 'daily') matchesDate = true;
                if (rt.frequency === 'weekly' && date.getDay() === start.getDay()) matchesDate = true;
                if (rt.frequency === 'monthly') matchesDate = date.getDate() === start.getDate();
                if (rt.frequency === 'yearly') matchesDate = date.getDate() === start.getDate() && date.getMonth() === start.getMonth();

                if (matchesDate) {
                    // Logic for applying transaction based on view and type

                    // 1. Global View
                    if (!selectedAccountId) {
                        if (rt.isTransfer) {
                            // Transfers are neutral in global view
                            return;
                        }
                        // Apply normal income/expense
                        currentBalance += (rt.type === 'income' ? rt.amount : -rt.amount);
                    }
                    // 2. Single Account View
                    else {
                        // If this account is the SOURCE
                        if (rt.accountId === selectedAccountId) {
                            // It's an outflow (Expense or Transfer Out)
                            // If it's a transfer, it's still money leaving THIS account
                            currentBalance += (rt.type === 'income' ? rt.amount : -rt.amount);
                        }
                        // If this account is the DESTINATION (Transfer In)
                        else if (rt.isTransfer && rt.toAccountId === selectedAccountId) {
                            // It's an inflow (Money coming in)
                            currentBalance += rt.amount;
                        }
                        // Else: Rule doesn't apply to this account
                    }
                }
            });

            data.push({
                fullDate: date.getTime(), // Unique key
                displayDate: format(date, forecastRange > 12 ? 'MMM yyyy' : 'MMM d', { locale: currentLocale }), // Smart display
                tooltipDate: format(date, 'd MMMM yyyy', { locale: currentLocale }), // Full tooltip date
                balance: currentBalance,
                originalDate: date // Keep original date for sorting/debugging if needed
            });
        }

        return data;
    }, [recurringTransactions, getBalance, selectedAccountId, forecastRange, currentLocale]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{t('forecast.title') as string}</h2>
                    <p className="text-slate-500 dark:text-slate-400">{t('forecast.subtitle') as string}</p>
                </div>

                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Période :
                    </label>
                    <select
                        value={forecastRange}
                        onChange={(e) => setForecastRange(parseInt(e.target.value))}
                        className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 text-sm px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value={3}>3 mois</option>
                        <option value={6}>6 mois</option>
                        <option value={12}>1 an</option>
                        <option value={24}>2 ans</option>
                    </select>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('forecast.graphTitle') as string}</CardTitle>
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
                                    dataKey="fullDate"
                                    tickFormatter={(val) => {
                                        // Find the corresponding data point to get the display formatted string
                                        // Or just re-format on the fly if we want, but using the pre-calculated one is safer if mapped correctly.
                                        // However, XAxis 'formatter' receives the value of dataKey. Here it is timestamp.
                                        // We can format it back to date.
                                        return format(new Date(val), forecastRange > 12 ? 'MMM yyyy' : 'MMM d', { locale: currentLocale });
                                    }}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    interval={Math.ceil(forecastData.length / 12)} // Dynamic interval based on range
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value} €`}
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                />
                                <Tooltip
                                    formatter={(value: number | undefined) => [`${(value || 0).toFixed(2)} €`, t('transactions.currentBalance') as string]}
                                    labelFormatter={(label) => format(new Date(label), 'd MMMM yyyy', { locale: currentLocale })}
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
                    <p>{t('forecast.emptyState') as string}</p>
                </div>
            )}
        </div>
    );
};
