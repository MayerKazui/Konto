import { useTheme, type Theme } from "@/components/ThemeProvider"
import { clsx } from 'clsx';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()

    return (
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg inline-flex">
            {[
                { id: 'light', label: 'Clair' },
                { id: 'dark', label: 'Sombre' },
                { id: 'system', label: 'Système' }
            ].map(({ id, label }) => (
                <button
                    key={id}
                    onClick={() => setTheme(id as Theme)}
                    className={clsx(
                        "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                        theme === id
                            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    )
}
