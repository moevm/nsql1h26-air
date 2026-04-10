import { Exercise, Comment, Review, User, UserSession, PaginationInfo } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (options.headers) {
      Object.assign(headers, options.headers as Record<string, string>);
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let url = `${API_URL}/api${endpoint}`;
    if (API_URL === 'http://localhost:3001') {
      url = `${API_URL}/api${endpoint}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async login(username: string, password: string) {
    const data = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async register(username: string, email: string, password: string, firstName?: string, lastName?: string) {
    const data = await this.request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, firstName, lastName }),
    });
    this.setToken(data.token);
    return data;
  }

  logout() {
    this.setToken(null);
  }

  async getExercises(params: {
    page?: number;
    limit?: number;
    title?: string;
    category?: string;
    difficulty?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    return this.request<{ exercises: Exercise[]; pagination: PaginationInfo }>(
      `/exercises?${queryParams.toString()}`
    );
  }

  async getExercise(id: string) {
    return this.request<Exercise>(`/exercises/${id}`);
  }

  async createExercise(exercise: Partial<Exercise>) {
    return this.request<Exercise>('/exercises', {
      method: 'POST',
      body: JSON.stringify(exercise),
    });
  }

  async updateExercise(id: string, exercise: Partial<Exercise>) {
    return this.request<Exercise>(`/exercises/${id}`, {
      method: 'PUT',
      body: JSON.stringify(exercise),
    });
  }

  async deleteExercise(id: string) {
    return this.request<{ message: string }>(`/exercises/${id}`, {
      method: 'DELETE',
    });
  }

  async getComments(exerciseId?: string, page = 1, limit = 20) {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (exerciseId) params.append('exerciseId', exerciseId);

    return this.request<{ comments: Comment[] }>(`/comments?${params.toString()}`);
  }

  async createComment(exerciseId: string, text: string) {
    return this.request<Comment>('/comments', {
      method: 'POST',
      body: JSON.stringify({ exerciseId, text }),
    });
  }

  async getReviews(exerciseId?: string, page = 1, limit = 20) {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (exerciseId) params.append('exerciseId', exerciseId);

    return this.request<{ reviews: Review[] }>(`/reviews?${params.toString()}`);
  }

  async createReview(exerciseId: string, rating: number, text: string) {
    return this.request<Review>('/reviews', {
      method: 'POST',
      body: JSON.stringify({ exerciseId, rating, text }),
    });
  }

  async getUsers(params: {
    page?: number;
    limit?: number;
    username?: string;
    email?: string;
    role?: string;
    firstName?: string;
    lastName?: string;
    createdFrom?: string;
    createdTo?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    return this.request<{ users: User[]; pagination: PaginationInfo }>(
      `/users?${queryParams.toString()}`
    );
  }

  async getUser(id: string) {
    return this.request<User>(`/users/${id}`);
  }

  async createSession(exerciseId: string, duration: number, completed: boolean) {
    return this.request<UserSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ exerciseId, duration, completed }),
    });
  }

  async getStatistics(params: {
    groupByX?: string;
    groupByY?: string;
    category?: string;
    difficulty?: string;
    minDuration?: number;
    maxDuration?: number;
    userId?: string;
    day?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    return this.request<{ statistics: any[] }>(`/statistics?${queryParams.toString()}`);
  }

  async exportData() {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api/export`, { headers });
    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `breathing_exercises_export_${new Date().toISOString()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async importData(data: any) {
    return this.request<{ message: string }>('/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
