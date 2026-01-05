// ==UserScript==
// @name         豆包体验优化
// @namespace    http://tampermonkey.net/
// @version      2026-01-05
// @description  优化豆包的体验
// @author       MilkWind
// @match        https://www.doubao.com/chat/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.doubao.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 使用 WeakSet 跟踪已处理的元素，避免重复处理
    const processedContainers = new WeakSet();
    const processedInputs = new WeakSet();

    // 使用 requestAnimationFrame 批量处理，避免频繁的 DOM 操作
    let rafId = null;
    const pendingContainers = new Set();

    const processContainer = (container) => {
        if (processedContainers.has(container)) return;
        
        container.style.cssText = `
            --center-content-max-width: auto !important;
            padding: 0 1rem;
        `;
        processedContainers.add(container);

        const inputs = container.querySelectorAll('[class^="inner"]');
        inputs.forEach(input => {
            if (processedInputs.has(input)) return;
            
            input.style.cssText = `
                max-width: auto;
                --content-max-width: auto !important;
            `;
            processedInputs.add(input);
        });
    };

    const batchProcess = () => {
        if (pendingContainers.size === 0) {
            rafId = null;
            return;
        }

        // 处理所有待处理的容器
        pendingContainers.forEach(container => {
            if (container.isConnected) {
                processContainer(container);
            }
        });
        pendingContainers.clear();

        rafId = null;
    };

    const observer = new MutationObserver((mutations) => {
        /*
        检测所有的.chrome70-container元素，
        将它们的内联样式：--center-content-max-width改为auto，padding: 0 1rem，
        如果是输入框，解除它的最大宽度限制；
        如果检测到有新的元素，则立即应用。
        */
        
        // 只查询新添加的节点，而不是所有节点
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType !== Node.ELEMENT_NODE) return;
                
                // 检查节点本身是否是容器
                if (node.classList && node.classList.contains('chrome70-container')) {
                    pendingContainers.add(node);
                }
            });
        });

        // 如果还有未处理的容器，也检查一下（处理初始加载的情况）
        if (pendingContainers.size === 0) {
            const allContainers = document.querySelectorAll('.chrome70-container');
            allContainers.forEach(container => {
                if (!processedContainers.has(container)) {
                    pendingContainers.add(container);
                }
            });
        }

        // 使用 requestAnimationFrame 批量处理
        if (pendingContainers.size > 0 && !rafId) {
            rafId = requestAnimationFrame(batchProcess);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 初始处理已存在的元素
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const containers = document.querySelectorAll('.chrome70-container');
            containers.forEach(container => pendingContainers.add(container));
            if (pendingContainers.size > 0 && !rafId) {
                rafId = requestAnimationFrame(batchProcess);
            }
        });
    } else {
        const containers = document.querySelectorAll('.chrome70-container');
        containers.forEach(container => pendingContainers.add(container));
        if (pendingContainers.size > 0 && !rafId) {
            rafId = requestAnimationFrame(batchProcess);
        }
    }
})();