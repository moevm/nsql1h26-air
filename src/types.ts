export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Exercise {
  _key: string;
  _id?: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  phases?: Phase[];
}

export interface Phase {
  _key?: string;
  name: string;
  duration: number;
  instruction: string;
  color: string;
  order?: number;
}

export interface Comment {
  _key: string;
  exerciseId: string;
  userId: string;
  username?: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _key: string;
  exerciseId: string;
  userId: string;
  username?: string;
  rating: number;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  _key: string;
  userId: string;
  exerciseId: string;
  duration: number;
  completed: boolean;
  createdAt: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
