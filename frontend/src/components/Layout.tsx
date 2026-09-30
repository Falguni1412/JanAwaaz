import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/demand', label: 'Demand Map' },
  { to: '/recommendations', label: 'Recommendations' },
  { to: '/budget', label: 'Budget Simulator' },
  { to: '/interventions', label: 'What-If' },
  { to: '/alignment', label: 'Investment Alignment' },
  { to: '/impact', label: 'Impact Tracker' },
  { to: '/brics', label: 'BRICS Intelligence' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-navy-200 sticky top-0 z-30">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-navy-900 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-accent relative">
                <div className="absolute inset-1.5 rounded-full bg-accent"></div>
              </div>
            </div>
            <div>
              <h1 className="text-base font-semibold text-navy-900 leading-tight">
                JanAwaaz
              </h1>
              <p className="text-xs text-navy-500 leading-tight">
                Silent Demand Intelligence · DPI for Governance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded font-medium">
              DEMO / SYNTHETIC DATA
            </span>
          </div>
        </div>
        <nav className="px-6 flex gap-1 overflow-x-auto scrollbar-thin">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'text-accent border-accent'
                    : 'text-navy-600 border-transparent hover:text-navy-900'
                }`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
      <footer className="px-6 py-3 border-t border-navy-200 bg-white">
        <p className="text-xs text-navy-500 text-center">
          JanAwaaz · BRICS Innovation Track · AI for Digital Public Infrastructure
        </p>
      </footer>
    </div>
  )
}
