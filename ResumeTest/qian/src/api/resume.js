import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 响应拦截器
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API请求失败:', error)
    return Promise.reject(error)
  }
)

// 获取简历详情
export async function getResume(id) {
  const response = await api.get(`/resumes/${id}`)
  return response.data
}

// 创建简历
export async function createResume(data) {
  const response = await api.post('/resumes', data)
  return response.data
}

// 更新简历基本信息
export async function updateResume(id, data) {
  const response = await api.put(`/resumes/${id}`, data)
  return response.data
}

// 删除简历
export async function deleteResume(id) {
  const response = await api.delete(`/resumes/${id}`)
  return response.data
}

// 获取简历列表
export async function getResumeList() {
  const response = await api.get('/resumes')
  return response.data
}

// 完整保存简历（更新主表+替换所有子表）
export async function saveResume(id, data) {
  const response = await api.post(`/resumes/${id}/save`, data)
  return response.data
}

// 下载PDF - 返回完整的response对象以便获取blob
export function downloadPDF(id) {
  return api.get(`/resumes/${id}/download`, {
    responseType: 'blob'
  })
}

// 工作经历接口
export function addWorkExperience(resumeId, data) {
  return api.post(`/resumes/${resumeId}/work-experiences`, data)
}

export function updateWorkExperience(resumeId, expId, data) {
  return api.put(`/resumes/${resumeId}/work-experiences/${expId}`, data)
}

export function deleteWorkExperience(resumeId, expId) {
  return api.delete(`/resumes/${resumeId}/work-experiences/${expId}`)
}

// 教育背景接口
export function addEducation(resumeId, data) {
  return api.post(`/resumes/${resumeId}/education`, data)
}

export function updateEducation(resumeId, eduId, data) {
  return api.put(`/resumes/${resumeId}/education/${eduId}`, data)
}

export function deleteEducation(resumeId, eduId) {
  return api.delete(`/resumes/${resumeId}/education/${eduId}`)
}

// 技能标签接口
export function addSkill(resumeId, data) {
  return api.post(`/resumes/${resumeId}/skills`, data)
}

export function deleteSkill(resumeId, skillId) {
  return api.delete(`/resumes/${resumeId}/skills/${skillId}`)
}
