import React, { useState, useEffect } from 'react';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { Button } from '@/components/ui/Button';
import type { RecurringTransaction, Transaction, TransactionType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSelector } from './AccountSelector';
import type { Frequency } from '@/types';

interface TransactionFormProps {
    onClose?: () => void;
    initialData?: Transaction | RecurringTransaction | null;
}

export const TransactionForm = ({ onClose, initialData }: TransactionFormProps) => {
    const { t } = useTranslation();
    const { addTransaction, updateTransaction, addRecurringTransaction, updateRecurringTransaction, addTransfer } = useBudgetStore();

    // Account State

    const { accounts, selectedAccountId } = useBudgetStore();

    // Default to selected account, or first account if none selected
    const initialAccountId = initialData?.accountId || selectedAccountId || (accounts.length > 0 ? accounts[0].id : '');
    const [accountId, setAccountId] = useState(initialAccountId);

    // Default destination account (for transfers) - try to find one that isn't the source
    const defaultToAccountId = accounts.find(a => a.id !== accountId)?.id || (accounts.length > 0 ? accounts[0].id : '');
    const [toAccountId, setToAccountId] = useState(initialData && 'toAccountId' in initialData && initialData.toAccountId ? initialData.toAccountId : defaultToAccountId);

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<TransactionType | 'transfer'>('expense');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);


    // Recurring state
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<Frequency>('monthly');
    const [endDateType, setEndDateType] = useState<'date' | 'occurrences' | null>(null);
    const [endDate, setEndDate] = useState('');
    const [occurrences, setOccurrences] = useState('');

    useEffect(() => {
        if (initialData) {
            setAmount(initialData.amount.toString());
            setDescription(initialData.description || '');
            setAccountId(initialData.accountId || selectedAccountId || accounts[0]?.id || '');

            if ('isTransfer' in initialData && initialData.isTransfer) {
                setType('transfer');
                // For existing transfers, we might need logic to find the linked account.
                // But generally editing transfers is complex because they are two transactions.
                // For now, let's assume editing limits.
                if ('toAccountId' in initialData && initialData.toAccountId) {
                    setToAccountId(initialData.toAccountId);
                }
            } else {
                setType(initialData.type);
            }



            if ('date' in initialData) {
                // Standard Transaction
                setDate(initialData.date);
                setIsRecurring(false);
            } else {
                // Recurring Transaction
                setIsRecurring(true);
                setFrequency(initialData.frequency);
                setDate(initialData.startDate || initialData.nextDueDate);

                if (initialData.endDate) {
                    setEndDateType('date');
                    setEndDate(initialData.endDate);
                } else {
                    setEndDateType(null);
                }
            }
        }
    }, [initialData, selectedAccountId, accounts, type]);

    // Auto-select account for new transactions if list loads/changes and no account checked
    useEffect(() => {
        if (!initialData && !accountId && accounts.length > 0) {
            setAccountId(selectedAccountId || accounts[0].id);
        }
    }, [accounts, selectedAccountId, initialData, accountId]);

    // Versioning Modal State
    const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Submitting form...", { amount, accountId, type, toAccountId });

        if (!amount || !accountId) {
            console.log("Validation failed: Missing amount or accountId");
            setError(t('form.error.missingFields') || "Veuillez remplir tous les champs obligatoires (Montant et Compte).");
            return;
        }
        if (type === 'transfer' && !toAccountId) {
            console.log("Validation failed: Missing toAccountId");
            setError(t('form.error.missingDestination') || "Veuillez sélectionner un compte de destination.");
            return;
        }
        if (type === 'transfer' && accountId === toAccountId) {
            setError(t('form.error.sameAccount') || "Les comptes source et destination doivent être différents.");
            return;
        }

        // Check for recurrence edit with sensitive changes
        if (initialData && 'frequency' in initialData && isRecurring) {
            const currentAmount = parseFloat(amount);
            const sensitiveChanged =
                currentAmount !== initialData.amount ||
                frequency !== initialData.frequency ||
                accountId !== initialData.accountId;

            if (sensitiveChanged) {
                setIsVersionModalOpen(true);
                return;
            }
        }

        // If not sensitive or new, just process as 'all' (update in place)
        executeSubmit('all');
    };

    const executeSubmit = (versionMode: 'all' | 'future') => {

        if (isRecurring) {
            let finalEndDate: string | undefined = undefined;

            if (endDateType === 'date' && endDate) {
                finalEndDate = endDate;
            } else if (endDateType === 'occurrences' && occurrences) {
                const num = parseInt(occurrences);
                if (!isNaN(num) && num > 0) {
                    const start = new Date(date);
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
                type: type === 'transfer' ? 'expense' : type as TransactionType,
                accountId,
                frequency,
                startDate: date,
                nextDueDate: date,
                endDate: finalEndDate,
                active: true,
                isTransfer: type === 'transfer',
                toAccountId: type === 'transfer' ? toAccountId : undefined
            };

            if (initialData && 'frequency' in initialData) {
                // Editing existing
                if (versionMode === 'future') {
                    // 1. End the old rule yesterday
                    const yesterday = new Date(date);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    updateRecurringTransaction(initialData.id, { endDate: yesterdayStr });

                    // 2. Create new rule starting today
                    addRecurringTransaction({
                        id: crypto.randomUUID(),
                        ...recurringData,
                        startDate: date,
                        nextDueDate: date
                    });

                } else {
                    // Update all (in place)
                    updateRecurringTransaction(initialData.id, {
                        ...recurringData,
                        nextDueDate: initialData.nextDueDate !== date ? date : initialData.nextDueDate
                    });
                }
            } else {
                // Creating new
                addRecurringTransaction({
                    id: crypto.randomUUID(),
                    ...recurringData,
                    nextDueDate: date,
                });
            }
        } else {
            // Standard transaction or Transfer
            if (type === 'transfer') {
                addTransfer(accountId, toAccountId, parseFloat(amount), date, description);
            } else {
                const transactionData = {
                    amount: parseFloat(amount),
                    description,
                    type: type as TransactionType,
                    accountId,
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
        }
        closeForm();
    };

    const closeForm = () => {
        setAmount('');
        setDescription('');
        setIsRecurring(false);
        setIsVersionModalOpen(false);
        if (onClose) onClose();
    }

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
                <Modal
                    isOpen={isVersionModalOpen}
                    onClose={() => setIsVersionModalOpen(false)}
                    title={(t('settings.editRecurringTitle') || "Modifier la récurrence") as string}
                    footer={
                        <>
                            <Button
                                variant="secondary"
                                onClick={() => executeSubmit('future')}
                            >
                                {(t('settings.editRecurringFuture') || "Futures seulement") as string}
                            </Button>
                            <Button
                                onClick={() => executeSubmit('all')}
                            >
                                {(t('settings.editRecurringAll') || "Historique complet") as string}
                            </Button>
                        </>
                    }
                >
                    <p className="text-slate-600 dark:text-slate-300">
                        {(t('settings.editRecurringMessage') || "Vous modifiez une règle récurrente existante. Comment voulez-vous appliquer ces changements ?") as string}
                    </p>
                </Modal>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                            {error}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={type === 'expense' ? 'danger' : 'secondary'}
                            className="flex-1"
                            onClick={() => setType('expense')}
                        >
                            {t('form.expense') as string}
                        </Button>
                        <Button
                            type="button"
                            variant={type === 'income' ? 'primary' : 'secondary'}
                            className="flex-1"
                            onClick={() => setType('income')}
                        >
                            {t('form.income') as string}
                        </Button>
                        <Button
                            type="button"
                            variant={type === 'transfer' ? 'primary' : 'secondary'} // Use primary or a distinct color
                            className={`flex-1 ${type === 'transfer' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                            onClick={() => setType('transfer')}
                        >
                            {t('form.transfer') || 'Virement'}
                        </Button>
                    </div>

                    {/* Source Account */}
                    <div>
                        <AccountSelector
                            value={accountId}
                            onChange={setAccountId}
                            label={type === 'transfer' ? (t('form.transferSource') || "Compte Source") : t('form.account')}
                        />
                    </div>

                    {/* Destination Account (Transfer Only) */}
                    {type === 'transfer' && (
                        <div>
                            <AccountSelector
                                value={toAccountId}
                                onChange={setToAccountId}
                                label={t('form.transferDestination') || "Vers le compte"}
                            />
                        </div>
                    )}



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
                            {t('form.isRecurring') as string}
                        </label>
                    </div>

                    {isRecurring && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    {t('form.frequency') as string}
                                </label>
                                <select
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value as Frequency)}
                                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                                >
                                    <option value="monthly">{t('form.frequencies.monthly') as string}</option>
                                    <option value="weekly">{t('form.frequencies.weekly') as string}</option>
                                    <option value="daily">{t('form.frequencies.daily') as string}</option>
                                    <option value="yearly">{t('form.frequencies.yearly') as string}</option>
                                </select>
                            </div>

                            {/* Recurrence Duration */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    {t('form.duration') as string}
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
                                            {t('form.durationInfinite') as string}
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
                                            {t('form.durationDate') as string}
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
                                            {t('form.durationOccurrences') as string}
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
                                                <span className="text-sm text-slate-500">{t('form.times') as string}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <Button type="submit" className="w-full mt-4">
                        {(initialData ? t('form.save') : t('form.submit')) as string}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};
