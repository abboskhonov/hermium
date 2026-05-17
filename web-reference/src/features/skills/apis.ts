import { get, post } from "@/lib/api"
import type { SkillsListResponse, SkillContentResponse } from "./types"

export async function fetchSkills(): Promise<SkillsListResponse> {
  return get<SkillsListResponse>("/api/hermes/skills")
}

export async function fetchSkillContent(category: string, skill: string): Promise<SkillContentResponse> {
  return get<SkillContentResponse>(`/api/hermes/skills/${category}/${skill}/SKILL.md`)
}

export async function toggleSkill(category: string, skill: string): Promise<{ disabled: boolean; key: string }> {
  return post<{ disabled: boolean; key: string }>(`/api/hermes/skills/${category}/${skill}/toggle`)
}
