import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { Account, RecurringTransaction, Transaction, AccountGroup } from '@/types';

interface BudgetState {
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  accounts: Account[];
  selectedAccountId: string | null;
  currentViewDate: Date;
  resetDay: number;
  setResetDay: (day: number) => void;

  // Supabase Sync
  isSyncing: boolean;
  initializeSync: () => Promise<void>;
  uploadLocalData: () => Promise<void>;

  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updated: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  importData: (data: Partial<BudgetState>) => void;

  addRecurringTransaction: (transaction: RecurringTransaction) => void;
  updateRecurringTransaction: (id: string, updated: Partial<RecurringTransaction>) => void;
  deleteRecurringTransaction: (id: string) => void;
  checkRecurringTransactions: () => void;
  addTransfer: (fromAccount: string, toAccount: string, amount: number, date: string, description?: string) => void;

  addAccount: (account: Account) => void;
  updateAccount: (id: string, updated: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  setSelectedAccount: (id: string) => void;

  accountGroups: AccountGroup[];
  addAccountGroup: (group: AccountGroup) => void;
  updateAccountGroup: (id: string, group: Partial<AccountGroup>) => void;
  deleteAccountGroup: (id: string) => void;

  setCurrentViewDate: (date: Date) => void;
  getBalance: (accountId?: string) => number;
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      transactions: [],
      recurringTransactions: [],
      accounts: [],
      selectedAccountId: null,
      currentViewDate: new Date(),
      accountGroups: [],
      resetDay: 1,
      isSyncing: false,

      // --- Supabase Sync Actions ---

      initializeSync: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        set({ isSyncing: true });

        // Fetch Accounts
        const { data: accounts } = await supabase.from('accounts').select('*');
        if (accounts) {
             const formattedAccounts = accounts.map(a => ({
                 id: a.id,
                 name: a.name,
                 type: a.type,
                 includeInTotal: a.include_in_total
             }));
             // Only overwrite if we found data (so we don't wipe local if offline/empty)
             // Actually, for sync, we should probably overwrite or merge. 
             // Simplest: Overwrite local with Cloud if Cloud has data.
             if (formattedAccounts.length > 0) {
                 set({ accounts: formattedAccounts });
                 if (!get().selectedAccountId) {
                     set({ selectedAccountId: formattedAccounts[0].id });
                 }
             }
        }

        // Fetch Transactions
        const { data: transactions } = await supabase.from('transactions').select('*');
        if (transactions) {
            const formattedTransactions = transactions.map(t => ({
                id: t.id,
                amount: t.amount,
                type: t.type,
                date: t.date,
                description: t.description,
                accountId: t.account_id,
                isRecurring: t.is_recurring,
                recurringId: t.recurring_id,
                isTransfer: t.is_transfer,
                linkedTransactionId: t.linked_transaction_id,
            }));
            if (formattedTransactions.length > 0) set({ transactions: formattedTransactions });
        }

        // Fetch Recurring
        const { data: recurring } = await supabase.from('recurring_transactions').select('*');
        if (recurring) {
            const formattedRecurring = recurring.map(r => ({
                id: r.id,
                amount: r.amount,
                type: r.type,
                description: r.description,
                frequency: r.frequency,
                startDate: r.start_date,
                nextDueDate: r.next_due_date,
                endDate: r.end_date,
                active: r.active,
                accountId: r.account_id,
                toAccountId: r.to_account_id,
                isTransfer: r.is_transfer
            }));
             if (formattedRecurring.length > 0) set({ recurringTransactions: formattedRecurring });
        }
        
        // Fetch Groups
        const { data: groups } = await supabase.from('account_groups').select('*');
        if (groups) {
             const formattedGroups = groups.map(g => ({
                 id: g.id,
                 name: g.name,
                 accountIds: g.account_ids || []
             }));
             if (formattedGroups.length > 0) set({ accountGroups: formattedGroups });
        }

        set({ isSyncing: false });
      },

      uploadLocalData: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        set({ isSyncing: true });
        
        const state = get();

        // Upload Accounts
        for (const acc of state.accounts) {
            await supabase.from('accounts').upsert({
                id: acc.id,
                user_id: user.id,
                name: acc.name,
                type: acc.type,
                include_in_total: acc.includeInTotal
            });
        }

