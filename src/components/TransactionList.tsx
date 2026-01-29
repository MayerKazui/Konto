import { useTranslation } from 'react-i18next';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowDown, ArrowUp, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { Transaction } from '@/types';
import { useState } from 'react';

interface TransactionListProps {
    onEdit?: (transaction: Transaction) => void;
}

export const TransactionList = ({ onEdit }: TransactionListProps = {}) => {
    const { t } = useTranslation();
    const { transactions, deleteTransaction, resetDay, recurringTransactions, currentViewDate, selectedAccountId } = useBudgetStore();

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });



    // Calculate start and end date of current cycle based on View Date
    const viewDate = currentViewDate instanceof Date ? currentViewDate : new Date(currentViewDate || new Date());
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();

    let startDate = new Date(currentYear, currentMonth, resetDay);
    let endDate = new Date(currentYear, currentMonth + 1, resetDay); // Exclusive end date

    // Adjust if viewDate is before reset day in its own month
    if (viewDate.getDate() < resetDay) {
        startDate = new Date(currentYear, currentMonth - 1, resetDay);
        endDate = new Date(currentYear, currentMonth, resetDay);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Real "Today" for determining what is projected vs actual
    const realToday = new Date();

    // 1. Get Actual Transactions
    const actualTransactions = transactions
        .filter(t => {
            const dateMatch = t.date >= startDateStr && t.date < endDateStr;
            const accountMatch = selectedAccountId ? t.accountId === selectedAccountId : true;
            return dateMatch && accountMatch;
        })
        .map(t => ({ ...t, isProjected: false }));

    // 2. Generate Projected Transactions from Recurring Rules
    const projectedTransactions: any[] = [];

    recurringTransactions.forEach(rt => {
        if (!rt.active) return;
        if (selectedAccountId && rt.accountId !== selectedAccountId) return;

        // We use 'let' because we are modifying nextDue in the loop
        let nextDue = new Date(rt.nextDueDate);

        // Loop to generate multiple occurrences if needed until endDate
        while (nextDue < endDate) {
            const nextDueStr = nextDue.toISOString().split('T')[0];

            // Only add if it's strictly in the future relative to "REAL TODAY"
            // AND within our cycle window (startDate -> endDate).
            // We use realToday to decide if it's "Projected" (future) or should have been "Actual" (past).
            if (nextDue > realToday && nextDue >= startDate) {
                projectedTransactions.push({
                    id: `proj-${rt.id}-${nextDueStr}`,
                    amount: rt.amount,
                    description: rt.description,
                    type: rt.type,
                    categoryId: rt.categoryId,
                    date: nextDueStr,
                    isRecurring: true,
                    isProjected: true
                });
            }

            // Advance date
            if (rt.frequency === 'daily') nextDue.setDate(nextDue.getDate() + 1);
            if (rt.frequency === 'weekly') nextDue.setDate(nextDue.getDate() + 7);
            if (rt.frequency === 'monthly') nextDue.setMonth(nextDue.getMonth() + 1);
            if (rt.frequency === 'yearly') nextDue.setFullYear(nextDue.getFullYear() + 1);
        }
    });

    // Merge and Sort
    const sortedTransactions = [...actualTransactions, ...projectedTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate Totals
    const currentTotal = actualTransactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
    const forecastAmount = sortedTransactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
    // Renaming to forecastTotal to match the view variable
    const forecastTotal = forecastAmount;

    return (
        <div className="space-y-4">
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
            />
            {/* Summary Header */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{t('transactions.currentBalance')}</p>
                    <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{currentTotal.toFixed(2)} €</p>
                </div>
                <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800">
                    <p className="text-sm font-medium text-violet-600 dark:text-violet-400">{t('transactions.forecastBalance')}</p>
                    <p className="text-2xl font-bold text-violet-900 dark:text-violet-100">{forecastTotal.toFixed(2)} €</p>
                </div>
            </div>

            {sortedTransactions.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    {t('transactions.emptyState')}
                </div>
            ) : sortedTransactions.map((transaction) => {
                return (
                    <div
                        key={transaction.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border shadow-sm transition-colors duration-200 gap-3 sm:gap-0 ${transaction.isProjected
                            ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 border-dashed opacity-75'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            }`}
                    >
                        <div className="flex items-center space-x-4">
                            <div
                                className={`p-2 rounded-full ${transaction.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                    }`}
                            >
                                {transaction.type === 'income' ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                            </div>
                            <div>
                                <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    {transaction.description || 'Transaction'}
                                    {transaction.isProjected && (
                                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                                            {t('transactions.projected')}
                                        </span>
                                    )}
                                    {transaction.isRecurring && (
                                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold">
                                            {t('transactions.recurring')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {format(parseISO(transaction.date), 'dd MMMM yyyy', { locale: fr })}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between w-full sm:w-auto space-x-4">
                            <span
                                className={`font-semibold ${transaction.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                                    }`}
                            >
                                {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)} €
                            </span>
                            {!transaction.isProjected && (
                                <div className="flex space-x-1">
                                    {onEdit && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-slate-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400"
                                            onClick={() => onEdit(transaction)}
                                        >
                                            <Pencil size={16} />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
                                        onClick={() => {
                                            setConfirmModal({
                                                isOpen: true,
                                                title: t('transactions.delete') || "Supprimer",
                                                message: t('settings.deleteTransactionMessage'),
                                                onConfirm: () => deleteTransaction(transaction.id)
                                            });
                                        }}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
