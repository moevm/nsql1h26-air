import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { ExerciseDetailPage } from './pages/ExerciseDetailPage';
import { ExerciseFormPage } from './pages/ExerciseFormPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { UsersPage } from './pages/UsersPage';
import { ProfilePage } from './pages/ProfilePage';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('exercises');
  const [pageData, setPageData] = useState<any>(null);

  const handleNavigate = (page: string, data?: any) => {
    setCurrentPage(page);
    setPageData(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onNavigate={handleNavigate} currentPage={currentPage} />

      <main>
        {currentPage === 'exercises' && <ExercisesPage onNavigate={handleNavigate} />}
        {currentPage === 'exercise-detail' && pageData?.id && (
          <ExerciseDetailPage exerciseId={pageData.id} onNavigate={handleNavigate} />
        )}
        {currentPage === 'exercise-create' && <ExerciseFormPage onNavigate={handleNavigate} />}
        {currentPage === 'exercise-edit' && pageData?.id && (
          <ExerciseFormPage exerciseId={pageData.id} onNavigate={handleNavigate} />
        )}
        {currentPage === 'statistics' && <StatisticsPage />}
        {currentPage === 'users' && user.role === 'admin' && <UsersPage onNavigate={handleNavigate} />}
        {currentPage === 'profile' && <ProfilePage userId={pageData?.id} onNavigate={handleNavigate} />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
