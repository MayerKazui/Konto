import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Transaction } from '../types';

interface TrendDataPoint {
    date: string;
    balance: number;
}

export const calculateTrendData = (
    transactions: Transaction[],
    startDate: Date,
    endDate: Date,
    targetAccountIds: string[] | null,
    locale?: string
): TrendDataPoint[] => {
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // 1. Calculate Initial Balance (All tx < startDate)
    const initialBalance = transactions.reduce((acc, t) => {
        // Account Filter
        if (targetAccountIds && !targetAccountIds.includes(t.accountId)) {
            return acc;
        }

        // Date Filter (< startDate)
        if (t.date < startDateStr) {
            return t.type === 'income' ? acc + t.amount : acc - t.amount;
        }
        return acc;
    }, 0);

    let runningBalance = initialBalance;
    const data: TrendDataPoint[] = [];
    const currentIterDate = new Date(startDate);

    // 2. Identify transactions WITHIN period [startDate, endDate)
    const cycleTransactions = transactions.filter(t => {
        let matchesAccount = true;
        if (targetAccountIds) {
            matchesAccount = targetAccountIds.includes(t.accountId);
        }
        // Note: Logic in Dashboard was: t.date >= startDateStr && t.date < endDateStr
        const endDateStr = endDate.toISOString().split('T')[0];
        const inRange = t.date >= startDateStr && t.date < endDateStr;
        return matchesAccount && inRange;
    });

    // Map transactions by date
    const txsByDate: Record<string, number> = {};
    cycleTransactions.forEach(t => {
        const d = t.date;
        txsByDate[d] = (txsByDate[d] || 0) + (t.type === 'income' ? t.amount : -t.amount);
    });

    // 3. Generate Daily Data
    while (currentIterDate < endDate) {
        const dateStr = currentIterDate.toISOString().split('T')[0];
        const dailyChange = txsByDate[dateStr] || 0;
        runningBalance += dailyChange;

        data.push({
            date: format(currentIterDate, 'd MMM', { locale: locale === 'fr' ? fr : undefined }),
            balance: runningBalance
        });
        currentIterDate.setDate(currentIterDate.getDate() + 1);
    }

    return data;
};
