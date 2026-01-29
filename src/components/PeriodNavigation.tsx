import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/Button';

export const PeriodNavigation = () => {
    const { currentViewDate, setCurrentViewDate } = useBudgetStore();

    // Ensure we are working with a Date object, even if state hydration is wonky (though we excluded it from persist)
    // The initial state new Date() is definitely a Date.
    const date = currentViewDate instanceof Date ? currentViewDate : new Date(currentViewDate);

    const handlePreviousMonth = () => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentViewDate(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentViewDate(newDate);
    };

    const handleReset = () => {
        setCurrentViewDate(new Date());
    };

    return (
        <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <Button variant="ghost" size="sm" onClick={handlePreviousMonth} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center space-x-2 px-2 min-w-[140px] justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded py-1" onClick={handleReset} title="Revenir à aujourd'hui">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 capitalize">
                    {format(date, 'MMMM yyyy', { locale: fr })}
                </span>
            </div>

            <Button variant="ghost" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
};
