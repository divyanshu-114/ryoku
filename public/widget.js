/**
 * Ryoku Embeddable Chat Widget
 *
 * Usage: Add to any website:
 *   <script src="https://ryoku.app/widget.js" data-slug="your-business-slug"></script>
 *
 * Options (via data attributes):
 *   data-slug       — Business slug (required)
 *   data-position   — "bottom-right" or "bottom-left"
 *   data-theme      — "dark", "light", or "auto"
 *   data-color      — Accent color hex
 *   data-open       — "true" to start open
 *   data-width     — Widget width (default: 400px)
 *   data-height    — Widget height (default: 600px)
 */
(function () {
    "use strict";

    const script = document.currentScript;
    const slug = script?.getAttribute("data-slug");
    if (!slug) {
        console.error("[Ryoku] Missing data-slug attribute on widget script.");
        return;
    }

    const position = script?.getAttribute("data-position") || "bottom-right";
    const theme = script?.getAttribute("data-theme") || "dark";
    const accentColor = script?.getAttribute("data-color") || "#6366f1";
    const startOpen = script?.getAttribute("data-open") === "true";
    const baseUrl = script?.src ? new URL(script.src).origin : window.location.origin;

    // State
    let isOpen = startOpen;
    let container, bubble, iframe, closeBtn;

    // Styles
    const BUBBLE_SIZE = 56;
    const WIDGET_WIDTH = Math.min(380, parseInt(script?.getAttribute("data-width")) || 380);
    const WIDGET_HEIGHT = Math.min(520, parseInt(script?.getAttribute("data-height")) || 520);

    function injectStyles() {
        const style = document.createElement("style");
        style.textContent = `
            #ryoku-widget-bubble {
                position: fixed;
                ${position === "bottom-left" ? "left" : "right"}: 16px;
                bottom: 16px;
                width: ${BUBBLE_SIZE}px;
                height: ${BUBBLE_SIZE}px;
                border-radius: 50%;
                background: ${accentColor};
                cursor: pointer;
                z-index: 999998;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 20px rgba(0,0,0,0.25), 0 0 0 0 ${accentColor}40;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                border: none;
                outline: none;
            }
            #ryoku-widget-bubble:hover {
                transform: scale(1.08);
                box-shadow: 0 6px 28px rgba(0,0,0,0.35), 0 0 0 6px ${accentColor}20;
            }
            #ryoku-widget-bubble svg {
                width: 24px;
                height: 24px;
                fill: white;
            }
            #ryoku-widget-container {
                position: fixed;
                ${position === "bottom-left" ? "left" : "right"}: 16px;
                bottom: calc(16px + ${BUBBLE_SIZE}px + 12px);
                width: ${WIDGET_WIDTH}px;
                max-width: calc(100vw - 32px);
                height: ${WIDGET_HEIGHT}px;
                max-height: calc(100dvh - 100px);
                z-index: 999999;
                border-radius: 14px;
                overflow: hidden;
                box-shadow: 0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
                transform: ${isOpen ? "scale(1) translateY(0)" : "scale(0.92) translateY(16px)"};
                opacity: ${isOpen ? "1" : "0"};
                pointer-events: ${isOpen ? "auto" : "none"};
                transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
            }
            #ryoku-widget-container.open {
                transform: scale(1) translateY(0);
                opacity: 1;
                pointer-events: auto;
            }
            #ryoku-widget-container.closed {
                transform: scale(0.92) translateY(16px);
                opacity: 0;
                pointer-events: none;
            }
            #ryoku-widget-iframe {
                width: 100%;
                height: 100%;
                border: none;
                background: ${theme === "light" ? "#ffffff" : "#0a0c13"};
            }
            #ryoku-widget-close {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: rgba(0,0,0,0.35);
                border: none;
                cursor: pointer;
                z-index: 10;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 13px;
                font-weight: 500;
                transition: background 0.2s;
            }
            #ryoku-widget-close:hover { background: rgba(0,0,0,0.55); }
            @media (max-width: 420px) {
                #ryoku-widget-container {
                    width: calc(100vw - 24px);
                    height: calc(100dvh - 90px);
                    left: 12px;
                    right: 12px;
                    bottom: 80px;
                    border-radius: 12px;
                }
                #ryoku-widget-bubble {
                    width: 52px;
                    height: 52px;
                    left: 12px !important;
                    right: 12px !important;
                    bottom: 12px;
                }
                #ryoku-widget-bubble svg {
                    width: 22px;
                    height: 22px;
                }
            }
            @media (max-height: 700px) {
                #ryoku-widget-container {
                    height: calc(100dvh - 80px);
                }
            }
            @supports (padding-bottom: env(safe-area-inset-bottom)) {
                #ryoku-widget-bubble {
                    bottom: calc(16px + env(safe-area-inset-bottom));
                }
                #ryoku-widget-container {
                    bottom: calc(16px + ${BUBBLE_SIZE}px + 12px + env(safe-area-inset-bottom));
                }
                @media (max-width: 420px) {
                    #ryoku-widget-container {
                        bottom: calc(70px + env(safe-area-inset-bottom));
                    }
                }
            }
        `;
        document.head.appendChild(style);
    }

    function createChatIcon() {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.innerHTML = '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>';
        return svg;
    }

    function createCloseIcon() {
        return "✕";
    }

    function toggle() {
        isOpen = !isOpen;
        container.className = isOpen ? "open" : "closed";
        container.id = "ryoku-widget-container";
    }

    function init() {
        injectStyles();

        // Bubble
        bubble = document.createElement("button");
        bubble.id = "ryoku-widget-bubble";
        bubble.appendChild(createChatIcon());
        bubble.addEventListener("click", toggle);
        bubble.setAttribute("aria-label", "Open chat");

        // Container
        container = document.createElement("div");
        container.id = "ryoku-widget-container";
        container.className = isOpen ? "open" : "closed";

        // Close button
        closeBtn = document.createElement("button");
        closeBtn.id = "ryoku-widget-close";
        closeBtn.innerHTML = createCloseIcon();
        closeBtn.addEventListener("click", toggle);
        closeBtn.setAttribute("aria-label", "Close chat");

        // Iframe
        iframe = document.createElement("iframe");
        iframe.id = "ryoku-widget-iframe";
        iframe.src = `${baseUrl}/chat/${slug}?embed=1`;
        iframe.title = "Chat Support";

        container.appendChild(closeBtn);
        container.appendChild(iframe);

        document.body.appendChild(bubble);
        document.body.appendChild(container);
    }

    // Initialize when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // Expose API for programmatic control
    window.RyokuWidget = {
        open: function () { if (!isOpen) toggle(); },
        close: function () { if (isOpen) toggle(); },
        toggle: toggle,
    };
})();
