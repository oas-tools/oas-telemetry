import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import { useAuth } from "@/context/AuthContext"
import { getLogoRelativePath } from "@/services/Backend"
import {
  Book,
  BookOpen,
  Construction,
  FileText,
  Github,
  Menu, // Add Book icon for API
  MessageSquare,
  Package,
  Puzzle,
  X
} from "lucide-react"
import React from "react"
import { Link } from "react-router-dom"

const tabs = [
  // Disabled until implemented
  // { id: "traces" as const, label: "Traces", icon: Activity },
  // { id: "metrics" as const, label: "Metrics", icon: BarChart3 },
  { id: "logs" as const, label: "Logs", icon: FileText },
  { id: "plugins" as const, label: "Plugins", icon: Puzzle },
  { id: "chat" as const, label: "Chat", icon: MessageSquare }
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
  },
  {
    label: "API",
    href: "/api",
    icon: Book
  },
  {
    label: "Dev Tools",
    href: "/dev-tools",
    icon: Construction
  }
]


export function TelemetryHeader({ activeTab = "" }: { activeTab?: string }) {
  const { isAuthenticated, logout, authEnabled } = useAuth()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const logoUrl = getLogoRelativePath();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between px-4 py-3 md:py-4">
        {/* Logo and Name */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logoUrl} alt="OAS Telemetry" className="w-8 h-8" />
          <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">OAS Telemetry</span>
        </Link>
        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-1 items-center justify-between ml-8">
          <NavigationMenu viewport={false} className="flex-1">
            <NavigationMenuList className="flex flex-row items-center gap-2">
              {tabs.map(({ id, label, icon: Icon }) => (
                <NavigationMenuItem key={id}>
                  <NavigationMenuLink asChild>
                    <Link
                      to={`/${id}`}
                      className={`flex flex-row items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                        activeTab === id
                          ? ""
                          : ""
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
              {/* Useful Links Dropdown only on desktop */}
              <NavigationMenuItem className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-3 py-2">
                      Useful Links
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="hidden md:block">
                    {usefulLinks.map((props) => (
                      <DropdownMenuItem key={props.label} asChild>
                        {props.href.startsWith("/") ? (
                          <Link to={props.href} className="flex items-center gap-2">
                            <props.icon className="h-4 w-4" />
                            {props.label}
                          </Link>
                        ) : (
                          <a
                            href={props.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            <props.icon className="h-4 w-4" />
                            {props.label}
                          </a>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          {/* Logout Button */}
          {authEnabled && isAuthenticated && (
            <Button
              variant="ghost"
              className="ml-4"
              onClick={logout}
            >
              Logout
            </Button>
          )}
        </div>
        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Open menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute top-0 right-0 w-3/4 max-w-xs h-full bg-white dark:bg-slate-900 shadow-lg flex flex-col gap-2 p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-lg text-slate-900 dark:text-white">Menu</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="w-6 h-6" />
              </button>
            </div>
            {tabs.map(({ id, label, icon: Icon }) => (
              <Link
                key={id}
                to={`/${id}`}
                className={`flex items-center gap-2 px-2 py-2 rounded text-base font-medium transition ${
                  activeTab === id
                    ? "bg-blue-50 dark:bg-slate-800"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
            {usefulLinks.map(({ label, href, icon: Icon }) =>
              href.startsWith("/") ? (
                <Link
                  key={label}
                  to={href}
                  className="flex flex-row items-center gap-2 px-2 py-2 rounded text-base font-medium transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ) : (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-row items-center gap-2 px-2 py-2 rounded text-base font-medium transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </a>
              )
            )}
            {authEnabled && isAuthenticated && (
              <Button
                variant="ghost"
                className="mt-4"
                onClick={() => {
                  setMobileOpen(false)
                  logout()
                }}
              >
                Logout
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
