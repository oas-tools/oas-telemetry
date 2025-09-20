export interface Plugin {
  id: string
  name: string
  url?: string
  code?: string
  moduleFormat: "cjs" | "esm"
  active: boolean
  sourceCode: string
  install?: {
    dependencies?: Array<{
      name: string
      options?: string
      override?: boolean
    }>
    globalOptions?: string
    ignoreErrors?: boolean
    verbose?: boolean
  }
  config?: Record<string, any>
  description?: string
  process?: any
}

export interface CreatePluginRequest {
  id: string
  url?: string
  code?: string
  moduleFormat: "cjs" | "esm"
  install?: {
    dependencies?: Array<{
      name: string
      options?: string
      override?: boolean
    }>
    globalOptions?: string
    ignoreErrors?: boolean
    verbose?: boolean
  }
  config?: Record<string, any>
}

export const DEFAULT_INSTALL_CONFIG = {
  globalOptions: "--no-save",
  ignoreErrors: false,
  verbose: true,
}
