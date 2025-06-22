export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">OAS Telemetry</h3>
            <p className="text-gray-300 text-sm">
              Express middleware for collecting telemetry data using OpenTelemetry in OpenAPI Specification
              applications.
            </p>
          </div>
          <div>
            <h4 className="text-md font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/oas-tools/oas-telemetry"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://www.npmjs.com/package/@oas-tools/oas-telemetry"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  NPM Package
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/oas-tools/oas-telemetry"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-md font-semibold mb-4">Features</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Real-time monitoring</li>
              <li>• Performance analytics</li>
              <li>• Custom plugins support</li>
              <li>• OpenAPI integration</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-400">
          <p>&copy; 2025 OAS Telemetry. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
