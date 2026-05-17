export interface SkillInfo {
  name: string
  description: string
  version: string
  author: string
  license: string
  tags: string[]
  related_skills: string[]
  disabled?: boolean
}

export interface SkillCategory {
  name: string
  description: string
  skills: SkillInfo[]
}

export interface SkillsListResponse {
  categories: SkillCategory[]
  total: number
}

export interface SkillContentResponse {
  content: string
  path: string
}
