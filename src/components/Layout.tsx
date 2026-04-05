import { Outlet, NavLink } from 'react-router-dom';
import { Home, User, ShieldAlert, LogOut } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';

export default function Layout() {
  const { profile } = useAuthStore();

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar for desktop, bottom nav for mobile */}
      <nav className="fixed bottom-0 w-full md:w-64 md:relative md:h-screen bg-white border-t md:border-t-0 md:border-r border-slate-200 z-10 flex md:flex-col p-4 md:p-6 justify-between md:justify-start gap-2 md:gap-4">
        <div className="hidden md:flex items-center gap-2 text-green-600 font-bold text-2xl tracking-tight mb-8 px-4">
          FUOYE Learn
        </div>
        
        <div className="flex md:flex-col w-full justify-around md:justify-start gap-2">
          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `flex items-center gap-4 p-3 md:px-4 md:py-3 rounded-xl font-bold transition-colors ${
                isActive ? 'bg-blue-50 text-blue-500 border-2 border-blue-200' : 'text-slate-500 hover:bg-slate-100 border-2 border-transparent'
              }`
            }
          >
            <Home className="w-6 h-6" />
            <span className="hidden md:inline uppercase tracking-wider text-sm">Learn</span>
          </NavLink>
          
          <NavLink
            to="/app/profile"
            className={({ isActive }) =>
              `flex items-center gap-4 p-3 md:px-4 md:py-3 rounded-xl font-bold transition-colors ${
                isActive ? 'bg-blue-50 text-blue-500 border-2 border-blue-200' : 'text-slate-500 hover:bg-slate-100 border-2 border-transparent'
              }`
            }
          >
            <User className="w-6 h-6" />
            <span className="hidden md:inline uppercase tracking-wider text-sm">Profile</span>
          </NavLink>

          {profile?.role === 'admin' && (
            <NavLink
              to="/app/admin"
              className={({ isActive }) =>
                `flex items-center gap-4 p-3 md:px-4 md:py-3 rounded-xl font-bold transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-500 border-2 border-blue-200' : 'text-slate-500 hover:bg-slate-100 border-2 border-transparent'
                }`
              }
            >
              <ShieldAlert className="w-6 h-6" />
              <span className="hidden md:inline uppercase tracking-wider text-sm">Admin</span>
            </NavLink>
          )}
        </div>

        <div className="hidden md:block mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 p-3 md:px-4 md:py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 w-full transition-colors uppercase tracking-wider text-sm border-2 border-transparent"
          >
            <LogOut className="w-6 h-6" />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
