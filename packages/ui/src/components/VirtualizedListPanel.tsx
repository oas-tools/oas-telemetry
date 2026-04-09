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
  const [firstItemIndex, setFirstItemIndex] = useState(100_000_000)
  const prevItemsRef = useRef<T[]>([])
  const [expanded, setExpanded] = useState(true)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const loadNewerItemsRef = useRef(loadNewerItems)
  const isLoadingRef = useRef(false)

  // Keep ref updated with latest loadNewerItems function
  useEffect(() => {
    loadNewerItemsRef.current = loadNewerItems
  }, [loadNewerItems])

  useEffect(() => {
    const prevItems = prevItemsRef.current
    let addedAtTop = 0

    if (
      items.length > prevItems.length &&
      prevItems.length > 0 &&
      items[0]?._id !== prevItems[0]?._id
    ) {
      addedAtTop = items.length - prevItems.length
      setFirstItemIndex((prev) => prev - addedAtTop)
    }
    prevItemsRef.current = items
  }, [items, panelName])
  
  // Poll for new items if:
  // 1. Items < threshold (always poll) OR
  // 2. Items >= threshold AND user is at bottom (like a chat)
  useEffect(() => {
    const shouldPoll = items.length <= ROWS_COUNT_THRESHOLD || isAtBottom
    
    if (shouldPoll) {
      const interval = setInterval(() => {
        if (!isLoadingRef.current) {
          isLoadingRef.current = true
          loadNewerItemsRef.current().finally(() => {
            isLoadingRef.current = false
          })
        }
      }, POLL_INTERVAL)

      return () => clearInterval(interval)
    }
  }, [items.length, isAtBottom, panelName])

  const handleStartReached = async () => {
    await loadOlderItems()
  }

  const handleEndReached = async () => {
    // Polling is active if: items < threshold OR user is at bottom
    // Skip if polling is already handling it
    if (items.length <= ROWS_COUNT_THRESHOLD || isAtBottom) {
      return
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
          atBottomStateChange={setIsAtBottom}
        />
      )}
    </CollapsibleCard>
  )
}
