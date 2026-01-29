import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { DollarSign, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Dashboard = () => {
    const { t } = useTranslation();
    const { getBalance, transactions, resetDay, currentViewDate } = useBudgetStore();
    const balance = getBalance();

    // Calculate current cycle dates
    // Defensive check for hydration issues if we decided to persist later, though effectively non-persisted now.
    const today = currentViewDate instanceof Date ? currentViewDate : new Date(currentViewDate || new Date());

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    let startDate = new Date(currentYear, currentMonth, resetDay);
    let endDate = new Date(currentYear, currentMonth + 1, resetDay);

    if (today.getDate() < resetDay) {
        startDate = new Date(currentYear, currentMonth - 1, resetDay);
        endDate = new Date(currentYear, currentMonth, resetDay);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Filter transactions for current cycle
    const cycleTransactions = transactions.filter(t => t.date >= startDateStr && t.date < endDateStr);

    // Calculate Previous Balance (Balance at the start of the current cycle)
    const previousTransactions = transactions.filter(t => t.date < startDateStr);
    const previousBalance = previousTransactions.reduce((acc, t) => {
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
    }, 0);

    // Calculate percentage change
    let percentageChange = 0;
    if (previousBalance !== 0) {
        percentageChange = ((balance - previousBalance) / Math.abs(previousBalance)) * 100;
    } else if (balance !== 0) {
        // If previous balance seems to be 0 but we have money now, it's 100% increase (or just considered positive)
        percentageChange = 100;
    }

    const monthlyIncome = cycleTransactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

    const monthlyExpenses = cycleTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    const monthlySavings = monthlyIncome - monthlyExpenses;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{t('dashboard.title')}</h2>
                <p className="text-slate-500 dark:text-slate-400">{t('dashboard.subtitle')}</p>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('dashboard.totalBalance')}</CardTitle>
                        <Wallet className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{balance.toFixed(2)} €</div>
                        <p className={`text-xs ${percentageChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}% {t('dashboard.vsLastMonth')}
                        </p>
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
