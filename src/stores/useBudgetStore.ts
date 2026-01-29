import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category, RecurringTransaction, Transaction } from '@/types';

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

  importData: (data: { transactions: Transaction[]; categories: Category[]; recurringTransactions: RecurringTransaction[] }) => void;
  
  resetDay: number;
  setResetDay: (day: number) => void;
  checkRecurringTransactions: () => void;

  // View State
  currentViewDate: Date;
  setCurrentViewDate: (date: Date) => void;

  // Helpers
  getBalance: () => number;
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

      addRecurringTransaction: (transaction) =>
        set((state) => ({ recurringTransactions: [...state.recurringTransactions, transaction] })),
      updateRecurringTransaction: (id, updated) =>
        set((state) => ({
            recurringTransactions: state.recurringTransactions.map((t) =>
            t.id === id ? { ...t, ...updated } : t
          ),
        })),
      deleteRecurringTransaction: (id) =>
        set((state) => ({
            recurringTransactions: state.recurringTransactions.filter((t) => t.id !== id),
        })),

      importData: (data) =>
        set(() => ({
          transactions: data.transactions || [],
          categories: data.categories || [],
          recurringTransactions: data.recurringTransactions || [],
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
                    // Stop generating if we passed the end date
                    // Also mark as inactive? For now just stop generating.
                    // Ideally we should mark inactive if valid endDate is passed.
                    updated = true; // flag to save state change (nextDueDate update) or maybe deactivation
                    break;
                }

                // generate transaction
                addTransaction({
                    id: crypto.randomUUID(),
                    amount: rt.amount,
                    description: rt.description,
                    type: rt.type,
                    categoryId: rt.categoryId,
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
                 // Check if the NEW nextDue is past the endDate, if so, deactivate? 
                 // For now, just updating nextDueDate ensures it won't trigger again if logic above holds.
                 // Actually the while loop condition handles generation, but we should store the forward-moved date.
                 updateRecurringTransaction(rt.id, { 
                     nextDueDate: nextDue.toISOString().split('T')[0],
                     active: endDate ? nextDue <= endDate : true 
                 });
            }
        });
      },
        
      getBalance: () => {
        const { transactions } = get();
        return transactions.reduce((acc, t) => {
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
          // Exclude currentViewDate
      })
    }
  )
);
