import { useState, useEffect } from 'react';
import { api } from '../api';
import { Exercise, Comment, Review } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Star, MessageCircle, Play, Pause, RotateCcw } from 'lucide-react';

interface ExerciseDetailPageProps {
  exerciseId: string;
  onNavigate: (page: string, data?: any) => void;
}

export function ExerciseDetailPage({ exerciseId, onNavigate }: ExerciseDetailPageProps) {
  const { user } = useAuth();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseTime, setPhaseTime] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  const [newComment, setNewComment] = useState('');
  const [newReview, setNewReview] = useState({ rating: 5, text: '' });

  useEffect(() => {
    fetchExerciseData();
  }, [exerciseId]);

  useEffect(() => {
    if (!isPlaying || !exercise?.phases?.length) return;

    const currentPhase = exercise.phases[currentPhaseIndex];
    if (!currentPhase) return;

    const interval = setInterval(() => {
      setPhaseTime((prev) => {
        if (prev >= currentPhase.duration) {
          if (currentPhaseIndex < exercise.phases!.length - 1) {
            setCurrentPhaseIndex((i) => i + 1);
            return 0;
          } else {
            setIsPlaying(false);
            handleSessionComplete();
            return prev;
          }
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentPhaseIndex, exercise]);

  const fetchExerciseData = async () => {
    try {
      const [exerciseData, commentsData, reviewsData] = await Promise.all([
        api.getExercise(exerciseId),
        api.getComments(exerciseId),
        api.getReviews(exerciseId),
      ]);

      setExercise(exerciseData);
      setComments(commentsData.comments);
      setReviews(reviewsData.reviews);
    } catch (error) {
      console.error('Failed to fetch exercise data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!isPlaying && sessionStartTime === null) {
      setSessionStartTime(Date.now());
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentPhaseIndex(0);
    setPhaseTime(0);
    setSessionStartTime(null);
  };

  const handleSessionComplete = async () => {
    if (sessionStartTime) {
      const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
      try {
        await api.createSession(exerciseId, duration, true);
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await api.createComment(exerciseId, newComment);
      setNewComment('');
      const { comments } = await api.getComments(exerciseId);
      setComments(comments);
    } catch (error) {
      alert('Failed to add comment');
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.text.trim()) return;

    try {
      await api.createReview(exerciseId, newReview.rating, newReview.text);
      setNewReview({ rating: 5, text: '' });
      const { reviews } = await api.getReviews(exerciseId);
      setReviews(reviews);
    } catch (error) {
      alert('Failed to add review');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p>Exercise not found</p>
      </div>
    );
  }

  const currentPhase = exercise.phases?.[currentPhaseIndex];
  const progress = currentPhase ? (phaseTime / currentPhase.duration) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => onNavigate('exercises')}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Exercises</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div>
          <img
            src={exercise.imageUrl || '/images/exercise-default.svg'}
            alt={exercise.title}
            className="w-full h-64 object-cover rounded-lg shadow-lg mb-4"
          />

          <h1 className="text-3xl font-bold text-gray-900 mb-2">{exercise.title}</h1>
          <div className="flex items-center space-x-3 mb-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {exercise.category}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              exercise.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
              exercise.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {exercise.difficulty}
            </span>
          </div>

          <p className="text-gray-700 mb-6">{exercise.description}</p>

          {exercise.phases && exercise.phases.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Exercise Phases:</h3>
              <div className="space-y-2">
                {exercise.phases.map((phase, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-2 rounded"
                    style={{ backgroundColor: index === currentPhaseIndex && isPlaying ? `${phase.color}20` : 'transparent' }}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: phase.color }}
                    />
                    <span className="flex-1 text-sm font-medium">{phase.name}</span>
                    <span className="text-sm text-gray-600">{phase.duration}s</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Practice Mode</h2>

          {currentPhase && (
            <>
              <div
                className="w-64 h-64 mx-auto rounded-full flex items-center justify-center mb-6 transition-all duration-1000"
                style={{
                  backgroundColor: `${currentPhase.color}20`,
                  border: `8px solid ${currentPhase.color}`,
                  transform: `scale(${0.8 + progress * 0.002})`,
                }}
              >
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {currentPhase.duration - phaseTime}
                  </div>
                  <div className="text-sm text-gray-600">seconds</div>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-2xl font-bold text-center text-gray-900 mb-2">
                  {currentPhase.name}
                </div>
                <div className="text-center text-gray-600 mb-4">
                  {currentPhase.instruction}
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: currentPhase.color,
                    }}
                  />
                </div>

                <div className="text-center text-sm text-gray-500">
                  Phase {currentPhaseIndex + 1} of {exercise.phases?.length || 0}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-center space-x-4">
            <button
              onClick={handlePlayPause}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span>{isPlaying ? 'Pause' : 'Start'}</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2 text-yellow-500" />
            Reviews
          </h3>

          {user && (
            <form onSubmit={handleAddReview} className="mb-6 p-4 bg-gray-50 rounded">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 ${star <= newReview.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Review</label>
                <textarea
                  value={newReview.text}
                  onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Share your experience..."
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Submit Review
              </button>
            </form>
          )}

          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review._key} className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{review.username}</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 text-sm">{review.text}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-blue-500" />
            Comments
          </h3>

          {user && (
            <form onSubmit={handleAddComment} className="mb-6 p-4 bg-gray-50 rounded">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                rows={3}
                placeholder="Add a comment..."
                required
              />
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Post Comment
              </button>
            </form>
          )}

          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment._key} className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{comment.username}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-700 text-sm">{comment.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