        // Upload Transactions
        // Batching would be better but simple loop for v1
        const txPayloads = state.transactions.map(t => ({
            id: t.id,
            user_id: user.id,
            account_id: t.accountId,
            amount: t.amount,
            type: t.type,
            date: t.date,
            description: t.description,
            is_recurring: t.isRecurring,
            recurring_id: t.recurringId,
            is_transfer: t.isTransfer,
            linked_transaction_id: t.linkedTransactionId
        }));
        if (txPayloads.length > 0) await supabase.from('transactions').upsert(txPayloads);

        // Upload Recurring
        const recPayloads = state.recurringTransactions.map(r => ({
             id: r.id,
             user_id: user.id,
             account_id: r.accountId,
             to_account_id: r.toAccountId,
             amount: r.amount,
             type: r.type,
             description: r.description,
             frequency: r.frequency,
             start_date: r.startDate,
             next_due_date: r.nextDueDate,
             end_date: r.endDate,
             active: r.active,
             is_transfer: r.isTransfer
        }));
        if (recPayloads.length > 0) await supabase.from('recurring_transactions').upsert(recPayloads);
        
        // Upload Groups
        for (const g of state.accountGroups) {
            await supabase.from('account_groups').upsert({
                id: g.id,
                user_id: user.id,
                name: g.name,
                account_ids: g.accountIds
            });
        }
        
