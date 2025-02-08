import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
	baseURL: '/api'  // This will be proxied to http://localhost:3000/api
});

// Add token to requests
api.interceptors.request.use(config => {
	const token = localStorage.getItem('token');
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
	response => response,
	error => {
		if (error.response?.status === 401 || error.response?.status === 403) {
			// Redirect to login page if unauthorized
			window.location.href = '/login';
		}
		return Promise.reject(error);
	}
);

export default api;