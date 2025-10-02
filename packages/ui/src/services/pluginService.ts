import type { Plugin, CreatePluginRequest } from "@/lib/types"
import backend from "@/services/Backend"

class PluginService {
  async listPlugins(): Promise<{ status: string; message: string; data: Plugin[] }> {
    try {
      const response = await backend.get(`/plugins`)
      return { status: "success", message: "", data: response.data.plugins }
    } catch (error) {
      let message = "Error listing plugins"
      if ((error as any).response?.data?.message) {
        message = (error as any).response.data
      }
      return { status: "error", message, data: [] }
    }
  }

  async createPlugin(request: CreatePluginRequest): Promise<{ status: string; message: string; data: Plugin | null }> {
    try {
      const response = await backend.post(`/plugins`, request)
      return { status: "success", message: "Plugin created", data: response.data }
    } catch (error) {
      let message = "Error creating plugin"
      let status = "error"
      if ((error as any).response) {
        status = (error as any).response.status === 400 ? "fail" : "error"
        message = (error as any).response.data || message
      }
      return { status, message, data: null }
    }
  }

  async activatePlugin(id: string): Promise<{ status: string; message: string; data: boolean }> {
    try {
      await backend.post(`/plugins/${encodeURIComponent(id)}/activate`)
      return { status: "success", message: "Plugin activated", data: true }
    } catch (error) {
      let message = `Error activating plugin ${id}`
      let status = "error"
      if ((error as any).response) {
        status = (error as any).response.status === 400 ? "fail" : "error"
        message = (error as any).response.data || message
      }
      return { status, message, data: false }
    }
  }

  async deactivatePlugin(id: string): Promise<{ status: string; message: string; data: boolean }> {
    try {
      await backend.post(`/plugins/${encodeURIComponent(id)}/deactivate`)
      return { status: "success", message: "Plugin deactivated", data: true }
    } catch (error) {
      let message = `Error deactivating plugin ${id}`
      let status = "error"
      if ((error as any).response) {
        status = (error as any).response.status === 400 ? "fail" : "error"
        message = (error as any).response.data || message
      }
      return { status, message, data: false }
    }
  }

  async deletePlugin(id: string): Promise<{ status: string; message: string; data: boolean }> {
    try {
      await backend.delete(`/plugins/${encodeURIComponent(id)}`)
      return { status: "success", message: "Plugin deleted", data: true }
    } catch (error) {
      let message = `Error deleting plugin ${id}`
      let status = "error"
      if ((error as any).response) {
        status = (error as any).response.status === 400 ? "fail" : "error"
        message = (error as any).response.data || message
      }
      return { status, message, data: false }
    }
  }
}

const pluginService = new PluginService()
export const getPluginService = (): PluginService => pluginService

export default PluginService
