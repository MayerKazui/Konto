import React from 'react';
import { LayoutDashboard, Receipt, TrendingUp, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx'; // Assuming clsx is installed since we used it in UI components, otherwise template literal

import { useTranslation } from 'react-i18next';
import { GlobalAccountSwitcher } from '@/components/GlobalAccountSwitcher';

import { useBudgetStore } from '@/stores/useBudgetStore';
import { useEffect } from 'react';
import { PeriodNavigation } from '@/components/PeriodNavigation';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
    const { t } = useTranslation();
    const checkRecurringTransactions = useBudgetStore((state) => state.checkRecurringTransactions);

    useEffect(() => {
        checkRecurringTransactions();
    }, [checkRecurringTransactions]);

    const navItems = [
        { icon: LayoutDashboard, label: t('nav.dashboard'), href: '/' },
        { icon: Receipt, label: t('nav.transactions'), href: '/transactions' },
        { icon: TrendingUp, label: t('nav.forecast'), href: '/forecast' },
        { icon: Settings, label: t('nav.settings'), href: '/settings' },
    ];

    return (
        <div className="flex h-screen bg-white dark:bg-slate-950 transition-colors duration-200 overflow-hidden">
            {/* Sidebar (Desktop) */}
            <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden md:flex flex-col transition-colors duration-200">
                <div className="p-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                        Konto
                    </h1>
                </div>
                <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                    {navItems.map((item, index) => (
                        <NavLink
                            key={index}
                            to={item.href}
                            className={({ isActive }) =>
                                clsx(
                                    "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                                    isActive
                                        ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400"
                                )
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-center text-slate-400 dark:text-slate-500 font-mono">
                        v1.2.1 (Fix Doublons)
                    </p>
                </div>
            </aside>



            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-white dark:bg-slate-950 transition-colors duration-200">
                <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8 space-y-6">
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 items-center">
                        <GlobalAccountSwitcher />
                        <PeriodNavigation />
                    </div>
                    {children}
                </div>
            </main>

            {/* Bottom Navigation (Mobile) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item, index) => (
                        <NavLink
                            key={index}
                            to={item.href}
                            className={({ isActive }) =>
                                clsx(
                                    "flex flex-col items-center justify-center w-full h-full space-y-1",
                                    isActive
                                        ? "text-indigo-600 dark:text-indigo-400"
                                        : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                )
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
};
