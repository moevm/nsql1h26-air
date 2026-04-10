import { useEffect, useState } from 'react';
import { User } from '../types';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';

interface ProfilePageProps {
  userId?: string;
  onNavigate: (page: string, data?: any) => void;
}

const DEFAULT_PROFILE_IMAGE = '/images/profile-default.svg';

export function ProfilePage({ userId, onNavigate }: ProfilePageProps) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const user = await api.getUser(targetUserId);
        setProfile(user);
      } catch (error) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId, currentUser?.id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => onNavigate(currentUser?.role === 'admin' ? 'users' : 'exercises')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="bg-white rounded-lg shadow p-6">User profile not found.</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => onNavigate(currentUser?.role === 'admin' ? 'users' : 'exercises')}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <img
            src={profile.profileImageUrl || DEFAULT_PROFILE_IMAGE}
            alt={profile.username}
            className="w-28 h-28 rounded-full object-cover border"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.firstName || profile.lastName
                ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
                : profile.username}
            </h1>
            <p className="text-gray-600">@{profile.username}</p>
            <p className="text-gray-700 mt-1">{profile.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
