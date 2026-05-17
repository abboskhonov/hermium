export interface HermesModel {
  id: string
  name: string
  provider: string
  provider_name: string
  context_length?: number
}

export interface ModelsResponse {
  models: HermesModel[]
  default_model: string
  active_provider?: string
  bare_default_model?: string
}
