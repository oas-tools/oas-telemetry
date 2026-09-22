import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

interface ModuleDisabledProps {
  feature: string;
}

export default function ModuleDisabled({ feature }: ModuleDisabledProps) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold mb-6">{feature} is disabled</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            This deployment does not have {feature} enabled. Ask whoever configured this instance to turn it on if you need it.
          </p>
          <Button
            variant="default"
            size="lg"
            onClick={() => navigate("/")}
            className="bg-white text-blue-600 hover:bg-gray-200"
          >
            Go to Home
          </Button>
        </div>
      </section>
      <div className="my-56" />
    </div>
  )
}
