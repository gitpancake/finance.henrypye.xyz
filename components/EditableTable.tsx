"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Currency } from "@/lib/types";
import { CURRENCIES } from "@/lib/constants";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/animate-ui/components/buttons/button";

export interface Column {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "checkbox" | "date" | "user-select";
  options?: string[];
  width?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = { id: string; [key: string]: any };

export interface UserOption {
  value: string;
  label: string;
}

interface EditableTableProps {
  title: string;
  columns: Column[];
  rows: Row[];
  onAdd: (row: Record<string, unknown>) => void;
  onUpdate: (row: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  defaultValues?: Record<string, unknown>;
  usersData?: UserOption[];
  onReorder?: (orderedIds: string[]) => void;
  rowActions?: (row: Row) => React.ReactNode;
}

// Shared inline input classes
const inlineInput =
  "w-full bg-transparent outline-none py-1 text-sm border-0 border-b border-input focus:border-foreground transition-colors";
const inlineNumber = `${inlineInput} text-right font-mono`;
const inlineSelect =
  "bg-transparent outline-none py-1 text-sm border-0 border-b border-input cursor-pointer";
const thClass =
  "text-xs uppercase tracking-wide text-muted-foreground font-medium";

function InlineRow({
  columns,
  data,
  onSave,
  onCancel,
  onDelete,
  isNew,
  usersData,
  dragHandle,
  extraActions,
}: {
  columns: Column[];
  data: Record<string, unknown>;
  onSave: (row: Record<string, unknown>) => void;
  onCancel?: () => void;
  onDelete?: () => void;
  isNew?: boolean;
  usersData?: UserOption[];
  dragHandle?: React.ReactNode;
  extraActions?: React.ReactNode;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(data);
  const [saved, setSaved] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    if (!isNew) setValues(data);
  }, [data, isNew]);

  useEffect(() => {
    if (isNew && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [isNew]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const triggerSave = useCallback(
    (newValues: Record<string, unknown>) => {
      onSave(newValues);
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
    },
    [onSave]
  );

  const handleExplicitSave = () => {
    onSave(values);
    if (isNew) setValues(data);
  };

  const handleCancel = () => {
    if (isNew && onCancel) {
      onCancel();
    } else {
      setValues(data);
    }
  };

  const handleNewRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleExplicitSave();
    if (e.key === "Escape") handleCancel();
  };

  const handleImmediateChange = (key: string, value: unknown) => {
    const newValues = { ...valuesRef.current, [key]: value };
    setValues(newValues);
    triggerSave(newValues);
  };

  const handleDebouncedChange = (key: string, value: unknown) => {
    const newValues = { ...valuesRef.current, [key]: value };
    setValues(newValues);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      triggerSave(valuesRef.current);
    }, 500);
  };

  const handleBlur = () => {
    if (isNew) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      triggerSave(valuesRef.current);
    }
  };