        set({ isSyncing: false });
      },

      // --- Actions with Side Effects ---

      addTransaction: async (transaction) => {
        set((state) => ({ transactions: [...state.transactions, transaction] }));
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('transactions').insert({
                id: transaction.id,
                user_id: user.id,
                account_id: transaction.accountId,
                amount: transaction.amount,
                type: transaction.type,
                date: transaction.date,
                description: transaction.description,
                is_recurring: transaction.isRecurring,
                recurring_id: transaction.recurringId,
                is_transfer: transaction.isTransfer,
                linked_transaction_id: transaction.linkedTransactionId
            });
        }
      },

      updateTransaction: async (id, updated) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updated } : t
          ),
        }));
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
             // Map frontend generic partial to DB specific fields if needed
             const payload: any = { ...updated };
             if (updated.accountId) payload.account_id = updated.accountId;
             if (updated.isRecurring) payload.is_recurring = updated.isRecurring;
             if (updated.recurringId) payload.recurring_id = updated.recurringId;
             
             await supabase.from('transactions').update(payload).eq('id', id);
        }
      },

      deleteTransaction: async (id) => {
        // Optimistic delete
        let linkedDeletedId: string | undefined;
        set((state) => {
          const transaction = state.transactions.find((t) => t.id === id);
          if (transaction && transaction.linkedTransactionId) {
             linkedDeletedId = transaction.linkedTransactionId;
             return {
                transactions: state.transactions.filter((t) => t.id !== id && t.id !== transaction.linkedTransactionId),
             };
          }
          return {
            transactions: state.transactions.filter((t) => t.id !== id),
          };
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('transactions').delete().eq('id', id);
            if (linkedDeletedId) {
                await supabase.from('transactions').delete().eq('id', linkedDeletedId);
            }
        }
      },

      addRecurringTransaction: async (transaction) => {
        set((state) => ({ recurringTransactions: [...state.recurringTransactions, transaction] }));
        get().checkRecurringTransactions();

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('recurring_transactions').insert({
                id: transaction.id,
                user_id: user.id,
                account_id: transaction.accountId,
                to_account_id: transaction.toAccountId,
                amount: transaction.amount,
                type: transaction.type,
                description: transaction.description,
                frequency: transaction.frequency,
                start_date: transaction.startDate,
                next_due_date: transaction.nextDueDate,
                end_date: transaction.endDate,
                active: transaction.active,
                is_transfer: transaction.isTransfer
            });
        }
      },

      updateRecurringTransaction: async (id, updated) => {
        set((state) => ({
          recurringTransactions: state.recurringTransactions.map((t) =>
            t.id === id ? { ...t, ...updated } : t
          ),
        }));
        get().checkRecurringTransactions();

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
             const payload: any = { ...updated };
             if (payload.startDate) payload.start_date = payload.startDate;
             if (payload.nextDueDate) payload.next_due_date = payload.nextDueDate;
             if (payload.endDate) payload.end_date = payload.endDate;
             if (payload.accountId) payload.account_id = payload.accountId;

            await supabase.from('recurring_transactions').update(payload).eq('id', id);
        }
      },

      deleteRecurringTransaction: async (id) => {
        set((state) => ({
          recurringTransactions: state.recurringTransactions.filter((t) => t.id !== id),
        }));
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('recurring_transactions').delete().eq('id', id);
        }
      },

      addAccount: async (account) => {
        set((state) => ({ accounts: [...state.accounts, account] }));
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('accounts').insert({
                id: account.id,
                user_id: user.id,
                name: account.name,
                type: account.type,
                include_in_total: account.includeInTotal
            });
        }
      },

      updateAccount: async (id, updated) => {
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === id ? { ...a, ...updated } : a
          ),
        }));
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
             const payload: any = { ...updated };
             if (payload.includeInTotal !== undefined) payload.include_in_total = payload.includeInTotal;
            await supabase.from('accounts').update(payload).eq('id', id);
        }
      },

      deleteAccount: async (id) => {
        set((state) => {
          const newAccounts = state.accounts.filter((a) => a.id !== id);
          let newSelectedId = state.selectedAccountId;
          if (state.selectedAccountId === id) {
            newSelectedId = newAccounts.length > 0 ? newAccounts[0].id : null;
          }
          return {
            accounts: newAccounts,
            selectedAccountId: newSelectedId
          };
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('accounts').delete().eq('id', id);
        }
      },
      
      addAccountGroup: async (group) => {
           set((state) => ({ accountGroups: [...state.accountGroups, group] }));
           
           const { data: { user } } = await supabase.auth.getUser();
           if (user) {
               await supabase.from('account_groups').insert({
                   id: group.id,
                   user_id: user.id,
                   name: group.name,
                   account_ids: group.accountIds
               });
           }
      },
      
      updateAccountGroup: async (id, updated) => {
          set((state) => ({
              accountGroups: state.accountGroups.map((g) =>
                g.id === id ? { ...g, ...updated } : g
              ),
            }));
            
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const payload: any = { ...updated };
                if (payload.accountIds) payload.account_ids = payload.accountIds;
                await supabase.from('account_groups').update(payload).eq('id', id);
            }
      },
      
      deleteAccountGroup: async (id) => {
          set((state) => ({
              accountGroups: state.accountGroups.filter((g) => g.id !== id),
            }));
            
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('account_groups').delete().eq('id', id);
            }
      },


      setSelectedAccount: (id: string) => set({ selectedAccountId: id }),

      importData: (data) =>
        set(() => ({
          transactions: data.transactions || [],
          recurringTransactions: data.recurringTransactions || [],
          accountGroups: data.accountGroups || [],
          accounts: data.accounts || [],
        })),

      setResetDay: (day) => set({ resetDay: day }),

      setCurrentViewDate: (date) => set({ currentViewDate: date }),

      addTransfer: (fromAccount, toAccount, amount, date, description) => {
        const expenseId = crypto.randomUUID();
        const incomeId = crypto.randomUUID();

        const expenseTx: Transaction = {
          id: expenseId,
          amount,
          type: 'expense',
          date,
          description: description || 'Transfer Out',
          accountId: fromAccount,
          isRecurring: false,
          isTransfer: true,
          linkedTransactionId: incomeId
        };

        const incomeTx: Transaction = {
          id: incomeId,
          amount,
          type: 'income',
          date,
          description: description || 'Transfer In',
          accountId: toAccount,
          isRecurring: false,
          isTransfer: true,
          linkedTransactionId: expenseId
        };
        
        // We reuse the single-add actions but they are async now.
        // Calling get().addTransaction(...) directly.
        get().addTransaction(expenseTx);
        get().addTransaction(incomeTx);
      },

      checkRecurringTransactions: () => {
        const { recurringTransactions, addTransaction, updateRecurringTransaction, addTransfer } = get();
        const today = new Date();

        recurringTransactions.forEach((rt) => {
          if (!rt.active) return;

          const nextDue = new Date(rt.nextDueDate);
          let updated = false;
          const endDate = rt.endDate ? new Date(rt.endDate) : null;

          while (nextDue <= today) {
            if (endDate && nextDue > endDate) {
              updated = true;
              break;
            }

            if (rt.isTransfer && rt.toAccountId) {
                addTransfer(
                    rt.accountId,
                    rt.toAccountId,
                    rt.amount,
                    nextDue.toISOString().split('T')[0],
                    rt.description
                );
            } else {
                addTransaction({
                  id: crypto.randomUUID(),
                  amount: rt.amount,
                  description: rt.description,
                  type: rt.type,
                  accountId: rt.accountId,
                  date: nextDue.toISOString().split('T')[0],
                  isRecurring: true,
                });
            }

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
        recurringTransactions: state.recurringTransactions,
        resetDay: state.resetDay,
        accounts: state.accounts,
        selectedAccountId: state.selectedAccountId,
        accountGroups: state.accountGroups,
      }),
    }
  )
);
