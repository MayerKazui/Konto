import { useState } from 'react';
import { useBudgetStore } from '@/stores/useBudgetStore';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    addMonths,
    subMonths,
    isToday
} from 'date-fns';
import { fr, enUS, es, it, de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

export const CalendarView = () => {
    const { t, i18n } = useTranslation();

    const locales: Record<string, any> = {
        fr,
        en: enUS,
        es,
        it,
        de
    };

    const currentLocale = locales[i18n.resolvedLanguage || 'fr'] || fr;
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const { transactions, recurringTransactions } = useBudgetStore();

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const jumpToToday = () => setCurrentDate(new Date());

    // Helper to get daily total
    const getDailyData = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd');

        // 1. Real Transactions
        const dayTransactions = transactions.filter(t => t.date.startsWith(dayStr));
        const expense = dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const income = dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);

        // 2. Projected ( Future )
        let projectedExpense = 0;
        let projectedIncome = 0;
        const isFuture = day > new Date();

        if (isFuture) {
            recurringTransactions.forEach(rt => {
                if (!rt.active) return;
                // Simple check if this recurring transaction falls on this day
                // This is a simplified projection for UI speed. 
                // Ideally we'd reuse the robust logic from store but that modifies state.
                // For visualization: check if day matches start date day-of-month (monthly) or day-of-week (weekly)
                // This "quick projection" needs to be accurate enough.

                const start = new Date(rt.startDate);
                let match = false;

                if (rt.frequency === 'monthly') {
                    if (day.getDate() === start.getDate()) match = true;
                    // Handle end of month edge cases (e.g. 31st on a 30-day month) - simplified for now
                } else if (rt.frequency === 'weekly') {
                    if (day.getDay() === start.getDay()) match = true;
                } else if (rt.frequency === 'daily') {
                    match = true;
                } else if (rt.frequency === 'yearly') {
                    if (day.getDate() === start.getDate() && day.getMonth() === start.getMonth()) match = true;
                }

                if (match && day >= start && (!rt.endDate || day <= new Date(rt.endDate))) {
                    if (rt.type === 'expense') projectedExpense += rt.amount;
                    else projectedIncome += rt.amount;
                }
            });
        }

        return { expense, income, projectedExpense, projectedIncome, dayTransactions };
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent capitalize">
                    {format(currentDate, 'MMMM yyyy', { locale: currentLocale })}
                </h1>
                <div className="flex items-center space-x-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={jumpToToday} className="px-3 py-1 text-sm bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-md font-medium">
                        {t('calendar.today') || "Aujourd'hui"}
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                {/* Days Header */}
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    {Array.from({ length: 7 }).map((_, i) => {
                        // Start from Monday (index 1 in date-fns usually, or 0 is sunday). 
                        // Our calendar starts on Monday (weekStartsOn: 1).
                        // Let's create a date that is a Monday.
                        // Jan 1 2024 was a Monday.
                        const day = new Date(2024, 0, 1 + i);
                        return (
                            <div key={i} className="py-2 text-center text-sm font-medium text-slate-500 capitalize">
                                {format(day, 'EEE', { locale: currentLocale })}
                            </div>
                        );
                    })}
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                    {calendarDays.map((day) => {
                        const { expense, income, projectedExpense, projectedIncome } = getDailyData(day);
                        const isCurrentMonth = isSameMonth(day, currentDate);

                        return (
                            <div
                                key={day.toISOString()}
                                className={clsx(
                                    "min-h-[100px] p-2 border-b border-r border-slate-100 dark:border-slate-800/50 flex flex-col transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20",
                                    !isCurrentMonth && "bg-slate-50/50 dark:bg-slate-950/50 text-slate-400",
                                    isToday(day) && "bg-indigo-50/30 dark:bg-indigo-900/10"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={clsx(
                                        "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                                        isToday(day) ? "bg-indigo-600 text-white" : "text-slate-700 dark:text-slate-300"
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                </div>

                                <div className="flex-1 space-y-1">
                                    {/* Actuals */}
                                    {(expense > 0 || income > 0) && (
                                        <div className="text-xs space-y-0.5">
                                            {income > 0 && <div className="text-emerald-600 flex items-center"><ArrowDownLeft className="w-3 h-3 mr-1" /> {income.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>}
                                            {expense > 0 && <div className="text-rose-600 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1" /> {expense.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>}
                                        </div>
                                    )}

                                    {/* Projections (Ghosted) */}
                                    {(projectedExpense > 0 || projectedIncome > 0) && isCurrentMonth && (
                                        <div className="text-[10px] space-y-0.5 opacity-60 mt-1 pt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
                                            {projectedIncome > 0 && <div className="text-emerald-500 flex items-center italic"><ArrowDownLeft className="w-2 h-2 mr-1" /> {projectedIncome.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>}
                                            {projectedExpense > 0 && <div className="text-rose-500 flex items-center italic"><ArrowUpRight className="w-2 h-2 mr-1" /> {projectedExpense.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
