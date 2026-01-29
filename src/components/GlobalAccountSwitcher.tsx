import { useBudgetStore } from '@/stores/useBudgetStore';
import { Wallet } from 'lucide-react';

export const GlobalAccountSwitcher = () => {
    const { accounts, selectedAccountId, setSelectedAccount } = useBudgetStore();

    if (!accounts || accounts.length === 0) return null;

    return (
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-md px-3 py-1.5">
            <Wallet className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <select
                value={selectedAccountId || ''}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
            >
                {accounts.map((account) => (
                    <option key={account.id} value={account.id} className="bg-white dark:bg-slate-900">
                        {account.name}
                    </option>
                ))}
            </select>
        </div>
    );
};
