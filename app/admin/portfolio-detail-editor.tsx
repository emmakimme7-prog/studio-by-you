"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isVideoSrc, uploadImageFile, uploadVideoFile } from "@/lib/client-upload";

type CellWidth = "auto" | 25 | 33 | 50 | 67 | 75 | 100;
type TextAlign = "left" | "center" | "right";
type DividerOrientation = "horizontal" | "vertical";

type TextCell = {
  id: string;
  type: "text";
  html: string;
  align: TextAlign;
  width: CellWidth;
};

type ImageCell = {
  id: string;
  type: "image";
  src: string;
  alt: string;
  radius: "square" | "rounded";
  width: CellWidth;
};

type VideoCell = {
  id: string;
  type: "video";
  src: string;
  width: CellWidth;
};

type DividerCell = {
  id: string;
  type: "divider";
  orientation: DividerOrientation;
  color: string;
  width: CellWidth;
};

type Cell = TextCell | ImageCell | VideoCell | DividerCell;
type Row = { id: string; cells: Cell[] };

type TextToolbarState = {
  fontSize: string;
  fontWeight: string;
  color: string;
};

const uid = () => Math.random().toString(36).slice(2, 10);
const WIDTH_OPTIONS: CellWidth[] = ["auto", 25, 33, 50, 67, 75, 100];
const FONT_SIZE_OPTIONS = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48];
const FONT_WEIGHT_OPTIONS = [300, 400, 500, 600, 700, 800];

const WIDTH_LABELS: Record<CellWidth, string> = {
  auto: "균등",
  25: "1/4",
  33: "1/3",
  50: "1/2",
  67: "2/3",
  75: "3/4",
  100: "1/1",
};

