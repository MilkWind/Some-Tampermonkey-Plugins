// ==UserScript==
// @name         网页限制解除
// @namespace    http://tampermonkey.net/
// @version      2025-07-10
// @description  删除 "不可选取"、"禁止快捷键打开F12"、"禁止右键菜单" 功能
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

    // 删除所有常见的反调试和限制代码 - Remove common anti-debugging code
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

    // 初始化函数 - Initialize all functions
    function init() {
        console.log('面试鸭体验优化插件正在启动...');
        
        // Apply fixes immediately
        enableTextSelection();
        enableDevTools();
        enableContextMenu();
        removeAntiDebugging();
        
        // Also apply when DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                enableTextSelection();
                enableContextMenu();
            });
        }
        
        console.log('✅ 面试鸭体验优化插件已成功启动！');
        console.log('✅ 已启用文本选择功能');
        console.log('✅ 已启用开发者工具快捷键');
        console.log('✅ 已启用右键菜单功能');
    }

    // 立即启动 - Start immediately
    init();
})();