"use client";

type ServiceInquiryButtonProps = {
  intent: string;
  className?: string;
  label?: string;
};

export function ServiceInquiryButton({ intent, className = "secondary-link button-reset", label = "문의하기" }: ServiceInquiryButtonProps) {
  function handleClick() {
    window.dispatchEvent(
      new CustomEvent("studio-by-you:open-chat", {
        detail: { intent },
      }),
    );
  }

  return (
    <button className={className} onClick={handleClick} type="button">
      {label}
    </button>
  );
}
