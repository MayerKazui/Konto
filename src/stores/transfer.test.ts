import { describe, it, expect, beforeEach } from 'vitest';
import { useBudgetStore } from '@/stores/useBudgetStore';

// Mock crypto.randomUUID if not present
if (!global.crypto) {
    Object.defineProperty(global, 'crypto', {
        value: {
            randomUUID: () => Math.random().toString(36).substring(2, 15),
        }
    });
} else if (!global.crypto.randomUUID) {
     // If crypto exists but no randomUUID (some jsdom versions)
     Object.defineProperty(global.crypto, 'randomUUID', {
        value: () => Math.random().toString(36).substring(2, 15),
        writable: true
    });
}

describe('Transfer Feature', () => {
    beforeEach(() => {
        useBudgetStore.setState({
            transactions: [],
            accounts: [
                { id: 'acc1', name: 'Account 1', type: 'checking', includeInTotal: true },
                { id: 'acc2', name: 'Account 2', type: 'savings', includeInTotal: true }
            ],
            recurringTransactions: []
        });
    });

    it('should create immediate transfer correctly', () => {
        const { addTransfer } = useBudgetStore.getState();
        
        addTransfer('acc1', 'acc2', 100, '2023-01-01', 'Test Transfer');
        
        const { transactions } = useBudgetStore.getState();
        expect(transactions).toHaveLength(2);
        
        const expense = transactions.find(t => t.type === 'expense');
        const income = transactions.find(t => t.type === 'income');
        
        expect(expense).toBeDefined();
        expect(income).toBeDefined();
        
        expect(expense?.amount).toBe(100);
        expect(expense?.accountId).toBe('acc1');
        expect(expense?.isTransfer).toBe(true);
        expect(expense?.linkedTransactionId).toBe(income?.id);
        
        expect(income?.amount).toBe(100);
        expect(income?.accountId).toBe('acc2');
        expect(income?.isTransfer).toBe(true);
        expect(income?.linkedTransactionId).toBe(expense?.id);
    });

    it('should delete linked transaction when one is deleted', () => {
        const { addTransfer, deleteTransaction } = useBudgetStore.getState();
        addTransfer('acc1', 'acc2', 100, '2023-01-01', 'Test Transfer');
        
        let { transactions } = useBudgetStore.getState();
        const expense = transactions.find(t => t.type === 'expense');
        
        if (expense) {
            deleteTransaction(expense.id);
        }
        
        transactions = useBudgetStore.getState().transactions;
        expect(transactions).toHaveLength(0);
    });
    
    it('should generate recurring transfers correctly', () => {
         const { addRecurringTransaction, checkRecurringTransactions } = useBudgetStore.getState();
         
         
         addRecurringTransaction({
             id: 'rec1',
             amount: 50,
             type: 'expense',
             frequency: 'monthly',
             startDate: '2023-01-01',
             nextDueDate: '2023-01-01', // Past due
             accountId: 'acc1',
             toAccountId: 'acc2',
             description: 'Rec Transfer',
             active: true,
             isTransfer: true
         });
         
         checkRecurringTransactions();
         
         const { transactions } = useBudgetStore.getState();
         // Should have generated at least one pair
         expect(transactions.length).toBeGreaterThanOrEqual(2);
         
         const t1 = transactions[0];
         expect(t1.isTransfer).toBe(true);
         expect(t1.amount).toBe(50);
    });
});
