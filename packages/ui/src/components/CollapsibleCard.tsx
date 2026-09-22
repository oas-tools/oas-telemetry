import React from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleCardProps {
  isOpen: boolean
  onToggle: () => void
  header: React.ReactNode
  /** Optional extra control rendered next to the collapse chevron (e.g. a view-mode toggle). */
  headerAction?: React.ReactNode
  children: React.ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  isOpen,
  onToggle,
  header,
  headerAction,
  children,
  className,
  headerClassName,
  contentClassName,
}) => (
  <Card className={className}>
    <CardHeader
      className={cn("flex flex-row flex-wrap items-center justify-between gap-y-1 cursor-pointer", headerClassName)}
      onClick={onToggle}
    >
      <div className="min-w-0 flex-1 basis-full sm:basis-0">{header}</div>
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {headerAction}
        <Button
          variant="ghost"
          size="icon"
          aria-label={isOpen ? "Collapse" : "Expand"}
          tabIndex={-1}
          className="shrink-0"
        >
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </Button>
      </div>
    </CardHeader>
    {isOpen && <CardContent className={contentClassName}>{children}</CardContent>}
  </Card>
)

export default CollapsibleCard
