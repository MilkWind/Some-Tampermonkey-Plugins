// ==UserScript==
// @name         岗位招考统计
// @namespace    http://tampermonkey.net/
// @version      2025-10-16
// @description  提供一个仪表盘，展示识别到的有效条目数，以及一个可以一键复制所有有效数据条目为CSV格式的按钮
// @author       MilkWind
// @match        https://www.gwyzwb.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.gwyzwb.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 创建仪表盘样式
    const dashboardStyle = `
        .recruitment-dashboard {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: white;
            color: black;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
            z-index: 10000;
            min-width: 250px;
            font-family: 'Microsoft YaHei', Arial, sans-serif;
        }
        .recruitment-dashboard h3 {
            margin: 0 0 15px 0;
            font-size: 18px;
            font-weight: bold;
        }
        .recruitment-dashboard .stats {
            margin-bottom: 15px;
            font-size: 14px;
        }
        .recruitment-dashboard .stats-number {
            font-size: 32px;
            font-weight: bold;
            margin: 10px 0;
        }
        .recruitment-dashboard button {
            background: white;
            color: #667eea;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            width: 100%;
            transition: all 0.3s ease;
        }
        .recruitment-dashboard button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        .recruitment-dashboard button:active {
            transform: translateY(0);
        }
        .recruitment-dashboard .success-msg {
            margin-top: 10px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 5px;
            font-size: 12px;
            text-align: center;
            display: none;
        }
    `;

    // 添加样式到页面
    const styleElement = document.createElement('style');
    styleElement.textContent = dashboardStyle;
    document.head.appendChild(styleElement);

    // 提取数据的函数
    function extractRecruitmentData() {
        const rows = document.querySelectorAll('tr.list_one');
        const data = [];

        // 去掉表头 - 从第二个元素开始遍历
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.querySelectorAll('td');
            const rowData = {
                positionCode: '',
                position: '',
                recruitNum: '',
                applicantNum: ''
            };

            cells.forEach(cell => {
                const label = cell.getAttribute('data-label');
                if (!label) return;

                const text = cell.textContent.trim();

                if (label.includes('岗位代码')) {
                    rowData.positionCode = text;
                } else if (label.includes('招考职位')) {
                    rowData.position = text;
                } else if (label.includes('招考人数')) {
                    rowData.recruitNum = text;
                } else if (label.includes('报名人数')) {
                    rowData.applicantNum = text;
                }
            });

            // 只添加至少有岗位代码的有效条目
            if (rowData.positionCode) {
                data.push(rowData);
            }
        }

        return data;
    }

    // 转换为CSV格式的函数
    function convertToCSV(data) {
        if (data.length === 0) {
            return '';
        }

        // CSV头部
        const header = '岗位代码,招考职位,招考人数,报名人数';

        // CSV数据行
        const rows = data.map(item => {
            // 处理包含逗号、引号或换行符的字段
            const escapeCSV = (field) => {
                if (field.includes(',') || field.includes('"') || field.includes('\n')) {
                    return `"${field.replace(/"/g, '""')}"`;
                }
                return field;
            };

            return [
                escapeCSV(item.positionCode),
                escapeCSV(item.position),
                escapeCSV(item.recruitNum),
                escapeCSV(item.applicantNum)
            ].join(',');
        });

        return [header, ...rows].join('\n');
    }

    // 复制到剪贴板的函数
    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        } else {
            // 备用方案：使用传统的方法
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textarea);
                return Promise.resolve();
            } catch (err) {
                document.body.removeChild(textarea);
                return Promise.reject(err);
            }
        }
    }

    // 创建仪表盘UI
    function createDashboard() {
        let isStatisticsStarted = false;
        let observer = null;

        const dashboard = document.createElement('div');
        dashboard.className = 'recruitment-dashboard';
        dashboard.innerHTML = `
            <h3>招考统计仪表盘</h3>
            <div class="stats">
                <div>识别到有效条目数：</div>
                <div class="stats-number" id="entry-count">-</div>
            </div>
            <button id="start-stats-btn">开始统计</button>
            <button id="copy-csv-btn" disabled style="margin-top: 10px; opacity: 0.5; cursor: not-allowed;">复制CSV数据</button>
            <div class="success-msg" id="success-msg">✓ 已复制到剪贴板！</div>
        `;

        document.body.appendChild(dashboard);

        // 绑定按钮事件
        const startBtn = document.getElementById('start-stats-btn');
        const copyBtn = document.getElementById('copy-csv-btn');
        const successMsg = document.getElementById('success-msg');

        // 开始统计按钮事件
        startBtn.addEventListener('click', () => {
            if (!isStatisticsStarted) {
                isStatisticsStarted = true;
                startBtn.disabled = true;
                startBtn.style.opacity = '0.5';
                startBtn.style.cursor = 'not-allowed';
                startBtn.textContent = '统计中...';

                // 更新数据
                updateDashboard();

                // 启用复制按钮
                copyBtn.disabled = false;
                copyBtn.style.opacity = '1';
                copyBtn.style.cursor = 'pointer';

                startBtn.textContent = '统计完毕';
            }
        });

        // 复制CSV按钮事件
        copyBtn.addEventListener('click', () => {
            if (!isStatisticsStarted) {
                alert('请先点击"开始统计"按钮');
                return;
            }

            const data = extractRecruitmentData();
            const csv = convertToCSV(data);

            if (csv) {
                copyToClipboard(csv)
                    .then(() => {
                        successMsg.style.display = 'block';
                        setTimeout(() => {
                            successMsg.style.display = 'none';
                        }, 2000);
                    })
                    .catch(err => {
                        alert('复制失败，请重试');
                        console.error('复制失败:', err);
                    });
            } else {
                alert('没有找到有效数据');
            }
        });
    }

    // 更新仪表盘数据
    function updateDashboard() {
        const countElement = document.getElementById('entry-count');
        if (countElement) {
            const data = extractRecruitmentData();
            countElement.textContent = data.length;
        }
    }

    // 删除mm_dialog元素
    function deleteMMDialog() {
        const intervalId = setInterval(() => {
            const mmDialog = document.getElementById('mm_dialog');
            if (mmDialog) {
                mmDialog.remove();
                clearInterval(intervalId);
                // console.log('mm_dialog已成功删除');
            }
        }, 100); // 每100毫秒检查一次
    }

    // 等待页面加载完成后创建仪表盘
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createDashboard();
            deleteMMDialog();
        });
    } else {
        createDashboard();
        deleteMMDialog();
    }

})();