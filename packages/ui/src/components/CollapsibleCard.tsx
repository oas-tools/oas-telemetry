import React from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"

interface CollapsibleCardProps {
  isOpen: boolean
  onToggle: () => void
  header: React.ReactNode
  children: React.ReactNode
  className?: string
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  isOpen,
  onToggle,
  header,
  children,
  className,
}) => (
  <Card className={className}>
    <CardHeader
      className="flex flex-row items-center justify-between cursor-pointer"
      onClick={onToggle}
    >
      <div>{header}</div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={isOpen ? "Collapse" : "Expand"}
        tabIndex={-1}
        className="ml-2"
      >
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </Button>
    </CardHeader>
    {isOpen && <CardContent>{children}</CardContent>}
  </Card>
)

export default CollapsibleCard
