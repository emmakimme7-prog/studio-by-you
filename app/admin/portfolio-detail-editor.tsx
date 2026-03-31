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

type Cell = TextCell | ImageCell | VideoCell;
type Row = { id: string; cells: Cell[] };
type PendingUploadTarget =
  | { kind: "new-row" }
  | { kind: "append-to-row"; rowId: string }
  | { kind: "replace-cell"; rowId: string; cellId: string };

const uid = () => Math.random().toString(36).slice(2, 10);

const WIDTH_OPTIONS: CellWidth[] = ["auto", 25, 33, 50, 67, 75, 100];
const WIDTH_LABELS: Record<CellWidth, string> = {
  auto: "균등",
  25: "1/4",
  33: "1/3",
  50: "1/2",
  67: "2/3",
  75: "3/4",
  100: "1/1",
};

function createTextCell(): TextCell {
  return { id: uid(), type: "text", html: "", align: "left", width: "auto" };
}

function cloneCell(cell: Cell): Cell {
  if (cell.type === "text") {
    return { ...cell, id: uid() };
  }

  if (cell.type === "image") {
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

function getRowCellShares(cells: Cell[]): number[] {
  if (cells.length === 0) {
    return [];
  }

  const explicitTotal = cells.reduce((sum, cell) => sum + (cell.width === "auto" ? 0 : cell.width), 0);
  const autoCount = cells.filter(cell => cell.width === "auto").length;

  if (explicitTotal >= 100 || autoCount === 0) {
    return cells.map(cell => (cell.width === "auto" ? 100 / cells.length : cell.width));
  }

  const remaining = Math.max(100 - explicitTotal, 0);
  const autoShare = autoCount > 0 ? remaining / autoCount : 0;

  return cells.map(cell => (cell.width === "auto" ? autoShare : cell.width));
}

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
    gap: 26,
    minWidth: 0,
    alignItems: "start",
  };
}

