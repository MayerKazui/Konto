import React, { useState, useEffect } from 'react';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { Button } from '@/components/ui/Button';
import type { RecurringTransaction, Transaction, TransactionType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TransactionFormProps {
    onClose?: () => void;
    initialData?: Transaction | RecurringTransaction | null;
}

export const TransactionForm = ({ onClose, initialData }: TransactionFormProps) => {
    const { t } = useTranslation();
    const { addTransaction, updateTransaction, addRecurringTransaction, updateRecurringTransaction, categories } = useBudgetStore();

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<TransactionType>('expense');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Recurring state
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
    const [endDateType, setEndDateType] = useState<'date' | 'occurrences' | null>(null);
    const [endDate, setEndDate] = useState('');
    const [occurrences, setOccurrences] = useState('');

    useEffect(() => {
        if (initialData) {
            setAmount(initialData.amount.toString());
            setDescription(initialData.description || '');
            setType(initialData.type);

            if ('date' in initialData) {
                // Standard Transaction
                setDate(initialData.date);
                setIsRecurring(false);
            } else {
                // Recurring Transaction
                setIsRecurring(true);
                setFrequency(initialData.frequency);
                // For recurring, we might use nextDueDate or startDate depending on what we want to edit.
                // Usually startDate is the anchor.
                setDate(initialData.startDate || initialData.nextDueDate);

                if (initialData.endDate) {
                    setEndDateType('date');
                    setEndDate(initialData.endDate);
                } else {
                    setEndDateType(null);
                }
            }
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) return;

        // Auto-assign first category of the selected type
        const defaultCategory = categories.find(c => c.type === type);
        const finalCategoryId = initialData?.categoryId || (defaultCategory ? defaultCategory.id : categories[0].id);

        if (isRecurring) {
            let finalEndDate: string | undefined = undefined;

            if (endDateType === 'date' && endDate) {
                finalEndDate = endDate;
            } else if (endDateType === 'occurrences' && occurrences) {
                // Calculate end date based on occurrences
                const num = parseInt(occurrences);
                if (!isNaN(num) && num > 0) {
                    const start = new Date(date);
                    // Logic to add (num - 1) periods to start date
                    if (frequency === 'daily') start.setDate(start.getDate() + (num - 1));
                    if (frequency === 'weekly') start.setDate(start.getDate() + (num - 1) * 7);
                    if (frequency === 'monthly') start.setMonth(start.getMonth() + (num - 1));
                    if (frequency === 'yearly') start.setFullYear(start.getFullYear() + (num - 1));
                    finalEndDate = start.toISOString().split('T')[0];
                }
            }

            const recurringData = {
                amount: parseFloat(amount),
                description,
                type,
                categoryId: finalCategoryId, // Keep existing category if editing, or default
                frequency,
                startDate: date,
                nextDueDate: date, // Logic for update might need refinement if we don't want to reset nextDueDate
                endDate: finalEndDate,
                active: true,
            };

            if (initialData && 'frequency' in initialData) {
                // Update existing recurring
                // We preserve nextDueDate from initialData unless user explicitly wants to reset it?
                // For simplicity, if they change the date (start date), it resets the cycle.
                updateRecurringTransaction(initialData.id, {
                    ...recurringData,
                    nextDueDate: initialData.nextDueDate !== date ? date : initialData.nextDueDate
                });
            } else {
                // Create new
                addRecurringTransaction({
                    id: crypto.randomUUID(),
                    ...recurringData,
                    nextDueDate: date,
                });
            }

        } else {
            const transactionData = {
                amount: parseFloat(amount),
                description,
                type,
                categoryId: finalCategoryId,
                date,
                isRecurring: false,
            };

            if (initialData && !('frequency' in initialData)) {
                updateTransaction(initialData.id, transactionData);
            } else {
                addTransaction({
                    id: crypto.randomUUID(),
                    ...transactionData,
                });
            }
        }

        setAmount('');
        setDescription('');
        setIsRecurring(false);
        if (onClose) onClose();
    };

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>{initialData ? t('form.editTitle') : t('form.addTitle')}</CardTitle>
                {onClose && (
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={type === 'expense' ? 'danger' : 'secondary'}
                            className="flex-1"
                            onClick={() => setType('expense')}
                        >
                            {t('form.expense')}
                        </Button>
                        <Button
                            type="button"
                            variant={type === 'income' ? 'primary' : 'secondary'}
                            className="flex-1"
                            onClick={() => setType('income')}
                        >
                            {t('form.income')}
                        </Button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {t('form.amount')}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {t('form.date')}
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {t('form.description')}
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                            placeholder={t('form.descriptionPlaceholder')}
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="isRecurring"
                            checked={isRecurring}
                            onChange={(e) => setIsRecurring(e.target.checked)}
                            disabled={!!initialData} // Disable changing recurrence type during edit to simplify logic
                            className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer disabled:opacity-50"
                        />
                        <label htmlFor="isRecurring" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {t('form.isRecurring')}
                        </label>
                    </div>

                    {isRecurring && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    {t('form.frequency')}
                                </label>
                                <select
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value as any)}
                                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                                >
                                    <option value="monthly">{t('form.frequencies.monthly')}</option>
                                    <option value="weekly">{t('form.frequencies.weekly')}</option>
                                    <option value="daily">{t('form.frequencies.daily')}</option>
                                    <option value="yearly">{t('form.frequencies.yearly')}</option>
                                </select>
                            </div>

                            {/* Recurrence Duration */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    {t('form.duration')}
                                </label>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            id="duration-infinite"
                                            name="duration"
                                            checked={!endDateType}
                                            onChange={() => {
                                                setEndDateType(null);
                                                setEndDate('');
                                                setOccurrences('');
                                            }}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                                        />
                                        <label htmlFor="duration-infinite" className="text-sm text-slate-700 dark:text-slate-300">
                                            {t('form.durationInfinite')}
                                        </label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            id="duration-date"
                                            name="duration"
                                            checked={endDateType === 'date'}
                                            onChange={() => setEndDateType('date')}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                                        />
                                        <label htmlFor="duration-date" className="text-sm text-slate-700 dark:text-slate-300">
                                            {t('form.durationDate')}
                                        </label>
                                        {endDateType === 'date' && (
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="ml-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                                                required
                                            />
                                        )}
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="radio"
                                            id="duration-occurrences"
                                            name="duration"
                                            checked={endDateType === 'occurrences'}
                                            onChange={() => setEndDateType('occurrences')}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                                        />
                                        <label htmlFor="duration-occurrences" className="text-sm text-slate-700 dark:text-slate-300">
                                            {t('form.durationOccurrences')}
                                        </label>
                                        {endDateType === 'occurrences' && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="2"
                                                    value={occurrences}
                                                    onChange={(e) => setOccurrences(e.target.value)}
                                                    className="w-20 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                                                    placeholder="3"
                                                    required
                                                />
                                                <span className="text-sm text-slate-500">{t('form.times')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <Button type="submit" className="w-full mt-4">
                        {initialData ? t('form.save') : t('form.submit')}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};
