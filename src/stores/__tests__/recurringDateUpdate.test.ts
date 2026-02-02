
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBudgetStore } from '@/stores/useBudgetStore';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: null } })
        },
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockResolvedValue({ error: null }),
            delete: vi.fn().mockResolvedValue({ error: null }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
            eq: vi.fn().mockReturnThis(),
        })
    }
}));

// Mock crypto
if (!global.crypto) {
    Object.defineProperty(global, 'crypto', {
        value: {
            randomUUID: () => Math.random().toString(36).substring(2, 15),
        }
    });
} else if (!global.crypto.randomUUID) {
     Object.defineProperty(global.crypto, 'randomUUID', {
        value: () => Math.random().toString(36).substring(2, 15),
        writable: true
    });
}

describe('Recurring Date Update Propagation', () => {
    beforeEach(() => {
        useBudgetStore.setState({
            transactions: [],
            recurringTransactions: [],
            accounts: [{ id: 'acc1', name: 'Test Account', type: 'checking', includeInTotal: true }]
        });
        vi.clearAllMocks();
    });

    it('should propagate date shift to child transactions', async () => {
        const { addRecurringTransaction, checkRecurringTransactions, updateRecurringTransaction } = useBudgetStore.getState();
        const today = new Date().toISOString().split('T')[0];
        const initialDate = today;

        // 1. Create Recurring Rule
        await addRecurringTransaction({
            id: 'rec_1',
            amount: 100,
            type: 'expense',
            description: 'Monthly Fee',
            frequency: 'monthly',
            startDate: initialDate,
            nextDueDate: initialDate,
            accountId: 'acc1',
            active: true
        });

        // 2. Generate Transactions
        checkRecurringTransactions();

        // 3. Verify Child Transaction Created
        let { transactions } = useBudgetStore.getState();
        expect(transactions).toHaveLength(1);
        expect(transactions[0].date).toBe(initialDate);

        // 4. Update Recurring Rule Date (+1 Day)
        const nextDay = new Date(new Date(today).getTime() + 86400000).toISOString().split('T')[0];
        await updateRecurringTransaction('rec_1', {
            startDate: nextDay
        });

        // 5. Verify Child Transaction Date Shifted
        transactions = useBudgetStore.getState().transactions;
        expect(transactions).toHaveLength(1);
        expect(transactions[0].date).toBe(nextDay);
    });

    it('should propagate amount changes to child transactions', async () => {
        const { addRecurringTransaction, checkRecurringTransactions, updateRecurringTransaction } = useBudgetStore.getState();
        const today = new Date().toISOString().split('T')[0];
        const initialDate = today;

        // 1. Create Recurring Rule
        await addRecurringTransaction({
            id: 'rec_2',
            amount: 100,
            type: 'expense',
            description: 'Monthly Fee',
            frequency: 'monthly',
            startDate: initialDate,
            nextDueDate: initialDate,
            accountId: 'acc1',
            active: true
        });

        checkRecurringTransactions();

        // 2. Update Amount
        await updateRecurringTransaction('rec_2', {
            amount: 150
        });

        const { transactions } = useBudgetStore.getState();
        expect(transactions[0].amount).toBe(150);
    });
});
