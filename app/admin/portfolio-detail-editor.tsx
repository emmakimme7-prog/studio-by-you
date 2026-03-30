"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isVideoSrc, uploadImageFile, uploadVideoFile } from "@/lib/client-upload";

// ─── Types ───────────────────────────────────────────────────────────────────

type CellWidth = "auto" | 25 | 33 | 50 | 67 | 75 | 100;

type TextCell  = { id: string; type: "text";  html: string; align: "left"|"center"|"right"; width: CellWidth };
type ImageCell = { id: string; type: "image"; src: string; alt: string; radius: "square"|"rounded"; width: CellWidth };
type VideoCell = { id: string; type: "video"; src: string; width: CellWidth };
type Cell = TextCell | ImageCell | VideoCell;

type Row = { id: string; cells: Cell[] };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

const WIDTH_LABELS: Record<CellWidth, string> = {
  auto: "균등", 25: "1/4", 33: "1/3", 50: "1/2", 67: "2/3", 75: "3/4", 100: "1/1",
};
const WIDTH_OPTIONS: CellWidth[] = ["auto", 25, 33, 50, 67, 75, 100];

function cellFlexStyle(width: CellWidth): React.CSSProperties {
  if (width === "auto") return { flex: 1, minWidth: 0 };
  return { flex: `0 0 ${width}%`, maxWidth: `${width}%` };
}

// ─── Parse HTML → Rows ───────────────────────────────────────────────────────

