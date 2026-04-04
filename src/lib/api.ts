// ============ Types ============

export interface Post {
  id: number;
  title: string;
  description: string;
  category: number;
  comments: string | null;
  created_at: string;
  author_id: number | null;
  author_name: string | null;
  event_start: string | null;
  event_end: string | null;
  badge: string | null;
  status: string | null;
}

export interface User {
  id: number;
  username: string;
  email: string;
  create_time: string;
  ban: number;
  is_admin: number;
  cash: number;
  vang: number;
  vip: number;
  ip_address: string | null;
  active: number;
  last_time_login: string;
  last_time_logout: string;
}

export interface Giftcode {
  id: number;
  code: string;
  count_left: number;
  detail: string;
  type: number | null;
  datecreate: string;
  expired: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// ============ Helpers ============

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Lỗi không xác định' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ============ Posts API ============

export async function fetchPosts(params?: {
  search?: string;
  category?: string | number;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Post>> {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.category !== undefined && params.category !== 'all') q.set('category', String(params.category));
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  return request<PaginatedResponse<Post>>(`/posts?${q.toString()}`);
}

export async function fetchPost(id: number | string): Promise<Post> {
  return request<Post>(`/posts/${id}`);
}

export async function createPost(data: { title: string; description: string; category?: number; author_id?: number; author_name?: string; event_start?: string; event_end?: string; badge?: string; is_admin?: boolean }): Promise<Post> {
  return request<Post>('/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchMyPosts(authorId: number): Promise<PaginatedResponse<Post>> {
  return request<PaginatedResponse<Post>>(`/posts/my?author_id=${authorId}`);
}

export async function updatePost(id: number, data: { title?: string; description?: string; category?: number; author_id?: number; is_admin?: boolean; event_start?: string; event_end?: string; badge?: string }): Promise<Post> {
  return request<Post>(`/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function fetchPendingPosts(): Promise<{ data: Post[] }> {
  return request<{ data: Post[] }>('/posts/pending');
}

export async function approvePost(id: number, status: 'approved' | 'rejected'): Promise<Post> {
  return request<Post>(`/posts/${id}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function deletePost(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/posts/${id}`, { method: 'DELETE' });
}

// ============ Comments API ============

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  username: string;
  content: string;
  created_at: string;
}

export async function fetchComments(postId: number): Promise<{ data: Comment[] }> {
  return request<{ data: Comment[] }>(`/posts/${postId}/comments`);
}

export async function createComment(postId: number, data: { user_id: number; username: string; content: string }): Promise<Comment> {
  return request<Comment>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteComment(id: number, data: { user_id: number; is_admin: boolean }): Promise<{ message: string }> {
  return request<{ message: string }>(`/comments/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(data),
  });
}

// ============ Users API ============

export async function fetchUsers(params?: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<User>> {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.role && params.role !== 'all') q.set('role', params.role);
  if (params?.status && params.status !== 'all') q.set('status', params.status);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  return request<PaginatedResponse<User>>(`/users?${q.toString()}`);
}

export async function banUser(id: number, ban: boolean): Promise<{ message: string }> {
  return request<{ message: string }>(`/users/${id}/ban`, {
    method: 'PUT',
    body: JSON.stringify({ ban }),
  });
}

// ============ Giftcodes API ============

export async function fetchGiftcodes(params?: {
  search?: string;
  status?: string;
}): Promise<{ data: Giftcode[] }> {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.status && params.status !== 'all') q.set('status', params.status);
  return request<{ data: Giftcode[] }>(`/giftcodes?${q.toString()}`);
}

export async function createGiftcode(data: {
  code: string;
  count_left?: number;
  detail?: string;
  type?: number;
  expired?: string;
}): Promise<Giftcode> {
  return request<Giftcode>('/giftcodes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function redeemGiftcode(code: string): Promise<{ message: string; reward: string }> {
  return request<{ message: string; reward: string }>('/giftcodes/redeem', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function deleteGiftcode(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/giftcodes/${id}`, { method: 'DELETE' });
}

// ============ Stats API ============

export async function fetchStats(): Promise<{ totalPosts: number; totalUsers: number; totalGiftcodes: number }> {
  return request('/stats');
}
