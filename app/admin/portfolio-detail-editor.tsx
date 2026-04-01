"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isVideoSrc, uploadImageFile, uploadVideoFile } from "@/lib/client-upload";

type CellWidth = "auto" | 25 | 33 | 50 | 67 | 75 | 100;
type TextAlign = "left" | "center" | "right";

type TextCell = {
  id: string;
  type: "text";
  html: string;
  align: TextAlign;
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700 | 800;
  color: string;
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

type LineCell = {
  id: string;
  type: "line";
  orientation: "horizontal" | "vertical";
  color: string;
  width: CellWidth;
};

type Cell = TextCell | ImageCell | VideoCell | LineCell;
type Row = { id: string; cells: Cell[] };
type PageSettings = {
  background: string;
  textColor: string;
};
type PendingUploadTarget =
  | { kind: "new-row" }
  | { kind: "append-to-row"; rowId: string }
  | { kind: "replace-cell"; rowId: string; cellId: string };

const uid = () => Math.random().toString(36).slice(2, 10);

const WIDTH_OPTIONS: CellWidth[] = ["auto", 25, 33, 50, 67, 75, 100];
const FONT_SIZE_OPTIONS = [16, 18, 20, 24, 28, 32, 40];
const FONT_WEIGHT_OPTIONS = [400, 500, 600, 700, 800] as const;
const WIDTH_LABELS: Record<CellWidth, string> = {
  auto: "균등",
  25: "1/4",
  33: "1/3",
  50: "1/2",
  67: "2/3",
  75: "3/4",
  100: "1/1",
};

function createTextCell(color = "#141924"): TextCell {
  return { id: uid(), type: "text", html: "", align: "left", fontSize: 18, fontWeight: 500, color, width: "auto" };
}

function createHorizontalLineCell(): LineCell {
  return { id: uid(), type: "line", orientation: "horizontal", color: "#cfd6e3", width: 100 };
}

function createVerticalLineCell(): LineCell {
  return { id: uid(), type: "line", orientation: "vertical", color: "#cfd6e3", width: "auto" };
}

function cloneCell(cell: Cell): Cell {
  if (cell.type === "text") {
    return { ...cell, id: uid() };
  }

  if (cell.type === "image") {
    return { ...cell, id: uid() };
  }

  if (cell.type === "line") {
    return { ...cell, id: uid() };
  }

  return { ...cell, id: uid() };
}

function createEmptyRows(): Row[] {
  return [{ id: uid(), cells: [createTextCell()] }];
}

function widthFromValue(raw: string): CellWidth {
  const parsed = Number.parseFloat(raw);
  return [25, 33, 50, 67, 75, 100].includes(parsed) ? (parsed as CellWidth) : "auto";
}

function fontSizeFromValue(raw: string): number {
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 18;
}

function fontWeightFromValue(raw: string): 400 | 500 | 600 | 700 | 800 {
  const parsed = Number.parseInt(raw, 10);
  return FONT_WEIGHT_OPTIONS.includes(parsed as 400 | 500 | 600 | 700 | 800) ? (parsed as 400 | 500 | 600 | 700 | 800) : 500;
}

function normalizeColor(raw: string | null | undefined, fallback: string): string {
  const value = (raw || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return value;
  }

  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    return `#${value.slice(1).split("").map(char => `${char}${char}`).join("")}`;
  }

  const rgbMatch = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    return `#${rgbMatch.slice(1, 4).map(channel => Number.parseInt(channel, 10).toString(16).padStart(2, "0")).join("")}`;
  }

  return fallback;
}

function cellFlexStyle(width: CellWidth): React.CSSProperties {
  if (width === "auto") {
    return { flex: "1 1 0", minWidth: 0 };
  }

  return {
    flex: `0 0 ${width}%`,
    width: `${width}%`,
    maxWidth: `${width}%`,
    minWidth: 0,
  };
}

function isDarkColor(value: string) {
  const hex = value.replace("#", "").trim();
  const normalized =
    hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return false;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance < 0.48;
}

function getRowCellShares(cells: Cell[]): number[] {
  if (cells.length === 0) {
    return [];
  }

  const shareCells = cells.filter(cell => !(cell.type === "line" && cell.orientation === "vertical"));
  const explicitTotal = shareCells.reduce((sum, cell) => sum + (cell.width === "auto" ? 0 : cell.width), 0);
  const autoCount = shareCells.filter(cell => cell.width === "auto").length;

  if (explicitTotal >= 100 || autoCount === 0) {
    return cells.map(cell => {
      if (cell.type === "line" && cell.orientation === "vertical") {
        return 0;
      }

      return cell.width === "auto" ? 100 / Math.max(shareCells.length, 1) : cell.width;
    });
  }

  const remaining = Math.max(100 - explicitTotal, 0);
  const autoShare = autoCount > 0 ? remaining / autoCount : 0;

  return cells.map(cell => {
    if (cell.type === "line" && cell.orientation === "vertical") {
      return 0;
    }

    return cell.width === "auto" ? autoShare : cell.width;
  });
}

function getRowGap(cells: Cell[]) {
  return cells.length > 0 && cells.every(cell => cell.type === "image") ? 0 : 26;
}

// Module-level flag to track if drag originated from within the editor
let _editorDragActive = false;

function rowBoxStyle(isSelected: boolean, isDragOver: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "28px minmax(0, 1fr) 108px",
    alignItems: "stretch",
    gap: 16,
    padding: "16px 18px",
    borderRadius: 22,
    border: `1.5px solid ${
      isDragOver ? "rgba(49, 99, 255, 1)" : isSelected ? "rgba(49, 99, 255, 0.48)" : "rgba(18, 24, 38, 0.16)"
    }`,
    boxShadow: isSelected ? "0 0 0 3px rgba(49, 99, 255, 0.06)" : "none",
    background: isDragOver ? "rgba(49, 99, 255, 0.02)" : "#fff",
  };
}

function rowActionsStyle(): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 8,
    minWidth: 108,
  };
}

function rowCellsStyle(): React.CSSProperties {
  return {
    display: "grid",
    minWidth: 0,
    alignItems: "start",
  };
}

