const API_URL = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const authAPI = {
  login: (email, password) => 
    fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
    
  register: (name, email, password) => 
    fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
    
  getMe: () => 
    fetchWithAuth('/auth/me', {
      method: 'GET',
    }),
};

export const tasksAPI = {
  getAll: () => 
    fetchWithAuth('/tasks', {
      method: 'GET',
    }),
    
  getById: (id) => 
    fetchWithAuth(`/tasks/${id}`, {
      method: 'GET',
    }),
    
  create: (taskData) => 
    fetchWithAuth('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    }),
    
  update: (id, taskData) => 
    fetchWithAuth(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    }),
    
  updateStatus: (id, status) => 
    fetchWithAuth(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
    
  delete: (id) => 
    fetchWithAuth(`/tasks/${id}`, {
      method: 'DELETE',
    }),
};
