import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { SavingsGoals } from '@/components/SavingsGoals';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { calculateTrendData } from '@/utils/chartUtils';

export const Dashboard = () => {
    const { t, i18n } = useTranslation();
    const { transactions, resetDay, currentViewDate, selectedAccountId, accountGroups } = useBudgetStore();
    const [viewMode, setViewMode] = useState<string>('current'); // 'current', 'all', or groupId

    // Calculate start and end of the current view month
    const { startDate, endDate } = useMemo(() => {
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();

        // Logic to determine start/end based on resetDay
        const start = new Date(year, month, resetDay);
        if (currentViewDate.getDate() < resetDay) {
            start.setMonth(start.getMonth() - 1);
        }
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        return { startDate: start, endDate: end };
    }, [currentViewDate, resetDay]);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Determine filter accounts
    const targetAccountIds = useMemo(() => {
        if (viewMode === 'current') {
            return selectedAccountId ? [selectedAccountId] : [];
        } else if (viewMode !== 'all') {
            const group = accountGroups.find(g => g.id === viewMode);
            return group ? group.accountIds : null;
        }
        return null;
    }, [viewMode, selectedAccountId, accountGroups]);

    // Filter transactions
    const cycleTransactions = useMemo(() => {
        return transactions.filter(t => {
            const inDateRange = t.date >= startDateStr && t.date < endDateStr;
            let matchesAccount = true;

            if (targetAccountIds) {
                matchesAccount = targetAccountIds.includes(t.accountId);
            }

            return inDateRange && matchesAccount;
        });
    }, [transactions, startDateStr, endDateStr, targetAccountIds]);

    // Calculate Balance (Total of ALL time for selected scope)
    const balance = useMemo(() => {
        return transactions.reduce((acc, t) => {
            let matches = true;
            if (targetAccountIds) {
                matches = targetAccountIds.includes(t.accountId);
            }
            if (!matches) return acc;
            return t.type === 'income' ? acc + t.amount : acc - t.amount;
        }, 0);
    }, [transactions, targetAccountIds]);

    const monthlyIncome = useMemo(() => cycleTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0), [cycleTransactions]);

    const monthlyExpenses = useMemo(() => cycleTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0), [cycleTransactions]);

    const monthlySavings = monthlyIncome - monthlyExpenses;

    // Calculate Trend Data (Daily Balance Evolution)
    const trendData = useMemo(() => {
        return calculateTrendData(transactions, startDate, endDate, targetAccountIds, i18n.language);
    }, [transactions, startDate, endDate, targetAccountIds, i18n.language]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{t('dashboard.title') as string}</h2>
                    <p className="text-slate-500 dark:text-slate-400">{t('dashboard.subtitle') as string}</p>
                </div>

                <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-slate-500" />
                    <select
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="current">{(t('dashboard.viewCurrent') || "Compte Actif") as string}</option>
                        <option value="all">{(t('dashboard.viewAll') || "Tous les comptes") as string}</option>
                        {accountGroups.length > 0 && (
                            <optgroup label={(t('settings.accountGroups') || "Groupes") as string}>
                                {accountGroups.map(group => (
                                    <option key={group.id} value={group.id}>{group.name}</option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                </div>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t('dashboard.totalBalance') as string}
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {balance.toFixed(2)} €
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('dashboard.income') as string}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{monthlyIncome.toFixed(2)} €</div>
                        <p className="text-xs text-slate-500">{t('dashboard.noIncome') as string}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('dashboard.expenses') as string}</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{monthlyExpenses.toFixed(2)} €</div>
                        <p className="text-xs text-slate-500">{t('dashboard.noExpense') as string}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('dashboard.investments') as string}</CardTitle>
                        <DollarSign className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${monthlySavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {monthlySavings.toFixed(2)} €
                        </div>
                        <p className="text-xs text-slate-500">{t('dashboard.savingsSubtitle') as string}</p>
                    </CardContent>
                </Card>
            </div>

            <SavingsGoals />

            <div className="grid gap-4 grid-cols-1">
                {/* Trend Area Chart */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>{(t('dashboard.balanceTrend') || "Évolution du Solde") as string}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    minTickGap={30}
                                />
                                <YAxis
                                    hide
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip
                                    formatter={(value?: number) => [`${Number(value || 0).toFixed(2)} €`, t('dashboard.balance') as string]}
                                    contentStyle={{ backgroundColor: 'var(--color-bg-card)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="balance"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorTrend)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
