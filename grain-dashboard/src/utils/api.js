import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
})

const token = localStorage.getItem('grain_token')
if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`

api.interceptors.response.use(
  r => r,
  err => {
    // Don't redirect on 401 for login/setup endpoints — let the page handle the error
    const isAuthRoute = err.config?.url?.includes('/auth/login') || err.config?.url?.includes('/auth/setup')
    if (err.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('grain_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
