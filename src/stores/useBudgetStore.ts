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
  clearAllData: () => Promise<void>;

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

  savingsGoals: import('@/types').SavingsGoal[];
  addSavingsGoal: (goal: import('@/types').SavingsGoal) => void;
  updateSavingsGoal: (id: string, goal: Partial<import('@/types').SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;

  setCurrentViewDate: (date: Date) => void;
  getBalance: (accountId?: string) => number;

  // Notification State
  notification: { message: string, type: 'success' | 'error' | 'info' | 'warning', id: string } | null;
  notify: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
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
      savingsGoals: [],
      resetDay: 1,
      isSyncing: false,
      notification: null,

      notify: (message, type = 'info') => set({ notification: { message, type, id: Math.random().toString() } }),

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
        const { data: recurringData } = await supabase.from('recurring_transactions').select('*');
        if (recurringData) {
          const formattedRecurring = recurringData.map(r => ({
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
            isTransfer: r.is_transfer,
            interval: r.interval
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

        // Fetch Savings Goals
        const { data: goals } = await supabase.from('savings_goals').select('*');
        if (goals) {
          const formattedGoals = goals.map(g => ({
            id: g.id,
            name: g.name,
            targetAmount: g.target_amount,
            currentAmount: g.current_amount,
            deadline: g.deadline,
            color: g.color
          }));
          if (formattedGoals.length > 0) set({ savingsGoals: formattedGoals });
        }

        // Ensure at least one account exists
        const { accounts: currentAccounts } = get();
        if (currentAccounts.length === 0) {
             const defaultAccount: Account = {
                 id: crypto.randomUUID(),
                 name: 'Compte Principal',
                 type: 'checking',
                 includeInTotal: true
             };
             get().addAccount(defaultAccount);
        }

        set({ isSyncing: false });
      },

      clearAllData: async () => {
          set({ isSyncing: true });
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
              try {
                  await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                  await supabase.from('recurring_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                  await supabase.from('account_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                  await supabase.from('savings_goals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                  await supabase.from('accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                  get().notify("Données cloud supprimées", "success");
              } catch (err) {
                  console.error("Clear Data Error:", err);
                  get().notify("Erreur lors de la suppression cloud", "error");
              }
          }

          set({
              transactions: [],
              recurringTransactions: [],
              accounts: [],
              selectedAccountId: null,
              accountGroups: [],
              savingsGoals: [],
              isSyncing: false
          });

          const defaultAccount: Account = {
              id: crypto.randomUUID(),
              name: 'Compte Principal',
              type: 'checking',
              includeInTotal: true
          };
          get().addAccount(defaultAccount);

          get().notify("Données réinitialisées", "success");
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
          is_transfer: r.isTransfer,
          interval: r.interval
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

        // Upload Savings Goals
        for (const sg of state.savingsGoals) {
           await supabase.from('savings_goals').upsert({
               id: sg.id,
               user_id: user.id,
               name: sg.name,
               target_amount: sg.targetAmount,
               current_amount: sg.currentAmount,
               deadline: sg.deadline,
               color: sg.color
           });
        }

        set({ isSyncing: false });
        get().notify("Données envoyées au cloud", "success");
      },

      // --- Actions with Side Effects ---

      addTransaction: async (transaction) => {
        set((state) => ({ transactions: [...state.transactions, transaction] }));

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          try {
            const { error } = await supabase.from('transactions').insert({
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
            if (error) {
              console.error("Supabase Add Transaction Error:", error);
              get().notify("Erreur de synchronisation", "error");
            } else {
              get().notify("Sauvegardé (Cloud)", "success");
            }
          } catch (err) {
            console.error("Supabase Add Transaction Exception:", err);
            get().notify("Erreur de connexion", "error");
          }
        } else {
          get().notify("Sauvegardé (Local)", "info");
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
          const payload: Record<string, unknown> = { ...updated };
          if (updated.accountId) payload.account_id = updated.accountId;
          if (updated.isRecurring) payload.is_recurring = updated.isRecurring;
          if (updated.recurringId) payload.recurring_id = updated.recurringId;

          try {
            const { error } = await supabase.from('transactions').update(payload).eq('id', id);
            if (error) {
              console.error("Supabase Update Transaction Error:", error);
              get().notify("Erreur de mise à jour (Cloud)", "error");
            } else {
              get().notify("Mise à jour réussie (Cloud)", "success");
            }
          } catch (err) {
            console.error("Supabase Update Transaction Exception:", err);
            get().notify("Erreur de connexion", "error");
          }
        } else {
          get().notify("Mise à jour locale", "info");
        }
      },

      deleteTransaction: async (id) => {
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
          try {
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            if (linkedDeletedId) {
              await supabase.from('transactions').delete().eq('id', linkedDeletedId);
            }
            if (error) {
              get().notify("Erreur de suppression (Cloud)", "error");
            } else {
              get().notify("Supprimé (Cloud)", "success");
            }
          } catch (err) { console.error("Supabase Delete Error:", err); get().notify("Erreur de connexion", "error"); }
        } else {
          get().notify("Supprimé (Local)", "info");
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
            is_transfer: transaction.isTransfer,
            interval: transaction.interval // Add interval to payload
          });
        }
      },

      updateRecurringTransaction: async (id, updated) => {
        const { recurringTransactions } = get();
        const oldRT = recurringTransactions.find(t => t.id === id);

        // 1. Propagate changes to child transactions (History Update) - PRE-UPDATE
        // We do this BEFORE updating the rule and running checkRecurringTransactions
        // to ensure the transactions are already at their new dates/values so checkRecurring doesn't create duplicates.
        if (oldRT) {
            const propUpdates: Record<string, unknown> = {};
            let shouldPropagate = false;
            let daysDiff = 0;

            // Check for sensitive changes
            if (updated.amount !== undefined && updated.amount !== oldRT.amount) { propUpdates.amount = updated.amount; shouldPropagate = true; }
            if (updated.description !== undefined && updated.description !== oldRT.description) { propUpdates.description = updated.description; shouldPropagate = true; }
            if (updated.accountId !== undefined && updated.accountId !== oldRT.accountId) { propUpdates.accountId = updated.accountId; shouldPropagate = true; }
            if (updated.toAccountId !== undefined && updated.toAccountId !== oldRT.toAccountId) { propUpdates.toAccountId = updated.toAccountId; shouldPropagate = true; }
            
                // Calculate Date Shift
                if (updated.startDate && updated.startDate !== oldRT.startDate) {
                    const oldStart = new Date(oldRT.startDate);
                    const newStart = new Date(updated.startDate);
                    const diffTime = newStart.getTime() - oldStart.getTime();
                    daysDiff = Math.round(diffTime / (1000 * 60 * 60 * 24));
                    if (daysDiff !== 0) shouldPropagate = true;
                }
                
                // If interval changed, we might want to regenerate future? 
                // Currently propUpdates handles history. Changing interval usually applies to future generation.
                // existing child transactions are "done". 
                
                if (shouldPropagate) {
                const { transactions: currentTransactions } = get();
                // Find all child transactions
                const affectedChildren = currentTransactions.filter(t => t.recurringId === id);
                
                if (affectedChildren.length > 0) {
                    const updatedTransactions = currentTransactions.map(t => {
                        if (t.recurringId === id) {
                            const txUpdate: Record<string, unknown> = { ...propUpdates };
                            
                            // Apply date shift
                            if (daysDiff !== 0) {
                                const txDate = new Date(t.date);
                                txDate.setDate(txDate.getDate() + daysDiff);
                                txUpdate.date = txDate.toISOString().split('T')[0];
                            }
                            return { ...t, ...txUpdate };
                        }
                        return t;
                    });

                    set({ transactions: updatedTransactions });

                    // Supabase Sync for Children
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const childrenToSync = updatedTransactions.filter(t => t.recurringId === id);
                        const txPayloads = childrenToSync.map(t => ({
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
                        await supabase.from('transactions').upsert(txPayloads);
                    }
                }
            }
        }

        // 2. Update Recurring Transaction State
        set((state) => ({
          recurringTransactions: state.recurringTransactions.map((t) =>
            t.id === id ? { ...t, ...updated } : t
          ),
        }));
        
        // 3. Check for missing occurrences (after history is shifted)
        get().checkRecurringTransactions();


        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const payload: Record<string, unknown> = { ...updated };
          if (payload.startDate) payload.start_date = payload.startDate;
          if (payload.nextDueDate) payload.next_due_date = payload.nextDueDate;
          if (payload.endDate) payload.end_date = payload.endDate;
          if (payload.accountId) payload.account_id = payload.accountId;
          if (payload.toAccountId) payload.to_account_id = payload.toAccountId;
          if (payload.interval) {
              // Interval matches column name, nothing to map
          }

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
        set((state) => {
            const newState = { accounts: [...state.accounts, account] };
            if (newState.accounts.length === 1) {
                return { ...newState, selectedAccountId: account.id };
            }
            return newState;
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          try {
            const { error } = await supabase.from('accounts').insert({
              id: account.id,
              user_id: user.id,
              name: account.name,
              type: account.type,
              include_in_total: account.includeInTotal
            });
            if (error) console.error("Supabase Add Account Error:", error);
          } catch (err) { console.error("Supabase Add Account Exception:", err); }
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
          const payload: Record<string, unknown> = { ...updated };
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
          const payload: Record<string, unknown> = { ...updated };
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

      // --- Savings Goals Actions ---
      addSavingsGoal: async (goal) => {
        set((state) => ({ savingsGoals: [...state.savingsGoals, goal] }));

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('savings_goals').insert({
              id: goal.id,
              user_id: user.id,
              name: goal.name,
              target_amount: goal.targetAmount,
              current_amount: goal.currentAmount,
              deadline: goal.deadline,
              color: goal.color
          });
        }
      },

      updateSavingsGoal: async (id, updated) => {
        set((state) => ({
          savingsGoals: state.savingsGoals.map((g) =>
            g.id === id ? { ...g, ...updated } : g
          ),
        }));

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
             const payload: Record<string, unknown> = { ...updated };
             if (payload.targetAmount) payload.target_amount = payload.targetAmount;
             if (payload.currentAmount) payload.current_amount = payload.currentAmount;
             
             await supabase.from('savings_goals').update(payload).eq('id', id);
        }
      },

      deleteSavingsGoal: async (id) => {
        set((state) => ({
          savingsGoals: state.savingsGoals.filter((g) => g.id !== id),
        }));

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('savings_goals').delete().eq('id', id);
        }
      },


      setSelectedAccount: (id: string) => set({ selectedAccountId: id }),

      importData: (data) =>
        set(() => ({
          transactions: data.transactions || [],
          recurringTransactions: data.recurringTransactions || [],
          accountGroups: data.accountGroups || [],
          accounts: data.accounts || [],
          savingsGoals: data.savingsGoals || [],
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

        get().addTransaction(expenseTx);
        get().addTransaction(incomeTx);
      },

      checkRecurringTransactions: () => {
        const { recurringTransactions, updateRecurringTransaction, addTransfer } = get();
        const today = new Date();

        recurringTransactions.forEach((rt) => {
          if (!rt.active) return;

          const nextDue = new Date(rt.nextDueDate);
          let updated = false;
          const endDate = rt.endDate ? new Date(rt.endDate) : null;
          const { transactions } = get();

          while (nextDue <= today) {
            if (endDate && nextDue > endDate) {
              updated = true;
              break;
            }

            const year = nextDue.getFullYear();
            const month = String(nextDue.getMonth() + 1).padStart(2, '0');
            const day = String(nextDue.getDate()).padStart(2, '0');
            const currentDateStr = `${year}-${month}-${day}`;

            if (rt.isTransfer && rt.toAccountId) {
                const duplicate = transactions.find(t => 
                    (t.recurringId === rt.id && t.date.startsWith(currentDateStr)) ||
                    (t.amount === rt.amount && 
                     t.accountId === rt.accountId &&
                     t.date.startsWith(currentDateStr) &&
                     t.type === 'expense')
                );

                if (!duplicate) {
                  addTransfer(
                    rt.accountId,
                    rt.toAccountId,
                    rt.amount,
                    currentDateStr,
                    rt.description
                  );
                }
            } else {
              const duplicate = transactions.find(t => 
                 (t.recurringId === rt.id && t.date.startsWith(currentDateStr)) ||
                 (t.amount === rt.amount && 
                  t.accountId === rt.accountId &&
                  t.type === rt.type &&
                  t.description?.trim() === rt.description?.trim() &&
                  t.date.startsWith(currentDateStr))
              );

              if (!duplicate) {
                  get().addTransaction({
                    id: crypto.randomUUID(),
                    amount: rt.amount,
                    description: rt.description,
                    type: rt.type,
                    accountId: rt.accountId,
                    date: currentDateStr,
                    isRecurring: true,
                    recurringId: rt.id
                  });
              }
            }



            const interval = rt.interval || 1;

            if (rt.frequency === 'daily') nextDue.setDate(nextDue.getDate() + 1 * interval);
            if (rt.frequency === 'weekly') nextDue.setDate(nextDue.getDate() + 7 * interval);
            if (rt.frequency === 'monthly') nextDue.setMonth(nextDue.getMonth() + 1 * interval);
            if (rt.frequency === 'yearly') nextDue.setFullYear(nextDue.getFullYear() + 1 * interval);

            updated = true;
          }

          if (updated) {
            updateRecurringTransaction(rt.id, {
              nextDueDate: `${nextDue.getFullYear()}-${String(nextDue.getMonth() + 1).padStart(2, '0')}-${String(nextDue.getDate()).padStart(2, '0')}`,
              active: endDate ? nextDue <= endDate : true,
              interval: rt.interval // Ensure interval is preserved in update if needed (though partial update usually doesn't need it unless it changed)
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
        savingsGoals: state.savingsGoals,
      }),
    }
  )
);