function rowCellsGridStyle(cells: Cell[]): React.CSSProperties {
  const shares = getRowCellShares(cells);

  return {
    ...rowCellsStyle(),
    gap: getRowGap(cells),
    gridTemplateColumns: cells.map((cell, index) => {
      if (cell.type === "line" && cell.orientation === "vertical") {
        return "18px";
      }

      return `minmax(0, ${Math.max(shares[index] ?? 1, 1)}fr)`;
    }).join(" "),
  };
}

function getBalancedWidth(cellCount: number): CellWidth {
  if (cellCount <= 1) return "auto";
  if (cellCount === 2) return 50;
  if (cellCount === 3) return 33;
  if (cellCount === 4) return 25;
  return "auto";
}

function rebalanceRowCells(cells: Cell[]): Cell[] {
  const shareCells = cells.filter(cell => !(cell.type === "line" && cell.orientation === "vertical"));
  const balancedWidth = getBalancedWidth(shareCells.length);
  const currentTotal = shareCells.reduce((sum, cell) => sum + (cell.width === "auto" ? 0 : cell.width), 0);
  const shouldNormalize =
    shareCells.length > 1 && (currentTotal >= 100 || shareCells.some(cell => cell.width === 100 || cell.width === "auto"));

  if (!shouldNormalize) {
    return cells;
  }

  return cells.map(cell => (
    cell.type === "line" && cell.orientation === "vertical"
      ? cell
      : { ...cell, width: balancedWidth }
  ));
}

function escapeAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function parsePortfolioDocument(html: string): { rows: Row[]; page: PageSettings } {
  if (typeof window === "undefined" || !html.trim()) {
    return {
      rows: createEmptyRows(),
      page: { background: "#ffffff", textColor: "#141924" },
    };
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.body.querySelector<HTMLElement>("[data-portfolio-page-root='true']") ?? doc.body;
  const page = {
    background: normalizeColor(root.getAttribute("data-page-background"), "#ffffff"),
    textColor: normalizeColor(root.getAttribute("data-page-text-color"), "#141924"),
  };
  const rows: Row[] = [];
  let textBuffer: string[] = [];

  const flushText = () => {
    const htmlValue = textBuffer.join("").trim();
    if (htmlValue) {
      rows.push({
        id: uid(),
      cells: [{ ...createTextCell(page.textColor), html: htmlValue }],
      });
    }
    textBuffer = [];
  };

  for (const node of Array.from(root.childNodes)) {
    if (!(node instanceof HTMLElement)) {
      const text = node.textContent?.trim();
      if (text) {
        textBuffer.push(`<p>${escapeAttr(text)}</p>`);
      }
      continue;
    }

    if (node.classList.contains("pbe-row")) {
      flushText();
      const cells: Cell[] = [];

      for (const child of Array.from(node.children)) {
        const el = child as HTMLElement;
        const divider = el.querySelector<HTMLElement>(".portfolio-editor-divider") ?? (el.classList.contains("portfolio-editor-divider") ? el : null);
        const figure = el.tagName === "FIGURE" ? el : el.querySelector("figure");
        const image = figure?.querySelector("img") ?? (el.tagName === "IMG" ? (el as HTMLImageElement) : null);
        const video = figure?.querySelector("video") ?? (el.tagName === "VIDEO" ? (el as HTMLVideoElement) : null);
        const width = widthFromValue(el.style.flexBasis || el.style.maxWidth || "");

        if (divider) {
          const orientation = divider.getAttribute("data-divider-orientation") === "vertical" ? "vertical" : "horizontal";
          cells.push({
            id: uid(),
            type: "line",
            orientation,
            color: normalizeColor(divider.getAttribute("data-divider-color") || divider.style.backgroundColor, "#cfd6e3"),
            width: orientation === "vertical" ? "auto" : width || 100,
          });
          continue;
        }

        if (video) {
          cells.push({ id: uid(), type: "video", src: video.getAttribute("src") ?? "", width });
          continue;
        }

        if (image) {
          cells.push({
            id: uid(),
            type: "image",
            src: image.getAttribute("src") ?? "",
            alt: image.alt,
            radius: image.style.borderRadius && image.style.borderRadius !== "0px" ? "rounded" : "square",
            width,
          });
          continue;
        }

        cells.push({
          id: uid(),
          type: "text",
          html: el.innerHTML.trim(),
          align: (el.style.textAlign as TextAlign) || "left",
          fontSize: fontSizeFromValue(el.style.fontSize),
          fontWeight: fontWeightFromValue(el.style.fontWeight),
          color: normalizeColor(el.style.color, page.textColor),
          width,
        });
      }

      if (cells.length > 0) {
        rows.push({ id: uid(), cells });
      }

      continue;
    }

    if (node.tagName === "FIGURE") {
      flushText();
      const image = node.querySelector("img");
      const video = node.querySelector("video");
      const width = widthFromValue(node.style.width || "");

      if (video) {
        rows.push({ id: uid(), cells: [{ id: uid(), type: "video", src: video.getAttribute("src") ?? "", width }] });
        continue;
      }

      if (image) {
        rows.push({
          id: uid(),
          cells: [{
            id: uid(),
            type: "image",
            src: image.getAttribute("src") ?? "",
            alt: image.alt,
            radius: image.style.borderRadius && image.style.borderRadius !== "0px" ? "rounded" : "square",
            width,
          }],
        });
        continue;
      }

      const divider = node.querySelector<HTMLElement>(".portfolio-editor-divider") ?? (node.classList.contains("portfolio-editor-divider") ? node : null);
      if (divider) {
        rows.push({
          id: uid(),
          cells: [{
            id: uid(),
            type: "line",
            orientation: divider.getAttribute("data-divider-orientation") === "vertical" ? "vertical" : "horizontal",
            color: normalizeColor(divider.getAttribute("data-divider-color") || divider.style.backgroundColor, "#cfd6e3"),
            width: 100,
          }],
        });
        continue;
      }
    }

    textBuffer.push(node.outerHTML);
  }

  flushText();
  return {
    rows: rows.length > 0 ? rows : createEmptyRows(),
    page,
  };
}

function serializeCellInner(cell: Cell): string {
  if (cell.type === "text") {
    return `<div style="text-align:${cell.align};color:${cell.color};font-size:${cell.fontSize}px;font-weight:${cell.fontWeight};">${cell.html || "<p><br></p>"}</div>`;
  }

  if (cell.type === "image") {
    const radius = cell.radius === "rounded" ? "12px" : "0px";
    return `<div class="portfolio-block-media"><img src="${escapeAttr(cell.src)}" alt="${escapeAttr(cell.alt)}" style="width:100%;height:auto;display:block;border-radius:${radius};object-fit:contain;object-position:center;" /></div>`;
  }

  if (cell.type === "video") {
    return `<div class="portfolio-block-media"><video src="${escapeAttr(cell.src)}" autoplay muted loop playsinline style="width:100%;height:auto;display:block;object-fit:contain;object-position:center;"></video></div>`;
  }

  if (cell.orientation === "vertical") {
    return `<div class="portfolio-editor-divider is-vertical" data-divider-orientation="vertical" data-divider-color="${escapeAttr(cell.color)}" style="background:${cell.color};"></div>`;
  }

  return `<div class="portfolio-editor-divider is-horizontal" data-divider-orientation="horizontal" data-divider-color="${escapeAttr(cell.color)}" style="background:${cell.color};"></div>`;
}

function rowsToHtml(rows: Row[], page: PageSettings): string {
  const markup = rows
    .filter(row => row.cells.length > 0)
    .map(row => {
      const cellsHtml = row.cells
        .map(cell => {
          const widthStyle = cell.type === "line" && cell.orientation === "vertical"
            ? "flex:0 0 18px;max-width:18px;"
            : cell.width === "auto"
              ? "flex:1 1 0;"
              : `flex:0 0 ${cell.width}%;max-width:${cell.width}%;`;
          return `<div class="pbe-cell" style="${widthStyle}min-width:0;">${serializeCellInner(cell)}</div>`;
        })
        .join("");

      return `<div class="pbe-row" style="display:flex;gap:${getRowGap(row.cells)}px;align-items:${row.cells.some(cell => cell.type === "line" && cell.orientation === "vertical") ? "stretch" : "flex-start"};margin:0 0 24px;">${cellsHtml}</div>`;
    })
    .join("\n");

  return `<div data-portfolio-page-root="true" data-page-background="${escapeAttr(page.background)}" data-page-text-color="${escapeAttr(page.textColor)}" style="background:${page.background};color:${page.textColor};">\n${markup}\n</div>`;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("이미지 읽기에 실패했습니다."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function TextCellEditor({
  cell,
  projectId,
  isActive,
  onFocus,
  onInput,
  registerRef,
}: {
  cell: TextCell;
  projectId: string;
  isActive: boolean;
  onFocus: () => void;
  onInput: (html: string) => void;
  registerRef: (cellId: string, element: HTMLDivElement | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const previousActive = useRef(false);
  const composing = useRef(false);

  useEffect(() => {
    registerRef(cell.id, ref.current);
    return () => registerRef(cell.id, null);
  }, [cell.id, registerRef]);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    if (isActive) {
      return;
    }

    if (ref.current.innerHTML !== cell.html) {
      ref.current.innerHTML = cell.html;
    }
  }, [cell.html, cell.id, isActive, projectId]);

  useEffect(() => {
    if (isActive && !previousActive.current && ref.current) {
      ref.current.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    previousActive.current = isActive;
  }, [isActive]);

  const insertPlainText = useCallback((text: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    const nextRange = document.createRange();
    nextRange.setStartAfter(textNode);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
  }, []);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="portfolio-block-text"
      style={{ textAlign: cell.align, color: cell.color, fontSize: `${cell.fontSize}px`, fontWeight: cell.fontWeight }}
      onClick={onFocus}
      onFocus={onFocus}
      onInput={() => {
        if (composing.current) return;
        onInput(ref.current?.innerHTML ?? "");
      }}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={() => {
        composing.current = false;
        onInput(ref.current?.innerHTML ?? "");
        onFocus();
      }}
      onCopy={event => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();
        const wrapper = document.createElement("div");
        wrapper.setAttribute("data-editor-internal", "true");
        wrapper.appendChild(fragment);
        event.clipboardData.setData("text/html", wrapper.outerHTML);
        event.clipboardData.setData("text/plain", selection.toString());
        event.preventDefault();
      }}
      onPaste={event => {
        event.preventDefault();
        const html = event.clipboardData.getData("text/html");
        const text = event.clipboardData.getData("text/plain");
        if (html && html.includes('data-editor-internal="true"')) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const internal = doc.querySelector("[data-editor-internal]");
          if (internal && ref.current) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              const frag = document.createRange().createContextualFragment(internal.innerHTML);
              range.insertNode(frag);
            }
          }
        } else {
          insertPlainText(text);
        }
        onInput(ref.current?.innerHTML ?? "");
        onFocus();
      }}
      onBlur={() => {
        onInput(ref.current?.innerHTML ?? "");
      }}
      onMouseUp={onFocus}
      onDragStart={() => { _editorDragActive = true; }}
      onDragEnd={() => { _editorDragActive = false; }}
      onDrop={event => {
        if (!_editorDragActive) {
          event.preventDefault();
          const text = event.dataTransfer.getData("text/plain");
          insertPlainText(text);
          onInput(ref.current?.innerHTML ?? "");
          onFocus();
        }
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
  const [rows, setRows] = useState<Row[]>(() => parsePortfolioDocument(initialHtml).rows);
  const rowsRef = useRef<Row[]>([]);
  rowsRef.current = rows;
  const [pageSettings, setPageSettings] = useState<PageSettings>(() => parsePortfolioDocument(initialHtml).page);
  const [activeCell, setActiveCell] = useState<{ rowId: string; cellId: string } | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [selectedTextStyle, setSelectedTextStyle] = useState({ fontSize: 18, fontWeight: 500 as TextCell["fontWeight"], color: "#141924" });
  const prevProjectId = useRef(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadTarget = useRef<PendingUploadTarget | null>(null);
  const dragRowId = useRef<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const textCellRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const savedSelection = useRef<Range | null>(null);

  useEffect(() => {
    if (prevProjectId.current !== projectId) {
      prevProjectId.current = projectId;
      const nextDocument = parsePortfolioDocument(initialHtml);
      setRows(nextDocument.rows);
      setPageSettings(nextDocument.page);
      setActiveCell(null);
      setActiveRowId(null);
      setUploadNotice(null);
    }
  }, [initialHtml, projectId]);

  const emit = useCallback(
    (nextRows: Row[], nextPage = pageSettings) => {
      onChange(rowsToHtml(nextRows, nextPage));
    },
    [onChange, pageSettings],
  );

  const updateRows = useCallback(
    (nextRows: Row[]) => {
      const normalized = nextRows.length > 0 ? nextRows : createEmptyRows();
      setRows(normalized);
      emit(normalized);
    },
    [emit],
  );

  const updateCell = useCallback(
    (rowId: string, cellId: string, updater: (cell: Cell) => Cell) => {
      updateRows(
        rowsRef.current.map(row => (
          row.id !== rowId
            ? row
            : { ...row, cells: row.cells.map(cell => (cell.id === cellId ? updater(cell) : cell)) }
        )),
      );
    },
    [updateRows],
  );

  const appendTextCell = useCallback(
    (rowId: string) => {
      const nextCell = createTextCell(pageSettings.textColor);
      updateRows(rows.map(row => {
        if (row.id !== rowId) {
          return row;
        }

        return {
          ...row,
          cells: rebalanceRowCells([...row.cells, nextCell]),
        };
      }));
      setActiveRowId(rowId);
      setActiveCell({ rowId, cellId: nextCell.id });
    },
    [rows, updateRows],
  );

  const addTextRow = useCallback(() => {
    const cell = createTextCell(pageSettings.textColor);
    const row = { id: uid(), cells: [cell] };
    updateRows([...rows, row]);
    setActiveRowId(row.id);
    setActiveCell({ rowId: row.id, cellId: cell.id });
  }, [rows, updateRows]);

  const deleteRow = useCallback((rowId: string) => {
    const nextRows = rows.filter(row => row.id !== rowId);
    updateRows(nextRows);

    if (activeCell?.rowId === rowId) {
      setActiveCell(null);
    }

    setActiveRowId(current => (current === rowId ? null : current));
  }, [activeCell, rows, updateRows]);

  const addHorizontalLineRow = useCallback(() => {
    const row = { id: uid(), cells: [createHorizontalLineCell()] };
    updateRows([...rows, row]);
    setActiveRowId(row.id);
    setActiveCell({ rowId: row.id, cellId: row.cells[0].id });
  }, [rows, updateRows]);

  const appendVerticalLineCell = useCallback((rowId: string) => {
    const nextCell = createVerticalLineCell();
    updateRows(rows.map(row => (
      row.id !== rowId
        ? row
        : { ...row, cells: [...row.cells, nextCell] }
    )));
    setActiveRowId(rowId);
    setActiveCell({ rowId, cellId: nextCell.id });
  }, [rows, updateRows]);

  const duplicateRow = useCallback((rowId: string) => {
    const sourceRow = rows.find(row => row.id === rowId);
    if (!sourceRow) {
      return;
    }

    const sourceIndex = rows.findIndex(row => row.id === rowId);
    const nextRow: Row = {
      id: uid(),
      cells: sourceRow.cells.map(cloneCell),
    };
    const nextRows = [...rows];
    nextRows.splice(sourceIndex + 1, 0, nextRow);
    updateRows(nextRows);
    setActiveRowId(nextRow.id);
    setActiveCell({ rowId: nextRow.id, cellId: nextRow.cells[0]?.id ?? "" });
  }, [rows, updateRows]);

  const deleteCell = useCallback(
    (rowId: string, cellId: string) => {
      const targetRow = rows.find(row => row.id === rowId);
      if (!targetRow) {
        return;
      }

      if (targetRow.cells.length === 1) {
        const nextRows = rows.filter(row => row.id !== rowId);
        updateRows(nextRows);
      } else {
        updateRows(
          rows.map(row => (
            row.id !== rowId ? row : { ...row, cells: row.cells.filter(cell => cell.id !== cellId) }
          )),
        );
      }

      setActiveCell(null);
      setActiveRowId(rowId);
    },
    [rows, updateRows],
  );

  const triggerMediaPicker = useCallback((target: PendingUploadTarget) => {
    setUploadNotice(null);
    pendingUploadTarget.current = target;
    fileInputRef.current?.click();
  }, []);

  const duplicateCell = useCallback((rowId: string, cellId: string) => {
    const row = rows.find(candidate => candidate.id === rowId);
    if (!row) {
      return;
    }

    const index = row.cells.findIndex(cell => cell.id === cellId);
    if (index < 0) {
      return;
    }

    const nextCell = cloneCell(row.cells[index]);
    const nextCells = [...row.cells];
    nextCells.splice(index + 1, 0, nextCell);

    updateRows(
      rows.map(candidate => (
        candidate.id !== rowId ? candidate : { ...candidate, cells: rebalanceRowCells(nextCells) }
      )),
    );
    setActiveRowId(rowId);
    setActiveCell({ rowId, cellId: nextCell.id });
  }, [rows, updateRows]);

  const moveCell = useCallback((rowId: string, cellId: string, direction: "left" | "right") => {
    const row = rows.find(candidate => candidate.id === rowId);
    if (!row) {
      return;
    }

    const index = row.cells.findIndex(cell => cell.id === cellId);
    if (index < 0) {
      return;
    }

    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= row.cells.length) {
      return;
    }

    const nextCells = [...row.cells];
    const [movedCell] = nextCells.splice(index, 1);
    nextCells.splice(targetIndex, 0, movedCell);

    updateRows(
      rows.map(candidate => (
        candidate.id !== rowId ? candidate : { ...candidate, cells: nextCells }
      )),
    );
    setActiveRowId(rowId);
    setActiveCell({ rowId, cellId });
  }, [rows, updateRows]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadNotice(null);

      try {
        let src = "";

        if (file.type.startsWith("video/")) {
          src = await uploadVideoFile(file);
        } else {
          try {
            src = await uploadImageFile(file);
          } catch (error) {
            const message = error instanceof Error ? error.message : "";
            if (!message.includes("저장소")) {
              throw error;
            }

            src = await fileToDataUrl(file);
            setUploadNotice("스토리지 설정이 없어 이미지는 임시 방식으로 저장됐어요. 배포용으로는 업로드 저장소 설정이 필요합니다.");
          }
        }

        const nextCell: Cell = isVideoSrc(src)
          ? { id: uid(), type: "video", src, width: "auto" }
          : {
              id: uid(),
              type: "image",
              src,
              alt: file.name.replace(/\.[^.]+$/, ""),
              radius: "square",
              width: "auto",
            };

        const target = pendingUploadTarget.current;

        if (!target || target.kind === "new-row") {
          const nextRow = { id: uid(), cells: [nextCell] };
          const nextRows = [...rows, nextRow];
          updateRows(nextRows);
          setActiveRowId(nextRow.id);
          setActiveCell({ rowId: nextRow.id, cellId: nextCell.id });
          return;
        }

        if (target.kind === "append-to-row") {
          updateRows(
            rows.map(row => (
              row.id !== target.rowId
                ? row
                : { ...row, cells: rebalanceRowCells([...row.cells, nextCell]) }
            )),
          );
          setActiveRowId(target.rowId);
          setActiveCell({ rowId: target.rowId, cellId: nextCell.id });
          return;
        }

        updateRows(
          rows.map(row => (
            row.id !== target.rowId
              ? row
              : {
                  ...row,
                  cells: row.cells.map(cell => (
                    cell.id !== target.cellId
                      ? cell
                      : nextCell
                  )),
                }
          )),
        );
        setActiveRowId(target.rowId);
        setActiveCell({ rowId: target.rowId, cellId: nextCell.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "업로드에 실패했습니다.";
        setUploadNotice(message);
        alert(message);
      } finally {
        setUploading(false);
        pendingUploadTarget.current = null;
      }
    },
    [rows, updateRows],
  );

  const moveRow = useCallback((targetRowId: string) => {
    const sourceRowId = dragRowId.current;
    if (!sourceRowId || sourceRowId === targetRowId) {
      setDragOverRowId(null);
      return;
    }

    const sourceIndex = rows.findIndex(row => row.id === sourceRowId);
    const targetIndex = rows.findIndex(row => row.id === targetRowId);
    if (sourceIndex < 0 || targetIndex < 0) {
      setDragOverRowId(null);
      dragRowId.current = null;
      return;
    }

    const nextRows = [...rows];
    const [movedRow] = nextRows.splice(sourceIndex, 1);
    nextRows.splice(targetIndex, 0, movedRow);
    updateRows(nextRows);
    setDragOverRowId(null);
    dragRowId.current = null;
  }, [rows, updateRows]);

  const activeCellData = activeCell
    ? rows.find(row => row.id === activeCell.rowId)?.cells.find(cell => cell.id === activeCell.cellId) ?? null
    : null;
  const activeRowData = activeRowId ? rows.find(row => row.id === activeRowId) ?? null : null;
  const activeCellIndex = activeCell && activeRowData
    ? activeRowData.cells.findIndex(cell => cell.id === activeCell.cellId)
    : -1;
  const rowCount = rows.length;
  const cellCount = rows.reduce((sum, row) => sum + row.cells.length, 0);
  const temporaryImageCount = rows.reduce((sum, row) => (
    sum + row.cells.filter(cell => cell.type === "image" && cell.src.startsWith("data:image/")).length
  ), 0);
  const hasTemporaryImages = temporaryImageCount > 0;
  const selectedCellLabel = activeCellData
    ? activeCellData.type === "text"
      ? "텍스트 셀 선택됨"
      : activeCellData.type === "image"
        ? "이미지 셀 선택됨"
        : activeCellData.type === "video"
          ? "비디오 셀 선택됨"
          : activeCellData.orientation === "vertical"
            ? "세로선 선택됨"
            : "가로선 선택됨"
    : "셀 선택 없음";

  const execTextCommand = (command: string) => {
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false);
  };

  const registerTextCellRef = useCallback((cellId: string, element: HTMLDivElement | null) => {
    textCellRefs.current[cellId] = element;
  }, []);

  const syncActiveTextCell = useCallback((cellId: string) => {
    const element = textCellRefs.current[cellId];
    if (!element || !activeCell) {
      return;
    }

    updateRows(
      rows.map(row => (
        row.id !== activeCell.rowId
          ? row
          : {
              ...row,
              cells: row.cells.map(cell => (
                cell.id !== cellId || cell.type !== "text"
                  ? cell
                  : { ...cell, html: element.innerHTML }
              )),
            }
      )),
    );
  }, [activeCell, rows, updateRows]);

  const readSelectionStyle = useCallback((cellId: string) => {
    const root = textCellRefs.current[cellId];
    const selection = window.getSelection();
    if (!root || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      return;
    }

    savedSelection.current = range.cloneRange();
    const anchorNode = range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : range.startContainer as HTMLElement | null;
    const target = anchorNode && root.contains(anchorNode) ? anchorNode : root;
    const styles = window.getComputedStyle(target);
    const fontSize = Math.round(Number.parseFloat(styles.fontSize) || 18);
    const rawWeight = Number.parseInt(styles.fontWeight, 10);
    const fontWeight = FONT_WEIGHT_OPTIONS.reduce((closest, weight) => (
      Math.abs(weight - rawWeight) < Math.abs(closest - rawWeight) ? weight : closest
    ), 500 as TextCell["fontWeight"]);

    const color = normalizeColor(styles.color, pageSettings.textColor);
    setSelectedTextStyle({ fontSize, fontWeight, color });
  }, [pageSettings.textColor]);

  const execSelectionCommand = useCallback((command: string) => {
    if (!activeCell || activeCellData?.type !== "text") {
      return;
    }

    const root = textCellRefs.current[activeCell.cellId];
    const selection = window.getSelection();
    if (!root || !selection) {
      return;
    }

    if (savedSelection.current) {
      selection.removeAllRanges();
      selection.addRange(savedSelection.current);
    }

    if (selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer) || range.collapsed) {
      return;
    }

    execTextCommand(command);
    syncActiveTextCell(activeCell.cellId);
    readSelectionStyle(activeCell.cellId);
  }, [activeCell, activeCellData?.type, readSelectionStyle, syncActiveTextCell]);

  const applySelectionStyle = useCallback((style: Partial<CSSStyleDeclaration>) => {
    if (!activeCell || activeCellData?.type !== "text") {
      return;
    }

    const root = textCellRefs.current[activeCell.cellId];
    const selection = window.getSelection();
    if (!root || !selection) {
      return;
    }

    if (savedSelection.current) {
      selection.removeAllRanges();
      selection.addRange(savedSelection.current);
    }

    if (selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      return;
    }

    // 선택 없을 때 색상은 셀 전체에 적용
    if (range.collapsed && style.color) {
      updateCell(activeCell.rowId, activeCell.cellId, cell => ({ ...(cell as TextCell), color: style.color! }));
      return;
    }

    if (range.collapsed) {
      return;
    }

    const span = document.createElement("span");
    if (style.fontSize) {
      span.style.fontSize = style.fontSize;
    }
    if (style.fontWeight) {
      span.style.fontWeight = style.fontWeight;
    }
    if (style.color) {
      span.style.color = style.color;
    }

    span.appendChild(range.extractContents());
    range.insertNode(span);

    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    savedSelection.current = nextRange.cloneRange();

    syncActiveTextCell(activeCell.cellId);
    readSelectionStyle(activeCell.cellId);
  }, [activeCell, activeCellData?.type, readSelectionStyle, syncActiveTextCell]);

  useEffect(() => {
    if (!activeCell || activeCellData?.type !== "text") {
      return;
    }

    const handleSelectionChange = () => {
      readSelectionStyle(activeCell.cellId);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [activeCell, activeCellData?.type, readSelectionStyle]);

  return (
    <div className="portfolio-block-editor">
      <div className="portfolio-block-summary">
        <span className="portfolio-block-summary-chip">
          {rowCount}개 행
        </span>
        <span className="portfolio-block-summary-chip">
          {cellCount}개 셀
        </span>
        <span className={`portfolio-block-summary-chip${activeCellData ? " is-selected" : ""}`}>
          {selectedCellLabel}
        </span>
        <span className={`portfolio-block-summary-chip${activeRowId ? " is-selected" : ""}`}>
          {activeRowId ? "행 선택됨" : "행 선택 없음"}
        </span>
        {hasTemporaryImages ? (
          <span className="portfolio-block-summary-chip is-warning">
            임시 이미지 {temporaryImageCount}개
          </span>
        ) : null}
      </div>

      {uploadNotice ? (
        <div className={`portfolio-block-notice${hasTemporaryImages ? " is-warning-strong" : ""}`}>
          {uploadNotice}
        </div>
      ) : null}

      <div className="portfolio-rich-toolbar portfolio-block-toolbar">
        <div className="portfolio-toolbar-group">
          <span className="portfolio-block-toolbar-section">페이지</span>
          <label className="portfolio-toolbar-inline-select is-color">
            <span>배경</span>
            <input
              type="color"
              value={pageSettings.background}
              onChange={event => {
                const nextBackground = event.target.value;
                const nextTextColor = isDarkColor(nextBackground) && pageSettings.textColor === "#141924"
                  ? "#f7f9fc"
                  : !isDarkColor(nextBackground) && pageSettings.textColor === "#f7f9fc"
                    ? "#141924"
                    : pageSettings.textColor;
                const nextPage = { background: nextBackground, textColor: nextTextColor };
                setPageSettings(nextPage);
                emit(rows, nextPage);
              }}
            />
            <code>{pageSettings.background}</code>
          </label>
          <label className="portfolio-toolbar-inline-select is-color">
            <span>기본 글자</span>
            <input
              type="color"
              value={pageSettings.textColor}
              onChange={event => {
                const nextPage = { ...pageSettings, textColor: event.target.value };
                setPageSettings(nextPage);
                emit(rows, nextPage);
              }}
            />
            <code>{pageSettings.textColor}</code>
          </label>
        </div>

        {!activeCellData ? (
          <div className="portfolio-toolbar-group">
            <span className="portfolio-toolbar-label">셀을 선택하면 서식과 크기 옵션이 나타납니다.</span>
          </div>
        ) : null}

        {activeCellData?.type === "text" ? (
          <>
            <div className="portfolio-toolbar-group">
              <span className="portfolio-block-toolbar-section">서식</span>
              <label className="portfolio-toolbar-inline-select">
                <span>크기</span>
                <select
                  value={selectedTextStyle.fontSize}
                  onChange={event => applySelectionStyle({ fontSize: `${event.target.value}px` })}
                >
                  {FONT_SIZE_OPTIONS.map(size => (
                    <option key={size} value={size}>
                      {size}px
                    </option>
                  ))}
                </select>
              </label>
              <label className="portfolio-toolbar-inline-select">
                <span>굵기</span>
                <select
                  value={selectedTextStyle.fontWeight}
                  onChange={event => applySelectionStyle({ fontWeight: event.target.value })}
                >
                  {FONT_WEIGHT_OPTIONS.map(weight => (
                    <option key={weight} value={weight}>
                      {weight}
                    </option>
                  ))}
                </select>
              </label>
              <label className="portfolio-toolbar-inline-select is-color">
                <span>글자색</span>
                <input
                  type="color"
                  value={selectedTextStyle.color}
                  onChange={event => applySelectionStyle({ color: event.target.value })}
                />
                <code>{selectedTextStyle.color}</code>
              </label>
              <div className="portfolio-toolbar-sep" />
              <button className="secondary-link button-reset" type="button" onMouseDown={event => { event.preventDefault(); execSelectionCommand("bold"); }}>
                <b>B</b>
              </button>
              <button className="secondary-link button-reset" type="button" onMouseDown={event => { event.preventDefault(); execSelectionCommand("italic"); }}>
                <span style={{ fontStyle: "italic" }}>/</span>
              </button>
              <button className="secondary-link button-reset" type="button" onMouseDown={event => { event.preventDefault(); execSelectionCommand("underline"); }}>
                <span style={{ textDecoration: "underline" }}>U</span>
              </button>
            </div>
            <div className="portfolio-toolbar-group">
              <span className="portfolio-block-toolbar-section">정렬</span>
              {(["left", "center", "right"] as const).map(align => (
                <button
                  key={align}
                  className={`secondary-link button-reset${activeCellData.align === align ? " is-active" : ""}`}
                  type="button"
                  onMouseDown={event => {
                    event.preventDefault();
                    updateCell(activeCell!.rowId, activeCell!.cellId, cell => ({ ...(cell as TextCell), align }));
                  }}
                >
                  {align === "left" ? "좌" : align === "center" ? "중" : "우"}
                </button>
              ))}
              <div className="portfolio-toolbar-sep" />
              <span className="portfolio-block-toolbar-section">폭</span>
              {WIDTH_OPTIONS.map(width => (
                <button
                  key={String(width)}
                  className={`secondary-link button-reset${activeCellData.width === width ? " is-active" : ""}`}
                  type="button"
                  onMouseDown={event => {
                    event.preventDefault();
                    updateCell(activeCell!.rowId, activeCell!.cellId, cell => ({ ...cell, width }));
                  }}
                >
                  {WIDTH_LABELS[width]}
                </button>
              ))}
              {activeRowData && activeCellIndex >= 0 ? (
                <>
                  <div className="portfolio-toolbar-sep" />
                  <button
                    className="secondary-link button-reset"
                    disabled={activeCellIndex === 0}
                    type="button"
                    onMouseDown={event => {
                      event.preventDefault();
                      moveCell(activeCell!.rowId, activeCell!.cellId, "left");
                    }}
                  >
                    ←
                  </button>
                  <button
                    className="secondary-link button-reset"
                    disabled={activeCellIndex === activeRowData.cells.length - 1}
                    type="button"
                    onMouseDown={event => {
                      event.preventDefault();
                      moveCell(activeCell!.rowId, activeCell!.cellId, "right");
                    }}
                  >
                    →
                  </button>
                </>
              ) : null}
              <div className="portfolio-toolbar-sep" />
              <button
                className="secondary-link button-reset"
                type="button"
                onMouseDown={event => {
                  event.preventDefault();
                  duplicateCell(activeCell!.rowId, activeCell!.cellId);
                }}
              >
                셀 복제
              </button>
            </div>
          </>
        ) : null}

        {activeCellData?.type === "image" || activeCellData?.type === "video" || activeCellData?.type === "line" ? (
          <div className="portfolio-toolbar-group">
            <span className="portfolio-block-toolbar-section">폭</span>
            {((activeCellData.type === "line" && activeCellData.orientation === "vertical" ? ["auto"] : WIDTH_OPTIONS) as CellWidth[]).map(width => (
              <button
                key={String(width)}
                className={`secondary-link button-reset${activeCellData.width === width ? " is-active" : ""}`}
                type="button"
                onClick={() => updateCell(activeCell!.rowId, activeCell!.cellId, cell => ({ ...cell, width }))}
              >
                {WIDTH_LABELS[width]}
              </button>
            ))}
            {activeRowData && activeCellIndex >= 0 ? (
              <>
                <div className="portfolio-toolbar-sep" />
                <button
                  className="secondary-link button-reset"
                  disabled={activeCellIndex === 0}
                  type="button"
                  onClick={() => moveCell(activeCell!.rowId, activeCell!.cellId, "left")}
                >
                  ←
                </button>
                <button
                  className="secondary-link button-reset"
                  disabled={activeCellIndex === activeRowData.cells.length - 1}
                  type="button"
                  onClick={() => moveCell(activeCell!.rowId, activeCell!.cellId, "right")}
                >
                  →
                </button>
              </>
            ) : null}
            <div className="portfolio-toolbar-sep" />
            <button className="secondary-link button-reset" type="button" onClick={() => duplicateCell(activeCell!.rowId, activeCell!.cellId)}>
              셀 복제
            </button>
            <button
              className="secondary-link button-reset"
              type="button"
              disabled={uploading || activeCellData.type === "line"}
              onClick={() => triggerMediaPicker({ kind: "replace-cell", rowId: activeCell!.rowId, cellId: activeCell!.cellId })}
            >
              {uploading ? "업로드 중..." : "미디어 교체"}
            </button>
            {activeCellData.type === "line" ? (
              <>
                <div className="portfolio-toolbar-sep" />
                <label className="portfolio-toolbar-inline-select is-color">
                  <span>선색</span>
                  <input
                    key={`line-color-${activeCell?.cellId}`}
                    type="color"
                    value={activeCellData.color}
                    onChange={event => updateCell(activeCell!.rowId, activeCell!.cellId, cell => ({ ...(cell as LineCell), color: event.target.value }))}
                  />
                  <code>{activeCellData.color}</code>
                </label>
              </>
            ) : null}
            {activeCellData.type === "image" ? (
              <>
                <div className="portfolio-toolbar-sep" />
                <button
                  className={`secondary-link button-reset${activeCellData.radius === "square" ? " is-active" : ""}`}
                  type="button"
                  onClick={() => updateCell(activeCell!.rowId, activeCell!.cellId, cell => ({ ...(cell as ImageCell), radius: "square" }))}
                >
                  각짐
                </button>
                <button
                  className={`secondary-link button-reset${activeCellData.radius === "rounded" ? " is-active" : ""}`}
                  type="button"
                  onClick={() => updateCell(activeCell!.rowId, activeCell!.cellId, cell => ({ ...(cell as ImageCell), radius: "rounded" }))}
                >
                  라운드
                </button>
              </>
            ) : null}
            <div className="portfolio-toolbar-sep" />
            <button className="secondary-link button-reset" style={{ color: "#c03" }} type="button" onClick={() => deleteCell(activeCell!.rowId, activeCell!.cellId)}>
              삭제
            </button>
          </div>
        ) : null}
      </div>

      <div
        className="portfolio-block-list"
        style={{
          background: pageSettings.background,
          color: pageSettings.textColor,
          borderRadius: 28,
          padding: 18,
          border: "1px solid rgba(18, 24, 38, 0.08)",
        }}
      >
        {rows.map(row => (
          <div key={row.id} className="portfolio-block-row-wrap">
            <div
              className={`portfolio-block-row${dragOverRowId === row.id ? " is-drag-over" : ""}${activeRowId === row.id ? " is-selected" : ""}`}
              style={rowBoxStyle(activeRowId === row.id, dragOverRowId === row.id)}
              onDragOver={event => {
                event.preventDefault();
                setDragOverRowId(row.id);
              }}
              onClick={() => {
                setActiveRowId(row.id);
              }}
              onDragEnd={() => {
                setDragOverRowId(null);
                dragRowId.current = null;
              }}
              onDrop={event => {
                event.preventDefault();
                moveRow(row.id);
              }}
            >
              <button
                className="portfolio-block-handle"
                draggable
                type="button"
                onDragStart={() => {
                  dragRowId.current = row.id;
                }}
              >
                ⋮⋮
              </button>

              <div className="portfolio-block-cells" style={rowCellsGridStyle(row.cells)}>
                {row.cells.map(cell => {
                  const isActive = activeCell?.cellId === cell.id;

                  return (
                    <div
                      key={cell.id}
                      className={`portfolio-block-cell${isActive ? " is-active" : ""}${cell.type === "text" ? " is-text" : cell.type === "line" ? " is-line" : " is-media"}`}
                      style={{
                        border: isActive ? "1.5px solid rgba(49, 99, 255, 1)" : "1.5px solid rgba(18, 24, 38, 0.08)",
                        borderRadius: 22,
                        overflow: cell.type === "line" ? "visible" : "hidden",
                        background: cell.type === "text" ? "#fff" : cell.type === "line" ? "transparent" : "#fff",
                        minHeight: cell.type === "text" ? 144 : cell.type === "line" ? 144 : undefined,
                        width: "100%",
                        maxWidth: "100%",
                      }}
                      onClick={() => {
                        setActiveRowId(row.id);
                        setActiveCell({ rowId: row.id, cellId: cell.id });
                      }}
                    >
                      {cell.type === "text" ? (
                        <TextCellEditor
                          cell={cell}
                          projectId={projectId}
                          isActive={isActive}
                          registerRef={registerTextCellRef}
                          onFocus={() => {
                            setActiveRowId(row.id);
                            setActiveCell({ rowId: row.id, cellId: cell.id });
                            readSelectionStyle(cell.id);
                          }}
                          onInput={html => {
                            updateRows(
                              rows.map(candidate => (
                                candidate.id !== row.id
                                  ? candidate
                                  : {
                                      ...candidate,
                                      cells: candidate.cells.map(candidateCell => (
                                        candidateCell.id !== cell.id
                                          ? candidateCell
                                          : { ...candidateCell, html } as TextCell
                                      )),
                                    }
                              )),
                            );
                          }}
                        />
                      ) : null}

                      {cell.type === "line" ? (
                        <div
                          className={`portfolio-editor-divider is-${cell.orientation}`}
                          data-divider-orientation={cell.orientation}
                          data-divider-color={cell.color}
                          style={{
                            background: cell.color,
                            backgroundColor: cell.color,
                            ...(cell.orientation === "horizontal"
                              ? { height: 3, width: "100%", alignSelf: "center", margin: "28px 0" }
                              : { width: 3, minHeight: "100%", alignSelf: "stretch", margin: "0 auto" }),
                          }}
                        />
                      ) : null}

                      {cell.type === "image" ? (
                        cell.src ? (
                          <div className="portfolio-block-media-frame">
                            <img
                              src={cell.src}
                              alt={cell.alt}
                              className="portfolio-block-media-preview"
                              style={{
                                display: "block",
                                width: "100%",
                                maxWidth: "100%",
                                height: "auto",
                                maxHeight: "none",
                                objectFit: "contain",
                                objectPosition: "center",
                                borderRadius: cell.radius === "rounded" ? 18 : 0,
                              }}
                            />
                          </div>
                        ) : (
                          <div className="portfolio-block-media-empty">이미지를 추가해 주세요</div>
                        )
                      ) : null}

                      {cell.type === "video" ? (
                        cell.src ? (
                          <div className="portfolio-block-media-frame">
                            <video
                              src={cell.src}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="portfolio-block-media-preview"
                              style={{
                                display: "block",
                                width: "100%",
                                maxWidth: "100%",
                                height: "auto",
                                maxHeight: "none",
                                objectFit: "contain",
                                objectPosition: "center",
                              }}
                            />
                          </div>
                        ) : (
                          <div className="portfolio-block-media-empty">비디오를 추가해 주세요</div>
                        )
                      ) : null}

                      {isActive ? (
                        <button
                          className="portfolio-block-cell-delete"
                          type="button"
                          onClick={event => {
                            event.stopPropagation();
                            deleteCell(row.id, cell.id);
                          }}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="portfolio-block-add-cell" style={rowActionsStyle()}>
                <button className="secondary-link button-reset" type="button" onClick={() => appendTextCell(row.id)}>
                  + 글
                </button>
                <button className="secondary-link button-reset" type="button" onClick={() => triggerMediaPicker({ kind: "append-to-row", rowId: row.id })}>
                  + 미디어
                </button>
                <button className="secondary-link button-reset" type="button" onClick={() => appendVerticalLineCell(row.id)}>
                  + 세로선
                </button>
                <button className="secondary-link button-reset" type="button" onClick={() => duplicateRow(row.id)}>
                  행 복제
                </button>
                <button className="secondary-link button-reset is-danger" type="button" onClick={() => deleteRow(row.id)}>
                  행 삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="portfolio-block-add-row">
        <button className="secondary-link button-reset" type="button" onClick={addTextRow}>
          + 텍스트 행
        </button>
        <button className="secondary-link button-reset" type="button" disabled={uploading} onClick={() => triggerMediaPicker({ kind: "new-row" })}>
          {uploading ? "업로드 중..." : "+ 미디어 행"}
        </button>
        <button className="secondary-link button-reset" type="button" onClick={addHorizontalLineRow}>
          + 가로선 행
        </button>
      </div>

      <input
        ref={fileInputRef}
        accept="image/*,video/mp4,video/webm,video/quicktime"
        style={{ display: "none" }}
        type="file"
        onChange={event => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFileSelect(file);
          }
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}
