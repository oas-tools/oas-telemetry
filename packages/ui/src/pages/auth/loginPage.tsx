// src/pages/LoginPage.tsx
"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import backend from "@/services/Backend";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function LoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuthenticated, authEnabled } = useAuth();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await backend.post("/auth/login", { password }).catch((err) => err.response);
      if (res && res.data && res.data.valid) {
        toast.success("Login successful! Redirecting...");
        setAuthenticated(true);
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 800);
        return;
      }
      if (res && res.data && res.data.message) {
        toast.error(res.data.message);
      } else {
        toast.error("Login failed. Please try again.");
      }
    } catch {
      toast.error("Unknown error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!authEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <span>Authentication is disabled.</span>
        <Button onClick={() => navigate("/")}>Take me home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader>
          <div className="flex flex-col items-center gap-2">
            <Lock className="h-8 w-8 text-primary" />
            <CardTitle className="text-center text-lg">
              Sign in to OAS Telemetry
            </CardTitle>
            <CardDescription className="text-center">
              Enter your password to access the dashboard.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoFocus
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Login
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground text-center w-full">
            &copy; {new Date().getFullYear()} OAS Telemetry
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
