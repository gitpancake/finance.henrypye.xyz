"use client";

import { useState, useRef, useEffect } from "react";
import type { Currency } from "@/lib/types";
import { CURRENCIES } from "@/lib/constants";

export interface Column {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "checkbox" | "date";
  options?: string[];
  width?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = { id: string; [key: string]: any };

interface EditableTableProps {
  title: string;
  columns: Column[];
  rows: Row[];
  onAdd: (row: Record<string, unknown>) => void;
  onUpdate: (row: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  defaultValues?: Record<string, unknown>;
}

function InlineRow({
  columns,
  data,
  onSave,
  onCancel,
  onDelete,
  isNew,
}: {
  columns: Column[];
  data: Record<string, unknown>;
  onSave: (row: Record<string, unknown>) => void;
  onCancel?: () => void;
  onDelete?: () => void;
  isNew?: boolean;
}) {
  const [editing, setEditing] = useState(isNew ?? false);
  const [values, setValues] = useState<Record<string, unknown>>(data);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [editing]);

  const handleSave = () => {
    onSave(values);
    if (isNew) {
      setValues(data);
    } else {
      setEditing(false);
    }
  };

  const handleCancel = () => {
    if (isNew && onCancel) {
      onCancel();
    } else {
      setValues(data);
      setEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  if (!editing && !isNew) {
    return (
      <tr className="group">
        {columns.map((col) => (
          <td
            key={col.key}
            className={col.type === "number" ? "num" : ""}
          >
            {col.type === "checkbox" ? (
              <input
                type="checkbox"
                checked={!!values[col.key]}
                disabled
                className="accent-zinc-900"
              />
            ) : col.type === "select" ? (
              <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono">
                {String(values[col.key] ?? "")}
              </span>
            ) : col.type === "date" ? (
              values[col.key]
                ? new Date(String(values[col.key])).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
                : ""
            ) : (
              String(values[col.key] ?? "")
            )}
          </td>
        ))}
        <td className="w-20">
          <div className="flex gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-zinc-400 hover:text-zinc-900"
            >
              Edit
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-xs text-zinc-400 hover:text-red-600"
              >
                Del
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={isNew ? "border-t border-dashed border-zinc-300" : ""}>
      {columns.map((col, i) => (
        <td key={col.key} className={col.type === "number" ? "num" : ""}>
          {col.type === "checkbox" ? (
            <input
              type="checkbox"
              checked={!!values[col.key]}
              onChange={(e) =>
                setValues({ ...values, [col.key]: e.target.checked })
              }
              className="accent-zinc-900"
            />
          ) : col.type === "select" ? (
            <select
              value={String(values[col.key] ?? "")}
              onChange={(e) =>
                setValues({ ...values, [col.key]: e.target.value })
              }
              onKeyDown={handleKeyDown}
            >
              {(col.options ?? CURRENCIES).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
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
                      ? e.target.value === "" ? "" : parseFloat(e.target.value)
                      : e.target.value,
                })
              }
              onKeyDown={handleKeyDown}
              placeholder={col.label}
              step={col.type === "number" ? "0.01" : undefined}
            />
          )}
        </td>
      ))}
      <td className="w-20">
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            className="text-xs font-medium text-zinc-900 hover:text-green-600"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="text-xs text-zinc-400 hover:text-zinc-900"
          >
            Cancel
          </button>
          {!isNew && onDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-zinc-400 hover:text-red-600"
            >
              Del
            </button>
          )}
        </div>
      </td>
    </tr>
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
}: EditableTableProps) {
  const [showAdd, setShowAdd] = useState(false);

  const defaults: Record<string, unknown> = defaultValues ?? {};
  for (const col of columns) {
    if (!(col.key in defaults)) {
      if (col.type === "number") defaults[col.key] = "";
      else if (col.type === "checkbox") defaults[col.key] = false;
      else if (col.type === "select") defaults[col.key] = col.options?.[0] ?? "CAD";
      else if (col.type === "date") defaults[col.key] = "";
      else defaults[col.key] = "";
    }
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-zinc-700">{title}</h2>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-900"
          >
            + Add
          </button>
        )}
      </div>
      <table className="sheet">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.label}
              </th>
            ))}
            <th style={{ width: "80px" }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <InlineRow
              key={row.id as string}
              columns={columns}
              data={row}
              onSave={onUpdate}
              onDelete={() => onDelete(row.id as string)}
            />
          ))}
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
            />
          )}
          {rows.length === 0 && !showAdd && (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="text-center text-sm text-zinc-400 py-8"
              >
                No entries yet.{" "}
                <button
                  onClick={() => setShowAdd(true)}
                  className="text-zinc-600 hover:text-zinc-900 underline"
                >
                  Add one
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
