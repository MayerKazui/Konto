import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Account, Category, RecurringTransaction, Transaction, AccountGroup } from '@/types';
interface BudgetState {
  transactions: Transaction[];
  categories: Category[];
  recurringTransactions: RecurringTransaction[];
  
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  
  addCategory: (category: Category) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  addRecurringTransaction: (transaction: RecurringTransaction) => void;
  updateRecurringTransaction: (id: string, transaction: Partial<RecurringTransaction>) => void;
  deleteRecurringTransaction: (id: string) => void;

  importData: (data: { transactions: Transaction[]; categories: Category[]; recurringTransactions: RecurringTransaction[]; accountGroups?: AccountGroup[] }) => void;
  
  resetDay: number;
  setResetDay: (day: number) => void;
  checkRecurringTransactions: () => void;

  // Account State
  accounts: Account[];
  selectedAccountId: string | null;
  addAccount: (account: Account) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  setSelectedAccount: (id: string) => void;

  // Account Groups
  accountGroups: AccountGroup[];
  addAccountGroup: (group: AccountGroup) => void;
  updateAccountGroup: (id: string, group: Partial<AccountGroup>) => void;
  deleteAccountGroup: (id: string) => void;

  // View State
  currentViewDate: Date;
  setCurrentViewDate: (date: Date) => void;

  // Helpers
  getBalance: (accountId?: string) => number;
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      transactions: [],
      categories: [
        { id: '1', name: 'Salary', type: 'income', color: '#10b981' },
        { id: '2', name: 'Housing', type: 'expense', color: '#ef4444' },
        { id: '3', name: 'Food', type: 'expense', color: '#f59e0b' },
        { id: '4', name: 'Transport', type: 'expense', color: '#3b82f6' },
        { id: '5', name: 'Entertainment', type: 'expense', color: '#8b5cf6' },
      ],
      recurringTransactions: [],
      // Account State
      accounts: [],
      selectedAccountId: null,
      currentViewDate: new Date(),

