// ==UserScript==
// @name         网页限制解除
// @namespace    http://tampermonkey.net/
// @version      2025-07-10
// @description  删除 "不可选取"、"禁止快捷键打开F12"、"禁止右键菜单"、"禁止复制" 功能
// @author       MilkWind
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mianshiya.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. 删除不可选取限制 - Remove text selection restrictions
    function enableTextSelection() {
        // Override CSS that prevents text selection
        const style = document.createElement('style');
        style.textContent = `
            * {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                -webkit-touch-callout: default !important;
                -webkit-tap-highlight-color: rgba(0,0,0,0.4) !important;
            }
        `;
        document.head.appendChild(style);

        // Remove event listeners that prevent selection
        document.onselectstart = null;
        document.ondragstart = null;
        document.oncontextmenu = null;

        // Remove selection blocking from all elements
        function removeSelectionBlocking() {
            const allElements = document.querySelectorAll('*');
            allElements.forEach(element => {
                element.onselectstart = null;
                element.ondragstart = null;
                element.oncontextmenu = null;
                
                // Remove inline styles that block selection
                if (element.style.userSelect === 'none') {
                    element.style.userSelect = 'text';
                }
                if (element.style.webkitUserSelect === 'none') {
                    element.style.webkitUserSelect = 'text';
                }
                if (element.style.mozUserSelect === 'none') {
                    element.style.mozUserSelect = 'text';
                }
                if (element.style.msUserSelect === 'none') {
                    element.style.msUserSelect = 'text';
                }
            });
        }
        
        removeSelectionBlocking();
        
        // Continue to remove blocking as new content loads
        const observer = new MutationObserver(removeSelectionBlocking);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 2. 删除禁止F12快捷键限制 - Remove F12 and dev tools blocking
    function enableDevTools() {
        // Remove existing keydown event listeners by cloning and replacing elements
        const removeKeydownListeners = () => {
            // Override the addEventListener method to prevent new blocking listeners
            const originalAddEventListener = EventTarget.prototype.addEventListener;
            EventTarget.prototype.addEventListener = function(type, listener, options) {
                if (type === 'keydown' && listener.toString().includes('123')) {
                    // Skip listeners that block F12 (keyCode 123)
                    return;
                }
                if (type === 'keydown' && listener.toString().includes('preventDefault')) {
                    // Skip listeners that prevent default behavior on keydown
                    return;
                }
                return originalAddEventListener.call(this, type, listener, options);
            };
        };

        removeKeydownListeners();

        // Override common key blocking functions
        window.addEventListener('keydown', function(e) {
            e.stopImmediatePropagation();
        }, true);

        // Allow all key combinations
        document.onkeydown = null;
        document.onkeyup = null;
        document.onkeypress = null;
    }

    // 3. 删除禁止右键菜单限制 - Remove right-click menu blocking
    function enableContextMenu() {
        // Remove context menu blocking
        document.oncontextmenu = null;
        document.onselectstart = null;
        document.ondragstart = null;

        // Remove context menu blocking from all elements
        function removeContextMenuBlocking() {
            const allElements = document.querySelectorAll('*');
            allElements.forEach(element => {
                element.oncontextmenu = null;
                element.removeAttribute('oncontextmenu');
                
                // Remove event listeners that block context menu
                const newElement = element.cloneNode(true);
                if (element.parentNode) {
                    element.parentNode.replaceChild(newElement, element);
                }
            });
        }

        // Override addEventListener to prevent context menu blocking
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (type === 'contextmenu' && listener.toString().includes('preventDefault')) {
                // Skip listeners that block context menu
                return;
            }
            if (type === 'mousedown' && listener.toString().includes('button') && listener.toString().includes('2')) {
                // Skip listeners that block right mouse button
                return;
            }
            return originalAddEventListener.call(this, type, listener, options);
        };

        // Enable context menu by allowing the event
        document.addEventListener('contextmenu', function(e) {
            e.stopImmediatePropagation();
            return true;
        }, true);

        document.addEventListener('mousedown', function(e) {
            if (e.button === 2) {
                e.stopImmediatePropagation();
                return true;
            }
        }, true);
    }

    // 4. 删除禁止复制限制 - Remove copy blocking restrictions
    function enableCopying() {
        // Remove copy blocking event handlers
        document.oncopy = null;
        document.oncut = null;
        document.onbeforecopy = null;
        document.onbeforecut = null;

        // Override addEventListener to prevent copy blocking
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if ((type === 'copy' || type === 'beforecopy' || type === 'cut' || type === 'beforecut') 
                && listener.toString().includes('preventDefault')) {
                // Skip listeners that block copy/cut events
                return;
            }
            if (type === 'keydown' && listener.toString().includes('copy')) {
                // Skip listeners that block copy shortcuts
                return;
            }
            return originalAddEventListener.call(this, type, listener, options);
        };

        // Enable copy events by allowing them
        document.addEventListener('copy', function(e) {
            e.stopImmediatePropagation();
            return true;
        }, true);

        document.addEventListener('cut', function(e) {
            e.stopImmediatePropagation();
            return true;
        }, true);

        document.addEventListener('beforecopy', function(e) {
            e.stopImmediatePropagation();
            return true;
        }, true);

        document.addEventListener('beforecut', function(e) {
            e.stopImmediatePropagation();
            return true;
        }, true);

        // Allow Ctrl+C / Cmd+C shortcuts
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.stopImmediatePropagation();
                return true;
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
                e.stopImmediatePropagation();
                return true;
            }
        }, true);

        // Remove copy blocking from all elements
        function removeCopyBlocking() {
            const allElements = document.querySelectorAll('*');
            allElements.forEach(element => {
                element.oncopy = null;
                element.oncut = null;
                element.onbeforecopy = null;
                element.onbeforecut = null;
                element.removeAttribute('oncopy');
                element.removeAttribute('oncut');
                element.removeAttribute('onbeforecopy');
                element.removeAttribute('onbeforecut');
            });
        }

        removeCopyBlocking();

        // Continue to remove blocking as new content loads
        const observer = new MutationObserver(removeCopyBlocking);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 5. 删除所有常见的反调试和限制代码 - Remove common anti-debugging code
    function removeAntiDebugging() {
        // Clear common anti-debugging intervals
        const originalSetInterval = window.setInterval;
        window.setInterval = function(func, delay) {
            const funcString = func.toString();
            if (funcString.includes('debugger') || 
                funcString.includes('console') ||
                funcString.includes('devtools')) {
                return;
            }
            return originalSetInterval.apply(this, arguments);
        };

        // Clear existing intervals that might be blocking
        for (let i = 1; i < 10000; i++) {
            clearInterval(i);
        }

        // Disable console blocking
        if (window.console) {
            Object.defineProperty(window.console, 'clear', {
                value: function() {},
                writable: false
            });
        }
    }

    // 6. 创建可拖拽控制面板 - Create draggable control panel
    function createControlPanel() {
        // Avoid duplicate panels
        if (document.getElementById('unlock-panel-root')) {
            document.getElementById('unlock-panel-root').remove();
        }

        const panel = document.createElement('div');
        panel.id = 'unlock-panel-root';
        panel.style.cssText = [
            'position: fixed',
            'top: 80px',
            'right: 24px',
            'z-index: 2147483647',
            'width: 240px',
            'background: rgba(255, 255, 255, 0.96)',
            'color: #475569',
            'border: 1px solid #e5e7eb',
            'border-radius: 14px',
            'box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)',
            'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            'font-size: 13px',
            'user-select: none',
            'overflow: hidden',
            'backdrop-filter: blur(8px)',
            '-webkit-backdrop-filter: blur(8px)'
        ].join(';');

        // ---- Build unlock SVG icon ----
        function createUnlockIcon(size) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.setAttribute('width', size);
            svg.setAttribute('height', size);
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
            svg.setAttribute('stroke-width', '2');
            svg.setAttribute('stroke-linecap', 'round');
            svg.setAttribute('stroke-linejoin', 'round');

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', '3');
            rect.setAttribute('y', '11');
            rect.setAttribute('width', '18');
            rect.setAttribute('height', '11');
            rect.setAttribute('rx', '2');
            rect.setAttribute('ry', '2');
            svg.appendChild(rect);

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M7 11V7a5 5 0 0 1 9.9-1');
            svg.appendChild(path);

            return svg;
        }

        // Header (drag handle)
        const header = document.createElement('div');
        header.style.cssText = [
            'padding: 12px 16px',
            'background: linear-gradient(135deg, #f0f9ff 0%, #ecfeff 100%)',
            'color: #0f766e',
            'font-weight: 600',
            'cursor: move',
            'font-size: 14px',
            'letter-spacing: 0.3px',
            'border-bottom: 1px solid #e5e7eb',
            'display: flex',
            'align-items: center',
            'gap: 10px'
        ].join(';');

        // Collapse button (minimize to a small dot) - placed at top-left
        const collapseBtn = document.createElement('span');
        collapseBtn.textContent = '—';
        collapseBtn.title = '收起';
        collapseBtn.style.cssText = 'cursor:pointer;font-size:16px;line-height:1;color:#94a3b8;padding:0 2px;transition: color 0.15s;flex-shrink:0';
        collapseBtn.onmouseenter = () => collapseBtn.style.color = '#475569';
        collapseBtn.onmouseleave = () => collapseBtn.style.color = '#94a3b8';
        collapseBtn.onclick = (e) => {
            e.stopPropagation();
            collapse();
        };
        header.appendChild(collapseBtn);

        // Title (icon + text) - takes remaining space
        const titleWrap = document.createElement('span');
        titleWrap.style.cssText = 'display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;';
        const titleIcon = createUnlockIcon(18);
        const titleText = document.createElement('span');
        titleText.textContent = '解锁面板';
        titleWrap.appendChild(titleIcon);
        titleWrap.appendChild(titleText);
        header.appendChild(titleWrap);

        // Close button - top-right
        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.title = '关闭';
        closeBtn.style.cssText = 'cursor:pointer;font-size:20px;line-height:1;color:#94a3b8;padding:0 2px;transition: color 0.15s;flex-shrink:0';
        closeBtn.onmouseenter = () => closeBtn.style.color = '#475569';
        closeBtn.onmouseleave = () => closeBtn.style.color = '#94a3b8';
        closeBtn.onclick = () => panel.remove();
        header.appendChild(closeBtn);

        // Body
        const body = document.createElement('div');
        body.style.cssText = 'padding: 12px; display: flex; flex-direction: column; gap: 8px;';

        function makeButton(label, fn, opts) {
            opts = opts || {};
            const defaultBg = opts.bg || '#ffffff';
            const defaultBorder = opts.border || '#e5e7eb';
            const defaultColor = opts.color || '#475569';
            const hoverBg = opts.hoverBg || '#f8fafc';
            const hoverBorder = opts.hoverBorder || '#cbd5e1';
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = [
                `padding: 9px 12px`,
                `border: 1px solid ${defaultBorder}`,
                `border-radius: 8px`,
                `background: ${defaultBg}`,
                `color: ${defaultColor}`,
                `cursor: pointer`,
                `font-size: 13px`,
                `font-weight: 500`,
                `text-align: left`,
                `transition: all 0.15s ease`
            ].join(';');
            btn.onmouseenter = () => {
                btn.style.background = hoverBg;
                btn.style.borderColor = hoverBorder;
            };
            btn.onmouseleave = () => {
                btn.style.background = defaultBg;
                btn.style.borderColor = defaultBorder;
            };
            btn.onclick = () => {
                try {
                    fn();
                    flash(btn, '#dcfce7', '#16a34a', defaultBg, defaultBorder, defaultColor);
                } catch (err) {
                    console.error('[Unlock Panel]', err);
                    flash(btn, '#fee2e2', '#dc2626', defaultBg, defaultBorder, defaultColor);
                }
            };
            return btn;
        }

        function flash(btn, bg, color, defaultBg, defaultBorder, defaultColor) {
            btn.style.background = bg;
            btn.style.borderColor = color;
            btn.style.color = color;
            setTimeout(() => {
                btn.style.background = defaultBg;
                btn.style.borderColor = defaultBorder;
                btn.style.color = defaultColor;
            }, 350);
        }

        body.appendChild(makeButton('① 文本选择', enableTextSelection));
        body.appendChild(makeButton('② 开发者工具 (F12)', enableDevTools));
        body.appendChild(makeButton('③ 右键菜单', enableContextMenu));
        body.appendChild(makeButton('④ 复制 / 剪切', enableCopying));
        body.appendChild(makeButton('⑤ 反调试清除', removeAntiDebugging));

        const allBtn = makeButton('⚡ 全部应用 (All)', () => {
            enableTextSelection();
            enableDevTools();
            enableContextMenu();
            enableCopying();
            removeAntiDebugging();
        }, {
            bg: '#ecfdf5',
            border: '#a7f3d0',
            color: '#047857',
            hoverBg: '#d1fae5',
            hoverBorder: '#6ee7b7'
        });
        body.appendChild(allBtn);

        const hint = document.createElement('div');
        hint.textContent = '可重复点击 · 拖拽标题移动';
        hint.style.cssText = 'font-size:11px;color:#94a3b8;text-align:center;margin-top:4px;letter-spacing:0.2px';
        body.appendChild(hint);

        panel.appendChild(header);
        panel.appendChild(body);
        document.documentElement.appendChild(panel);

        // ---- Collapse / Expand state ----
        const EXPANDED_WIDTH = '240px';
        const EXPANDED_ICON_SIZE = '18';
        const COLLAPSED_ICON_SIZE = '24';
        let isCollapsed = false;

        function collapse() {
            if (isCollapsed) return;
            isCollapsed = true;

            // Capture collapse button center BEFORE any layout changes so we can anchor the dot to it
            const anchorRect = collapseBtn.getBoundingClientRect();
            const anchorCx = anchorRect.left + anchorRect.width / 2;
            const anchorCy = anchorRect.top + anchorRect.height / 2;

            body.style.display = 'none';

            // Hide everything except the icon
            collapseBtn.style.display = 'none';
            closeBtn.style.display = 'none';
            titleText.style.display = 'none';

            // Center the icon
            titleWrap.style.flex = '0 0 auto';
            titleWrap.style.justifyContent = 'center';
            titleIcon.setAttribute('width', COLLAPSED_ICON_SIZE);
            titleIcon.setAttribute('height', COLLAPSED_ICON_SIZE);

            header.style.padding = '0';
            header.style.width = '48px';
            header.style.height = '48px';
            header.style.justifyContent = 'center';
            header.style.borderBottom = 'none';
            header.style.cursor = 'pointer';
            header.title = '点击展开 · 拖拽移动';

            panel.style.width = '48px';
            panel.style.borderRadius = '50%';
            panel.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.12)';

            // Position the dot so its center matches the collapse button's center.
            // This also converts from right-anchored to left-anchored, making
            // the behavior consistent with the post-drag (left-anchored) case.
            const dotSize = 48;
            let newLeft = anchorCx - dotSize / 2;
            let newTop = anchorCy - dotSize / 2;
            // Clamp to viewport
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - dotSize));
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - dotSize));
            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
            panel.style.right = 'auto';
        }

        function expand() {
            if (!isCollapsed) return;

            // Record the dot's center before expanding
            const dotRect = panel.getBoundingClientRect();
            const cx = dotRect.left + dotRect.width / 2;
            const cy = dotRect.top + dotRect.height / 2;

            isCollapsed = false;
            // FIX: restore to 'flex' explicitly (setting '' would lose the cssText rule)
            body.style.display = 'flex';

            // Restore visibility
            collapseBtn.style.display = '';
            closeBtn.style.display = '';
            titleText.style.display = '';

            titleWrap.style.flex = '1 1 auto';
            titleWrap.style.justifyContent = '';
            titleIcon.setAttribute('width', EXPANDED_ICON_SIZE);
            titleIcon.setAttribute('height', EXPANDED_ICON_SIZE);

            header.style.padding = '12px 16px';
            header.style.width = '';
            header.style.height = '';
            header.style.justifyContent = '';
            header.style.borderBottom = '1px solid #e5e7eb';
            header.style.cursor = 'move';
            header.title = '';

            panel.style.width = EXPANDED_WIDTH;
            panel.style.borderRadius = '14px';
            panel.style.boxShadow = '0 8px 28px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)';

            // After restoring layout, measure where the collapse button ended up and
            // shift the panel so the collapse button stays at the dot's center (cx, cy).
            const newAnchorRect = collapseBtn.getBoundingClientRect();
            const anchorCx = newAnchorRect.left + newAnchorRect.width / 2;
            const anchorCy = newAnchorRect.top + newAnchorRect.height / 2;
            const dx = cx - anchorCx;
            const dy = cy - anchorCy;
            let newLeft = (parseFloat(panel.style.left) || 0) + dx;
            let newTop = (parseFloat(panel.style.top) || 0) + dy;
            // Clamp to viewport
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - panel.offsetWidth));
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - panel.offsetHeight));
            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
        }

        // ---- Drag logic (works for both expanded and collapsed) ----
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        let startX = 0;
        let startY = 0;
        let movedDuringDrag = false;

        header.addEventListener('mousedown', (e) => {
            // Skip if click lands on close/collapse button or any of their children (e.g. SVG)
            if (closeBtn.contains(e.target) || collapseBtn.contains(e.target)) return;
            isDragging = true;
            movedDuringDrag = false;
            startX = e.clientX;
            startY = e.clientY;
            const rect = panel.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            panel.style.transition = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedDuringDrag = true;

            let x = e.clientX - offsetX;
            let y = e.clientY - offsetY;
            // Keep panel inside viewport
            const maxX = window.innerWidth - panel.offsetWidth;
            const maxY = window.innerHeight - panel.offsetHeight;
            x = Math.max(0, Math.min(x, maxX));
            y = Math.max(0, Math.min(y, maxY));
            panel.style.left = x + 'px';
            panel.style.top = y + 'px';
            panel.style.right = 'auto';
        });

        document.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            // In collapsed mode, a click without significant movement expands
            if (isCollapsed && !movedDuringDrag) {
                expand();
            }
        });

        console.log('✅ 解锁面板已创建');
    }

    // 初始化函数 - Initialize all functions
    function init() {
        console.log('面试鸭体验优化插件正在启动...');

        // Apply fixes immediately
        enableTextSelection();
        enableDevTools();
        enableContextMenu();
        enableCopying();
        removeAntiDebugging();

        // Create the draggable control panel
        createControlPanel();

        // Also apply when DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                enableTextSelection();
                enableContextMenu();
                enableCopying();
                createControlPanel();
            });
        }

        console.log('✅ 面试鸭体验优化插件已成功启动！');
        console.log('✅ 已启用文本选择功能');
        console.log('✅ 已启用开发者工具快捷键');
        console.log('✅ 已启用右键菜单功能');
        console.log('✅ 已启用复制功能');
        console.log('✅ 解锁面板已加载，可在页面右上角拖拽使用');
    }

    // 稍后启动
    setTimeout(init, 2000);
})();