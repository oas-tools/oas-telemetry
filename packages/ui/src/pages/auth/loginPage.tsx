import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TelemetryHeader } from "@/components/pages/telemetry-header"
import { Lock, AlertCircle, CheckCircle } from "lucide-react"

interface LoginPageProps {
  onLogin?: () => void
  onNavigateToLanding?: () => void
}

export default function LoginPage({ onLogin, onNavigateToLanding }: LoginPageProps) {
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setNotification({ type: null, message: "" })

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Mock validation - in real app this would be an actual API call
      if (password === "oas-telemetry-password") {
        setNotification({ type: "success", message: "Login successful" })
        setTimeout(() => {
          onLogin?.()
        }, 1000)
      } else {
        setNotification({ type: "error", message: "Invalid API Key" })
      }
    } catch (error) {
        console.error("Error checking API Key:", error)
      setNotification({
        type: "error",
        message: "An error occurred while checking the API Key.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TelemetryHeader onNavigateToLanding={onNavigateToLanding} />

      <main className="flex items-center justify-center py-16">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>Enter your API key to access the telemetry dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">API Key</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your API key"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {notification.type && (
                <Alert
                  className={
                    notification.type === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
                  }
                >
                  {notification.type === "error" ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  <AlertDescription className={notification.type === "error" ? "text-red-800" : "text-green-800"}>
                    {notification.message}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Authenticating..." : "Login"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>
                Default API key for demo: <code className="bg-gray-100 px-1 rounded">oas-telemetry-password</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
