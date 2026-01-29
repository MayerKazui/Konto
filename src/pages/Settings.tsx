import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { Trash2, AlertTriangle, Download, Upload, Languages, Pencil } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { TransactionForm } from '@/components/TransactionForm';
import type { RecurringTransaction } from '@/types';

export const Settings = () => {
    const { t, i18n } = useTranslation();
    const { transactions, categories, recurringTransactions } = useBudgetStore();

    // Edit state
    const [editingRule, setEditingRule] = useState<RecurringTransaction | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const handleEditRule = (rule: RecurringTransaction) => {
        setEditingRule(rule);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingRule(null);
    };

    const handleClearData = () => {
        if (confirm(t('settings.clearConfirm'))) {
            localStorage.removeItem('budget-storage');
            window.location.reload();
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const importData = useBudgetStore((state) => state.importData);

    const handleExport = () => {
        const data = {
            transactions,
            categories,
            recurringTransactions,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `konto-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content);

                if (!data.transactions || !data.categories) {
                    throw new Error('Format de fichier invalide');
                }

                if (confirm(t('settings.importConfirm', { count: data.transactions.length, categories: data.categories.length }))) {
                    importData(data);
                    alert(t('settings.importSuccess'));
                }
            } catch (error) {
                alert(t('settings.importError'));
                console.error(error);
            }
        };
        reader.readAsText(file);
        // Reset input
        event.target.value = '';
    };

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="space-y-6 relative">
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <TransactionForm onClose={handleCloseForm} initialData={editingRule} />
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{t('settings.title')}</h2>
                <p className="text-slate-500 dark:text-slate-400">{t('settings.subtitle')}</p>
            </div>

            <div className="space-y-4">
                {/* Language Switcher */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Languages className="h-5 w-5" />
                            {t('settings.language')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t('settings.appLanguage')}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.languageSubtitle')}</p>
                            </div>
                            <select
                                value={i18n.resolvedLanguage}
                                onChange={(e) => changeLanguage(e.target.value)}
                                className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                            >
                                <option value="fr">Français</option>
                                <option value="en">English</option>
                                <option value="es">Español</option>
                                <option value="it">Italiano</option>
                                <option value="de">Deutsch</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('settings.budgetCycle')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {t('settings.resetDay')}
                            </label>
                            <p className="text-sm text-slate-500 mb-2">
                                {t('settings.resetDaySubtitle')}
                            </p>
                            <select
                                value={useBudgetStore((s) => s.resetDay)}
                                onChange={(e) => useBudgetStore.getState().setResetDay(parseInt(e.target.value))}
                                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                            >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                    <option key={day} value={day}>
                                        {t('settings.dayOfMonth', { day })}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('settings.appearance')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-slate-100">{t('settings.theme')}</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.themeSubtitle')}</p>
                            </div>
                            <ThemeToggle />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('settings.recurringRules')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {recurringTransactions.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.noRecurringRules')}</p>
                        ) : (
                            <div className="space-y-2">
                                {recurringTransactions.map((recurringTransaction) => {
                                    const category = categories.find(c => c.id === recurringTransaction.categoryId);
                                    // Translate frequency if mapped, otherwise raw
                                    const freqLabel = t(`form.frequencies.${recurringTransaction.frequency}`);

                                    return (
                                        <div key={recurringTransaction.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg gap-3 sm:gap-0">
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-slate-100">{recurringTransaction.description || category?.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {recurringTransaction.amount.toFixed(2)} € • {freqLabel}
                                                    {recurringTransaction.endDate && ` • ${t('settings.until')} ${format(parseISO(recurringTransaction.endDate), 'dd/MM/yyyy')}`}
                                                    {' • '}{t('settings.predictedOn')}: {format(parseISO(recurringTransaction.nextDueDate), 'dd/MM/yyyy')}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-slate-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400"
                                                    onClick={() => handleEditRule(recurringTransaction)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    onClick={() => {
                                                        if (confirm(t('settings.deleteRuleConfirm'))) {
                                                            useBudgetStore.getState().deleteRecurringTransaction(recurringTransaction.id)
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('settings.backupRestore')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50 shadow-sm">
                            <div>
                                <h4 className="font-medium text-slate-900">{t('settings.export')} / {t('settings.import')}</h4>
                                <p className="text-sm text-slate-500 mt-1">
                                    {t('settings.backupSubtitle')}
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                                <Button variant="secondary" size="sm" onClick={handleExport} className="w-full sm:w-auto">
                                    <Download className="w-4 h-4 mr-2" />
                                    {t('settings.export')}
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
                                    <Upload className="w-4 h-4 mr-2" />
                                    {t('settings.import')}
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".json"
                                    onChange={handleImport}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('settings.dataManagement')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
                            <div>
                                <h4 className="font-medium text-slate-900">{t('settings.appStats')}</h4>
                                <p className="text-sm text-slate-500 mt-1">
                                    {t('settings.statsDetail', { transactions: transactions.length, categories: categories.length, rules: recurringTransactions.length })}
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-start gap-4 p-4 rounded-lg bg-red-50 text-red-900">
                                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-medium">{t('settings.dangerZone')}</h4>
                                    <p className="text-sm text-red-700 mt-1 mb-3">
                                        {t('settings.dangerMessage')}
                                    </p>
                                    <Button variant="danger" onClick={handleClearData} className="w-full sm:w-auto">
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        {t('settings.clearAll')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
};
