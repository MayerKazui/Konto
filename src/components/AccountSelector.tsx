import { useBudgetStore } from '@/stores/useBudgetStore';
import { useTranslation } from 'react-i18next';

interface AccountSelectorProps {
    value?: string;
    onChange: (value: string) => void;
}

export const AccountSelector = ({ value, onChange }: AccountSelectorProps) => {
    const { t } = useTranslation();
    const { accounts } = useBudgetStore();

    // If no accounts exist (edge case before rehydration), don't render or render placeholder
    if (!accounts || accounts.length === 0) return null;

    return (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('form.account') || "Compte"}
            </label>
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
