import { useBudgetStore } from '@/stores/useBudgetStore';
import { useTranslation } from 'react-i18next';

interface AccountSelectorProps {
    value?: string;
    onChange: (value: string) => void;
    label?: string; // Optional custom label
}

export const AccountSelector = ({ value, onChange, label }: AccountSelectorProps) => {
    const { t } = useTranslation();
    const { accounts } = useBudgetStore();

    // If no accounts exist, render a placeholder or disabled state
    if (!accounts || accounts.length === 0) {
        return (
            <div className="space-y-1">
                {label && (
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        {label}
                    </label>
                )}
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-md border border-red-200 dark:border-red-800">
                    {t('form.noAccounts') || "Aucun compte trouvé. Veuillez créer un compte d'abord."}
                </div>
            </div>
        );
    }

    const labelText = label !== undefined ? label : (t('form.account') || "Compte");

    return (
        <div className="space-y-1">
            {labelText && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {labelText}
                </label>
            )}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            >
                <option value="" disabled>{t('form.selectAccount') || "Sélectionner un compte"}</option>
                {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                        {account.name}
                    </option>
                ))}
            </select>
        </div>
    );
};