function rowCellsGridStyle(cells: Cell[]): React.CSSProperties {
  const shares = getRowCellShares(cells);

  return {
    ...rowCellsStyle(),
    gridTemplateColumns: shares.map(share => `minmax(0, ${Math.max(share, 1)}fr)`).join(" "),
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
  const balancedWidth = getBalancedWidth(cells.length);
  const currentTotal = cells.reduce((sum, cell) => sum + (cell.width === "auto" ? 0 : cell.width), 0);
  const shouldNormalize =
    cells.length > 1 && (currentTotal >= 100 || cells.some(cell => cell.width === 100 || cell.width === "auto"));

  if (!shouldNormalize) {
    return cells;
  }

  return cells.map(cell => ({ ...cell, width: balancedWidth }));
}

function escapeAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function parseHtmlToRows(html: string): Row[] {
  if (typeof window === "undefined" || !html.trim()) {
    return createEmptyRows();
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.body.querySelector<HTMLElement>("[data-portfolio-page-root='true']") ?? doc.body;
  const rows: Row[] = [];
  let textBuffer: string[] = [];

  const flushText = () => {
    const htmlValue = textBuffer.join("").trim();
    if (htmlValue) {
      rows.push({
        id: uid(),
        cells: [{ ...createTextCell(), html: htmlValue }],
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
        const figure = el.tagName === "FIGURE" ? el : el.querySelector("figure");
        const image = figure?.querySelector("img") ?? (el.tagName === "IMG" ? (el as HTMLImageElement) : null);
        const video = figure?.querySelector("video") ?? (el.tagName === "VIDEO" ? (el as HTMLVideoElement) : null);
        const width = widthFromValue(el.style.flexBasis || el.style.maxWidth || "");

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
          align: "left",
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
    }

    textBuffer.push(node.outerHTML);
  }

  flushText();
  return rows.length > 0 ? rows : createEmptyRows();
}

function serializeCellInner(cell: Cell): string {
  if (cell.type === "text") {
    return cell.html || "<p><br></p>";
  }

  if (cell.type === "image") {
    const radius = cell.radius === "rounded" ? "12px" : "0px";
    return `<img src="${escapeAttr(cell.src)}" alt="${escapeAttr(cell.alt)}" style="width:100%;display:block;border-radius:${radius};" />`;
  }

  return `<video src="${escapeAttr(cell.src)}" controls playsinline style="width:100%;display:block;"></video>`;
}

function rowsToHtml(rows: Row[]): string {
  const markup = rows
    .filter(row => row.cells.length > 0)
    .map(row => {
      const cellsHtml = row.cells
        .map(cell => {
          const widthStyle = cell.width === "auto" ? "flex:1 1 0;" : `flex:0 0 ${cell.width}%;max-width:${cell.width}%;`;
          return `<div class="pbe-cell" style="${widthStyle}min-width:0;">${serializeCellInner(cell)}</div>`;
        })
        .join("");

      return `<div class="pbe-row" style="display:flex;gap:28px;align-items:flex-start;margin:0 0 24px;">${cellsHtml}</div>`;
    })
    .join("\n");

  return `<div data-portfolio-page-root="true" data-page-background="#ffffff" data-page-text-color="#141924" style="background:#ffffff;color:#141924;">\n${markup}\n</div>`;
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
}: {
  cell: TextCell;
  projectId: string;
  isActive: boolean;
  onFocus: () => void;
  onInput: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cacheKey = useRef("");
  const previousActive = useRef(false);

  useEffect(() => {
    const nextKey = `${projectId}:${cell.id}:${cell.html}`;
    if (ref.current && cacheKey.current !== nextKey) {
      ref.current.innerHTML = cell.html;
      cacheKey.current = nextKey;
    }
  }, [cell.html, cell.id, projectId]);

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

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="portfolio-block-text"
      style={{ textAlign: cell.align }}
      onClick={onFocus}
      onFocus={onFocus}
      onInput={() => onInput(ref.current?.innerHTML ?? "")}
    />
  );
}

type PortfolioDetailEditorProps = {
  projectId: string;
  initialHtml: string;
  onChange: (html: string) => void;
};

export function PortfolioDetailEditor({ projectId, initialHtml, onChange }: PortfolioDetailEditorProps) {
  const [rows, setRows] = useState<Row[]>(() => parseHtmlToRows(initialHtml));
  const [activeCell, setActiveCell] = useState<{ rowId: string; cellId: string } | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const prevProjectId = useRef(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadTarget = useRef<PendingUploadTarget | null>(null);
  const dragRowId = useRef<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);

  useEffect(() => {
    if (prevProjectId.current !== projectId) {
      prevProjectId.current = projectId;
      setRows(parseHtmlToRows(initialHtml));
      setActiveCell(null);
      setActiveRowId(null);
      setUploadNotice(null);
    }
  }, [initialHtml, projectId]);

  const emit = useCallback(
    (nextRows: Row[]) => {
      onChange(rowsToHtml(nextRows));
    },
    [onChange],
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
        rows.map(row => (
          row.id !== rowId
            ? row
            : { ...row, cells: row.cells.map(cell => (cell.id === cellId ? updater(cell) : cell)) }
        )),
      );
    },
    [rows, updateRows],
  );

  const appendTextCell = useCallback(
    (rowId: string) => {
      const nextCell = createTextCell();
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
    const cell = createTextCell();
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
        : "비디오 셀 선택됨"
    : "셀 선택 없음";

  const execTextCommand = (command: string) => {
    document.execCommand(command, false);
  };

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
        {!activeCellData ? (
          <span className="portfolio-toolbar-label">셀을 선택하면 서식과 크기 옵션이 나타납니다.</span>
        ) : null}

        {activeCellData?.type === "text" ? (
          <div className="portfolio-toolbar-group">
            <span className="portfolio-block-toolbar-section">서식</span>
            <button className="secondary-link button-reset" type="button" onMouseDown={event => { event.preventDefault(); execTextCommand("bold"); }}>
              <b>B</b>
            </button>
            <button className="secondary-link button-reset" type="button" onMouseDown={event => { event.preventDefault(); execTextCommand("italic"); }}>
              <span style={{ fontStyle: "italic" }}>/</span>
            </button>
            <button className="secondary-link button-reset" type="button" onMouseDown={event => { event.preventDefault(); execTextCommand("underline"); }}>
              <span style={{ textDecoration: "underline" }}>U</span>
            </button>
            <div className="portfolio-toolbar-sep" />
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
            <span className="portfolio-block-toolbar-section">복제</span>
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
        ) : null}

        {activeCellData?.type === "image" || activeCellData?.type === "video" ? (
          <div className="portfolio-toolbar-group">
            <span className="portfolio-block-toolbar-section">폭</span>
            {WIDTH_OPTIONS.map(width => (
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
            <span className="portfolio-block-toolbar-section">관리</span>
            <button className="secondary-link button-reset" type="button" onClick={() => duplicateCell(activeCell!.rowId, activeCell!.cellId)}>
              셀 복제
            </button>
            <button
              className="secondary-link button-reset"
              type="button"
              disabled={uploading}
              onClick={() => triggerMediaPicker({ kind: "replace-cell", rowId: activeCell!.rowId, cellId: activeCell!.cellId })}
            >
              {uploading ? "업로드 중..." : "미디어 교체"}
            </button>
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

      <div className="portfolio-block-list">
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
                      className={`portfolio-block-cell${isActive ? " is-active" : ""}${cell.type === "text" ? " is-text" : " is-media"}`}
                      style={{
                        border: isActive ? "1.5px solid rgba(49, 99, 255, 1)" : "1.5px solid rgba(18, 24, 38, 0.08)",
                        borderRadius: 22,
                        overflow: "hidden",
                        background: "#fff",
                        minHeight: cell.type === "text" ? 144 : undefined,
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
                          onFocus={() => {
                            setActiveRowId(row.id);
                            setActiveCell({ rowId: row.id, cellId: cell.id });
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

                      {cell.type === "image" ? (
                        cell.src ? (
                          <img
                            src={cell.src}
                            alt={cell.alt}
                            className="portfolio-block-media-preview"
                            style={{ borderRadius: cell.radius === "rounded" ? 18 : 0 }}
                          />
                        ) : (
                          <div className="portfolio-block-media-empty">이미지를 추가해 주세요</div>
                        )
                      ) : null}

                      {cell.type === "video" ? (
                        cell.src ? (
                          <video src={cell.src} controls className="portfolio-block-media-preview" />
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
