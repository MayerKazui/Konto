import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { Languages, Download, Upload, Trash2, AlertTriangle, Wallet, Plus, Pencil, CreditCard } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { TransactionForm } from '@/components/TransactionForm';
import type { RecurringTransaction } from '@/types';

export const Settings = () => {
    const { t, i18n } = useTranslation();
    const { transactions, recurringTransactions, accounts, selectedAccountId } = useBudgetStore();

    const filteredRecurringTransactions = recurringTransactions.filter(rt =>
        selectedAccountId ? rt.accountId === selectedAccountId : true
    );

    // Edit state
    const [editingRule, setEditingRule] = useState<RecurringTransaction | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Account Modal State
    const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
    const [newAccountName, setNewAccountName] = useState('');

    const handleEditRule = (rule: RecurringTransaction) => {
        setEditingRule(rule);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingRule(null);
    };

    const handleAddAccount = () => {
        if (newAccountName.trim()) {
            useBudgetStore.getState().addAccount({
                id: crypto.randomUUID(),
                name: newAccountName.trim(),
                type: 'checking',
                includeInTotal: true,
            });
            setNewAccountName('');
            setIsAddAccountModalOpen(false);
        }
    };

    // Group Modal State
    const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedGroupAccounts, setSelectedGroupAccounts] = useState<string[]>([]);

    const handleAddGroup = () => {
        if (newGroupName.trim() && selectedGroupAccounts.length > 0) {
            useBudgetStore.getState().addAccountGroup({
                id: crypto.randomUUID(),
                name: newGroupName.trim(),
                accountIds: selectedGroupAccounts
            });
            setNewGroupName('');
            setSelectedGroupAccounts([]);
            setIsAddGroupModalOpen(false);
        }
    };

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'primary';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    const openConfirm = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'primary' = 'danger') => {
        setConfirmModal({ isOpen: true, title, message, onConfirm, variant });
    };

    const handleClearData = () => {
        openConfirm(
            t('settings.clearAll'),
            t('settings.clearConfirm'),
            () => {
                localStorage.removeItem('budget-storage');
                window.location.reload();
            }
        );
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const importData = useBudgetStore((state) => state.importData);

    const handleExport = () => {
        const data = {
            transactions,
            recurringTransactions,
            accountGroups: useBudgetStore.getState().accountGroups,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `konto - backup - ${new Date().toISOString().split('T')[0]}.json`;
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

                if (!data.transactions) {
                    throw new Error('Format de fichier invalide');
                }

                openConfirm(
                    t('settings.import'),
                    t('settings.importConfirm', { count: data.transactions.length }),
                    () => {
                        importData(data);
                        alert(t('settings.importSuccess'));
                    },
                    'primary'
                );
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

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
            />

            <Modal
                isOpen={isAddAccountModalOpen}
                onClose={() => setIsAddAccountModalOpen(false)}
                title={t('settings.addAccount') || "Ajouter un compte"}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsAddAccountModalOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleAddAccount} disabled={!newAccountName.trim()}>
                            {t('form.submit') || "Ajouter"}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {t('settings.accountNamePrompt') || "Nom du compte:"}
                        </label>
                        <input
                            type="text"
                            value={newAccountName}
                            onChange={(e) => setNewAccountName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ex: Épargne"
                            autoFocus
                        />
                    </div>
                </div>
            </Modal>

            {/* Account Group Modal */}
            <Modal
                isOpen={isAddGroupModalOpen}
                onClose={() => {
                    setIsAddGroupModalOpen(false);
                    setNewGroupName('');
                    setSelectedGroupAccounts([]);
                }}
                title={t('settings.createGroup') || "Créer un groupe"}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsAddGroupModalOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleAddGroup} disabled={!newGroupName.trim() || selectedGroupAccounts.length === 0}>
                            {t('form.create') || "Créer"}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {t('settings.groupName') || "Nom du groupe:"}
                        </label>
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ex: Quotidien"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {t('settings.selectAccounts') || "Sélectionner les comptes:"}
                        </label>
                        <div className="max-h-40 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-800 rounded-md p-2">
                            {accounts.map(account => (
                                <label key={account.id} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedGroupAccounts.includes(account.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedGroupAccounts([...selectedGroupAccounts, account.id]);
                                            } else {
                                                setSelectedGroupAccounts(selectedGroupAccounts.filter(id => id !== account.id));
                                            }
                                        }}
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">{account.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{t('settings.title')}</h2>
                <p className="text-slate-500 dark:text-slate-400">{t('settings.subtitle')}</p>
            </div>

            <div className="space-y-4">
                {/* Account Management Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                {t('settings.accounts')}
                            </div>
                            <Button size="sm" onClick={() => setIsAddAccountModalOpen(true)} className="w-full sm:w-auto">
                                <Plus className="w-4 h-4 mr-2" />
                                {t('settings.addAccount')}
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {accounts?.map((account) => (
                            <div key={account.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-slate-100">{account.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{account.type}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        onClick={() => {
                                            openConfirm(
                                                t('settings.deleteAccountConfirm') || "Supprimer ce compte ?",
                                                t('settings.deleteAccountMessage'),
                                                () => useBudgetStore.getState().deleteAccount(account.id)
                                            );
                                        }}
                                        disabled={useBudgetStore.getState().accounts.length <= 1}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Language Switcher */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Languages className="h-5 w-5" />
                            {t('settings.language')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t('settings.appLanguage')}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.languageSubtitle')}</p>
                            </div>
                            <select
                                value={i18n.resolvedLanguage}
                                onChange={(e) => changeLanguage(e.target.value)}
                                className="w-full sm:w-auto rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
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

                {/* Account Groups Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Wallet className="h-5 w-5" />
                                {t('settings.accountGroups') || "Groupes de comptes"}
                            </div>
                            <Button size="sm" onClick={() => setIsAddGroupModalOpen(true)} className="w-full sm:w-auto">
                                <Plus className="w-4 h-4 mr-2" />
                                {t('settings.addGroup') || "Créer un groupe"}
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {useBudgetStore.getState().accountGroups.map((group) => (
                            <div key={group.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-slate-100">{group.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {group.accountIds.length} {t('settings.accounts') || "comptes"}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => {
                                        openConfirm(
                                            t('settings.deleteGroupTitle') || "Supprimer ce groupe ?",
                                            t('settings.deleteGroupMessage'),
                                            () => useBudgetStore.getState().deleteAccountGroup(group.id)
                                        );
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        {useBudgetStore.getState().accountGroups.length === 0 && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Aucun groupe créé.</p>
                        )}
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
                        {filteredRecurringTransactions.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.noRecurringRules')}</p>
                        ) : (
                            <div className="space-y-2">
                                {filteredRecurringTransactions.map((recurringTransaction) => {
                                    // Translate frequency if mapped, otherwise raw
                                    const freqLabel = t(`form.frequencies.${recurringTransaction.frequency}`);

                                    return (
                                        <div key={recurringTransaction.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg gap-3 sm:gap-0">
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-slate-100">{recurringTransaction.description}</p>
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
                                                        openConfirm(
                                                            t('settings.deleteRuleConfirm'),
                                                            t('settings.deleteRuleMessage'),
                                                            () => useBudgetStore.getState().deleteRecurringTransaction(recurringTransaction.id)
                                                        );
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
                                    {t('settings.statsDetail', { transactions: transactions.length, rules: filteredRecurringTransactions.length })}
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