      addTransaction: (transaction) =>
        set((state) => ({ transactions: [...state.transactions, transaction] })),
      updateTransaction: (id, updated) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updated } : t
          ),
        })),
      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),

      addCategory: (category) =>
        set((state) => ({ categories: [...state.categories, category] })),
      updateCategory: (id, updated) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updated } : c
          ),
        })),
      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        })),

      addRecurringTransaction: (transaction) => {
        set((state) => ({ recurringTransactions: [...state.recurringTransactions, transaction] }));
        get().checkRecurringTransactions();
      },
      updateRecurringTransaction: (id, updated) => {
        set((state) => ({
            recurringTransactions: state.recurringTransactions.map((t) =>
            t.id === id ? { ...t, ...updated } : t
          ),
        }));
        get().checkRecurringTransactions();
      },
      deleteRecurringTransaction: (id) =>
        set((state) => ({
            recurringTransactions: state.recurringTransactions.filter((t) => t.id !== id),
        })),

      // Account Actions
      addAccount: (account) =>
        set((state) => ({ accounts: [...state.accounts, account] })),
      updateAccount: (id, updated) =>
        set((state) => ({
            accounts: state.accounts.map((a) =>
            a.id === id ? { ...a, ...updated } : a
          ),
        })),
      deleteAccount: (id) =>
        set((state) => {
            const newAccounts = state.accounts.filter((a) => a.id !== id);
            // If we deleted the selected account, select the first available one or null
            let newSelectedId = state.selectedAccountId;
            if (state.selectedAccountId === id) {
                newSelectedId = newAccounts.length > 0 ? newAccounts[0].id : null;
            }
            return {
                accounts: newAccounts,
                selectedAccountId: newSelectedId
            };
        }),
      
      setSelectedAccount: (id: string) => set({ selectedAccountId: id }),

      // Account Groups
      accountGroups: [],
      addAccountGroup: (group) =>
        set((state) => ({ accountGroups: [...state.accountGroups, group] })),
      updateAccountGroup: (id, updated) =>
        set((state) => ({
            accountGroups: state.accountGroups.map((g) =>
            g.id === id ? { ...g, ...updated } : g
          ),
        })),
      deleteAccountGroup: (id) =>
        set((state) => ({
            accountGroups: state.accountGroups.filter((g) => g.id !== id),
        })),

      importData: (data) =>
        set(() => ({
          transactions: data.transactions || [],
          categories: data.categories || [],
          recurringTransactions: data.recurringTransactions || [],
          accountGroups: data.accountGroups || [], // Import groups
          accounts: [], 
        })),

      resetDay: 1,
      setResetDay: (day) => set({ resetDay: day }),
      
      setCurrentViewDate: (date) => set({ currentViewDate: date }),

      checkRecurringTransactions: () => {
        const { recurringTransactions, addTransaction, updateRecurringTransaction } = get();
        const today = new Date();
        
        recurringTransactions.forEach((rt) => {
            if (!rt.active) return;
            
            let nextDue = new Date(rt.nextDueDate);
            let updated = false;

            // Check if we passed the end date
            const endDate = rt.endDate ? new Date(rt.endDate) : null;

            while (nextDue <= today) {
                if (endDate && nextDue > endDate) {
                    updated = true; 
                    break;
                }

                // generate transaction
                addTransaction({
                    id: crypto.randomUUID(),
                    amount: rt.amount,
                    description: rt.description,
                    type: rt.type,
                    categoryId: rt.categoryId,
                    accountId: rt.accountId, 
                    date: nextDue.toISOString().split('T')[0],
                    isRecurring: true,
                });

                // Calculate next date
                if (rt.frequency === 'daily') nextDue.setDate(nextDue.getDate() + 1);
                if (rt.frequency === 'weekly') nextDue.setDate(nextDue.getDate() + 7);
                if (rt.frequency === 'monthly') nextDue.setMonth(nextDue.getMonth() + 1);
                if (rt.frequency === 'yearly') nextDue.setFullYear(nextDue.getFullYear() + 1);
                
                updated = true;
            }

            if (updated) {
                 updateRecurringTransaction(rt.id, { 
                     nextDueDate: nextDue.toISOString().split('T')[0],
                     active: endDate ? nextDue <= endDate : true 
                 });
            }
        });
      },
        
      getBalance: (accountId?: string) => {
        const { transactions, selectedAccountId } = get();
        // If accountId is provided, filter by it.
        // If accountId is explicit 'all', sum everything.
        // If no accountId provided, fallback to selectedAccountId. If that is null, maybe sum all? 
        // Logic: specific ID > 'all' check > selectedAccountId > all
        
        const targetAccountId = accountId || selectedAccountId;

        return transactions.reduce((acc, t) => {
          if (targetAccountId && targetAccountId !== 'all' && t.accountId !== targetAccountId) return acc;
          return t.type === 'income' ? acc + t.amount : acc - t.amount;
        }, 0);
      }
    }),
    {
      name: 'budget-storage',
      partialize: (state) => ({
          transactions: state.transactions,
          categories: state.categories,
          recurringTransactions: state.recurringTransactions,
          resetDay: state.resetDay,
          accounts: state.accounts,
          selectedAccountId: state.selectedAccountId,
          accountGroups: state.accountGroups,
      }),
      onRehydrateStorage: () => (state) => {
          if (!state) return;
          
          // Migration: Initialize default account if none exist
          if (!state.accounts || state.accounts.length === 0) {
              const defaultAccount: Account = {
                  id: 'default',
                  name: 'Compte Principal',
                  type: 'checking',
                  includeInTotal: true,
              };
              state.accounts = [defaultAccount];
          }
          
          if (!state.selectedAccountId && state.accounts.length > 0) {
              state.selectedAccountId = state.accounts[0].id;
          }

          const defaultAccountId = state.accounts[0].id;

          // Migration: Assign transactions without accountId to default
          let transactionsUpdated = false;
          const updatedTransactions = state.transactions.map(t => {
              if (!t.accountId) {
                  transactionsUpdated = true;
                  return { ...t, accountId: defaultAccountId };
              }
              return t;
          });

          // Migration: Assign recurring transactions without accountId to default
          let recurringUpdated = false;
          const updatedRecurring = state.recurringTransactions.map(rt => {
              if (!rt.accountId) {
                  recurringUpdated = true;
                  return { ...rt, accountId: defaultAccountId };
              }
              return rt;
          });

          // Apply updates if migration occurred
          if (transactionsUpdated || recurringUpdated) {
            // We can't use 'set' here directly easily as it's outside the hook scope mostly,
            // but mutating state in onRehydrate works for zustand persist (usually).
            // However, a safer way might be to just assign.
            state.transactions = updatedTransactions;
            state.recurringTransactions = updatedRecurring;
          }
      }
    }
  )
);