function cellFlexStyle(width: CellWidth): React.CSSProperties {
  if (width === "auto") return { flex: 1, minWidth: 0 };
  return { flex: `0 0 ${width}%`, maxWidth: `${width}%` };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rgbToHex(value: string) {
  if (value.startsWith("#")) return value;
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return "#141924";
  return `#${[match[1], match[2], match[3]].map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
}

function normalizeFontWeight(value: string) {
  const numeric = Number.parseInt(value, 10);
  if (Number.isNaN(numeric)) return "400";
  const closest = FONT_WEIGHT_OPTIONS.reduce((best, option) =>
    Math.abs(option - numeric) < Math.abs(best - numeric) ? option : best,
  FONT_WEIGHT_OPTIONS[0]);
  return String(closest);
}

function readTextToolbarState(editor: HTMLDivElement, range: Range | null): TextToolbarState | null {
  const targetNode = range?.startContainer ?? editor;
  const targetElement = targetNode.nodeType === Node.TEXT_NODE ? targetNode.parentElement : (targetNode as HTMLElement | null);
  if (!targetElement || !editor.contains(targetElement)) return null;
  const style = window.getComputedStyle(targetElement);
  return {
    fontSize: String(Math.round(Number.parseFloat(style.fontSize) || 16)),
    fontWeight: normalizeFontWeight(style.fontWeight),
    color: rgbToHex(style.color),
  };
}

function parsePageSettings(root: HTMLElement) {
  return {
    background: root.getAttribute("data-page-background") || "#ffffff",
    textColor: root.getAttribute("data-page-text-color") || "#141924",
  };
}

function parseHtmlToState(html: string) {
  if (typeof window === "undefined" || !html.trim()) {
    return {
      rows: [{ id: uid(), cells: [{ id: uid(), type: "text", html: "", align: "left", width: "auto" } as TextCell] }],
      background: "#ffffff",
      textColor: "#141924",
    };
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.body.querySelector<HTMLElement>("[data-portfolio-page-root='true']") ?? doc.body;
  const { background, textColor } = parsePageSettings(root);
  const rows: Row[] = [];
  let textAccum: string[] = [];

  const flushText = () => {
    const joined = textAccum.join("").trim();
    if (joined) {
      rows.push({
        id: uid(),
        cells: [{ id: uid(), type: "text", html: joined, align: "left", width: "auto" }],
      });
    }
    textAccum = [];
  };

  for (const node of Array.from(root.childNodes)) {
    if (!(node instanceof HTMLElement)) {
      const text = node.textContent?.trim();
      if (text) textAccum.push(`<p>${escapeHtml(text)}</p>`);
      continue;
    }

    if (node.classList.contains("pbe-row")) {
      flushText();
      const cells: Cell[] = [];
      for (const child of Array.from(node.children)) {
        const el = child as HTMLElement;
        const fig = el.tagName === "FIGURE" ? el : el.querySelector("figure");
        const img = fig?.querySelector("img") ?? (el.tagName === "IMG" ? (el as HTMLImageElement) : null);
        const vid = fig?.querySelector("video") ?? (el.tagName === "VIDEO" ? (el as HTMLVideoElement) : null);
        const divider: HTMLElement | null =
          (el.querySelector(".portfolio-editor-divider") as HTMLElement | null) ??
          (el.classList.contains("portfolio-editor-divider") ? el : null);
        const widthRaw = parseFloat(el.style.flexBasis || el.style.maxWidth || "0");
        const width: CellWidth = ([25, 33, 50, 67, 75, 100].includes(widthRaw) ? widthRaw : "auto") as CellWidth;

        if (divider) {
          cells.push({
            id: uid(),
            type: "divider",
            orientation: divider.classList.contains("is-vertical") ? "vertical" : "horizontal",
            color: divider.getAttribute("data-divider-color") || divider.style.background || "#d0d7e2",
            width,
          });
        } else if (vid) {
          cells.push({ id: uid(), type: "video", src: vid.getAttribute("src") ?? "", width });
        } else if (img) {
          const radius = img.style.borderRadius && img.style.borderRadius !== "0px" ? "rounded" : "square";
          cells.push({ id: uid(), type: "image", src: img.getAttribute("src") ?? "", alt: img.alt, radius, width });
        } else {
          cells.push({ id: uid(), type: "text", html: el.innerHTML.trim(), align: "left", width });
        }
      }
      if (cells.length) rows.push({ id: uid(), cells });
      continue;
    }

    if (node.classList.contains("portfolio-editor-divider")) {
      flushText();
      rows.push({
        id: uid(),
        cells: [{
          id: uid(),
          type: "divider",
          orientation: node.classList.contains("is-vertical") ? "vertical" : "horizontal",
          color: node.getAttribute("data-divider-color") || node.style.background || "#d0d7e2",
          width: "auto",
        }],
      });
      continue;
    }

    if (node.tagName === "FIGURE") {
      flushText();
      const img = node.querySelector("img");
      const vid = node.querySelector("video");
      const widthRaw = parseFloat(node.style.width || "0");
      const width: CellWidth = ([25, 33, 50, 67, 75, 100].includes(widthRaw) ? widthRaw : "auto") as CellWidth;
      if (vid) {
        rows.push({ id: uid(), cells: [{ id: uid(), type: "video", src: vid.getAttribute("src") ?? "", width }] });
      } else if (img) {
        const radius = img.style.borderRadius && img.style.borderRadius !== "0px" ? "rounded" : "square";
        rows.push({ id: uid(), cells: [{ id: uid(), type: "image", src: img.getAttribute("src") ?? "", alt: img.alt, radius, width }] });
      }
      continue;
    }

    textAccum.push(node.outerHTML);
  }

  flushText();

  return {
    rows: rows.length
      ? rows
      : [{ id: uid(), cells: [{ id: uid(), type: "text", html: "", align: "left", width: "auto" } as TextCell] }],
    background,
    textColor,
  };
}

function serializeCellInner(cell: Cell): string {
  if (cell.type === "text") return cell.html || "<p><br></p>";
  if (cell.type === "divider") {
    const base = `background:${cell.color};`;
    if (cell.orientation === "vertical") {
      return `<div class="portfolio-editor-divider is-vertical" data-divider-color="${cell.color}" style="${base}width:1px;min-height:100%;align-self:stretch;"></div>`;
    }
    return `<div class="portfolio-editor-divider is-horizontal" data-divider-color="${cell.color}" style="${base}width:100%;height:1px;"></div>`;
  }
  const radius = cell.type === "image" && cell.radius === "rounded" ? "12px" : "0px";
  if (cell.type === "image") {
    return `<img src="${cell.src}" alt="${escapeHtml(cell.alt)}" style="width:100%;display:block;border-radius:${radius};" />`;
  }
  return `<video src="${cell.src}" controls playsinline style="width:100%;display:block;"></video>`;
}

function serializeCell(cell: Cell, singleInRow: boolean) {
  if (cell.type === "text") return cell.html || "<p><br></p>";
  if (cell.type === "divider") {
    if (cell.orientation === "horizontal") {
      return `<div class="portfolio-editor-divider is-horizontal" data-divider-color="${cell.color}" style="background:${cell.color};width:100%;height:1px;margin:18px 0;"></div>`;
    }
    return `<div class="portfolio-editor-divider is-vertical" data-divider-color="${cell.color}" style="background:${cell.color};width:1px;min-height:160px;margin:0 auto;"></div>`;
  }
  const width = singleInRow && cell.width !== "auto" ? `${cell.width}%` : "100%";
  return `<figure class="portfolio-block-media" style="width:${width};display:block;margin:0 0 18px;">${serializeCellInner(cell)}</figure>`;
}

function rowsToHtml(rows: Row[], pageBackground: string, textColor: string) {
  const inner = rows
    .map((row) => {
      if (row.cells.length === 1) return serializeCell(row.cells[0], true);
      const cellsHtml = row.cells
        .map((cell) => {
          const width = cell.width === "auto" ? "" : `flex:0 0 ${cell.width}%;max-width:${cell.width}%;`;
          return `<div class="pbe-cell" style="flex:1;min-width:0;${width}">${serializeCellInner(cell)}</div>`;
        })
        .join("");
      return `<div class="pbe-row" style="display:flex;gap:0;align-items:flex-start;margin:0 0 24px;">${cellsHtml}</div>`;
    })
    .join("\n");

  return `<div data-portfolio-page-root="true" data-page-background="${pageBackground}" data-page-text-color="${textColor}" style="background:${pageBackground};color:${textColor};">\n${inner}\n</div>`;
}

function wrapSelectionWithStyle(editor: HTMLDivElement, stylePatch: Record<string, string>) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;

  const styleString = Object.entries(stylePatch)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");

  if (range.collapsed) {
    editor.innerHTML = `<span style="${styleString}">${editor.innerHTML || "<br>"}</span>`;
    return true;
  }

  const span = document.createElement("span");
  Object.entries(stylePatch).forEach(([key, value]) => span.style.setProperty(key, value));
  span.appendChild(range.extractContents());
  range.insertNode(span);
  return true;
}

function TextCellEditor({
  cell,
  projectId,
  registerRef,
  onFocus,
  onInput,
}: {
  cell: TextCell;
  projectId: string;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  onFocus: () => void;
  onInput: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initKey = useRef("");

  useEffect(() => {
    const key = `${projectId}:${cell.id}`;
    if (ref.current && initKey.current !== key) {
      ref.current.innerHTML = cell.html;
      initKey.current = key;
    }
  }, [projectId, cell.id, cell.html]);

  useEffect(() => {
    registerRef(cell.id, ref.current);
    return () => registerRef(cell.id, null);
  }, [cell.id, registerRef]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="portfolio-block-text"
      style={{ outline: "none", minHeight: 36, textAlign: cell.align }}
      onFocus={onFocus}
      onInput={() => onInput(ref.current?.innerHTML ?? "")}
      onPaste={(event) => {
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
        onInput(ref.current?.innerHTML ?? "");
      }}
    />
  );
}

type PortfolioDetailEditorProps = {
  projectId: string;
  initialHtml: string;
  onChange: (html: string) => void;
};

export function PortfolioDetailEditor({ projectId, initialHtml, onChange }: PortfolioDetailEditorProps) {
  const initialState = useMemo(() => parseHtmlToState(initialHtml), [initialHtml]);
  const [rows, setRows] = useState<Row[]>(initialState.rows);
  const [pageBackground, setPageBackground] = useState(initialState.background);
  const [pageTextColor] = useState(initialState.textColor);
  const [activeCell, setActiveCell] = useState<{ rowId: string; cellId: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [textToolbar, setTextToolbar] = useState<TextToolbarState>({ fontSize: "16", fontWeight: "400", color: "#141924" });
  const prevProjectId = useRef(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTarget = useRef<{ rowId: string | null } | null>(null);
  const dragRowId = useRef<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const textRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    if (prevProjectId.current !== projectId) {
      prevProjectId.current = projectId;
      const parsed = parseHtmlToState(initialHtml);
      setRows(parsed.rows);
      setPageBackground(parsed.background);
      setActiveCell(null);
    }
  }, [projectId, initialHtml]);

  const emit = useCallback(
    (nextRows: Row[], nextBackground = pageBackground) => {
      onChange(rowsToHtml(nextRows, nextBackground, pageTextColor));
    },
    [onChange, pageBackground, pageTextColor],
  );

  const updateRows = (next: Row[]) => {
    setRows(next);
    emit(next);
  };

  const updatePageBackground = (value: string) => {
    setPageBackground(value);
    emit(rows, value);
  };

  const updateCell = (rowId: string, cellId: string, patch: Partial<Cell>) => {
    const next = rows.map((row) =>
      row.id !== rowId
        ? row
        : { ...row, cells: row.cells.map((cell) => (cell.id !== cellId ? cell : ({ ...cell, ...patch } as Cell))) },
    );
    updateRows(next);
  };

  const deleteCell = (rowId: string, cellId: string) => {
    const row = rows.find((item) => item.id === rowId);
    if (!row) return;
    if (row.cells.length === 1) {
      updateRows(rows.filter((item) => item.id !== rowId));
    } else {
      updateRows(rows.map((item) => (item.id !== rowId ? item : { ...item, cells: item.cells.filter((cell) => cell.id !== cellId) })));
    }
    setActiveCell(null);
  };

  const addRow = (cell: Cell) => {
    const row: Row = { id: uid(), cells: [cell] };
    const next = [...rows, row];
    updateRows(next);
    setActiveCell({ rowId: row.id, cellId: cell.id });
  };

  const addTextRow = () => addRow({ id: uid(), type: "text", html: "", align: "left", width: "auto" });
  const addDividerRow = (orientation: DividerOrientation) => addRow({ id: uid(), type: "divider", orientation, color: "#d0d7e2", width: orientation === "vertical" ? 25 : "auto" });

  const addCellToRow = (rowId: string, cell: Cell) => {
    const next = rows.map((row) => (row.id !== rowId ? row : { ...row, cells: [...row.cells, cell] }));
    updateRows(next);
    setActiveCell({ rowId, cellId: cell.id });
  };

  const handleFileSelect = async (file: File) => {
    const target = pendingTarget.current;
    try {
      setUploading(true);
      const src = file.type.startsWith("video/") ? await uploadVideoFile(file) : await uploadImageFile(file);
      const cell: Cell = isVideoSrc(src)
        ? { id: uid(), type: "video", src, width: "auto" }
        : { id: uid(), type: "image", src, alt: file.name.replace(/\.[^.]+$/, ""), radius: "square", width: "auto" };

      if (!target?.rowId) addRow(cell);
      else addCellToRow(target.rowId, cell);
    } catch (error) {
      alert(error instanceof Error ? error.message : "업로드 실패");
    } finally {
      setUploading(false);
      pendingTarget.current = null;
    }
  };

  const registerTextRef = useCallback((id: string, el: HTMLDivElement | null) => {
    textRefs.current[id] = el;
  }, []);

  const activeCellData = activeCell
    ? rows.find((row) => row.id === activeCell.rowId)?.cells.find((cell) => cell.id === activeCell.cellId) ?? null
    : null;

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!activeCell) return;
      const editor = textRefs.current[activeCell.cellId];
      const selection = window.getSelection();
      if (!editor || !selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        savedRange.current = range.cloneRange();
        const nextToolbar = readTextToolbarState(editor, range);
        if (nextToolbar) setTextToolbar(nextToolbar);
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [activeCell]);

  useEffect(() => {
    if (!activeCellData || activeCellData.type !== "text" || !activeCell) return;
    const editor = textRefs.current[activeCell.cellId];
    if (!editor) return;
    const nextToolbar = readTextToolbarState(editor, savedRange.current);
    if (nextToolbar) setTextToolbar(nextToolbar);
  }, [activeCell, activeCellData]);

  const restoreSavedRange = () => {
    if (!savedRange.current) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(savedRange.current);
  };

  const applyTextStyle = (stylePatch: Record<string, string>) => {
    if (!activeCellData || activeCellData.type !== "text" || !activeCell) return;
    const editor = textRefs.current[activeCell.cellId];
    if (!editor) return;
    restoreSavedRange();
    wrapSelectionWithStyle(editor, stylePatch);
    updateCell(activeCell.rowId, activeCell.cellId, { html: editor.innerHTML });
    setTextToolbar((current) => ({
      fontSize: stylePatch["font-size"] ? stylePatch["font-size"].replace("px", "") : current.fontSize,
      fontWeight: stylePatch["font-weight"] ?? current.fontWeight,
      color: stylePatch.color ?? current.color,
    }));
  };

  const onRowDragStart = (rowId: string) => {
    dragRowId.current = rowId;
  };

  const onRowDragOver = (event: React.DragEvent, rowId: string) => {
    event.preventDefault();
    setDragOverRowId(rowId);
  };

  const onRowDrop = (event: React.DragEvent, targetRowId: string) => {
    event.preventDefault();
    const sourceRowId = dragRowId.current;
    if (!sourceRowId || sourceRowId === targetRowId) {
      setDragOverRowId(null);
      return;
    }
    const sourceIndex = rows.findIndex((row) => row.id === sourceRowId);
    const targetIndex = rows.findIndex((row) => row.id === targetRowId);
    const next = [...rows];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    updateRows(next);
    setDragOverRowId(null);
    dragRowId.current = null;
  };

  const onRowDragEnd = () => {
    setDragOverRowId(null);
    dragRowId.current = null;
  };

  return (
    <div className="portfolio-block-editor">
      <div className="portfolio-rich-toolbar">
        <div className="portfolio-toolbar-group">
          <span className="portfolio-toolbar-label">페이지 배경</span>
          <input type="color" value={pageBackground} onChange={(e) => updatePageBackground(e.target.value)} />
        </div>

        {activeCellData?.type === "text" && (
          <div className="portfolio-toolbar-group">
            <button className="secondary-link button-reset" onMouseDown={(e) => { e.preventDefault(); document.execCommand("italic"); }} type="button"><i>I</i></button>
            <button className="secondary-link button-reset" onMouseDown={(e) => { e.preventDefault(); document.execCommand("underline"); }} type="button" style={{ textDecoration: "underline" }}>U</button>
            <div className="portfolio-toolbar-sep" />
            <select value={textToolbar.fontSize} onChange={(e) => applyTextStyle({ "font-size": `${e.target.value}px` })}>
              {FONT_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}px</option>)}
            </select>
            <select value={textToolbar.fontWeight} onChange={(e) => applyTextStyle({ "font-weight": e.target.value })}>
              {FONT_WEIGHT_OPTIONS.map((weight) => <option key={weight} value={weight}>{weight}</option>)}
            </select>
            <label className="portfolio-color-control">
              글자색
              <input
                type="color"
                value={textToolbar.color}
                onChange={(e) => applyTextStyle({ color: e.target.value })}
              />
            </label>
            <div className="portfolio-toolbar-sep" />
            {(["left", "center", "right"] as const).map((align) => (
              <button
                key={align}
                className={`secondary-link button-reset${activeCellData.align === align ? " is-active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  updateCell(activeCell!.rowId, activeCell!.cellId, { align });
                }}
                type="button"
              >
                {align === "left" ? "좌" : align === "center" ? "중" : "우"}
              </button>
            ))}
            <div className="portfolio-toolbar-sep" />
            {WIDTH_OPTIONS.map((width) => (
              <button
                key={String(width)}
                className={`secondary-link button-reset${activeCellData.width === width ? " is-active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  updateCell(activeCell!.rowId, activeCell!.cellId, { width });
                }}
                type="button"
              >
                {WIDTH_LABELS[width]}
              </button>
            ))}
          </div>
        )}

        {(activeCellData?.type === "image" || activeCellData?.type === "video") && (
          <div className="portfolio-toolbar-group">
            {WIDTH_OPTIONS.map((width) => (
              <button
                key={String(width)}
                className={`secondary-link button-reset${activeCellData.width === width ? " is-active" : ""}`}
                onClick={() => updateCell(activeCell!.rowId, activeCell!.cellId, { width })}
                type="button"
              >
                {WIDTH_LABELS[width]}
              </button>
            ))}
            {activeCellData.type === "image" && (
              <>
                <div className="portfolio-toolbar-sep" />
                <button className={`secondary-link button-reset${activeCellData.radius === "square" ? " is-active" : ""}`} onClick={() => updateCell(activeCell!.rowId, activeCell!.cellId, { radius: "square" })} type="button">각짐</button>
                <button className={`secondary-link button-reset${activeCellData.radius === "rounded" ? " is-active" : ""}`} onClick={() => updateCell(activeCell!.rowId, activeCell!.cellId, { radius: "rounded" })} type="button">라운드</button>
              </>
            )}
          </div>
        )}

        {activeCellData?.type === "divider" && (
          <div className="portfolio-toolbar-group">
            <label className="portfolio-color-control">
              선색
              <input type="color" value={activeCellData.color} onChange={(e) => updateCell(activeCell!.rowId, activeCell!.cellId, { color: e.target.value })} />
            </label>
            <button className={`secondary-link button-reset${activeCellData.orientation === "horizontal" ? " is-active" : ""}`} onClick={() => updateCell(activeCell!.rowId, activeCell!.cellId, { orientation: "horizontal" })} type="button">가로선</button>
            <button className={`secondary-link button-reset${activeCellData.orientation === "vertical" ? " is-active" : ""}`} onClick={() => updateCell(activeCell!.rowId, activeCell!.cellId, { orientation: "vertical" })} type="button">세로선</button>
          </div>
        )}

        {!activeCellData && <span className="portfolio-toolbar-label">블록을 선택하면 옵션이 나타납니다</span>}
      </div>

      <div className="portfolio-block-list">
        {rows.map((row) => (
          <div
            key={row.id}
            className={`portfolio-block-row${dragOverRowId === row.id ? " is-drag-over" : ""}`}
            onDragOver={(e) => onRowDragOver(e, row.id)}
            onDrop={(e) => onRowDrop(e, row.id)}
            onDragEnd={onRowDragEnd}
          >
            <span className="portfolio-block-handle" draggable onDragStart={() => onRowDragStart(row.id)}>⠿</span>

            <div className="portfolio-block-cells">
              {row.cells.map((cell) => {
                const isActive = activeCell?.cellId === cell.id;
                return (
                  <div
                    key={cell.id}
                    className={`portfolio-block-cell${isActive ? " is-active" : ""}`}
                    style={cellFlexStyle(cell.width)}
                    onClick={() => setActiveCell({ rowId: row.id, cellId: cell.id })}
                  >
                    {cell.type === "text" && (
                      <TextCellEditor
                        cell={cell}
                        projectId={projectId}
                        registerRef={registerTextRef}
                        onFocus={() => setActiveCell({ rowId: row.id, cellId: cell.id })}
                        onInput={(html) => updateCell(row.id, cell.id, { html })}
                      />
                    )}

                    {cell.type === "image" && (
                      <img
                        src={cell.src}
                        alt={cell.alt}
                        style={{
                          width: "100%",
                          display: "block",
                          borderRadius: cell.radius === "rounded" ? 12 : 0,
                          maxHeight: 300,
                          objectFit: "contain",
                        }}
                      />
                    )}

                    {cell.type === "video" && (
                      <video src={cell.src} controls style={{ width: "100%", display: "block", maxHeight: 300 }} />
                    )}

                    {cell.type === "divider" && (
                      <div
                        className={`portfolio-editor-divider is-${cell.orientation}`}
                        style={
                          cell.orientation === "vertical"
                            ? { background: cell.color, width: 1, minHeight: 160, marginInline: "auto" }
                            : { background: cell.color, width: "100%", height: 1, marginBlock: 18 }
                        }
                      />
                    )}

                    {isActive && (
                      <button
                        className="portfolio-block-cell-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCell(row.id, cell.id);
                        }}
                        type="button"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}

              <div className="portfolio-block-add-cell">
                <button className="secondary-link button-reset" onClick={() => addCellToRow(row.id, { id: uid(), type: "text", html: "", align: "left", width: "auto" })} type="button">+ 글</button>
                <button
                  className="secondary-link button-reset"
                  onClick={() => {
                    pendingTarget.current = { rowId: row.id };
                    fileInputRef.current?.click();
                  }}
                  type="button"
                >
                  + 미디어
                </button>
                <button className="secondary-link button-reset" onClick={() => addCellToRow(row.id, { id: uid(), type: "divider", orientation: "vertical", color: "#d0d7e2", width: 25 })} type="button">+ 세로선</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="portfolio-block-add-row">
        <button className="secondary-link button-reset" onClick={addTextRow} type="button">+ 텍스트 행</button>
        <button
          className="secondary-link button-reset"
          disabled={uploading}
          onClick={() => {
            pendingTarget.current = { rowId: null };
            fileInputRef.current?.click();
          }}
          type="button"
        >
          {uploading ? "업로드 중..." : "+ 미디어 행"}
        </button>
        <button className="secondary-link button-reset" onClick={() => addDividerRow("horizontal")} type="button">+ 가로선 행</button>
      </div>

      <input
        ref={fileInputRef}
        accept="image/*,video/mp4,video/webm,video/quicktime"
        style={{ display: "none" }}
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFileSelect(file);
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
}
