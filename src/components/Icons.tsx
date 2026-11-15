// Icons come from lucide-react. Only the brand logo is custom.
export { ChevronRight, Ellipsis, History as HistoryIcon, RotateCcw, Search as SearchIcon, Sparkles as SparkleIcon, Trash2, X } from "lucide-react";

export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <rect x="6.5" y="9" width="9" height="4" rx="2" fill="#fff" />
      <rect x="16.5" y="9" width="9" height="4" rx="2" fill="#fff" opacity=".55" />
      <rect x="6.5" y="15.5" width="19" height="3.5" rx="1.75" fill="#fff" opacity=".9" />
      <rect x="6.5" y="21.5" width="11" height="3.5" rx="1.75" fill="#fff" opacity=".55" />
    </svg>
  );
}
