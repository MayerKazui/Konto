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

// Mock crypto.randomUUID
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

describe('Recurring Duplicate Detection', () => {
    beforeEach(() => {
        useBudgetStore.setState({
            transactions: [],
            recurringTransactions: [],
            accounts: [{ id: 'acc1', name: 'Test Account', type: 'checking', includeInTotal: true }]
        });
        vi.clearAllMocks();
    });

    it('should create transaction if none exists', () => {
        const { addRecurringTransaction, checkRecurringTransactions } = useBudgetStore.getState();
        const today = new Date().toISOString().split('T')[0];

        addRecurringTransaction({
            id: 'rec_strict',
            amount: 100,
            type: 'expense',
            description: 'Strict match test',
            frequency: 'monthly',
            startDate: today,
            nextDueDate: today,
            accountId: 'acc1',
            active: true
        });

        // Run check
        checkRecurringTransactions();

        const { transactions } = useBudgetStore.getState();
        expect(transactions).toHaveLength(1);
        expect(transactions[0].amount).toBe(100);
        expect(transactions[0].recurringId).toBe('rec_strict');
    });

    it('should NOT create duplicate if transaction with same recurringId exists', () => {
        const { addRecurringTransaction, checkRecurringTransactions, addTransaction } = useBudgetStore.getState();
        const today = new Date().toISOString().split('T')[0];

        // 1. Manually add a transaction with the recurringId (simulating previous run)
        addTransaction({
            id: 'tx_existing',
            amount: 100,
            type: 'expense',
            description: 'Strict match test',
            date: today,
            accountId: 'acc1',
            isRecurring: true,
            recurringId: 'rec_strict'
        });

        // 2. Add the rule
        addRecurringTransaction({
            id: 'rec_strict',
            amount: 100, // Same amount
            type: 'expense',
            description: 'Strict match test',
            frequency: 'monthly',
            startDate: today,
            nextDueDate: today, // Should be today to trigger check
            accountId: 'acc1',
            active: true
        });

        // 3. Run check
        checkRecurringTransactions();

        const { transactions } = useBudgetStore.getState();
        // Should still be 1
        expect(transactions).toHaveLength(1);
        expect(transactions[0].id).toBe('tx_existing');
    });

    it('should NOT create duplicate if legacy transaction exists (Loose Match)', () => {
        const { addRecurringTransaction, checkRecurringTransactions, addTransaction } = useBudgetStore.getState();
        const today = new Date().toISOString().split('T')[0];

        // 1. Manually add a "Legacy" transaction (No recurringId, maybe no isRecurring flag)
        addTransaction({
            id: 'tx_legacy',
            amount: 200,
            type: 'income',
            description: ' Legacy Salary ', // Checking trim
            date: today, // Simple string
            accountId: 'acc1',
            isRecurring: false, // Legacy might show false
            // recurringId is undefined
        });

        // 2. Add the rule matching it
        addRecurringTransaction({
            id: 'rec_legacy',
            amount: 200,
            type: 'income',
            description: 'Legacy Salary',
            frequency: 'monthly',
            startDate: today,
            nextDueDate: today,
            accountId: 'acc1',
            active: true
        });

        // 3. Run check
        checkRecurringTransactions();

        const { transactions } = useBudgetStore.getState();
        // Should still be 1 (the legacy one)
        expect(transactions).toHaveLength(1);
        expect(transactions[0].id).toBe('tx_legacy');
    });

    it('should NOT create duplicate if legacy transaction uses ISO Date string (StartsWith Check)', () => {
        const { addRecurringTransaction, checkRecurringTransactions, addTransaction } = useBudgetStore.getState();
        const today = new Date().toISOString().split('T')[0];
        const todayISO = new Date().toISOString(); // e.g., 2026-02-02T12:34:56.789Z

        // 1. Manually add a "Legacy" transaction with ISO date
        addTransaction({
            id: 'tx_iso',
            amount: 300,
            type: 'expense',
            description: 'ISO Date Test',
            date: todayISO, // Full timestamp
            accountId: 'acc1',
            isRecurring: false,
        });

        // 2. Add the rule
        addRecurringTransaction({
            id: 'rec_iso',
            amount: 300,
            type: 'expense',
            description: 'ISO Date Test',
            frequency: 'monthly',
            startDate: today,
            nextDueDate: today,
            accountId: 'acc1',
            active: true
        });

        // 3. Run check
        checkRecurringTransactions();

        const { transactions } = useBudgetStore.getState();
        // Should still be 1
        expect(transactions).toHaveLength(1);
        expect(transactions[0].id).toBe('tx_iso');
    });
});
