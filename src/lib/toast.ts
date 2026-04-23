/**
 * Simple toast notification system for Ryoku
 * Displays temporary notifications in the bottom-right corner
 */

export type ToastType = "success" | "error" | "warning" | "info";

let toastContainer: HTMLDivElement | null = null;
let toastId = 0;

function ensureContainer() {
    if (toastContainer) return;

    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    document.body.appendChild(toastContainer);
}

function getColorForType(type: ToastType): { bg: string; border: string; text: string; icon: string } {
    switch (type) {
        case "success":
            return {
                bg: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                text: "#22c55e",
                icon: "✓",
            };
        case "error":
            return {
                bg: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                text: "#ef4444",
                icon: "✕",
            };
        case "warning":
            return {
                bg: "rgba(233, 213, 63, 0.1)",
                border: "1px solid rgba(233, 213, 63, 0.3)",
                text: "#e9d53f",
                icon: "!",
            };
        case "info":
        default:
            return {
                bg: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                text: "#3b82f6",
                icon: "i",
            };
    }
}

export function showToast(message: string, type: ToastType = "info", duration = 4000) {
    ensureContainer();

    const id = `toast-${++toastId}`;
    const colors = getColorForType(type);

    const toastEl = document.createElement("div");
    toastEl.id = id;
    toastEl.style.cssText = `
        background: ${colors.bg};
        border: ${colors.border};
        color: #fff;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.5;
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: 350px;
        word-break: break-word;
        animation: slideIn 0.3s ease-out;
        pointer-events: auto;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;

    const iconEl = document.createElement("span");
    iconEl.textContent = colors.icon;
    iconEl.style.cssText = `
        color: ${colors.text};
        font-weight: bold;
        font-size: 16px;
        flex-shrink: 0;
    `;

    const messageEl = document.createElement("span");
    messageEl.textContent = message;
    messageEl.style.cssText = "flex: 1;";

    toastEl.appendChild(iconEl);
    toastEl.appendChild(messageEl);

    const closeEl = document.createElement("button");
    closeEl.innerHTML = "✕";
    closeEl.style.cssText = `
        background: none;
        border: none;
        color: ${colors.text};
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        margin-left: 8px;
        flex-shrink: 0;
        opacity: 0.6;
        transition: opacity 0.2s;
    `;

    closeEl.onmouseover = () => (closeEl.style.opacity = "1");
    closeEl.onmouseout = () => (closeEl.style.opacity = "0.6");

    toastEl.appendChild(closeEl);
    toastContainer!.appendChild(toastEl);

    const removeToast = () => {
        if (toastEl.parentElement) {
            toastEl.style.animation = "slideOut 0.3s ease-out forwards";
            setTimeout(() => {
                if (toastEl.parentElement) toastEl.remove();
            }, 300);
        }
    };

    closeEl.onclick = removeToast;

    if (duration > 0) {
        setTimeout(removeToast, duration);
    }

    return removeToast;
}

// Create animation styles
if (typeof document !== "undefined" && !document.getElementById("toast-animations")) {
    const style = document.createElement("style");
    style.id = "toast-animations";
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}
