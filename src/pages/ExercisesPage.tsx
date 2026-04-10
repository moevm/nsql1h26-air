import { useState, useEffect } from 'react';
import { api } from '../api';
import { Exercise, PaginationInfo } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Search, Plus, ChevronLeft, ChevronRight, Play, Edit, Trash2 } from 'lucide-react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

interface ExercisesPageProps {
  onNavigate: (page: string, data?: any) => void;
}

export function ExercisesPage({ onNavigate }: ExercisesPageProps) {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    title: '',
    category: '',
    difficulty: '',
  });
  const debouncedTitle = useDebouncedValue(filters.title, 500);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const data = await api.getExercises({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      setExercises(data.exercises);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, [pagination.page]);

  useEffect(() => {
    if (pagination.page === 1) {
      fetchExercises();
      return;
    }

    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedTitle, pagination.page]);

  const handleSearch = () => {
    if (pagination.page === 1) {
      fetchExercises();
      return;
    }

    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exercise?')) return;

    try {
      await api.deleteExercise(id);
      fetchExercises();
    } catch (error) {
      alert('Failed to delete exercise');
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Breathing Exercises</h1>
        {user?.role === 'admin' && (
          <button
            onClick={() => onNavigate('exercise-create')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            <span>Add Exercise</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Search className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Search & Filter</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={filters.title}
              onChange={(e) => setFilters({ ...filters, title: e.target.value })}
              placeholder="Search by title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="Relaxation">Relaxation</option>
              <option value="Sleep">Sleep</option>
              <option value="Energy">Energy</option>
              <option value="Focus">Focus</option>
              <option value="Therapeutic">Therapeutic</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <select
              value={filters.difficulty}
              onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {exercises.map((exercise) => (
              <div key={exercise._key} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
                <div
                  className="h-48 bg-cover bg-center"
                  style={{ backgroundImage: `url(${exercise.imageUrl || '/images/exercise-default.svg'})` }}
                />

                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{exercise.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded ${
                      exercise.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                      exercise.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {exercise.difficulty}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{exercise.description}</p>

                  <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">{exercise.category}</span>
                    <span>{formatDuration(exercise.duration)}</span>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => onNavigate('exercise-detail', { id: exercise._key })}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start</span>
                    </button>

                    {user?.role === 'admin' && (
                      <>
                        <button
                          onClick={() => onNavigate('exercise-edit', { id: exercise._key })}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exercise._key)}
                          className="px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className="flex justify-center items-center space-x-4">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="flex items-center space-x-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span className="text-sm text-gray-700">
                Page {pagination.page} of {pagination.pages}
              </span>

              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="flex items-center space-x-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
