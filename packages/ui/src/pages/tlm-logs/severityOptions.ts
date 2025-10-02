import { Bug, Info, AlertTriangle, AlertCircle } from "lucide-react"

export const severityOptions = [
  {
    value: "TRACE",
    label: "TRACE (1-4)",
    description: "Fine-grained debugging event. Usually disabled.",
    color: "text-gray-600 dark:text-gray-400",
    icon: Bug,
  },
  {
    value: "DEBUG",
    label: "DEBUG (5-8)",
    description: "Debugging event.",
    color: "text-gray-600 dark:text-gray-400",
    icon: Bug,
  },
  {
    value: "INFO",
    label: "INFO (9-12)",
    description: "Informational event.",
    color: "text-blue-600 dark:text-blue-400",
    icon: Info,
  },
  {
    value: "WARN",
    label: "WARN (13-16)",
    description: "Warning event.",
    color: "text-yellow-600 dark:text-yellow-400",
    icon: AlertTriangle,
  },
  {
    value: "ERROR",
    label: "ERROR (17-20)",
    description: "Error event.",
    color: "text-red-600 dark:text-red-400",
    icon: AlertCircle,
  },
  {
    value: "FATAL",
    label: "FATAL (21-24)",
    description: "Fatal error or crash.",
    color: "text-red-600 dark:text-red-400",
    icon: AlertCircle,
  },
  {
    value: "UNSPECIFIED",
    label: "UNSPECIFIED (0)",
    description: "Unspecified value.",
    color: "text-gray-600 dark:text-gray-400",
    icon: Info,
  }
]
