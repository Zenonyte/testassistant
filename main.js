// ==UserScript==
// @name         [RUBY] Test assistant
// @namespace    http://tampermonkey.net/
// @version      67.69
// @description  fent is my passion
// @include      /^https:\/\/r.*a.*tech\/?/
// @updateURL    https://raw.githubusercontent.com/Zenonyte/testassistant/refs/heads/main/main.js
// @downloadURL  https://raw.githubusercontent.com/Zenonyte/testassistant/refs/heads/main/main.js
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzODQgNTEyIj48IS0tISBGb250IEF3ZXNvbWUgRnJlZSA3LjEuMCBieSBAZm9udGF3ZXNvbWUgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbSBMaWNlbnNlIC0gaHR0cHM6Ly9mb250YXdlc29tZS5jb20vbGljZW5zZS9mcmVlIChJY29uczogQ0MgQlkgNC4wLCBGb250czogU0lMIE9GTCAxLjEsIENvZGU6IE1JVCBMaWNlbnNlKSBDb3B5cmlnaHQgMjAyNSBGb250aWNvbnMsIEluYy4gLS0+PHBhdGggZmlsbD0iIzAxRjhDMyIgZD0iTTM1MiAwYzE3LjcgMCAzMiAxNC4zIDMyIDMyIDAgNTcuOC0yNC40IDEwNC44LTU3LjQgMTQ0LjUtMjQuMSAyOC45LTUzLjggNTUuMS04My42IDc5LjUgMjkuOCAyNC41IDU5LjUgNTAuNiA4My42IDc5LjUgMzMgMzkuNiA1Ny40IDg2LjcgNTcuNCAxNDQuNSAwIDE3LjctMTQuMyAzMi0zMiAzMnMtMzItMTQuMy0zMi0zMkw2NCA0ODBjMCAxNy43LTE0LjMgMzItMzIgMzJTMCA0OTcuNyAwIDQ4MEMwIDQyMi4yIDI0LjQgMzc1LjIgNTcuNCAzMzUuNSA4MS41IDMwNi42IDExMS4yIDI4MC41IDE0MSAyNTYgMTExLjIgMjMxLjUgODEuNSAyMDUuNCA1Ny40IDE3Ni41IDI0LjQgMTM2LjggMCA4OS44IDAgMzIgMCAxNC4zIDE0LjMgMCAzMiAwUzY0IDE0LjMgNjQgMzJsMjU2IDBjMC0xNy43IDE0LjMtMzIgMzItMzJ6TTI4My41IDM4NGwtMTgyLjkgMGMtOC4yIDEwLjUtMTUuMSAyMS4xLTIwLjYgMzJsMjI0LjIgMGMtNS42LTEwLjktMTIuNS0yMS41LTIwLjYtMzJ6TTIzOCAzMzZjLTE0LjMtMTMtMjkuOC0yNS44LTQ2LTM5LTE2LjIgMTMuMS0zMS43IDI2LTQ2IDM5bDkyIDB6TTEwMC41IDEyOGwxODIuOSAwYzguMi0xMC41IDE1LjEtMjEuMSAyMC42LTMyTDc5LjkgOTZjNS42IDEwLjkgMTIuNSAyMS41IDIwLjYgMzJ6TTE0NiAxNzZjMTQuMyAxMyAyOS44IDI1LjggNDYgMzkgMTYuMi0xMy4xIDMxLjctMjYgNDYtMzlsLTkyIDB6Ii8+PC9zdmc+
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const FIELD_CONFIG = { //gotta futureproof it just a bit ig
        battery: { labelText: 'Battery status', type: 'ng-select' },
        functionality: { labelText: 'Functionality', type: 'ng-select' },
        appearance: { labelText: 'Appearance', type: 'ng-select' },
        faultDescription: { labelText: 'Fault Description', type: 'ng-select' }
    };

    const RULES = [ //more scaleable ig, lihtsam asju lisada
        {
            id: 'BH_ALERT_BAD_BATTERY',
            message: 'W & MF battery.',
            condition: (ctx) => {
                const { battery, functionality, appearance } = ctx;
                const isWorking = functionality === 'Working';
                const isBadBattery = ['70% - 79%', 'Below 70%'].includes(battery || '');
                const isAppearanceOkForBattery = ['Grade AB', 'Grade BC', ''].includes(appearance || '');
                return isWorking && isBadBattery && !isAppearanceOkForBattery;
            }
        },
        {
            id: 'MISSING_FAULT_DESC',
            message: 'Missing fault description.',
            condition: (ctx) => {
                const { functionality, faultDescription } = ctx;
                return functionality !== 'Working' && isEmpty(faultDescription);
            }
        },
        {
            id: 'MISSING_APPEARANCE',
            message: 'Missing appearance.',
            condition: (ctx) => {
                const { functionality, appearance } = ctx
                const isWorkingOrMinor = ['Working', 'Minor Fault'].includes(functionality);
                return isWorkingOrMinor && isEmpty(appearance);
            }
        },
        {
            id: 'FAULTY_WITH_APPEARANCE',
            message: 'Faulty device with appearance.',
            condition: (ctx) => {
                const { functionality, appearance } = ctx;
                const isWorkingOrMinor = ['Working', 'Minor Fault'].includes(functionality);
                return !isWorkingOrMinor && !isEmpty(appearance);
            }
        }
    ];

    let lastCtx = null;
    let lastAlertsKey = '';
    const popupState = { currentToken: 0, shownForToken: -1 };

    function isEmpty(value) {
        return value == null || String(value).trim() === '';
    }

    function findLabel(labelText) {
        const xpath = "//label[contains(normalize-space(.), '" + labelText + "')]";
        return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }

    function readNgSelectByLabel(labelText) {
        const labelNode = findLabel(labelText);
        if (!labelNode) return null;
        const formField = labelNode.closest('.form-field');
        if (!formField) return null;
        const ngSelectEl = formField.querySelector('ng-select');
        if (!ngSelectEl) return null;

        const valueLabel = ngSelectEl.querySelector('.ng-value-label');
        if (valueLabel?.textContent.trim()) return valueLabel.textContent.trim();

        const placeholder = ngSelectEl.querySelector('.ng-placeholder');
        if (placeholder?.textContent.trim()) return placeholder.textContent.trim();

        const input = ngSelectEl.querySelector('.ng-input input');
        if (input?.value.trim()) return input.value.trim();

        return '';
    }

    function readTextByLabel(labelText) {
        const labelNode = findLabel(labelText);
        if (!labelNode) return null;
        const container = labelNode.closest('.form-field') || labelNode.parentElement;
        if (!container) return null;
        const control = container.querySelector('textarea, input');
        return control ? control.value : '';
    }

    function readAllFields() {
        const ctx = {};
        for (const [key, cfg] of Object.entries(FIELD_CONFIG)) {
            ctx[key] = cfg.type === 'ng-select'
                ? readNgSelectByLabel(cfg.labelText)
                : readTextByLabel(cfg.labelText);
        }
        return ctx;
    }

    function contextsEqual(a, b) {
        return a?.battery === b?.battery &&
               a?.functionality === b?.functionality &&
               a?.appearance === b?.appearance &&
               a?.faultDescription === b?.faultDescription;
    }

    function evaluateRules(ctx) {
        return RULES.filter(rule => rule.condition(ctx));
    }

    function handleChangeIfNeeded() {
        const ctx = readAllFields();
        if (lastCtx && contextsEqual(ctx, lastCtx)) return;
        lastCtx = ctx;

        const activeRules = evaluateRules(ctx);
        const alertsKey = activeRules.map(r => r.id).sort().join('|');
        const isAlertActive = activeRules.length > 0;

        const logLine =
            `[BH] Battery: ${ctx.battery || 'null'} ` +
            `Functionality: ${ctx.functionality || 'null'} ` +
            `Appearance: ${ctx.appearance || 'null'} ` +
            `Fault: ${ctx.faultDescription || 'null'}`;

        console.log(logLine);

        if (alertsKey !== lastAlertsKey) {
            lastAlertsKey = alertsKey;
            if (isAlertActive) {
                const messages = activeRules.map(r => r.message);
                console.warn('%c[BH ALERT]%c',
                    'background:#ffcc00;color:#000;font-weight:bold;padding:2px 4px;border-radius:2px;',
                    '', ...messages);
                popupState.currentToken++;
            }
            updateButtonStyle(isAlertActive);
        }
    }

    function findTestButton() {
        return Array.from(document.querySelectorAll('app-footer button, button'))
            .find(btn => ['Save', 'Test match'].includes(btn.textContent?.trim()));
    }

    function updateButtonStyle(isAlertActive) {
        const button = findTestButton();
        if (!button) return;
        if (isAlertActive) {
            Object.assign(button.style, {
                backgroundColor: '#ff4444',
                color: 'white',
                borderColor: '#cc0000'
            });
            button.__wasRed = true;
        } else if (button.__wasRed) {
            button.style.cssText = '';
            delete button.__wasRed;
        }
    }

    function showPopupOncePerAlert(messages) {
        if (popupState.shownForToken === popupState.currentToken) return;
        popupState.shownForToken = popupState.currentToken;

        const modal = document.createElement('div');
        modal.id = 'bh-alert-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.7); z-index: 1000000; display: flex;
            align-items: center; justify-content: center; pointer-events: none;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, #ff4444, #ff6666);
            color: white; padding: 30px; border-radius: 12px; max-width: 460px;
            text-align: center; box-shadow: 0 20px 40px rgba(255,68,68,0.4);
            pointer-events: all; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);
        `;

        content.innerHTML = `
            <h2 style="margin: 0 0 16px 0; font-size: 22px;">⚠️</h2>
            <ul style="margin: 0 0 18px 0; padding-left: 20px; font-size: 14px; line-height: 1.4;">
                ${messages.map(msg => `<li style="margin-bottom:6px;text-align:left;">${msg}</li>`).join('')}
            </ul>
            <button id="bh-alert-ok" style="
                background: rgba(255,255,255,0.95); color: #ff4444; border: none;
                padding: 12px 26px; font-size: 14px; font-weight: 600;
                border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            ">I UNDERSTAND - CONTINUE</button>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        document.getElementById('bh-alert-ok').onclick = () => {
            modal.remove();
        };
    }

    function setupTestButton(button) {
        if (button.__bhClickHandler) return;
        button.__bhClickHandler = true;

        button.addEventListener('click', (e) => {
            const ctx = readAllFields();
            const activeRules = evaluateRules(ctx);
            if (activeRules.length && popupState.shownForToken !== popupState.currentToken) {
                e.preventDefault();
                e.stopPropagation();
                showPopupOncePerAlert(activeRules.map(r => r.message));
            }
        }, true);
    }

    function scanAndAttach() {
        for (const [key, cfg] of Object.entries(FIELD_CONFIG)) {
            const labelNode = findLabel(cfg.labelText);
            if (!labelNode) continue;

            if (cfg.type === 'ng-select') {
                const formField = labelNode.closest('.form-field');
                if (formField) {
                    const ngSelectEl = formField.querySelector('ng-select');
                    if (ngSelectEl && !ngSelectEl.__bhObserved) {
                        ngSelectEl.__bhObserved = true;
                        const obs = new MutationObserver(handleChangeIfNeeded);
                        obs.observe(ngSelectEl, { childList: true, attributes: true, subtree: true, characterData: true });
                        ngSelectEl.addEventListener('click', () => setTimeout(handleChangeIfNeeded, 50));
                    }
                }
            } else {
                const container = labelNode.closest('.form-field') || labelNode.parentElement;
                if (container) {
                    const control = container.querySelector('textarea, input');
                    if (control && !control.__bhObserved) {
                        control.__bhObserved = true;
                        control.addEventListener('input', handleChangeIfNeeded);
                    }
                }
            }
        }

        const btn = findTestButton();
        if (btn) setupTestButton(btn);
    }

    const globalObserver = new MutationObserver(() => {
        const timeout = globalObserver.__bhScanTimeout;
        if (timeout) clearTimeout(timeout);
        globalObserver.__bhScanTimeout = setTimeout(scanAndAttach, 150);
    });

    globalObserver.observe(document.documentElement, { childList: true, subtree: true });
    scanAndAttach();
})();
