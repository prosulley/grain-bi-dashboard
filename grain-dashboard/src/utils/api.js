import axios from 'axios'

const BASE_URL = import.meta.env.PROD
  ? 'https://grain-bi-dashboard-587389680762.europe-west1.run.app/api'
  : '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

const token = localStorage.getItem('grain_token')
if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('grain_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
