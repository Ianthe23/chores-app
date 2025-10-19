export interface Chore {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
  updated_at: string;
  user_id: number;
}

export interface CreateChoreRequest {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
}

export interface UpdateChoreRequest {
  title?: string;
  description?: string;
  status?: 'pending' | 'in-progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
}