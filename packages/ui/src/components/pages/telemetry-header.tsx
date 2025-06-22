import {
  Github,
  BookOpen,
  Package,
  Activity,
  BarChart3,
  FileText,
  Puzzle
} from "lucide-react"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from "@/components/ui/navigation-menu"
import { Link } from "react-router-dom"

const tabs = [
  { id: "traces" as const, label: "Traces", icon: Activity },
  { id: "metrics" as const, label: "Metrics", icon: BarChart3 },
  { id: "logs" as const, label: "Logs", icon: FileText },
  { id: "plugins" as const, label: "Plugins", icon: Puzzle }
]

const usefulLinks = [
  {
    label: "Documentation",
    href: "https://github.com/oas-tools/oas-telemetry",
    icon: BookOpen
  },
  {
    label: "NPM Package",
    href: "https://www.npmjs.com/package/@oas-tools/oas-telemetry",
    icon: Package
  },
  {
    label: "GitHub Repo",
    href: "https://github.com/oas-tools/oas-telemetry",
    icon: Github
  }
]

export function TelemetryHeader({ activeTab = "" }: { activeTab?: string }) {
  return (
    <header className="bg-slate-900 py-4">
    <NavigationMenu viewport={false}>
      <NavigationMenuList className="flex flex-row items-center gap-4 flex-wrap md:flex-nowrap mx-4 justify-between"></NavigationMenuList>
        <NavigationMenuList className="flex flex-row items-center gap-4 flex-wrap md:flex-nowrap mx-4">
          {/* Home */}
          <NavigationMenuItem>
            <NavigationMenuLink asChild>
              <Link to="/" className="text-xl font-bold text-white whitespace-nowrap">
                OAS-Telemetry
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>

          {/* Tabs */}
          {tabs.map(({ id, label, icon: Icon }) => (
            <NavigationMenuItem key={id}>
              <NavigationMenuLink asChild>
                <Link
                  to={`/${id}`}
                  className={`flex flex-row items-center gap-2 min-h-fit whitespace-nowrap ${
                    activeTab === id ? "text-blue-400 font-semibold" : "text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}

          {/* Useful Links Dropdown */}
          <NavigationMenuItem>
            <NavigationMenuTrigger className="bg-transparent text-white hover:bg-transparent focus:bg-transparent">
              Useful Links
            </NavigationMenuTrigger>
            <NavigationMenuContent className="absolute bg-slate-800 max-h-64 overflow-auto shadow-lg rounded-md min-w-fit w-max">
              <ul className="grid gap-4">
                {usefulLinks.map(({ label, href, icon: Icon }) => (
                  <li key={label}>
                    <NavigationMenuLink asChild>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-row items-center gap-2 hover:text-blue-400"
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </a>
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  )
}
