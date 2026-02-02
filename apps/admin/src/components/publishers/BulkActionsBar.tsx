interface BulkActionsBarProps {
  selectedCount: number;
  onActivate: () => void;
  onPause: () => void;
  onDisable: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onActivate,
  onPause,
  onDisable,
  onClearSelection,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-blue-700">
          {selectedCount} publisher{selectedCount !== 1 ? 's' : ''} selected
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onActivate}
            className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
          >
            Activate
          </button>
          <button
            type="button"
            onClick={onPause}
            className="inline-flex items-center rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500"
          >
            Pause
          </button>
          <button
            type="button"
            onClick={onDisable}
            className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
          >
            Disable
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            className="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Clear Selection
          </button>
        </div>
      </div>
    </div>
  );
}
