import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

export const Dashboard = () => {
    const { t } = useTranslation();
    const { transactions, resetDay, currentViewDate, selectedAccountId, accountGroups } = useBudgetStore();
    const [viewMode, setViewMode] = useState<string>('current'); // 'current', 'all', or groupId

    // Calculate start and end of the current view month
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();

    // Logic to determine start/end based on resetDay
    const startDate = new Date(year, month, resetDay);
    if (currentViewDate.getDate() < resetDay) {
        startDate.setMonth(startDate.getMonth() - 1);
    }
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Determine filter accounts
    let targetAccountIds: string[] | null = null; // null means ALL
    if (viewMode === 'current') {
        targetAccountIds = selectedAccountId ? [selectedAccountId] : [];
    } else if (viewMode !== 'all') {
        // Must be a group ID
        const group = accountGroups.find(g => g.id === viewMode);
        if (group) {
            targetAccountIds = group.accountIds;
        }
    }

    // Filter transactions
    const cycleTransactions = transactions.filter(t => {
        const inDateRange = t.date >= startDateStr && t.date < endDateStr;
        let matchesAccount = true;

        if (targetAccountIds) {
            matchesAccount = targetAccountIds.includes(t.accountId);
        }

        return inDateRange && matchesAccount;
    });

    // Calculate Balance (Total of ALL time for selected scope)
    // We need to replicate getBalance logic but with our scope
    const balance = transactions.reduce((acc, t) => {
        let matches = true;
        if (targetAccountIds) {
            matches = targetAccountIds.includes(t.accountId);
        }
        if (!matches) return acc;
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
    }, 0);

    const monthlyIncome = cycleTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

    const monthlyExpenses = cycleTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    const monthlySavings = monthlyIncome - monthlyExpenses;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{t('dashboard.title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400">{t('dashboard.subtitle')}</p>
                </div>

                <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-slate-500" />
                    <select
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="current">{t('dashboard.viewCurrent') || "Compte Actif"}</option>
                        <option value="all">{t('dashboard.viewAll') || "Tous les comptes"}</option>
                        {accountGroups.length > 0 && (
                            <optgroup label={t('settings.accountGroups') || "Groupes"}>
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
                            {t('dashboard.totalBalance')}
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
                        <CardTitle className="text-sm font-medium">{t('dashboard.income')}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{monthlyIncome.toFixed(2)} €</div>
                        <p className="text-xs text-slate-500">{t('dashboard.noIncome')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('dashboard.expenses')}</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{monthlyExpenses.toFixed(2)} €</div>
                        <p className="text-xs text-slate-500">{t('dashboard.noExpense')}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('dashboard.investments')}</CardTitle>
                        <DollarSign className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${monthlySavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {monthlySavings.toFixed(2)} €
                        </div>
                        <p className="text-xs text-slate-500">{t('dashboard.savingsSubtitle')}</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
