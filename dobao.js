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
    /*
    持续检测第一个直接子元素包含data-target-id="message-box-target-id"属性的所有.chrome70-container元素，
    将它们的内联样式：--center-content-max-width改为auto，padding: 0 1rem，
    如果检测到有新的元素，则立即应用。
    */
    const observer = new MutationObserver(() => {
        const containers = document.querySelectorAll('.chrome70-container');
        containers.forEach(container => {
            if (container.querySelector('[data-target-id="message-box-target-id"]')) {
                container.style.cssText = `
                --center-content-max-width: auto !important;
                padding: 0 1rem;
            `;
            }
        });
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();