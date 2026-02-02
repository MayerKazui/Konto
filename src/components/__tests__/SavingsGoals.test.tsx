// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { SavingsGoals } from '../SavingsGoals';
import { useBudgetStore } from '@/stores/useBudgetStore';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

// Mock the store
vi.mock('@/stores/useBudgetStore', () => ({
    useBudgetStore: vi.fn(),
}));

describe('SavingsGoals Component', () => {
    const mockAddSavingsGoal = vi.fn();
    const mockUpdateSavingsGoal = vi.fn();
    const mockDeleteSavingsGoal = vi.fn();
    const mockNotify = vi.fn();

    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        (useBudgetStore as any).mockReturnValue({
            savingsGoals: [],
            addSavingsGoal: mockAddSavingsGoal,
            updateSavingsGoal: mockUpdateSavingsGoal,
            deleteSavingsGoal: mockDeleteSavingsGoal,
            notify: mockNotify,
        });
    });

    it('renders title correctly', () => {
        render(<SavingsGoals />);
        expect(screen.getByText("Objectifs d'Épargne")).toBeInTheDocument();
    });

    it('opens form when clicking add button', () => {
        render(<SavingsGoals />);
        const headerBtn = screen.getByTestId('add-goal-header-btn');
        fireEvent.click(headerBtn);
        expect(screen.getByPlaceholderText('Ex: Voyage Japon')).toBeInTheDocument();
    });

    it('submits form calls addSavingsGoal', async () => {
        render(<SavingsGoals />);

        // Open form
        fireEvent.click(screen.getByTestId('add-goal-header-btn'));

        // Fill form
        fireEvent.change(screen.getByPlaceholderText('Ex: Voyage Japon'), { target: { value: 'New Car' } });
        fireEvent.change(screen.getByPlaceholderText('1000'), { target: { value: '20000' } });

        // Submit
        const submitBtn = screen.getByText('Créer');
        fireEvent.click(submitBtn);

        expect(mockAddSavingsGoal).toHaveBeenCalledTimes(1);
        expect(mockAddSavingsGoal).toHaveBeenCalledWith(expect.objectContaining({
            name: 'New Car',
            targetAmount: 20000
        }));
    });

    it('displays existing goals', () => {
        (useBudgetStore as any).mockReturnValue({
            savingsGoals: [
                { id: '1', name: 'Test Goal', targetAmount: 100, currentAmount: 50, color: 'bg-indigo-500' }
            ],
            addSavingsGoal: mockAddSavingsGoal,
            updateSavingsGoal: mockUpdateSavingsGoal,
            deleteSavingsGoal: mockDeleteSavingsGoal,
            notify: mockNotify,
        });

        render(<SavingsGoals />);
        expect(screen.getByText('Test Goal')).toBeInTheDocument();
        expect(screen.getByText('50,00 €')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
    });
});
