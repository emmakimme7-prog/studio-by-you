"use client";

import { useState } from "react";
import { uploadImageFile } from "@/lib/client-upload";

type HtmlEditorProps = {
  defaultValue?: string;
  label: string;
  name?: string;
  onValueChange?: (value: string) => void;
  value?: string;
};

export function HtmlEditor({ defaultValue = "", label, name, onValueChange, value: valueProp }: HtmlEditorProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const value = valueProp ?? internalValue;

  function setValue(nextValue: string | ((current: string) => string)) {
    const resolved = typeof nextValue === "function" ? nextValue(value) : nextValue;
    if (valueProp === undefined) {
      setInternalValue(resolved);
    }
    onValueChange?.(resolved);
  }

  function insertSnippet(snippet: string) {
    setValue((current) => `${current}${current.endsWith("\n") ? "" : "\n"}${snippet}`);
  }

  async function insertImage(file: File) {
    try {
      setIsUploadingImage(true);
      const src = await uploadImageFile(file);
      insertSnippet(`<p><img src="${src}" alt="" /></p>`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  return (
    <div className="html-editor-field">
      <div className="upload-copy">
        <strong>{label}</strong>
      </div>
      <div className="html-editor-toolbar">
        <button onClick={() => insertSnippet("<h2>소제목</h2>")} type="button">
          H2
        </button>
        <button onClick={() => insertSnippet("<p>본문을 입력하세요.</p>")} type="button">
          본문
        </button>
        <button
          onClick={() => {
            const url = window.prompt("링크 주소를 입력해주세요.");
            if (url) {
              insertSnippet(`<p><a href="${url}" target="_blank" rel="noreferrer">${url}</a></p>`);
            }
          }}
          type="button"
        >
          링크
        </button>
        <label className="html-editor-upload">
          {isUploadingImage ? "업로드 중..." : "이미지 추가"}
          <input
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void insertImage(file);
              }
              event.currentTarget.value = "";
            }}
            type="file"
          />
        </label>
      </div>
      <textarea
        className="html-editor-textarea"
        name={name}
        onChange={(event) => setValue(event.target.value)}
        rows={14}
        value={value}
      />
      <div className="html-editor-preview">
        <div className="upload-copy">
          <strong>미리보기</strong>
        </div>
        <div className="portfolio-detail-html" dangerouslySetInnerHTML={{ __html: value }} />
      </div>
    </div>
  );
}
