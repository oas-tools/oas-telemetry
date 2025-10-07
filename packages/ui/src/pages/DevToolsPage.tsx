import LogsGeneratorPanel from "./tlm-logs/LogsGeneratorPanel"

export default function DevToolsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
        <h1 className="text-2xl font-bold mb-2">Dev Tools</h1>
        <p className="text-muted-foreground mb-6">Utilities for testing and development.</p>
        <LogsGeneratorPanel />
      </main>
    </div>
  )
}
