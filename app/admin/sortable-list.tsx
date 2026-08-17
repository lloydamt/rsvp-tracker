"use client";

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

type SortableContextValue = {
  disabled: boolean;
  onHandleDragStart: (id: string, event: DragEvent<HTMLElement>) => void;
  onHandleDragEnd: () => void;
  onHandleKeyDown: (id: string, event: KeyboardEvent<HTMLElement>) => void;
};

const SortableContext = createContext<SortableContextValue | null>(null);

function moveId(ids: string[], fromId: string, toId: string) {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return ids;
  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function SortableList({
  persist,
  disabled = false,
  children,
}: {
  persist: (ids: string[]) => Promise<void>;
  disabled?: boolean;
  children: ReactNode;
}) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<{ id: string }>[];
  const serverIds = items.map((item) => item.props.id);
  const serverKey = serverIds.join("\0");
  const [state, setState] = useState({ key: serverKey, ids: serverIds });
  if (state.key !== serverKey) setState({ key: serverKey, ids: serverIds });

  const orderedIds = state.ids;
  const itemById = new Map(items.map((item) => [item.props.id, item]));
  const orderedIdsRef = useRef(orderedIds);
  orderedIdsRef.current = orderedIds;
  const persistRef = useRef(persist);
  persistRef.current = persist;
  const draggedId = useRef<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function commit(next: string[]) {
    if (next.every((id, index) => id === orderedIdsRef.current[index])) return;
    const previous = orderedIdsRef.current;
    setState((current) => ({ ...current, ids: next }));
    startTransition(async () => {
      try {
        await persistRef.current(next);
      } catch {
        setState((current) => ({ ...current, ids: previous }));
      }
    });
  }

  const context: SortableContextValue = {
    disabled,
    onHandleDragStart(id, event) {
      if (disabled) {
        event.preventDefault();
        return;
      }
      draggedId.current = id;
      setActiveId(id);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", id);
    },
    onHandleDragEnd() {
      draggedId.current = null;
      setActiveId(null);
      setDropTargetId(null);
    },
    onHandleKeyDown(id, event) {
      if (disabled || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
      event.preventDefault();
      event.stopPropagation();
      const current = orderedIdsRef.current;
      const index = current.indexOf(id);
      const nextIndex = event.key === "ArrowUp" ? index - 1 : index + 1;
      const target = current[nextIndex];
      if (!target) return;
      commit(moveId(current, id, target));
    },
  };

  if (items.length === 0) return null;

  return (
    <SortableContext.Provider value={context}>
      <div className="sortableList">
        {orderedIds.map((id) => {
          const item = itemById.get(id);
          if (!item) return null;
          return (
            <div
              key={id}
              className={`sortableItem${activeId === id ? " isDragging" : ""}${dropTargetId === id ? " dropTarget" : ""}`}
              onDragOver={(event) => {
                if (disabled || !draggedId.current) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                const target = draggedId.current === id ? null : id;
                setDropTargetId((current) => (current === target ? current : target));
              }}
              onDrop={(event) => {
                event.preventDefault();
                const fromId = draggedId.current ?? event.dataTransfer.getData("text/plain");
                draggedId.current = null;
                setActiveId(null);
                setDropTargetId(null);
                if (disabled || !fromId) return;
                commit(moveId(orderedIdsRef.current, fromId, id));
              }}
            >
              {item}
            </div>
          );
        })}
      </div>
    </SortableContext.Provider>
  );
}

export function SortableItem({ children }: { id: string; children: ReactNode }) {
  return <>{children}</>;
}

function stopSummaryToggle(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export function DragHandle({ id, label }: { id: string; label: string }) {
  const sortable = useContext(SortableContext);
  if (!sortable) return null;

  return (
    <span
      className="dragHandle"
      role="button"
      tabIndex={sortable.disabled ? -1 : 0}
      draggable={!sortable.disabled}
      aria-disabled={sortable.disabled}
      aria-label={`Reorder ${label}`}
      onClick={stopSummaryToggle}
      onPointerDown={(event) => event.stopPropagation()}
      onDragStart={(event) => {
        event.stopPropagation();
        sortable.onHandleDragStart(id, event);
      }}
      onDragEnd={sortable.onHandleDragEnd}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") stopSummaryToggle(event);
        sortable.onHandleKeyDown(id, event);
      }}
    >
      <svg viewBox="0 0 12 16" width="12" height="16" aria-hidden="true">
        <circle cx="3" cy="3" r="1.5" />
        <circle cx="9" cy="3" r="1.5" />
        <circle cx="3" cy="8" r="1.5" />
        <circle cx="9" cy="8" r="1.5" />
        <circle cx="3" cy="13" r="1.5" />
        <circle cx="9" cy="13" r="1.5" />
      </svg>
    </span>
  );
}
