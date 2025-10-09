// ==UserScript==
// @name         隐藏解析视频元素
// @namespace    http://tampermonkey.net/
// @version      2025-10-09
// @description  提供一个固钉悬浮切换按钮，可切换解析视频元素的显示与隐藏
// @author       MilkWind
// @match        https://spa.fenbi.com/ti/exam/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=spa.fenbi.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    /*
    在页面挂载完成后，默认在页面右上角提供一个固钉悬浮切换按钮，用于切换所有匹配的目标视频元素的显示与隐藏
    目标视频元素特征：id属性中包含"section-video"文本
    */

    // 状态：true表示显示视频，false表示隐藏视频
    let isVideoVisible = true;

    // 拖拽相关变量
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    // 从localStorage加载按钮位置
    function loadButtonPosition() {
        const savedPosition = localStorage.getItem('video-toggle-btn-position');
        if (savedPosition) {
            return JSON.parse(savedPosition);
        }
        return { top: '20px', right: '20px', left: 'auto', bottom: 'auto' };
    }

    // 保存按钮位置到localStorage
    function saveButtonPosition(top, left) {
        const position = { top, left, right: 'auto', bottom: 'auto' };
        localStorage.setItem('video-toggle-btn-position', JSON.stringify(position));
    }

    // 创建悬浮按钮
    function createToggleButton() {
        const button = document.createElement('button');
        button.id = 'video-toggle-btn';
        button.textContent = '隐藏视频';
        
        // 加载保存的位置
        const savedPosition = loadButtonPosition();
        
        // 设置初始偏移量
        if (savedPosition.left !== 'auto') {
            xOffset = parseInt(savedPosition.left);
            currentX = xOffset;
        } else if (savedPosition.right !== 'auto') {
            // 如果使用right定位，计算left值
            xOffset = window.innerWidth - parseInt(savedPosition.right) - 120;
            currentX = xOffset;
        }
        
        if (savedPosition.top !== 'auto') {
            yOffset = parseInt(savedPosition.top);
            currentY = yOffset;
        } else if (savedPosition.bottom !== 'auto') {
            yOffset = window.innerHeight - parseInt(savedPosition.bottom) - 40;
            currentY = yOffset;
        }
        
        button.style.cssText = `
            position: fixed;
            top: ${savedPosition.top};
            right: ${savedPosition.right};
            left: ${savedPosition.left};
            bottom: ${savedPosition.bottom};
            z-index: 9999;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: move;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: background-color 0.3s ease;
            user-select: none;
        `;

        // 鼠标悬停效果
        button.addEventListener('mouseenter', () => {
            if (!isDragging) {
                button.style.backgroundColor = '#45a049';
            }
        });

        button.addEventListener('mouseleave', () => {
            if (!isDragging) {
                button.style.backgroundColor = isVideoVisible ? '#4CAF50' : '#f44336';
            }
        });

        // 拖拽事件
        button.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        // 点击事件（只在没有拖拽时触发）
        button.addEventListener('click', (e) => {
            if (!isDragging) {
                toggleVideos();
            }
        });

        document.body.appendChild(button);
        return button;
    }

    // 开始拖拽
    function dragStart(e) {
        const button = document.getElementById('video-toggle-btn');
        if (e.target === button) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            isDragging = true;
            button.style.transition = 'background-color 0.3s ease';
        }
    }

    // 拖拽中
    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            const button = document.getElementById('video-toggle-btn');
            if (button) {
                button.style.left = `${currentX}px`;
                button.style.top = `${currentY}px`;
                button.style.right = 'auto';
                button.style.bottom = 'auto';
            }
        }
    }

    // 结束拖拽
    function dragEnd(e) {
        if (isDragging) {
            const button = document.getElementById('video-toggle-btn');
            
            // 保存位置
            if (button) {
                saveButtonPosition(button.style.top, button.style.left);
            }

            initialX = currentX;
            initialY = currentY;

            isDragging = false;
        }
    }

    // 获取所有目标视频元素
    function getVideoElements() {
        const allElements = document.querySelectorAll('[id*="section-video"]');
        return Array.from(allElements);
    }

    // 切换视频显示/隐藏
    function toggleVideos() {
        const videoElements = getVideoElements();
        const button = document.getElementById('video-toggle-btn');

        if (videoElements.length === 0) {
            alert('未找到包含"section-video"的视频元素');
            return;
        }

        isVideoVisible = !isVideoVisible;

        videoElements.forEach(element => {
            if (isVideoVisible) {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        });

        // 更新按钮文本和样式
        if (isVideoVisible) {
            button.textContent = '隐藏视频';
            button.style.backgroundColor = '#4CAF50';
        } else {
            button.textContent = '显示视频';
            button.style.backgroundColor = '#f44336';
        }
    }

    // 等待页面加载完成
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createToggleButton);
        } else {
            // DOM已经加载完成
            createToggleButton();
        }

        // 使用MutationObserver监听DOM变化，以便在动态加载的内容中也能找到视频元素
        const observer = new MutationObserver(() => {
            // 当DOM发生变化时，确保按钮仍然存在
            if (!document.getElementById('video-toggle-btn')) {
                createToggleButton();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 启动脚本
    init();
})();