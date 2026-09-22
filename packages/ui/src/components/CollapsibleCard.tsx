import React from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleCardProps {
  isOpen: boolean
  onToggle: () => void
  header: React.ReactNode
  children: React.ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  isOpen,
  onToggle,
  header,
  children,
  className,
  headerClassName,
  contentClassName,
}) => (
  <Card className={className}>
    <CardHeader
      className={cn("flex flex-row items-center justify-between cursor-pointer", headerClassName)}
      onClick={onToggle}
    >
      <div className="min-w-0 flex-1">{header}</div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={isOpen ? "Collapse" : "Expand"}
        tabIndex={-1}
        className="ml-2 shrink-0"
      >
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </Button>
    </CardHeader>
    {isOpen && <CardContent className={contentClassName}>{children}</CardContent>}
  </Card>
)

export default CollapsibleCard
