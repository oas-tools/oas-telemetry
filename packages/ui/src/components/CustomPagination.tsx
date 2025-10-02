/* eslint-disable no-unused-vars */
import { ChevronFirst, ChevronLeft, ChevronRight, ChevronLast } from "lucide-react"
import { Label } from "@/components/ui/label"

interface Props {
    currentPage: number
    totalPages: number
    itemsPerPage: number
    onPageChange: (page: number) => void
    onItemsPerPageChange: (value: number) => void
}

export function CustomPagination({
    currentPage,
    totalPages,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
}: Props) {
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-1">
                <button
                    className={`p-2 rounded border hover:bg-muted ${currentPage === 1 ? "opacity-50 pointer-events-none" : ""}`}
                    aria-label="First page"
                    onClick={() => onPageChange(1)}
                >
                    <ChevronFirst size={18} />
                </button>
                <button
                    className={`p-2 rounded border hover:bg-muted ${currentPage === 1 ? "opacity-50 pointer-events-none" : ""}`}
                    aria-label="Previous page"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                >
                    <ChevronLeft size={18} />
                </button>
                <span className="px-3 py-1 rounded font-bold border sm:text-base">
                    Page {currentPage}/{totalPages}
                </span>
                <button
                    className={`p-2 rounded border hover:bg-muted ${currentPage === totalPages ? "opacity-50 pointer-events-none" : ""}`}
                    aria-label="Next page"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                >
                    <ChevronRight size={18} />
                </button>
                <button
                    className={`p-2 rounded border hover:bg-muted ${currentPage === totalPages ? "opacity-50 pointer-events-none" : ""}`}
                    aria-label="Last page"
                    onClick={() => onPageChange(totalPages)}
                >
                    <ChevronLast size={18} />
                </button>
            </div>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <Label htmlFor="items-per-page" className="text-xs">Items per page:</Label>
                <select
                    id="items-per-page"
                    value={itemsPerPage}
                    onChange={e => onItemsPerPageChange(Number(e.target.value))}
                    className="border rounded px-2 py-1 text-xs"
                >
                    {[5, 10, 20, 50, 100].map(n => (
                        <option key={n} value={n}>{n}</option>
                    ))}
                </select>
            </div>
        </div>
    )
}
