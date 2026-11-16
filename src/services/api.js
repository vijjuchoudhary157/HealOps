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
    const message = errorData?.error?.message || errorData?.message || `API Error: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
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

export const incidentsAPI = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page);
    if (params.limit) searchParams.set('limit', params.limit);
    if (params.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params.severity && params.severity !== 'all') searchParams.set('severity', params.severity);
    if (params.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return fetchWithAuth(`/incidents${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  getStats: () =>
    fetchWithAuth('/incidents/stats', { method: 'GET' }),

  getById: (id) =>
    fetchWithAuth(`/incidents/${id}`, { method: 'GET' }),

  updateStatus: (id, status) =>
    fetchWithAuth(`/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

export const analysisAPI = {
  analyzeIncident: (incidentId) =>
    fetchWithAuth(`/incidents/${incidentId}/analyze`, { method: 'POST' }),

  getIncidentAnalysis: (incidentId) =>
    fetchWithAuth(`/incidents/${incidentId}/analysis`, { method: 'GET' }),

  getAllAnalyses: () =>
    fetchWithAuth('/analysis', { method: 'GET' }),
};
