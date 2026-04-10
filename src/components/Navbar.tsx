import { useAuth } from '../contexts/AuthContext';
import { User, LogOut, Home, BarChart3, Users } from 'lucide-react';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function Navbar({ onNavigate, currentPage }: NavbarProps) {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <button
              onClick={() => onNavigate('exercises')}
              className="flex items-center space-x-2 text-xl font-bold text-blue-600"
            >
              <span>🫁</span>
              <span>BreathApp</span>
            </button>

            <div className="flex space-x-4">
              <button
                onClick={() => onNavigate('exercises')}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === 'exercises'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Exercises</span>
              </button>

              <button
                onClick={() => onNavigate('statistics')}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === 'statistics'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Statistics</span>
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={() => onNavigate('users')}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium ${
                    currentPage === 'users'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Users</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <>
                <button
                  onClick={() => onNavigate('profile')}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm font-medium">{user.username}</span>
                  {user.role === 'admin' && (
                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">Admin</span>
                  )}
                </button>
                <button
                  onClick={logout}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
