import axios from 'axios'

const API_URL = 'https://grainbiz-api-587389680762.us-central1.run.app/api'

const api = axios.create({
  baseURL: API_URL,
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
