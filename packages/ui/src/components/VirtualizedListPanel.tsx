import { CardDescription, CardTitle } from "@/components/ui/card"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Virtuoso } from "react-virtuoso"
import CollapsibleCard from "./CollapsibleCard"

const ROWS_COUNT_THRESHOLD = 15
const POLL_INTERVAL = 3000 // 3 seconds

interface VirtualizedListPanelProps<T> {
  items: T[]
  itemContent: (index: number, item: T) => ReactNode
  title: string
  description: string
  emptyMessage: string
  loadOlderItems: () => Promise<void>
  loadNewerItems: () => Promise<void>
  panelName: string // for logging
}

export default function VirtualizedListPanel<T extends { _id: string }>({
  items,
  itemContent,
  title,
  description,
  emptyMessage,
  loadOlderItems,
  loadNewerItems,
  panelName,
}: VirtualizedListPanelProps<T>) {
  const virtuosoRef = useRef<any>(null)
  const isItemsBelowMinimum = useRef(true)
  const [firstItemIndex, setFirstItemIndex] = useState(100_000_000)
  const prevItemsRef = useRef<T[]>([])
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    isItemsBelowMinimum.current = items.length <= ROWS_COUNT_THRESHOLD

    const prevItems = prevItemsRef.current
    let addedAtTop = 0

    if (
      items.length > prevItems.length &&
      prevItems.length > 0 &&
      items[0]?._id !== prevItems[0]?._id
    ) {
      addedAtTop = items.length - prevItems.length
      setFirstItemIndex((prev) => prev - addedAtTop)
      console.log(
        `[${panelName}] ADDED AT TOP: prevItems.length=${prevItems.length} + addedAtTop=${addedAtTop} = items.length=${items.length}`,
      )
    }
    prevItemsRef.current = items
  }, [items, panelName])

  // Poll for new items every X seconds while below threshold
  useEffect(() => {
    if (items.length <= ROWS_COUNT_THRESHOLD) {
      console.log(`[${panelName}] Starting poll - count <= threshold`)
      const interval = setInterval(() => {
        console.log(`[${panelName}] Poll triggered`)
        loadNewerItems()
      }, POLL_INTERVAL)

      return () => clearInterval(interval)
    }
  }, [items.length, loadNewerItems, panelName])

  const handleStartReached = async () => {
    console.log(`[${panelName}] Top reached`)
    if (isItemsBelowMinimum.current) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
    await loadOlderItems()
  }

  const handleEndReached = async () => {
    console.log(`[${panelName}] Bottom reached`)
    if (isItemsBelowMinimum.current) {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
    await loadNewerItems()
  }

  return (
    <CollapsibleCard
      isOpen={expanded}
      onToggle={() => setExpanded((v) => !v)}
      header={
        <>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </>
      }
    >
      {items.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          firstItemIndex={firstItemIndex}
          style={{ height: "70vh" }}
          data={items}
          initialTopMostItemIndex={items.length - 1}
          itemContent={(_, item) => itemContent(_, item)}
          startReached={handleStartReached}
          endReached={handleEndReached}
        />
      )}
    </CollapsibleCard>
  )
}
