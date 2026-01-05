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

    const observer = new MutationObserver(() => {
        /*
        检测所有的.chrome70-container元素，
        将它们的内联样式：--center-content-max-width改为auto，padding: 0 1rem，
        如果是输入框，解除它的最大宽度限制；
        如果检测到有新的元素，则立即应用。
        */
        const containers = document.querySelectorAll('.chrome70-container');
        containers.forEach(container => {
            container.style.cssText = `
                --center-content-max-width: auto !important;
                padding: 0 1rem;
            `;

            const inputs = container.querySelectorAll('[class^="inner"]');
            if (inputs.length > 0) {
                inputs.forEach(input => {
                    input.style.cssText = `
                        max-width: auto;
                        --content-max-width: auto !important;
                    `;
                });
            }
        });
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();