"use client";

import { useState } from "react";

type HtmlEditorProps = {
  defaultValue: string;
  label: string;
  name: string;
};

export function HtmlEditor({ defaultValue, label, name }: HtmlEditorProps) {
  const [value, setValue] = useState(defaultValue);

  function insertSnippet(snippet: string) {
    setValue((current) => `${current}${current.endsWith("\n") ? "" : "\n"}${snippet}`);
  }

  function insertImage(file: File) {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        insertSnippet(`<p><img src="${reader.result}" alt="" /></p>`);
      }
    };

    reader.readAsDataURL(file);
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
          이미지 추가
          <input
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) insertImage(file);
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
    </div>
  );
}
