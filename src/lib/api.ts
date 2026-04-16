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
  vnd: number;
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

// Lấy user hiện tại từ localStorage
export function getCurrentUser(): { id: number; username: string; email: string; is_admin: number; cash: number; vang: number; vip: number; vnd: number } | null {
  try {
    const stored = localStorage.getItem('user');
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const user = getCurrentUser();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  // Gửi x-user-id header để server xác thực admin
  if (user?.id) {
    headers['x-user-id'] = String(user.id);
  }
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
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
  excludeCategory?: string | number;
  page?: number;
  limit?: number;
  searchMode?: string;
}): Promise<PaginatedResponse<Post>> {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.category !== undefined && params.category !== 'all') q.set('category', String(params.category));
  if (params?.excludeCategory !== undefined) q.set('excludeCategory', String(params.excludeCategory));
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.searchMode) q.set('searchMode', params.searchMode);
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

export async function redeemGiftcode(code: string, user_id: number): Promise<{ message: string; reward: string; player_name: string }> {
  return request<{ message: string; reward: string; player_name: string }>('/giftcodes/redeem', {
    method: 'POST',
    body: JSON.stringify({ code, user_id }),
  });
}

export async function deleteGiftcode(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/giftcodes/${id}`, { method: 'DELETE' });
}

export interface ItemOption {
  id: number;
  name: string;
  color: number;
}

export interface GiftcodeDetailItem {
  id: number;
  quantity: number;
  options: { id: number; param: number }[];
  icon_id: number;
  name: string;
  slot: number;
}

export async function fetchItemOptions(): Promise<{ data: ItemOption[] }> {
  return request<{ data: ItemOption[] }>('/admin/item-options');
}

export async function fetchGiftcodeItems(gcId: number): Promise<{ data: GiftcodeDetailItem[] }> {
  return request<{ data: GiftcodeDetailItem[] }>(`/admin/giftcode-items/${gcId}`);
}

// ============ Stats API ============

export async function fetchStats(): Promise<{ totalPosts: number; totalUsers: number; totalGiftcodes: number }> {
  return request('/stats');
}

// ============ Deposit API ============

export interface DepositOrder {
  id: number;
  name: number;
  refNo: string;
  amount: number;
  status: number;
  bank: string;
  date: string;
  transfer_code: string;
  user_id: number;
  username: string;
  created_at: string;
}

export interface DepositCreateResponse {
  message: string;
  deposit: DepositOrder;
  bank: { bank: string; accountName: string; accountNumber: string };
}

export interface DepositCheckResponse {
  status: 'success' | 'pending';
  message: string;
  cash_added?: number;
  user?: { id: number; username: string; email: string; is_admin: number; cash: number; vang: number; vip: number; vnd: number };
}

export async function createDeposit(data: { user_id: number; username: string; amount: number }): Promise<DepositCreateResponse> {
  return request<DepositCreateResponse>('/deposit/create', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function checkDeposit(deposit_id: number): Promise<DepositCheckResponse> {
  return request<DepositCheckResponse>('/deposit/check', {
    method: 'POST',
    body: JSON.stringify({ deposit_id }),
  });
}

export async function fetchDepositHistory(userId: number, page = 1): Promise<PaginatedResponse<DepositOrder>> {
  return request<PaginatedResponse<DepositOrder>>(`/deposit/history?user_id=${userId}&page=${page}`);
}

export async function cancelDeposit(deposit_id: number, user_id: number): Promise<{ message: string }> {
  return request<{ message: string }>('/deposit/cancel', {
    method: 'POST',
    body: JSON.stringify({ deposit_id, user_id }),
  });
}

// Admin deposit management
export interface DepositStats {
  totalDeposits: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  todayDeposits: number;
  todayAmount: number;
}

export async function fetchAdminDeposits(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<DepositOrder>> {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.status && params.status !== 'all') q.set('status', params.status);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  return request<PaginatedResponse<DepositOrder>>(`/admin/deposits?${q.toString()}`);
}

export async function fetchDepositStats(): Promise<DepositStats> {
  return request<DepositStats>('/admin/deposits/stats');
}

export async function approveDeposit(id: number, status: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/deposits/${id}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// ============ Admin — Player Inventory API ============

export interface Player {
  id: number;
  name: string;
  account_id: number;
  head: number;
}

export interface InventoryItem {
  item_id: number;
  quantity: number;
  slot: number;
  options: string;
  icon_id: number;
  name: string;
}

export interface ItemTemplate {
  id: number;
  name: string;
  icon_id: number;
  type: number;
  gender: number;
  level: number;
  description: string;
}

export async function fetchPlayers(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Player>> {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  return request<PaginatedResponse<Player>>(`/admin/players?${q.toString()}`);
}

export async function fetchPlayerInventory(playerId: number): Promise<{ data: InventoryItem[] }> {
  return request<{ data: InventoryItem[] }>(`/admin/players/${playerId}/inventory`);
}

export async function addInventoryItem(playerId: number, data: {
  item_id: number;
  quantity?: number;
  options?: string;
}): Promise<{ message: string; data: InventoryItem[] }> {
  return request<{ message: string; data: InventoryItem[] }>(`/admin/players/${playerId}/inventory`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteInventoryItem(playerId: number, slot: number): Promise<{ message: string; data: InventoryItem[] }> {
  return request<{ message: string; data: InventoryItem[] }>(`/admin/players/${playerId}/inventory/${slot}`, {
    method: 'DELETE',
  });
}

export async function fetchItemTemplates(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<ItemTemplate>> {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  return request<PaginatedResponse<ItemTemplate>>(`/admin/item-templates?${q.toString()}`);
}

// ============ Gallery API ============

export async function fetchGallery(): Promise<{ data: string[] }> {
  return request<{ data: string[] }>('/gallery');
}
