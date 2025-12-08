// ==UserScript==
// @name         [RUBY] BH Assistant
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  fent is my passion
// @include      /^https:\/\/r.*a.*tech\/?/
// @updateURL    https://raw.githubusercontent.com/Zenonyte/BHassistant/refs/heads/main/bhassistant.js
// @downloadURL  https://raw.githubusercontent.com/Zenonyte/BHassistant/refs/heads/main/bhassistant.js
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
   'use strict';
   const LABELS = {
       battery: 'Battery status',
       functionality: 'Functionality',
       appearance: 'Appearance'
   };
   const BAD_BATTERY = ['70% - 79%', 'Below 70%'];
   const OK_APPEARANCE = ['Grade A+', 'Grade A', 'Grade B', 'Grade C+', 'Grade C'];
   let debounceTimer = null;
   const DEBOUNCE_MS = 200;
   let isAlertActive = false;
   let popupShownForCurrentAlert = false;
   function findNgSelectByLabel(labelText) {
       const xpath = "//label[contains(normalize-space(.), '" + labelText + "')]";
       const labelNode = document.evaluate(
           xpath,
           document,
           null,
           XPathResult.FIRST_ORDERED_NODE_TYPE,
           null
       ).singleNodeValue;
       if (!labelNode) return null;
       const formField = labelNode.closest('.form-field');
       if (!formField) return null;
       return formField.querySelector('ng-select');
   }
   function getNgSelectText(ngSelectEl) {
       if (!ngSelectEl) return null;
       const valueLabel = ngSelectEl.querySelector('.ng-value-label');
       if (valueLabel && valueLabel.textContent.trim()) {
           return valueLabel.textContent.trim();
       }
       const placeholder = ngSelectEl.querySelector('.ng-placeholder');
       if (placeholder && placeholder.textContent.trim()) {
           return placeholder.textContent.trim();
       }
       const input = ngSelectEl.querySelector('.ng-input input');
       if (input && input.value.trim()) {
           return input.value.trim();
       }
       return null;
   }
   function findTestButton() {
       return Array.from(document.querySelectorAll('app-footer button, button')).find(btn =>
           btn.textContent?.trim() === 'Test match' ||
           btn.textContent?.trim() === 'Save'
       );
   }
   function updateButtonStyle() {
       const button = findTestButton();
       if (!button) return;
       if (isAlertActive) {
           button.style.backgroundColor = '#E4594C !important';
           button.style.color = '#FFFFFF !important';
           button.style.borderColor = '#cc0000 !important';
           button.style.setProperty('background-color', '#E4594C', 'important');
           button.__wasRed = true;
       } else if (button.__wasRed) {
           button.style.cssText = '';
           delete button.__wasRed;
       }
   }
   function showPopupWarning() {
       if (popupShownForCurrentAlert) return;
       popupShownForCurrentAlert = true;
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
           color: white; padding: 30px; border-radius: 12px; max-width: 420px;
           text-align: center; box-shadow: 0 20px 40px rgba(255,68,68,0.4);
           pointer-events: all; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);
       `;
       content.innerHTML = `
<h2 style="margin: 0 0 20px 0; font-size: 24px;">Zoinks, Working MF battery!</h2>
<div style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.5;">
<div style="margin-bottom: 8px;"><strong>Functionality:</strong> Working ✗</div>
<div style="margin-bottom: 16px;"><strong>Battery:</strong> Poor (&lt;80%) ✗</div>
</div>
<p style="margin: 0 0 25px 0; font-size: 14px; opacity: 0.95;">
               Please review before saving!
</p>
<button id="bh-alert-ok" style="
               background: rgba(255,255,255,0.95); color: #ff4444; border: none;
               padding: 14px 32px; font-size: 16px; font-weight: 600;
               border-radius: 8px; cursor: pointer; transition: all 0.2s;
               box-shadow: 0 4px 12px rgba(0,0,0,0.2);
           ">ACKNOWLEDGE</button>
       `;
       modal.appendChild(content);
       document.body.appendChild(modal);
       const okBtn = document.getElementById('bh-alert-ok');
       okBtn.onclick = () => {
           if (modal.parentNode) {
               modal.parentNode.removeChild(modal);
           }
       };
   }
   function logAllValuesDebounced() {
       if (debounceTimer) clearTimeout(debounceTimer);
       debounceTimer = setTimeout(() => {
           const batteryEl       = findNgSelectByLabel(LABELS.battery);
           const functionalityEl = findNgSelectByLabel(LABELS.functionality);
           const appearanceEl    = findNgSelectByLabel(LABELS.appearance);
           const batteryVal       = getNgSelectText(batteryEl);
           const functionalityVal = getNgSelectText(functionalityEl);
           const appearanceVal    = getNgSelectText(appearanceEl);
           const line =
               `[BH logger] Battery: ${batteryVal ?? 'null'} ` +
               `Functionality: ${functionalityVal ?? 'null'} ` +
               `Appearance: ${appearanceVal ?? 'null'}`; //pls log properly t his time thanx
           console.log(line);
           const wasAlertActive = isAlertActive;
           isAlertActive = functionalityVal === 'Working' &&
                          OK_APPEARANCE.includes(appearanceVal || '') &&
                          BAD_BATTERY.includes(batteryVal || '');
           if (wasAlertActive && !isAlertActive) {
               popupShownForCurrentAlert = false;
           }
           if (isAlertActive) {
               console.warn(
                   '%c[BH ALERT]%c ' + line,
                   'background:#ffcc00;color:#000;font-weight:bold;padding:2px 4px;border-radius:2px;',
                   ''
               );
           }
           if (wasAlertActive !== isAlertActive) {
               updateButtonStyle();
           }
       }, DEBOUNCE_MS);
   }
   function attachListenersToNgSelect(ngSelectEl) {
       if (!ngSelectEl || ngSelectEl.__bhLoggerAttached) return;
       ngSelectEl.__bhLoggerAttached = true;
       ngSelectEl.addEventListener('click', () => {
           setTimeout(logAllValuesDebounced, 50);
       });
       const observer = new MutationObserver(() => {
           logAllValuesDebounced();
       });
       observer.observe(ngSelectEl, {
           childList: true,
           attributes: true,
           subtree: true
       });
       ngSelectEl.__bhLoggerObserver = observer;
   }
   function setupTestButton(button) {
       if (!button || button.__bhClickBlocker) return;
       button.__bhClickBlocker = true;
       button.addEventListener('click', (e) => {
           if (isAlertActive && !popupShownForCurrentAlert) {
               e.preventDefault();
               e.stopPropagation();
               showPopupWarning();
           }
       }, true);
       updateButtonStyle();
   }
   function scanAndAttach() {
       Object.values(LABELS).forEach(labelText => {
           const el = findNgSelectByLabel(labelText);
           if (el) attachListenersToNgSelect(el);
       });
       document.querySelectorAll('app-footer button, button').forEach(setupTestButton);
   }
   const globalObserver = new MutationObserver(() => {
       if (globalObserver.__bhLoggerRescanTimeout) {
           clearTimeout(globalObserver.__bhLoggerRescanTimeout);
       }
       globalObserver.__bhLoggerRescanTimeout = setTimeout(scanAndAttach, 100);
   });
   globalObserver.observe(document.documentElement, {
       childList: true,
       subtree: true,
       attributes: true
   });
   scanAndAttach(); //canu pls work this time thanx
   setInterval(scanAndAttach, 500);
    //target = kofeiin + nikotiin
})();
