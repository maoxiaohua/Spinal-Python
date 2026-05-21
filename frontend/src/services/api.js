/**
 * API 客户端
 */
import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 90000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// 请求拦截器
apiClient.interceptors.request.use(
  config => {
    console.log('API 请求:', config.method.toUpperCase(), config.url)
    return config
  },
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  response => {
    console.log('API 响应:', response.status, response.config.url)
    return response
  },
  error => {
    console.error('响应错误:', error.response?.status, error.message)
    return Promise.reject(error)
  }
)

/**
 * 上传骨骼坐标
 */
export async function uploadLandmarks(
  landmarks,
  metrics,
  sessionId = null,
  forwardBendLandmarks = null,
  forwardBendMetrics = null,
  analysisType = 'basic'
) {
  const payload = { landmarks, metrics, sessionId, analysisType }
  if (forwardBendLandmarks) payload.forwardBendLandmarks = forwardBendLandmarks
  if (forwardBendMetrics) payload.forwardBendMetrics = forwardBendMetrics

  const response = await apiClient.post('/screening/landmarks', payload)
  return response.data
}

/**
 * 查询分析结果
 */
export async function getAnalysis(sessionId) {
  const response = await apiClient.get(`/screening/analysis/${sessionId}`)
  return response.data
}

/**
 * 获取推荐训练视频
 */
export async function getExercises(severity) {
  const response = await apiClient.get('/exercises', { params: { severity } })
  return response.data
}

/**
 * 获取附近医院推荐
 */
export async function getHospitalsNearby(city) {
  const response = await apiClient.get('/hospitals/nearby', { params: { city } })
  return response.data
}

/**
 * 健康检查
 */
export async function healthCheck() {
  const response = await apiClient.get('/health')
  return response.data
}

export default apiClient