function parseHtmlToRows(html: string): Row[] {
  if (typeof window === "undefined" || !html.trim()) {
    return [{ id: uid(), cells: [{ id: uid(), type: "text", html: "", align: "left", width: "auto" }] }];
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.body.querySelector<HTMLElement>("[data-portfolio-page-root='true']") ?? doc.body;
  const rows: Row[] = [];
  let textAccum: string[] = [];

  const flushText = () => {
    const joined = textAccum.join("").trim();
    if (joined) {
      rows.push({ id: uid(), cells: [{ id: uid(), type: "text", html: joined, align: "left", width: "auto" }] });
    }
    textAccum = [];
  };

  for (const node of Array.from(root.childNodes)) {
    if (!(node instanceof HTMLElement)) {
      const t = node.textContent?.trim();
      if (t) textAccum.push(`<p>${t}</p>`);
      continue;
    }

    // Multi-cell row
    if (node.classList.contains("pbe-row")) {
      flushText();
      const cells: Cell[] = [];
      for (const child of Array.from(node.children)) {
        const el = child as HTMLElement;
        const fig = el.tagName === "FIGURE" ? el : el.querySelector("figure");
        const img = fig?.querySelector("img") ?? (el.tagName === "IMG" ? el as HTMLImageElement : null);
        const vid = fig?.querySelector("video") ?? (el.tagName === "VIDEO" ? el as HTMLVideoElement : null);
        const wRaw = parseFloat(el.style.flexBasis || el.style.maxWidth || "0");
        const w: CellWidth = ([25,33,50,67,75,100].includes(wRaw) ? wRaw : "auto") as CellWidth;
        if (vid) {
          cells.push({ id: uid(), type: "video", src: vid.getAttribute("src") ?? "", width: w });
        } else if (img) {
          const br = img.style.borderRadius;
          cells.push({ id: uid(), type: "image", src: img.getAttribute("src") ?? "", alt: img.alt, radius: br && br !== "0px" ? "rounded" : "square", width: w });
        } else {
          cells.push({ id: uid(), type: "text", html: el.innerHTML.trim(), align: "left", width: w });
        }
      }
      if (cells.length) rows.push({ id: uid(), cells });
      continue;
    }

    // Single media figure (old or new format)
    if (node.tagName === "FIGURE") {
      flushText();
      const img = node.querySelector("img");
      const vid = node.querySelector("video");
      const wRaw = parseFloat(node.style.width || "0");
      const w: CellWidth = ([25,33,50,67,75,100].includes(wRaw) ? wRaw : "auto") as CellWidth;
      if (vid) {
        rows.push({ id: uid(), cells: [{ id: uid(), type: "video", src: vid.getAttribute("src") ?? "", width: w }] });
      } else if (img) {
        const br = img.style.borderRadius;
        rows.push({ id: uid(), cells: [{ id: uid(), type: "image", src: img.getAttribute("src") ?? "", alt: img.alt, radius: br && br !== "0px" ? "rounded" : "square", width: w }] });
      }
      continue;
    }

    textAccum.push(node.outerHTML);
  }

  flushText();
  return rows.length
    ? rows
    : [{ id: uid(), cells: [{ id: uid(), type: "text", html: "", align: "left", width: "auto" }] }];
}

// ─── Serialize Rows → HTML ───────────────────────────────────────────────────

function rowsToHtml(rows: Row[]): string {
  const inner = rows.map(row => {
    if (row.cells.length === 1) {
      return serializeCell(row.cells[0], true);
    }
    const cellsHtml = row.cells.map(cell => {
      const w = cell.width === "auto" ? "" : `flex:0 0 ${cell.width}%;max-width:${cell.width}%;`;
      return `<div class="pbe-cell" style="flex:1;min-width:0;${w}">${serializeCellInner(cell)}</div>`;
    }).join("");
    return `<div class="pbe-row" style="display:flex;gap:0;align-items:flex-start;margin:0 0 24px;">${cellsHtml}</div>`;
  }).join("\n");

  return `<div data-portfolio-page-root="true" data-page-background="#ffffff" data-page-text-color="#141924" style="background:#ffffff;color:#141924;">\n${inner}\n</div>`;
}

function serializeCellInner(cell: Cell): string {
  if (cell.type === "text") return cell.html || "<p><br></p>";
  const br = cell.type === "image" && cell.radius === "rounded" ? "12px" : "0px";
  if (cell.type === "image") return `<img src="${cell.src}" alt="${cell.alt}" style="width:100%;display:block;border-radius:${br};" />`;
  return `<video src="${cell.src}" controls playsinline style="width:100%;display:block;"></video>`;
}

function serializeCell(cell: Cell, singleInRow: boolean): string {
  if (cell.type === "text") return cell.html || "<p><br></p>";
  const br = cell.type === "image" && cell.radius === "rounded" ? "12px" : "0px";
  const w = singleInRow && cell.width !== "auto" ? `${cell.width}%` : "100%";
  const inner = cell.type === "image"
    ? `<img src="${cell.src}" alt="${cell.alt}" style="width:100%;display:block;border-radius:${br};" />`
    : `<video src="${cell.src}" controls playsinline style="width:100%;display:block;"></video>`;
  return `<figure class="portfolio-block-media" style="width:${w};display:block;margin:0 0 18px;">${inner}</figure>`;
}

// ─── TextCellEditor ───────────────────────────────────────────────────────────

function TextCellEditor({ cell, projectId, onFocus, onInput }: {
  cell: TextCell; projectId: string; onFocus: () => void; onInput: (html: string) => void;
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

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="portfolio-block-text"
      style={{ outline: "none", minHeight: 36, textAlign: cell.align }}
      onFocus={onFocus}
      onInput={() => onInput(ref.current?.innerHTML ?? "")}
    />
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

type PortfolioDetailEditorProps = {
  projectId: string;
  initialHtml: string;
  onChange: (html: string) => void;
};

export function PortfolioDetailEditor({ projectId, initialHtml, onChange }: PortfolioDetailEditorProps) {
  const [rows, setRows] = useState<Row[]>(() => parseHtmlToRows(initialHtml));
  const [activeCell, setActiveCell] = useState<{ rowId: string; cellId: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const prevProjectId = useRef(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTarget = useRef<{ rowId: string; insertAfterCellId?: string } | null>(null);
  const dragRowId = useRef<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);

  useEffect(() => {
    if (prevProjectId.current !== projectId) {
      prevProjectId.current = projectId;
      setRows(parseHtmlToRows(initialHtml));
      setActiveCell(null);
    }
  }, [projectId, initialHtml]);

  const emit = useCallback((nextRows: Row[]) => onChange(rowsToHtml(nextRows)), [onChange]);

  const updateRows = (next: Row[]) => { setRows(next); emit(next); };

  const updateCell = (rowId: string, cellId: string, patch: Partial<Cell>) => {
    const next = rows.map(r => r.id !== rowId ? r : {
      ...r,
      cells: r.cells.map(c => c.id !== cellId ? c : ({ ...c, ...patch } as Cell)),
    });
    updateRows(next);
  };

  const deleteCell = (rowId: string, cellId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    if (row.cells.length === 1) {
      updateRows(rows.filter(r => r.id !== rowId));
    } else {
      updateRows(rows.map(r => r.id !== rowId ? r : { ...r, cells: r.cells.filter(c => c.id !== cellId) }));
    }
    setActiveCell(null);
  };

  const addTextRow = () => {
    const cell: TextCell = { id: uid(), type: "text", html: "", align: "left", width: "auto" };
    const row: Row = { id: uid(), cells: [cell] };
    const next = [...rows, row];
    updateRows(next);
    setActiveCell({ rowId: row.id, cellId: cell.id });
  };

  const addCellToRow = (rowId: string, type: "image" | "video" | "text") => {
    if (type === "text") {
      const cell: TextCell = { id: uid(), type: "text", html: "", align: "left", width: "auto" };
      updateRows(rows.map(r => r.id !== rowId ? r : { ...r, cells: [...r.cells, cell] }));
      setActiveCell({ rowId, cellId: cell.id });
      return;
    }
    pendingTarget.current = { rowId };
    fileInputRef.current?.click();
  };

  const triggerMediaUpload = (rowId: string) => {
    pendingTarget.current = { rowId };
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (file: File) => {
    const target = pendingTarget.current;
    try {
      setUploading(true);
      const src = file.type.startsWith("video/") ? await uploadVideoFile(file) : await uploadImageFile(file);
      const isVid = isVideoSrc(src);

      if (!target) {
        // New row
        const cell: Cell = isVid
          ? { id: uid(), type: "video", src, width: "auto" }
          : { id: uid(), type: "image", src, alt: file.name.replace(/\.[^.]+$/, ""), radius: "square", width: "auto" };
        const row: Row = { id: uid(), cells: [cell] };
        const next = [...rows, row];
        updateRows(next);
        setActiveCell({ rowId: row.id, cellId: cell.id });
      } else {
        // Add to existing row
        const cell: Cell = isVid
          ? { id: uid(), type: "video", src, width: "auto" }
          : { id: uid(), type: "image", src, alt: file.name.replace(/\.[^.]+$/, ""), radius: "square", width: "auto" };
        const next = rows.map(r => r.id !== target.rowId ? r : { ...r, cells: [...r.cells, cell] });
        updateRows(next);
        setActiveCell({ rowId: target.rowId, cellId: cell.id });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
      pendingTarget.current = null;
    }
  };

  // Drag row reorder
  const onRowDragStart = (rowId: string) => { dragRowId.current = rowId; };
  const onRowDragOver = (e: React.DragEvent, rowId: string) => { e.preventDefault(); setDragOverRowId(rowId); };
  const onRowDrop = (e: React.DragEvent, targetRowId: string) => {
    e.preventDefault();
    const src = dragRowId.current;
    if (!src || src === targetRowId) { setDragOverRowId(null); return; }
    const srcIdx = rows.findIndex(r => r.id === src);
    const tgtIdx = rows.findIndex(r => r.id === targetRowId);
    const next = [...rows];
    const [moved] = next.splice(srcIdx, 1);
    next.splice(tgtIdx, 0, moved);
    updateRows(next);
    setDragOverRowId(null);
    dragRowId.current = null;
  };
  const onRowDragEnd = () => { setDragOverRowId(null); dragRowId.current = null; };

  // Active cell
  const activeCellData = activeCell
    ? rows.find(r => r.id === activeCell.rowId)?.cells.find(c => c.id === activeCell.cellId) ?? null
    : null;

  const fmt = (cmd: string) => { document.execCommand(cmd, false); };

  return (
    <div className="portfolio-block-editor">
      {/* ── Toolbar ── */}
      <div className="portfolio-rich-toolbar">
        {!activeCellData && (
          <span className="portfolio-toolbar-label">블록을 선택하면 옵션이 나타납니다</span>
        )}
        {activeCellData?.type === "text" && (
          <div className="portfolio-toolbar-group">
            <button className="secondary-link button-reset" onMouseDown={e => { e.preventDefault(); fmt("bold"); }} type="button"><b>B</b></button>
            <button className="secondary-link button-reset" onMouseDown={e => { e.preventDefault(); fmt("italic"); }} type="button"><i>I</i></button>
            <button className="secondary-link button-reset" onMouseDown={e => { e.preventDefault(); fmt("underline"); }} type="button" style={{ textDecoration: "underline" }}>U</button>
            <div className="portfolio-toolbar-sep" />
            {(["left","center","right"] as const).map(a => (
              <button
                key={a}
                className={`secondary-link button-reset${activeCellData.align === a ? " is-active" : ""}`}
                onMouseDown={e => { e.preventDefault(); updateCell(activeCell!.rowId, activeCell!.cellId, { align: a }); }}
                type="button"
              >{a === "left" ? "좌" : a === "center" ? "중" : "우"}</button>
            ))}
            <div className="portfolio-toolbar-sep" />
            {WIDTH_OPTIONS.map(w => (
              <button key={String(w)} className={`secondary-link button-reset${activeCellData.width === w ? " is-active" : ""}`} onMouseDown={e => { e.preventDefault(); updateCell(activeCell!.rowId, activeCell!.cellId, { width: w }); }} type="button">{WIDTH_LABELS[w]}</button>
            ))}
          </div>
        )}
        {(activeCellData?.type === "image" || activeCellData?.type === "video") && (
          <div className="portfolio-toolbar-group">
            {WIDTH_OPTIONS.map(w => (
              <button key={String(w)} className={`secondary-link button-reset${activeCellData.width === w ? " is-active" : ""}`} onClick={() => updateCell(activeCell!.rowId, activeCell!.cellId, { width: w })} type="button">{WIDTH_LABELS[w]}</button>
            ))}
            {activeCellData.type === "image" && (
              <>
                <div className="portfolio-toolbar-sep" />
                <button className={`secondary-link button-reset${activeCellData.radius === "square" ? " is-active" : ""}`} onClick={() => updateCell(activeCell!.rowId, activeCell!.cellId, { radius: "square" })} type="button">각짐</button>
                <button className={`secondary-link button-reset${activeCellData.radius === "rounded" ? " is-active" : ""}`} onClick={() => updateCell(activeCell!.rowId, activeCell!.cellId, { radius: "rounded" })} type="button">라운드</button>
              </>
            )}
            <div className="portfolio-toolbar-sep" />
            <button className="secondary-link button-reset" style={{ color: "#c03" }} onClick={() => deleteCell(activeCell!.rowId, activeCell!.cellId)} type="button">삭제</button>
          </div>
        )}
      </div>

      {/* ── Row list ── */}
      <div className="portfolio-block-list">
        {rows.map(row => (
          <div
            key={row.id}
            className={`portfolio-block-row${dragOverRowId === row.id ? " is-drag-over" : ""}`}
            onDragOver={e => onRowDragOver(e, row.id)}
            onDrop={e => onRowDrop(e, row.id)}
            onDragEnd={onRowDragEnd}
          >
            {/* Drag handle */}
            <span
              className="portfolio-block-handle"
              draggable
              onDragStart={() => onRowDragStart(row.id)}
            >⠿</span>

            {/* Cells */}
            <div className="portfolio-block-cells">
              {row.cells.map(cell => {
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
                        onFocus={() => setActiveCell({ rowId: row.id, cellId: cell.id })}
                        onInput={html => {
                          const next = rows.map(r => r.id !== row.id ? r : {
                            ...r,
                            cells: r.cells.map(c => c.id !== cell.id ? c : { ...c, html } as TextCell),
                          });
                          setRows(next);
                          emit(next);
                        }}
                      />
                    )}
                    {cell.type === "image" && (
                      <img src={cell.src} alt={cell.alt} style={{ width: "100%", display: "block", borderRadius: cell.radius === "rounded" ? 12 : 0, maxHeight: 300, objectFit: "contain" }} />
                    )}
                    {cell.type === "video" && (
                      <video src={cell.src} controls style={{ width: "100%", display: "block", maxHeight: 300 }} />
                    )}
                    {/* Per-cell delete */}
                    {isActive && (
                      <button
                        className="portfolio-block-cell-delete"
                        onClick={e => { e.stopPropagation(); deleteCell(row.id, cell.id); }}
                        type="button"
                      >✕</button>
                    )}
                  </div>
                );
              })}

              {/* Add cell to this row */}
              <div className="portfolio-block-add-cell">
                <button className="secondary-link button-reset" onClick={() => addCellToRow(row.id, "text")} title="텍스트 열 추가" type="button">+ 글</button>
                <button className="secondary-link button-reset" onClick={() => triggerMediaUpload(row.id)} title="미디어 열 추가" type="button">+ 미디어</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Add row ── */}
      <div className="portfolio-block-add-row">
        <button className="secondary-link button-reset" onClick={addTextRow} type="button">+ 텍스트 행</button>
        <button className="secondary-link button-reset" disabled={uploading} onClick={() => { pendingTarget.current = null; fileInputRef.current?.click(); }} type="button">
          {uploading ? "업로드 중..." : "+ 미디어 행"}
        </button>
      </div>

      <input
        ref={fileInputRef}
        accept="image/*,video/mp4,video/webm,video/quicktime"
        style={{ display: "none" }}
        type="file"
        onChange={e => { const f = e.target.files?.[0]; if (f) void handleFileSelect(f); e.currentTarget.value = ""; }}
      />
    </div>
  );
}
