import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">

      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold mb-6">Page Not Found</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            The page you are looking for does not exist. You can return to the home page using the button below.
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
