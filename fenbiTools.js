// ==UserScript==
// @name         粉笔工具箱
// @namespace    http://tampermonkey.net/
// @version      2025-10-16
// @description  提供一个可拖拽的功能仪表盘，包含正确率统计、更改解析视频元素的位置以及自动展开折叠容器的功能
// @author       MilkWind
// @match        https://spa.fenbi.com/ti/exam/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=spa.fenbi.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /**
     * 功能仪表盘管理类
     * 提供正确率统计和视频切换功能
     */
    class Dashboard {
        constructor() {
            this.isVideoInOriginalPosition = true;
            this.videoOriginalPositions = new Map(); // 存储视频元素的原始位置
            this.isDragging = false;
            this.dragStarted = false;
            this.currentX = 0;
            this.currentY = 0;
            this.initialX = 0;
            this.initialY = 0;
            this.xOffset = 0;
            this.yOffset = 0;
            this.dashboard = null;
            this.statsInterval = null;
            this.isCollapsed = false;
            this.isAutoExpandEnabled = true; // 默认启用自动展开
        }

        /**
         * 从localStorage加载仪表盘位置
         */
        loadPosition() {
            const savedPosition = localStorage.getItem('dashboard-position');
            if (savedPosition) {
                return JSON.parse(savedPosition);
            }
            return { top: '20px', right: '20px', left: 'auto', bottom: 'auto' };
        }

        /**
         * 保存仪表盘位置到localStorage
         */
        savePosition(top, left) {
            const position = { top, left, right: 'auto', bottom: 'auto' };
            localStorage.setItem('dashboard-position', JSON.stringify(position));
        }

        /**
         * 从localStorage加载折叠状态
         */
        loadCollapsedState() {
            const savedState = localStorage.getItem('dashboard-collapsed');
            return savedState === 'true';
        }

        /**
         * 保存折叠状态到localStorage
         */
        saveCollapsedState(isCollapsed) {
            localStorage.setItem('dashboard-collapsed', isCollapsed.toString());
        }

        /**
         * 从localStorage加载自动展开状态
         */
        loadAutoExpandState() {
            const savedState = localStorage.getItem('dashboard-auto-expand');
            // 默认为true，如果未设置或设置为'true'
            return savedState === null || savedState === 'true';
        }

        /**
         * 保存自动展开状态到localStorage
         */
        saveAutoExpandState(isEnabled) {
            localStorage.setItem('dashboard-auto-expand', isEnabled.toString());
        }

        /**
         * 创建仪表盘UI
         */
        createDashboard() {
            const dashboard = document.createElement('div');
            dashboard.id = 'fenbi-dashboard';

            // 加载保存的位置和折叠状态
            const savedPosition = this.loadPosition();
            this.isCollapsed = this.loadCollapsedState();
            this.isAutoExpandEnabled = this.loadAutoExpandState();

            // 设置初始偏移量
            if (savedPosition.left !== 'auto') {
                this.xOffset = parseInt(savedPosition.left);
                this.currentX = this.xOffset;
            } else if (savedPosition.right !== 'auto') {
                this.xOffset = window.innerWidth - parseInt(savedPosition.right) - 280;
                this.currentX = this.xOffset;
            }

            if (savedPosition.top !== 'auto') {
                this.yOffset = parseInt(savedPosition.top);
                this.currentY = this.yOffset;
            } else if (savedPosition.bottom !== 'auto') {
                this.yOffset = window.innerHeight - parseInt(savedPosition.bottom) - 200;
                this.currentY = this.yOffset;
            }

            dashboard.style.cssText = `
                position: fixed;
                top: ${savedPosition.top};
                right: ${savedPosition.right};
                left: ${savedPosition.left};
                bottom: ${savedPosition.bottom};
                z-index: 9999;
                background: white;
                color: #333;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                border: 1px solid #e0e0e0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                min-width: 280px;
                user-select: none;
            `;

            dashboard.innerHTML = `
                <div id="dashboard-header" style="
                    padding: 15px 20px;
                    cursor: move;
                    font-weight: bold;
                    font-size: 16px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: white;
                    color: gray;
                    border-radius: 12px 12px 0 0;
                ">
                    <button id="collapse-btn" style="
                            background: rgba(255,255,255,0.2);
                            border: 1px solid rgba(255,255,255,0.3);
                            color: gray;
                            cursor: pointer;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-size: 16px;
                            transition: all 0.3s ease;
                        ">${this.isCollapsed ? '▶' : '▼'}</button>
                    <span id="dashboard-title">粉笔工具箱</span>
                    <div id="dashboard-header-right" style="display: flex; align-items: center; gap: 10px;">
                        <span id="drag-hint" style="font-size: 12px; opacity: 0.8;">可拖拽</span>
                    </div>
                </div>
                <div id="dashboard-content" style="padding: 20px; display: ${this.isCollapsed ? 'none' : 'block'};">
                    <div id="stats-section" style="margin-bottom: 20px;">
                        <div style="
                            font-size: 14px;
                            margin-bottom: 10px;
                            color: #666;
                            font-weight: 600;
                        ">全站平均正确率</div>
                        <div id="accuracy-display" style="
                            font-size: 32px;
                            font-weight: bold;
                            text-align: center;
                            padding: 15px;
                            background: #f5f5f5;
                            border-radius: 8px;
                            margin-bottom: 8px;
                            color: #333;
                        ">--</div>
                        <div id="stats-details" style="
                            font-size: 12px;
                            text-align: center;
                            color: #888;
                        ">等待数据加载...</div>
                    </div>
                    <div id="control-section">
                        <button id="video-toggle-btn" style="
                            width: 100%;
                            padding: 12px 20px;
                            background-color: #4CAF50;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: bold;
                            transition: all 0.3s ease;
                            box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
                            margin-bottom: 10px;
                        ">视频移至解析后</button>
                        <button id="expand-toggle-btn" style="
                            width: 100%;
                            padding: 12px 20px;
                            background-color: ${this.isAutoExpandEnabled ? '#9E9E9E' : '#2196F3'};
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: bold;
                            transition: all 0.3s ease;
                            box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
                        ">${this.isAutoExpandEnabled ? '禁用自动展开解析' : '启用自动展开解析'}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dashboard);
            this.dashboard = dashboard;

            // 如果初始状态是折叠的，立即应用折叠样式
            if (this.isCollapsed) {
                const title = document.getElementById('dashboard-title');
                const dragHint = document.getElementById('drag-hint');
                const header = document.getElementById('dashboard-header');
                const collapseBtn = document.getElementById('collapse-btn');

                title.style.display = 'none';
                dragHint.style.display = 'none';
                header.style.borderBottom = 'none';
                header.style.padding = '8px';
                header.style.borderRadius = '12px';
                collapseBtn.style.padding = '8px 10px';
                collapseBtn.style.fontSize = '14px';
                this.dashboard.style.minWidth = '0';
                this.dashboard.style.width = 'auto';
            }

            this.setupEventListeners();
            this.startStatsUpdater();

            return dashboard;
        }

        /**
         * 设置事件监听器
         */
        setupEventListeners() {
            const header = document.getElementById('dashboard-header');
            const toggleBtn = document.getElementById('video-toggle-btn');
            const collapseBtn = document.getElementById('collapse-btn');
            const expandToggleBtn = document.getElementById('expand-toggle-btn');

            // 拖拽事件
            header.addEventListener('mousedown', (e) => this.dragStart(e));
            document.addEventListener('mousemove', (e) => this.drag(e));
            document.addEventListener('mouseup', () => this.dragEnd());

            // 折叠/展开按钮
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!this.dragStarted) {
                    this.toggleCollapse();
                }
            });

            collapseBtn.addEventListener('mouseenter', () => {
                collapseBtn.style.backgroundColor = 'rgba(255,255,255,0.3)';
            });

            collapseBtn.addEventListener('mouseleave', () => {
                collapseBtn.style.backgroundColor = 'rgba(255,255,255,0.2)';
            });

            // 视频切换按钮
            toggleBtn.addEventListener('click', () => {
                if (!this.dragStarted) {
                    this.toggleVideos();
                }
            });

            // 按钮悬停效果
            toggleBtn.addEventListener('mouseenter', () => {
                if (!this.isDragging) {
                    toggleBtn.style.transform = 'scale(1.05)';
                }
            });

            toggleBtn.addEventListener('mouseleave', () => {
                toggleBtn.style.transform = 'scale(1)';
            });

            // 自动展开切换按钮
            expandToggleBtn.addEventListener('click', () => {
                if (!this.dragStarted) {
                    this.toggleAutoExpand();
                }
            });

            // 自动展开按钮悬停效果
            expandToggleBtn.addEventListener('mouseenter', () => {
                if (!this.isDragging) {
                    expandToggleBtn.style.transform = 'scale(1.05)';
                }
            });

            expandToggleBtn.addEventListener('mouseleave', () => {
                expandToggleBtn.style.transform = 'scale(1)';
            });
        }

        /**
         * 开始拖拽
         */
        dragStart(e) {
            if (e.target.closest('#dashboard-header')) {
                this.initialX = e.clientX - this.xOffset;
                this.initialY = e.clientY - this.yOffset;
                this.isDragging = true;
                this.dragStarted = false;
            }
        }

        /**
         * 拖拽中
         */
        drag(e) {
            if (this.isDragging) {
                e.preventDefault();

                this.currentX = e.clientX - this.initialX;
                this.currentY = e.clientY - this.initialY;

                this.xOffset = this.currentX;
                this.yOffset = this.currentY;

                this.dragStarted = true;

                if (this.dashboard) {
                    this.dashboard.style.left = `${this.currentX}px`;
                    this.dashboard.style.top = `${this.currentY}px`;
                    this.dashboard.style.right = 'auto';
                    this.dashboard.style.bottom = 'auto';
                }
            }
        }

        /**
         * 结束拖拽
         */
        dragEnd() {
            if (this.isDragging) {
                if (this.dashboard) {
                    this.savePosition(this.dashboard.style.top, this.dashboard.style.left);
                }

                this.initialX = this.currentX;
                this.initialY = this.currentY;

                this.isDragging = false;

                // 延迟重置dragStarted，避免触发click事件
                setTimeout(() => {
                    this.dragStarted = false;
                }, 100);
            }
        }

        /**
         * 切换折叠/展开状态
         */
        toggleCollapse() {
            this.isCollapsed = !this.isCollapsed;
            const content = document.getElementById('dashboard-content');
            const collapseBtn = document.getElementById('collapse-btn');
            const title = document.getElementById('dashboard-title');
            const dragHint = document.getElementById('drag-hint');
            const header = document.getElementById('dashboard-header');

            if (this.isCollapsed) {
                // 折叠状态：只显示一个小方块
                content.style.display = 'none';
                title.style.display = 'none';
                dragHint.style.display = 'none';
                header.style.borderBottom = 'none';
                header.style.padding = '8px';
                header.style.borderRadius = '12px';
                collapseBtn.textContent = '▶';
                collapseBtn.style.padding = '8px 10px';
                collapseBtn.style.fontSize = '14px';
                this.dashboard.style.minWidth = '0';
                this.dashboard.style.width = 'auto';
            } else {
                // 展开状态：显示完整内容
                content.style.display = 'block';
                title.style.display = 'inline';
                dragHint.style.display = 'inline';
                header.style.borderBottom = '1px solid #e0e0e0';
                header.style.padding = '15px 20px';
                header.style.borderRadius = '12px 12px 0 0';
                collapseBtn.textContent = '▼';
                collapseBtn.style.padding = '4px 8px';
                collapseBtn.style.fontSize = '16px';
                this.dashboard.style.minWidth = '280px';
                this.dashboard.style.width = '';
            }

            this.saveCollapsedState(this.isCollapsed);
        }

        /**
         * 自动展开折叠的容器元素
         */
        expandCollapsedContainers() {
            if (!this.isAutoExpandEnabled) {
                return;
            }

            const containers = document.querySelectorAll('.ng-trigger.ng-trigger-collapseMotion.result-common-container-toggle');

            if (containers.length > 0) {
                containers.forEach(container => {
                    container.style.height = 'auto';
                    container.style.overflow = 'visible';
                });
                // console.log(`[粉笔工具箱] 已展开 ${containers.length} 个折叠容器`);
            }
        }

        /**
         * 切换自动展开功能
         */
        toggleAutoExpand() {
            this.isAutoExpandEnabled = !this.isAutoExpandEnabled;
            const button = document.getElementById('expand-toggle-btn');

            if (this.isAutoExpandEnabled) {
                button.innerHTML = '禁用自动展开解析';
                button.style.backgroundColor = '#9E9E9E';
                // 立即执行一次展开
                this.expandCollapsedContainers();
            } else {
                button.innerHTML = '启用自动展开解析';
                button.style.backgroundColor = '#2196F3';
            }

            this.saveAutoExpandState(this.isAutoExpandEnabled);
        }

        /**
         * 获取所有目标视频元素
         */
        getVideoElements() {
            const allElements = document.querySelectorAll('[id*="section-video"]');
            return Array.from(allElements);
        }

        /**
         * 获取对应的解析元素
         */
        getSolutionElement(videoElement) {
            // 尝试在父元素的兄弟节点中查找解析元素
            let parent = videoElement.parentElement;
            if (!parent) return null;

            // 在同级元素中查找
            let sibling = parent.nextElementSibling;
            while (sibling) {
                if (sibling.id && sibling.id.includes('section-solution')) {
                    return sibling;
                }
                // 也在子元素中查找
                const solutionInChild = sibling.querySelector('[id*="section-solution"]');
                if (solutionInChild) {
                    return solutionInChild;
                }
                sibling = sibling.nextElementSibling;
            }

            // 如果没找到，尝试在整个文档中查找最近的解析元素
            const allSolutions = document.querySelectorAll('[id*="section-solution"]');
            for (let solution of allSolutions) {
                // 检查解析元素是否在视频元素之后
                if (videoElement.compareDocumentPosition(solution) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    return solution;
                }
            }

            return null;
        }

        /**
         * 切换视频位置
         */
        toggleVideos() {
            const videoElements = this.getVideoElements();
            const button = document.getElementById('video-toggle-btn');

            if (videoElements.length === 0) {
                this.showNotification('未找到包含"section-video"的视频元素');
                return;
            }

            this.isVideoInOriginalPosition = !this.isVideoInOriginalPosition;

            if (this.isVideoInOriginalPosition) {
                // 恢复到原始位置
                videoElements.forEach(videoElement => {
                    const originalPosition = this.videoOriginalPositions.get(videoElement);
                    if (originalPosition) {
                        const { parent, nextSibling } = originalPosition;
                        if (parent) {
                            if (nextSibling) {
                                parent.insertBefore(videoElement, nextSibling);
                            } else {
                                parent.appendChild(videoElement);
                            }
                        }
                    }
                });

                // 清空存储的位置信息
                this.videoOriginalPositions.clear();

                button.innerHTML = '视频移至解析后';
                button.style.backgroundColor = '#4CAF50';
            } else {
                // 移动到解析元素之后
                let movedCount = 0;
                videoElements.forEach(videoElement => {
                    // 保存原始位置
                    const originalParent = videoElement.parentElement;
                    const originalNextSibling = videoElement.nextElementSibling;
                    this.videoOriginalPositions.set(videoElement, {
                        parent: originalParent,
                        nextSibling: originalNextSibling
                    });

                    // 查找对应的解析元素
                    const solutionElement = this.getSolutionElement(videoElement);
                    if (solutionElement) {
                        // 将视频元素移动到解析元素之后
                        if (solutionElement.nextElementSibling) {
                            solutionElement.parentElement.insertBefore(videoElement, solutionElement.nextElementSibling);
                        } else {
                            solutionElement.parentElement.appendChild(videoElement);
                        }
                        movedCount++;
                    }
                });

                button.innerHTML = '恢复视频位置';
                button.style.backgroundColor = '#f44336';
            }
        }

        /**
         * 获取正确率数据
         */
        getAccuracyData() {
            const correctRateElements = document.querySelectorAll('.overall-item-value.correct-rate');

            if (correctRateElements.length === 0) {
                // console.log('[粉笔工具箱] 未找到正确率元素');
                return null;
            }

            // console.log(`[粉笔工具箱] 找到 ${correctRateElements.length} 个正确率元素`);

            const rates = [];
            correctRateElements.forEach((element, index) => {
                // 获取元素的第一个文本节点（排除子元素）
                let text = '';
                for (let node of element.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        text += node.textContent;
                    }
                }

                // 也尝试从完整文本中提取，以兼容不同的HTML结构
                if (!text.trim()) {
                    text = element.textContent;
                }

                // 提取数字（可能包含小数点）
                const match = text.match(/(\d+\.?\d*)/);
                if (match) {
                    const rate = parseFloat(match[1]);
                    if (!isNaN(rate) && rate >= 0 && rate <= 100) {
                        rates.push(rate);
                        // console.log(`[粉笔工具箱] 题目 ${index + 1}: ${rate}%`);
                    }
                }
            });

            if (rates.length === 0) {
                // console.log('[粉笔工具箱] 未能解析出任何正确率数据');
                return null;
            }

            const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
            const result = {
                average: average.toFixed(1),
                count: rates.length,
                rates: rates,
                min: Math.min(...rates).toFixed(1),
                max: Math.max(...rates).toFixed(1)
            };

            // console.log(`[粉笔工具箱] 统计结果: 平均 ${result.average}%, 最高 ${result.max}%, 最低 ${result.min}%`);

            return result;
        }

        /**
         * 更新统计数据显示
         */
        updateStats() {
            const accuracyDisplay = document.getElementById('accuracy-display');
            const statsDetails = document.getElementById('stats-details');

            const data = this.getAccuracyData();

            if (data) {
                accuracyDisplay.textContent = `${data.average}%`;

                // 显示详细统计信息
                const detailsHtml = `
                    <div>共 ${data.count} 个题目</div>
                    <div style="margin-top: 4px; font-size: 11px;">
                        最高: ${data.max}% | 最低: ${data.min}%
                    </div>
                `;
                statsDetails.innerHTML = detailsHtml;

                // 根据正确率设置颜色
                const rate = parseFloat(data.average);
                if (rate >= 80) {
                    accuracyDisplay.style.color = '#4CAF50';
                } else if (rate >= 60) {
                    accuracyDisplay.style.color = '#FFC107';
                } else {
                    accuracyDisplay.style.color = '#f44336';
                }
            } else {
                accuracyDisplay.textContent = '--';
                accuracyDisplay.style.color = 'white';
                statsDetails.innerHTML = '暂无正确率数据';
            }
        }

        /**
         * 启动定时更新统计数据
         */
        startStatsUpdater() {
            // 首次更新
            setTimeout(() => {
                this.updateStats();
                this.expandCollapsedContainers();
            }, 1000);

            // 每5秒更新一次
            this.statsInterval = setInterval(() => {
                this.updateStats();
                this.expandCollapsedContainers();
            }, 5000);
        }

        /**
         * 显示通知
         */
        showNotification(message) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px 40px;
                border-radius: 8px;
                z-index: 10000;
                font-size: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            `;
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 2000);
        }

        /**
         * 初始化
         */
        init() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.createDashboard();
                    // 自动启用视频位置更改功能
                    setTimeout(() => this.toggleVideos(), 1500);
                    // 自动展开折叠容器
                    setTimeout(() => this.expandCollapsedContainers(), 500);
                });
            } else {
                this.createDashboard();
                // 自动启用视频位置更改功能
                setTimeout(() => this.toggleVideos(), 1500);
                // 自动展开折叠容器
                setTimeout(() => this.expandCollapsedContainers(), 500);
            }

            // 使用MutationObserver监听DOM变化
            const observer = new MutationObserver(() => {
                if (!document.getElementById('fenbi-dashboard')) {
                    this.createDashboard();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: false
            });
        }
    }

    // 启动脚本
    const dashboard = new Dashboard();
    dashboard.init();
})();