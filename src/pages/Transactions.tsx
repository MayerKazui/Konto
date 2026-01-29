import { useState } from 'react';
import { TransactionList } from '@/components/TransactionList';
import { TransactionForm } from '@/components/TransactionForm';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { Transaction } from '@/types';

export const Transactions = () => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    const handleEdit = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setIsFormOpen(true);
    };

    const handleClose = () => {
        setIsFormOpen(false);
        setEditingTransaction(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Transactions</h2>
                    <p className="text-slate-500 dark:text-slate-400">Gérez vos revenus et dépenses.</p>
                </div>
                {!isFormOpen && (
                    <Button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} className="w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" /> Ajouter une Transaction
                    </Button>
                )}
            </div>

            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md">
                        <TransactionForm onClose={handleClose} initialData={editingTransaction} />
                    </div>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Transactions Récentes</CardTitle>
                </CardHeader>
                <CardContent>
                    <TransactionList onEdit={handleEdit} />
                </CardContent>
            </Card>
        </div>
    );
};
