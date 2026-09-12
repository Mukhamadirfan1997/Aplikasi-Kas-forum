import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

type Props = {
  page: number; // 1-indexed
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (s: number) => void;
  pageSizeOptions?: number[];
};

export function PaginationControls({ page, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange, pageSizeOptions = [10, 25, 50, 100] }: Props) {
  if (totalItems === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 text-sm">
      <div className="text-muted-foreground text-xs sm:text-sm">
        Menampilkan {start}–{end} dari {totalItems} data
        {onPageSizeChange && (
          <span className="ml-2">
            • Per halaman{" "}
            <select value={pageSize} onChange={(e) => onPageSizeChange(parseInt(e.target.value))} className="border rounded px-1 py-0.5 text-xs">
              {pageSizeOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => onPageChange(1)} title="Halaman pertama"><ChevronsLeft className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => onPageChange(page - 1)} title="Sebelumnya"><ChevronLeft className="h-3.5 w-3.5" /></Button>
        <span className="text-xs px-2 py-1 border rounded bg-muted/50 min-w-[72px] text-center">{page} / {Math.max(1, totalPages)}</span>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} title="Berikutnya"><ChevronRight className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} title="Halaman terakhir"><ChevronsRight className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}