  // ========== NEW ROW ==========
  if (isNew) {
    return (
      <TableRow className="border-t border-dashed">
        {dragHandle && <TableCell />}
        {columns.map((col, i) => (
          <TableCell
            key={col.key}
            className={col.type === "number" ? "text-right font-mono" : ""}
          >
            {col.type === "checkbox" ? (
              <input
                type="checkbox"
                checked={!!values[col.key]}
                onChange={(e) =>
                  setValues({ ...values, [col.key]: e.target.checked })
                }
                className="accent-primary"
              />
            ) : col.type === "select" ? (
              <select
                value={String(values[col.key] ?? "")}
                onChange={(e) =>
                  setValues({ ...values, [col.key]: e.target.value })
                }
                onKeyDown={handleNewRowKeyDown}
                className={inlineSelect}
              >
                {(col.options ?? CURRENCIES).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : col.type === "user-select" ? (
              <select
                value={String(values[col.key] ?? "")}
                onChange={(e) =>
                  setValues({ ...values, [col.key]: e.target.value || null })
                }
                onKeyDown={handleNewRowKeyDown}
                className={inlineSelect}
              >
                <option value="">— none —</option>
                {(usersData ?? []).map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                ref={i === 0 ? firstInputRef : undefined}
                type={col.type === "date" ? "date" : col.type}
                value={
                  col.type === "number"
                    ? (values[col.key] as number) ?? ""
                    : String(values[col.key] ?? "")
                }
                onChange={(e) =>
                  setValues({
                    ...values,
                    [col.key]:
                      col.type === "number"
                        ? e.target.value === ""
                          ? ""
                          : parseFloat(e.target.value)
                        : e.target.value,
                  })
                }
                onKeyDown={handleNewRowKeyDown}
                placeholder={col.label}
                step={col.type === "number" ? "0.01" : undefined}
                className={col.type === "number" ? inlineNumber : inlineInput}
              />
            )}
          </TableCell>
        ))}
        <TableCell className="w-20">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExplicitSave}
              className="h-auto px-1.5 py-0.5 text-xs font-medium"
            >
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-auto px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  // ========== EXISTING ROW (always editable, auto-save) ==========
  return (
    <TableRow className="group">
      {dragHandle && (
        <TableCell className="w-6 !px-0">{dragHandle}</TableCell>
      )}
      {columns.map((col) => (
        <TableCell
          key={col.key}
          className={col.type === "number" ? "text-right font-mono" : ""}
        >
          {col.type === "checkbox" ? (
            <input
              type="checkbox"
              checked={!!values[col.key]}
              onChange={(e) =>
                handleImmediateChange(col.key, e.target.checked)
              }
              className="accent-primary"
            />
          ) : col.type === "select" ? (
            <select
              value={String(values[col.key] ?? "")}
              onChange={(e) =>
                handleImmediateChange(col.key, e.target.value)
              }
              className={inlineSelect}
            >
              {(col.options ?? CURRENCIES).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : col.type === "user-select" ? (
            <select
              value={String(values[col.key] ?? "")}
              onChange={(e) =>
                handleImmediateChange(col.key, e.target.value || null)
              }
              className={inlineSelect}
            >
              <option value="">— none —</option>
              {(usersData ?? []).map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          ) : col.type === "date" ? (
            <input
              type="date"
              value={String(values[col.key] ?? "")}
              onChange={(e) =>
                handleImmediateChange(col.key, e.target.value)
              }
              className={inlineInput}
            />
          ) : (
            <input
              type={col.type}
              value={
                col.type === "number"
                  ? (values[col.key] as number) ?? ""
                  : String(values[col.key] ?? "")
              }
              onChange={(e) =>
                handleDebouncedChange(
                  col.key,
                  col.type === "number"
                    ? e.target.value === ""
                      ? ""
                      : parseFloat(e.target.value)
                    : e.target.value
                )
              }
              onBlur={handleBlur}
              placeholder={col.label}
              step={col.type === "number" ? "0.01" : undefined}
              className={col.type === "number" ? inlineNumber : inlineInput}
            />
          )}
        </TableCell>
      ))}
      <TableCell className="w-20">
        <div className="flex gap-1 items-center">
          <span
            className={`text-xs text-green-500 transition-opacity duration-300 ${
              saved ? "opacity-100" : "opacity-0"
            }`}
          >
            Saved
          </span>
          {extraActions}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-destructive/60 hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              Del
            </button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function SortableRow({
  row,
  columns,
  onUpdate,
  onDelete,
  usersData,
  rowActions,
}: {
  row: Row;
  columns: Column[];
  onUpdate: (row: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  usersData?: UserOption[];
  rowActions?: (row: Row) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const dragHandle = (
    <button
      className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none"
      {...attributes}
      {...listeners}
    >
      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
        <circle cx="3" cy="3" r="1.5" />
        <circle cx="9" cy="3" r="1.5" />
        <circle cx="3" cy="8" r="1.5" />
        <circle cx="9" cy="8" r="1.5" />
        <circle cx="3" cy="13" r="1.5" />
        <circle cx="9" cy="13" r="1.5" />
      </svg>
    </button>
  );

  return (
    <tr ref={setNodeRef} style={style} className="group border-b transition-colors hover:bg-muted/50">
      <td className="w-6 p-0">
        <div className="flex items-center justify-center h-full">
          {dragHandle}
        </div>
      </td>
      <InlineRowCells
        columns={columns}
        data={row}
        onSave={onUpdate}
        onDelete={() => onDelete(row.id)}
        usersData={usersData}
        extraActions={rowActions?.(row)}
      />
    </tr>
  );
}

function InlineRowCells({
  columns,
  data,
  onSave,
  onDelete,
  usersData,
  extraActions,
}: {
  columns: Column[];
  data: Record<string, unknown>;
  onSave: (row: Record<string, unknown>) => void;
  onDelete?: () => void;
  usersData?: UserOption[];
  extraActions?: React.ReactNode;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(data);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    setValues(data);
  }, [data]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const triggerSave = useCallback(
    (newValues: Record<string, unknown>) => {
      onSave(newValues);
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
    },
    [onSave]
  );

  const handleImmediateChange = (key: string, value: unknown) => {
    const newValues = { ...valuesRef.current, [key]: value };
    setValues(newValues);
    triggerSave(newValues);
  };

  const handleDebouncedChange = (key: string, value: unknown) => {
    const newValues = { ...valuesRef.current, [key]: value };
    setValues(newValues);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      triggerSave(valuesRef.current);
    }, 500);
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      triggerSave(valuesRef.current);
    }
  };

  return (
    <>
      {columns.map((col) => (
        <td
          key={col.key}
          className={`p-2 align-middle whitespace-nowrap ${
            col.type === "number" ? "text-right font-mono" : ""
          }`}
        >
          {col.type === "checkbox" ? (
            <input
              type="checkbox"
              checked={!!values[col.key]}
              onChange={(e) =>
                handleImmediateChange(col.key, e.target.checked)
              }
              className="accent-primary"
            />
          ) : col.type === "select" ? (
            <select
              value={String(values[col.key] ?? "")}
              onChange={(e) =>
                handleImmediateChange(col.key, e.target.value)
              }
              className={inlineSelect}
            >
              {(col.options ?? CURRENCIES).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : col.type === "user-select" ? (
            <select
              value={String(values[col.key] ?? "")}
              onChange={(e) =>
                handleImmediateChange(col.key, e.target.value || null)
              }
              className={inlineSelect}
            >
              <option value="">— none —</option>
              {(usersData ?? []).map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          ) : col.type === "date" ? (
            <input
              type="date"
              value={String(values[col.key] ?? "")}
              onChange={(e) =>
                handleImmediateChange(col.key, e.target.value)
              }
              className={inlineInput}
            />
          ) : (
            <input
              type={col.type}
              value={
                col.type === "number"
                  ? (values[col.key] as number) ?? ""
                  : String(values[col.key] ?? "")
              }
              onChange={(e) =>
                handleDebouncedChange(
                  col.key,
                  col.type === "number"
                    ? e.target.value === ""
                      ? ""
                      : parseFloat(e.target.value)
                    : e.target.value
                )
              }
              onBlur={handleBlur}
              placeholder={col.label}
              step={col.type === "number" ? "0.01" : undefined}
              className={col.type === "number" ? inlineNumber : inlineInput}
            />
          )}
        </td>
      ))}
      <td className="w-20 p-2 align-middle">
        <div className="flex gap-1 items-center">
          <span
            className={`text-xs text-green-500 transition-opacity duration-300 ${
              saved ? "opacity-100" : "opacity-0"
            }`}
          >
            Saved
          </span>
          {extraActions}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-destructive/60 hover:text-destructive lg:opacity-0 lg:group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              Del
            </button>
          )}
        </div>
      </td>
    </>
  );
}

export default function EditableTable({
  title,
  columns,
  rows,
  onAdd,
  onUpdate,
  onDelete,
  defaultValues,
  usersData,
  onReorder,
  rowActions,
}: EditableTableProps) {
  const [showAdd, setShowAdd] = useState(false);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  const defaults: Record<string, unknown> = defaultValues ?? {};
  for (const col of columns) {
    if (!(col.key in defaults)) {
      if (col.type === "number") defaults[col.key] = "";
      else if (col.type === "checkbox") defaults[col.key] = false;
      else if (col.type === "select")
        defaults[col.key] = col.options?.[0] ?? "CAD";
      else if (col.type === "user-select") defaults[col.key] = null;
      else if (col.type === "date") defaults[col.key] = "";
      else defaults[col.key] = "";
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;

    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...rows];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);
    onReorder(newOrder.map((r) => r.id));
  };

  const hasDrag = !!onReorder;
  const colSpanTotal = columns.length + 1 + (hasDrag ? 1 : 0);

  const tableContent = (
    <Table>
      <TableHeader>
        <TableRow>
          {hasDrag && <TableHead style={{ width: "24px" }} />}
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={thClass}
              style={col.width ? { width: col.width } : undefined}
            >
              {col.label}
            </TableHead>
          ))}
          <TableHead className={thClass} style={{ width: "80px" }} />
        </TableRow>
      </TableHeader>
      <TableBody>
        {hasDrag ? (
          <SortableContext
            items={rows.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            {rows.map((row) => (
              <SortableRow
                key={row.id}
                row={row}
                columns={columns}
                onUpdate={onUpdate}
                onDelete={onDelete}
                usersData={usersData}
                rowActions={rowActions}
              />
            ))}
          </SortableContext>
        ) : (
          rows.map((row) => (
            <InlineRow
              key={row.id as string}
              columns={columns}
              data={row}
              onSave={onUpdate}
              onDelete={() => onDelete(row.id as string)}
              usersData={usersData}
              extraActions={rowActions?.(row)}
            />
          ))
        )}
        {showAdd && (
          <InlineRow
            columns={columns}
            data={defaults}
            onSave={(row) => {
              onAdd(row);
              setShowAdd(false);
            }}
            onCancel={() => setShowAdd(false)}
            isNew
            usersData={usersData}
            dragHandle={hasDrag ? <span /> : undefined}
          />
        )}
        {rows.length === 0 && !showAdd && (
          <TableRow>
            <TableCell
              colSpan={colSpanTotal}
              className="text-center text-sm text-muted-foreground py-8"
            >
              No entries yet.{" "}
              <button
                onClick={() => setShowAdd(true)}
                className="text-foreground/60 hover:text-foreground underline"
              >
                Add one
              </button>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
        {!showAdd && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdd(true)}
            className="h-auto px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            + Add
          </Button>
        )}
      </div>
      {hasDrag ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {tableContent}
        </DndContext>
      ) : (
        tableContent
      )}
    </div>
  );
}
