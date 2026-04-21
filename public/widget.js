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
    const BUBBLE_SIZE = 60;
    const WIDGET_WIDTH = 400;
    const WIDGET_HEIGHT = 600;

    function injectStyles() {
        const style = document.createElement("style");
        style.textContent = `
            #ryoku-widget-bubble {
                position: fixed;
                ${position === "bottom-left" ? "left" : "right"}: 20px;
                bottom: 20px;
                width: ${BUBBLE_SIZE}px;
                height: ${BUBBLE_SIZE}px;
                border-radius: 50%;
                background: ${accentColor};
                cursor: pointer;
                z-index: 999998;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 24px rgba(0,0,0,0.3), 0 0 0 0 ${accentColor}40;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                border: none;
                outline: none;
            }
            #ryoku-widget-bubble:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 32px rgba(0,0,0,0.4), 0 0 0 8px ${accentColor}20;
            }
            #ryoku-widget-bubble svg {
                width: 28px;
                height: 28px;
                fill: white;
            }
            #ryoku-widget-container {
                position: fixed;
                ${position === "bottom-left" ? "left" : "right"}: 20px;
                bottom: 90px;
                width: ${WIDGET_WIDTH}px;
                height: ${WIDGET_HEIGHT}px;
                z-index: 999999;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
                transform: ${isOpen ? "scale(1) translateY(0)" : "scale(0.9) translateY(20px)"};
                opacity: ${isOpen ? "1" : "0"};
                pointer-events: ${isOpen ? "auto" : "none"};
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
            }
            #ryoku-widget-container.open {
                transform: scale(1) translateY(0);
                opacity: 1;
                pointer-events: auto;
            }
            #ryoku-widget-container.closed {
                transform: scale(0.9) translateY(20px);
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
                top: 10px;
                right: 10px;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: rgba(0,0,0,0.4);
                border: none;
                cursor: pointer;
                z-index: 10;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 14px;
                transition: background 0.2s;
            }
            #ryoku-widget-close:hover { background: rgba(0,0,0,0.6); }
            @media (max-width: 480px) {
                #ryoku-widget-container {
                    width: calc(100vw - 20px);
                    height: calc(100vh - 120px);
                    ${position === "bottom-left" ? "left" : "right"}: 10px;
                    bottom: 80px;
                    border-radius: 12px;
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
