// ==UserScript==
// @name         Dynamic Ad Blocker
// @namespace    ADBlocker
// @version      202608200910
// @description  Hides ads dynamically based on selectors from a GitHub Gist URL.
// @author       Zero
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_webRequest
// @grant        unsafeWindow
// @run-at       document-start
// @require      https://raw.githubusercontent.com/SuperLeeK/web-javascript-lib/refs/heads/main/widgets/button.js
// @require      https://raw.githubusercontent.com/SuperLeeK/web-javascript-lib/refs/heads/main/widgets/toast.js
// @require      https://raw.githubusercontent.com/SuperLeeK/web-javascript-lib/refs/heads/main/libs/useGist.js
// @require      https://raw.githubusercontent.com/SuperLeeK/web-javascript-lib/refs/heads/main/libs/useKeyPress.js
// @connect      api.github.com
// @updateURL    https://github.com/SuperLeeK/tampermonkey-adblocker/raw/refs/heads/main/adblocker.user.js
// @downloadURL  https://github.com/SuperLeeK/tampermonkey-adblocker/raw/refs/heads/main/adblocker.user.js
// @exclude      https://github.com/*
// @exclude      https://vscode.dev/*
// @exclude      https://*google*
// @exclude      https://*github*
// ==/UserScript==

function getGistConfig() {
  const defaultConfig = {
    gistId: "",
    token: "",
    fileName: "ad_selector_list.json",
    blackListFileName: "ad_selector_blacklist.json"
  };

  let saved = GM_getValue("gist_config", null);

  // GM 스토리지에 유효한 정보가 없으면 localStorage 백업에서 복구 시도
  if (!saved || !saved.gistId || !saved.token) {
    try {
      const localBackupStr = localStorage.getItem("adblock_gist_config");
      if (localBackupStr) {
        const localBackup = JSON.parse(localBackupStr);
        if (localBackup && (localBackup.gistId || localBackup.token)) {
          saved = { ...(saved || {}), ...localBackup };
          GM_setValue("gist_config", saved);
        }
      }
    } catch (e) {}
  }

  if (!saved) return defaultConfig;
  return { ...defaultConfig, ...saved };
}

function setGistConfig(config) {
  GM_setValue("gist_config", config);
  try {
    localStorage.setItem("adblock_gist_config", JSON.stringify(config));
  } catch (e) {}
}

function showGistConfigModal(onSaved) {
  const existing = document.getElementById("adblock-gist-modal");
  if (existing) existing.remove();

  const currentConfig = getGistConfig();

  const modalContainer = document.createElement("div");
  modalContainer.id = "adblock-gist-modal";
  modalContainer.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000005;
    width: 420px;
    max-width: calc(100vw - 32px);
    background: #18181b;
    color: #f4f4f5;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    overflow: hidden;
    box-sizing: border-box;
  `;

  modalContainer.innerHTML = `
    <div style="padding: 12px 16px; background: rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center; user-select: none;">
      <span style="font-weight: 600; font-size: 13px; color: #ff9800;">⚙️ GitHub Gist 동기화 설정</span>
      <button id="adblock-gist-close" style="background: none; border: none; color: #a1a1aa; font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1;" title="닫기">&times;</button>
    </div>
    <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
      <div style="font-size: 11px; color: #a1a1aa; line-height: 1.4; background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.2); padding: 8px 10px; border-radius: 6px;">
        💡 룰 데이터를 동기화할 본인의 GitHub Gist ID와 Personal Access Token을 입력해주세요. (토큰 권한: gist)
      </div>
      <div>
        <label style="display: block; color: #a1a1aa; font-size: 12px; margin-bottom: 4px; font-weight: 500;">Gist ID (필수):</label>
        <input type="text" id="adblock-gist-id-input" placeholder="예: abf07974131992ec7b992a09ab8da6f6" style="width: 100%; box-sizing: border-box; padding: 8px 10px; background: #09090b; color: #4ade80; border: 1px solid #3f3f46; border-radius: 6px; font-family: monospace; font-size: 12px; outline: none;" value="${currentConfig.gistId || ''}" />
      </div>
      <div>
        <label style="display: block; color: #a1a1aa; font-size: 12px; margin-bottom: 4px; font-weight: 500;">GitHub Token (필수):</label>
        <input type="text" id="adblock-gist-token-input" placeholder="예: ghp_xxxxxxxxxxxxxxxxxxxx" style="width: 100%; box-sizing: border-box; padding: 8px 10px; background: #09090b; color: #ffab40; border: 1px solid #3f3f46; border-radius: 6px; font-family: monospace; font-size: 12px; outline: none;" value="${currentConfig.token || ''}" />
      </div>
      <div>
        <label style="display: block; color: #a1a1aa; font-size: 12px; margin-bottom: 4px; font-weight: 500;">선택자 파일명:</label>
        <input type="text" id="adblock-gist-file-input" placeholder="ad_selector_list.json" style="width: 100%; box-sizing: border-box; padding: 8px 10px; background: #09090b; color: #f4f4f5; border: 1px solid #3f3f46; border-radius: 6px; font-family: monospace; font-size: 12px; outline: none;" value="${currentConfig.fileName || 'ad_selector_list.json'}" />
      </div>
      <div>
        <label style="display: block; color: #a1a1aa; font-size: 12px; margin-bottom: 4px; font-weight: 500;">블랙리스트 파일명:</label>
        <input type="text" id="adblock-gist-blacklist-file-input" placeholder="ad_selector_blacklist.json" style="width: 100%; box-sizing: border-box; padding: 8px 10px; background: #09090b; color: #f4f4f5; border: 1px solid #3f3f46; border-radius: 6px; font-family: monospace; font-size: 12px; outline: none;" value="${currentConfig.blackListFileName || 'ad_selector_blacklist.json'}" />
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
        <button id="adblock-gist-open-url" style="padding: 6px 12px; background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500;">🔗 Gist 바로가기</button>
        <div style="display: flex; gap: 8px;">
          <button id="adblock-gist-cancel" style="padding: 6px 14px; background: #27272a; color: #d4d4d8; border: 1px solid #3f3f46; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500;">취소</button>
          <button id="adblock-gist-save" style="padding: 6px 16px; background: #ff9800; color: #09090b; font-weight: 600; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">저장 및 동기화</button>
        </div>
      </div>
    </div>
  `;

  (document.body || document.documentElement).appendChild(modalContainer);

  const close = () => modalContainer.remove();

  modalContainer.querySelector("#adblock-gist-close").onclick = close;
  modalContainer.querySelector("#adblock-gist-cancel").onclick = close;

  modalContainer.querySelector("#adblock-gist-open-url").onclick = () => {
    const gistId = modalContainer.querySelector("#adblock-gist-id-input").value.trim() || currentConfig.gistId;
    if (!gistId) {
      alert("Gist ID가 입력되지 않았습니다.");
      return;
    }
    window.open(`https://gist.github.com/${gistId}`, "_blank");
  };

  modalContainer.querySelector("#adblock-gist-save").onclick = () => {
    const gistId = modalContainer.querySelector("#adblock-gist-id-input").value.trim();
    const token = modalContainer.querySelector("#adblock-gist-token-input").value.trim();
    const fileName = modalContainer.querySelector("#adblock-gist-file-input").value.trim() || "ad_selector_list.json";
    const blackListFileName = modalContainer.querySelector("#adblock-gist-blacklist-file-input").value.trim() || "ad_selector_blacklist.json";

    if (!gistId || !token) {
      alert("Gist ID와 GitHub Token은 필수 입력 항목입니다.");
      return;
    }

    setGistConfig({
      gistId,
      token,
      fileName,
      blackListFileName
    });

    close();
    Toast.show("Gist 설정이 저장되었습니다. 동기화를 위해 페이지를 새로고침합니다.");
    if (onSaved) onSaved();
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };
}

function makeButtonGroups({ handleManualClick, handlePickerCoverClick, handlePickerHideClick, handleStyleInjectClick, handleBlacklistClick, handleUrlBlockClick, handleDeleteListClick, handleHideReleaseClick, handleGistConfigClick, isBlacklisted = false }) {
  if (!document.getElementById('adblock-responsive-style')) {
    const responsiveStyle = document.createElement('style');
    responsiveStyle.id = 'adblock-responsive-style';
    responsiveStyle.textContent = `
      #adblock-modal-info, #adblock-selector-modal, #adblock-modal-candidate-select {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      #adblock-modal-info::-webkit-scrollbar, #adblock-selector-modal *::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      #adblock-ui-group {
        position: fixed !important;
        left: 20px !important;
        bottom: 20px !important;
        z-index: 2147483647 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 8px !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        transform: none !important;
        filter: none !important;
        clip: auto !important;
      }
      .adblock-fab-toggle {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: #2563eb;
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        transition: transform 0.2s ease, background 0.2s ease;
        outline: none;
      }
      .adblock-fab-toggle:hover {
        transform: scale(1.08);
        background: #1d4ed8;
      }
      .adblock-menu-wrapper {
        display: flex;
        flex-direction: column;
        gap: 6px;
        opacity: 0;
        transform: translateY(12px) scale(0.92);
        transform-origin: bottom left;
        pointer-events: none;
        transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      }
      #adblock-ui-group.is-open .adblock-menu-wrapper {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }
      @media screen and (max-width: 768px) {
        #adblock-ui-group {
          left: 12px !important;
          bottom: 12px !important;
          gap: 6px !important;
        }
        .adblock-fab-toggle {
          width: 36px !important;
          height: 36px !important;
          font-size: 15px !important;
        }
        .adblock-menu-wrapper button, .adblock-menu-wrapper .btn {
          padding: 4px 8px !important;
          font-size: 11px !important;
          height: auto !important;
          line-height: 1.2 !important;
        }
      }
    `;
    (document.head || document.documentElement).appendChild(responsiveStyle);
  }

  const groups = document.createElement('div');
  groups.id = "adblock-ui-group";

  const fabToggle = document.createElement('button');
  fabToggle.className = 'adblock-fab-toggle';
  fabToggle.title = '광고 차단 메뉴';
  fabToggle.innerHTML = '🛡️';

  const menuWrapper = document.createElement('div');
  menuWrapper.className = 'adblock-menu-wrapper';

  fabToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = groups.classList.toggle('is-open');
    fabToggle.innerHTML = isOpen ? '✕' : '🛡️';
  });

  document.addEventListener('click', (e) => {
    if (!groups.contains(e.target)) {
      groups.classList.remove('is-open');
      fabToggle.innerHTML = '🛡️';
    }
  });

  const scriptUpdateBtn = new Button({
    text: "🔄 스크립트 업데이트",
    variant: "warning",
    size: "small",
    onClick: () => {
      const updateUrl = "https://github.com/SuperLeeK/tampermonkey-adblocker/raw/refs/heads/main/adblocker.user.js";
      window.location.href = updateUrl;
    },
  });
  if (scriptUpdateBtn && scriptUpdateBtn.element) {
    scriptUpdateBtn.element.style.backgroundColor = '#3b82f6';
    scriptUpdateBtn.element.style.color = '#ffffff';
    scriptUpdateBtn.element.style.fontWeight = '600';
    scriptUpdateBtn.element.style.borderColor = '#60a5fa';
  }

  const gistConfigBtn = new Button({
    text: "⚙️ Gist 설정",
    variant: "warning",
    size: "small",
    onClick: handleGistConfigClick || (() => showGistConfigModal()),
  });

  if (isBlacklisted) {
    const releaseBtn = new Button({
      text: "블랙리스트해제",
      variant: "danger",
      size: "small",
      onClick: handleBlacklistClick,
    });

    releaseBtn.appendTo(menuWrapper);
    scriptUpdateBtn.appendTo(menuWrapper);
    gistConfigBtn.appendTo(menuWrapper);
  } else {
    const pickerCoverBtn = new Button({
      text: "선택자(흰색덮기)",
      variant: "success",
      size: "small",
      onClick: handlePickerCoverClick,
    });

    const pickerHideBtn = new Button({
      text: "선택자(영역제거)",
      variant: "success",
      size: "small",
      onClick: handlePickerHideClick,
    });

    const urlBlockBtn = new Button({
      text: "광고링크추가",
      variant: "warning",
      size: "small",
      onClick: handleUrlBlockClick,
    });

    const styleInjectBtn = new Button({
      text: "스타일주입",
      variant: "danger",
      size: "small",
      onClick: handleStyleInjectClick,
    });
    if (styleInjectBtn && styleInjectBtn.element) {
      styleInjectBtn.element.style.backgroundColor = '#f38ba8';
      styleInjectBtn.element.style.color = '#11111b';
      styleInjectBtn.element.style.fontWeight = '600';
      styleInjectBtn.element.style.borderColor = '#f38ba8';
    }

    const deleteListBtn = new Button({
      text: "차단항목삭제",
      variant: "danger",
      size: "small",
      onClick: handleDeleteListClick,
    });

    const blacklistBtn = new Button({
      text: "블랙리스트추가",
      variant: "danger",
      size: "small",
      onClick: handleBlacklistClick,
    });

    pickerCoverBtn.appendTo(menuWrapper);
    pickerHideBtn.appendTo(menuWrapper);
    urlBlockBtn.appendTo(menuWrapper);
    styleInjectBtn.appendTo(menuWrapper);
    deleteListBtn.appendTo(menuWrapper);
    blacklistBtn.appendTo(menuWrapper);
    gistConfigBtn.appendTo(menuWrapper);
  }

  groups.appendChild(menuWrapper);
  groups.appendChild(fabToggle);
  
  if (document.body) {
    document.body.appendChild(groups);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      if (document.body && !document.getElementById("adblock-ui-group")) {
        document.body.appendChild(groups);
      }
    });
  }
}

function clipboardEventListener({ handleClick }) {
  // 초기 실행 시 혹은 값이 없을 때 빈 문자열로 설정
  let lastContent = GM_getValue("lastClipboardContent", "");

  async function checkClipboardOnFocus() {
    try {
      // 1. 현재 클립보드 읽기
      const currentClipboard = await navigator.clipboard.readText();
      
      // 2. 저장된 마지막 내용 불러오기 (다른 탭에서 업데이트했을 수 있으므로 다시 읽음)
      lastContent = GM_getValue("lastClipboardContent", "");

      // 3. 내용이 있고, 이전과 다를 때만 실행
      if (currentClipboard && currentClipboard !== lastContent) {
        console.log(
          "%c[감지] 클립보드 내용이 변경되었습니다 (저장소 동기화):",
          "color: #00ff00; font-weight: bold;",
        );
        console.log(currentClipboard);

        // 4. 새로운 내용을 저장소에 즉시 기록 (다른 탭/페이지에서도 인식하도록)
        GM_setValue("lastClipboardContent", currentClipboard);
        
        // 5. 콜백 실행 (prompt 띄우기 등)
        handleClick();
      }
    } catch (err) {
      // 권한 거부(최초 1회 허용 필요)나 포커스 문제 발생 시 무시
    }
  }

  // 브라우저 창/탭으로 포커스가 돌아올 때 체크
  // window.addEventListener("focus", () => {
  //   setTimeout(checkClipboardOnFocus, 150); // 포커스 전환 안정화를 위해 약간의 지연시간 추가
  // });
}

// --- 전역 헬퍼 및 극초기 주입 로직 ---

// 0. URL / Location 객체 uri.match(...) 예외 방지 Polyfill 및 alert 방어
// 0. 메인 월드(unsafeWindow & Page Context)에 URL/Location uri.match Polyfill 및 alert/error 방어 스크립트 주입
(function initPolyfills() {
  const polyfillCode = `(function() {
    try {
      if (typeof URL !== "undefined" && !URL.prototype.match) {
        URL.prototype.match = function (regExp) {
          return (this.href || this.toString()).match(regExp);
        };
      }
      if (typeof Location !== "undefined" && !Location.prototype.match) {
        Location.prototype.match = function (regExp) {
          return (this.href || this.toString()).match(regExp);
        };
      }
      if (typeof window !== "undefined" && window.alert) {
        const origAlert = window.alert;
        window.alert = function (msg) {
          const strMsg = String(msg || "");
          if (strMsg.includes("uri.match") || strMsg.includes("indexOf is not a function") || strMsg.includes("setting 'textarea'") || strMsg.includes("setting textarea")) {
            console.warn("[Dynamic Ad Blocker] Suppressed site error alert:", msg);
            return;
          }
          return origAlert.apply(this, arguments);
        };
      }
      window.addEventListener('error', function(e) {
        const errStr = String(e && (e.message || e.error) || "");
        if (errStr.includes("uri.match") || errStr.includes("indexOf is not a function") || errStr.includes("setting 'textarea'") || errStr.includes("setting textarea")) {
          console.warn("[Dynamic Ad Blocker] Suppressed uncaught site error:", e);
          e.preventDefault && e.preventDefault();
          e.stopPropagation && e.stopPropagation();
          return true;
        }
      }, true);
    } catch (err) {}
  })();`;

  // 1. unsafeWindow 직접 조작 (Tampermonkey)
  try {
    const targetWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    if (targetWin.URL && !targetWin.URL.prototype.match) {
      targetWin.URL.prototype.match = function (regExp) {
        return (this.href || this.toString()).match(regExp);
      };
    }
    if (targetWin.Location && !targetWin.Location.prototype.match) {
      targetWin.Location.prototype.match = function (regExp) {
        return (this.href || this.toString()).match(regExp);
      };
    }
    if (targetWin.alert) {
      const origAlert = targetWin.alert;
      targetWin.alert = function (msg) {
        const strMsg = String(msg || "");
        if (strMsg.includes("uri.match") || strMsg.includes("indexOf is not a function") || strMsg.includes("setting 'textarea'") || strMsg.includes("setting textarea")) {
          console.warn("[Dynamic Ad Blocker] Suppressed site alert via unsafeWindow:", msg);
          return;
        }
        return origAlert.apply(this, arguments);
      };
    }
  } catch (e) {}

  // 2. Main World(페이지 컨텍스트) DOM <script> 주입
  const inject = () => {
    try {
      const script = document.createElement("script");
      script.textContent = polyfillCode;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (e) {}
  };

  if (document.documentElement || document.head) {
    inject();
  } else {
    document.addEventListener("DOMContentLoaded", inject, { once: true });
  }
})();

function isMatch(ruleStr, targetStr) {
  if (!ruleStr || !targetStr) return false;
  const cleanRule = ruleStr.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").trim().toLowerCase();
  const cleanTarget = targetStr.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").trim().toLowerCase();

  if (cleanRule === cleanTarget) {
    return true;
  }

  if (cleanRule.includes("*")) {
    // . + ? ^ $ { } ( ) | [ ] \ 등 정규식 특수문자 이스케이프 (* 제외)
    const escaped = cleanRule.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    // 와일드카드 * 를 .* 로 치환
    const wildcardRegexStr = escaped.replace(/\*/g, ".*");
    const regexStr = "(^|\\.)" + wildcardRegexStr + "$";
    try {
      const regex = new RegExp(regexStr);
      return regex.test(cleanTarget);
    } catch (e) {
      return false;
    }
  }

  return cleanTarget.endsWith("." + cleanRule) || cleanRule.endsWith("." + cleanTarget);
}

function getWildcardDomain(domainOrUrl) {
  if (!domainOrUrl) return domainOrUrl;
  try {
    if (domainOrUrl.startsWith("http://") || domainOrUrl.startsWith("https://")) {
      const url = new URL(domainOrUrl);
      const cleanHost = url.hostname.replace(/^www\./, "");
      const wildcardHost = cleanHost.replace(/\d+/g, "*");
      return `${url.protocol}//${wildcardHost}`;
    }
  } catch (e) {}
  const clean = domainOrUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  return clean.replace(/\d+/g, "*");
}

function hasNumericDomain(domainOrUrl) {
  if (!domainOrUrl) return false;
  try {
    if (domainOrUrl.startsWith("http://") || domainOrUrl.startsWith("https://")) {
      const url = new URL(domainOrUrl);
      return /\d+/.test(url.hostname);
    }
  } catch (e) {}
  return /\d+/.test(domainOrUrl);
}

function getUniqueSelector(el) {
  if (!el || el.nodeType !== 1) return '';
  
  if (el.id && typeof el.id === 'string' && el.id.trim() !== '') {
    const cleanId = el.id.trim();
    // 동적 난수 ID 패턴 감지 (예: bd_486616_10226213971, ad_box_98123)
    const matchDynamic = cleanId.match(/^([a-zA-Z_]+)[0-9_\-]+$/);
    if (matchDynamic && matchDynamic[1] && matchDynamic[1].length >= 2) {
      return `[id^="${matchDynamic[1]}"]`;
    }
    return '#' + CSS.escape(cleanId);
  }
  
  let selector = el.tagName.toLowerCase();
  if (el.className && typeof el.className === 'string') {
    const classes = Array.from(el.classList)
      .filter(c => c && typeof c === 'string' && c !== 'adblock-picker-overlay')
      .map(c => CSS.escape(c.trim()))
      .join('.');
    if (classes) {
      selector += '.' + classes;
    }
  }
  
  const parent = el.parentElement;
  if (parent && parent.tagName && parent.tagName.toLowerCase() !== 'html' && parent.tagName.toLowerCase() !== 'body') {
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(el) + 1;
    selector += `:nth-child(${index})`;
    
    const parentSelector = getUniqueSelector(parent);
    if (parentSelector) {
      return parentSelector + ' > ' + selector;
    }
  }
  
  return selector;
}

function generateCandidateSelectors(el) {
  if (!el || el.nodeType !== 1) return [];

  const candidates = [];

  // 1. 스마트 기본 선택자
  const primary = getUniqueSelector(el);
  if (primary) candidates.push(primary);

  const tagName = el.tagName.toLowerCase();

  // 2. 속성 / 데이터(Data) / 커스텀 속성 검사
  if (el.attributes) {
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      const name = attr.name.toLowerCase();
      const val = attr.value.trim();

      if (name === "style" || name === "class" || name.startsWith("on")) continue;

      if (name.startsWith("data-") || name.startsWith("aria-") || ["role", "name", "type", "id", "src", "href"].includes(name) || name.includes("-")) {
        if (val) {
          if (val.length < 50) {
            candidates.push(`[${name}="${CSS.escape(val)}"]`);
            candidates.push(`${tagName}[${name}="${CSS.escape(val)}"]`);
          } else {
            candidates.push(`[${name}]`);
          }
        } else {
          candidates.push(`[${name}]`);
        }
      }
    }
  }

  // 3. ID 및 클래스 기반
  if (el.id && typeof el.id === 'string' && el.id.trim()) {
    const cleanId = el.id.trim();
    candidates.push('#' + CSS.escape(cleanId));
    candidates.push(`${tagName}#${CSS.escape(cleanId)}`);
  }

  if (el.className && typeof el.className === 'string') {
    const classList = Array.from(el.classList).filter(c => c && c !== 'adblock-picker-overlay');
    if (classList.length > 0) {
      const fullClass = classList.map(c => CSS.escape(c.trim())).join('.');
      candidates.push('.' + fullClass);
      candidates.push(`${tagName}.${fullClass}`);

      classList.forEach(c => {
        if (c.trim().length >= 2) {
          candidates.push('.' + CSS.escape(c.trim()));
          candidates.push(`${tagName}.${CSS.escape(c.trim())}`);
        }
      });
    }
  }

  // 4. 부모 계층과의 조합 (Parent Combination)
  const parent = el.parentElement;
  if (parent && parent.tagName && !['html', 'body'].includes(parent.tagName.toLowerCase())) {
    const parentTag = parent.tagName.toLowerCase();
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(el) + 1;

    let parentSel = '';
    if (parent.id) {
      parentSel = '#' + CSS.escape(parent.id.trim());
    } else if (parent.classList && parent.classList.length > 0) {
      const pClass = Array.from(parent.classList).filter(c => c && c !== 'adblock-picker-overlay')[0];
      if (pClass) parentSel = `${parentTag}.${CSS.escape(pClass)}`;
    } else {
      parentSel = parentTag;
    }

    if (parentSel) {
      if (el.classList && el.classList.length > 0) {
        const firstClass = Array.from(el.classList).filter(c => c && c !== 'adblock-picker-overlay')[0];
        if (firstClass) candidates.push(`${parentSel} > ${tagName}.${CSS.escape(firstClass)}`);
      }
      candidates.push(`${parentSel} > ${tagName}:nth-child(${index})`);
    }
  }

  // 5. 단순 태그명
  candidates.push(tagName);

  return Array.from(new Set(candidates)).filter(s => s && s.trim().length > 0);
}

function extractAllResourceUrls(el) {
  const urls = [];
  const currentHost = window.location.hostname;

  function addUrl(str) {
    if (!str || typeof str !== 'string') return;
    if (!str.startsWith('http')) return;
    try {
      const url = new URL(str);
      if (url.protocol === 'data:') return;
      
      const host = url.hostname.toLowerCase();
      const cleanCurrentHost = currentHost.toLowerCase();
      if (host === cleanCurrentHost || host.endsWith('.' + cleanCurrentHost) || cleanCurrentHost.endsWith('.' + host)) {
        return;
      }
      
      urls.push(url.href);
    } catch (e) {}
  }

  function traverse(node) {
    if (!node) return;

    if (node.src) addUrl(node.src);
    if (node.href) addUrl(node.href);
    
    if (node.attributes) {
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        if (attr.value && attr.value.includes('http')) {
          addUrl(attr.value);
          const matches = attr.value.match(/https?:\/\/[^\s"'()]+/g);
          if (matches) {
            matches.forEach(m => addUrl(decodeURIComponent(m)));
          }
        }
      }
    }
    
    if (node.style && node.style.backgroundImage) {
      const match = node.style.backgroundImage.match(/url\((['"]?)(.*?)\1\)/);
      if (match && match[2]) addUrl(match[2]);
    }
    
    if (node.nodeType === 1) {
      const computedBg = window.getComputedStyle(node).backgroundImage;
      if (computedBg && computedBg !== 'none') {
        const match = computedBg.match(/url\((['"]?)(.*?)\1\)/);
        if (match && match[2]) addUrl(match[2]);
      }
    }

    if (node.tagName && node.tagName.toLowerCase() === 'iframe') {
      try {
        const doc = node.contentDocument || node.contentWindow.document;
        if (doc) {
          traverse(doc.body || doc.documentElement);
        }
      } catch (e) {}
    }

    if (node.children && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        traverse(node.children[i]);
      }
    }
  }

  if (!el) return [];

  let ancestor = el;
  while (ancestor && ancestor.tagName && ancestor.tagName.toLowerCase() !== 'body') {
    if (ancestor.src) addUrl(ancestor.src);
    if (ancestor.href) addUrl(ancestor.href);
    ancestor = ancestor.parentElement;
  }

  traverse(el);

  return Array.from(new Set(urls));
}

function buildUrlPattern(urlStr) {
  if (!urlStr) return '';
  try {
    const url = new URL(urlStr);
    const host = url.hostname;
    if (url.protocol === 'data:') return '';
    return `*://${host}/*`;
  } catch (e) {
    return urlStr;
  }
}

let isPickerActive = false;
let currentHoveredElement = null;
let pickerOverlayElement = null;

function startElementPicker(onSelect) {
  if (isPickerActive) return;
  isPickerActive = true;

  Toast.show('가릴 광고 영역을 클릭하세요. (취소: ESC)');

  // 1. iframe 마우스 이벤트 무력화 스타일 주입
  const iframeDisableStyle = document.createElement("style");
  iframeDisableStyle.id = "adblock-iframe-disable-style";
  iframeDisableStyle.innerHTML = "iframe { pointer-events: none !important; }";
  (document.head || document.documentElement).appendChild(iframeDisableStyle);

  // 2. 오버레이 엘리먼트 생성
  pickerOverlayElement = document.createElement("div");
  pickerOverlayElement.id = "adblock-picker-overlay";
  pickerOverlayElement.style.position = "absolute";
  pickerOverlayElement.style.pointerEvents = "none"; // 마우스 이벤트 통과
  pickerOverlayElement.style.zIndex = "1000000"; // 매우 높은 z-index
  pickerOverlayElement.style.border = "3px dashed orange"; // 테두리 1.3배 두껍게 (3px)
  pickerOverlayElement.style.backgroundColor = "rgba(255, 152, 0, 0.2)"; // 반투명 주황색 배경
  pickerOverlayElement.style.display = "none";
  pickerOverlayElement.style.boxSizing = "border-box";
  document.body.appendChild(pickerOverlayElement);

  const onMouseMove = (e) => {
    if (!isPickerActive) return;
    
    // UI 그룹과 그 하위 요소는 무시
    const uiGroup = document.getElementById("adblock-ui-group");
    if (uiGroup && (uiGroup === e.target || uiGroup.contains(e.target))) {
      if (pickerOverlayElement) {
        pickerOverlayElement.style.display = "none";
      }
      currentHoveredElement = null;
      return;
    }

    if (currentHoveredElement === e.target) return;

    currentHoveredElement = e.target;
    
    // 바운딩 박스를 계산하여 오버레이 위치 조절
    const rect = currentHoveredElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    pickerOverlayElement.style.width = rect.width + "px";
    pickerOverlayElement.style.height = rect.height + "px";
    pickerOverlayElement.style.top = (rect.top + scrollTop) + "px";
    pickerOverlayElement.style.left = (rect.left + scrollLeft) + "px";
    pickerOverlayElement.style.display = "block";
  };

  const onClick = (e) => {
    if (!isPickerActive) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const uiGroup = document.getElementById("adblock-ui-group");
    if (uiGroup && (uiGroup === e.target || uiGroup.contains(e.target))) {
      stopPicker();
      return;
    }

    const selectedElement = currentHoveredElement || e.target;
    stopPicker();

    if (selectedElement) {
      const selector = getUniqueSelector(selectedElement);
      if (selector) {
        onSelect(selector, selectedElement);
      }
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      stopPicker();
      Toast.show('선택 모드가 취소되었습니다.');
    }
  };

  const preventAll = (e) => {
    if (!isPickerActive) return;
    
    // 마우스 우클릭(e.button === 2) 또는 contextmenu 이벤트 발생 시 피커 즉시 취소
    if (e.button === 2 || e.type === 'contextmenu') {
      stopPicker();
      Toast.show('선택 모드가 취소되었습니다.');
    }

    const uiGroup = document.getElementById("adblock-ui-group");
    if (uiGroup && (uiGroup === e.target || uiGroup.contains(e.target))) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  };

  const stopPicker = () => {
    isPickerActive = false;
    
    // iframe 무력화 스타일 제거
    const iframeStyle = document.getElementById("adblock-iframe-disable-style");
    if (iframeStyle) {
      iframeStyle.remove();
    }

    if (pickerOverlayElement) {
      pickerOverlayElement.remove();
      pickerOverlayElement = null;
    }
    currentHoveredElement = null;
    
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("contextmenu", preventAll, true); // contextmenu 해제 추가
    
    document.removeEventListener("mousedown", preventAll, true);
    document.removeEventListener("mouseup", preventAll, true);
    document.removeEventListener("pointerdown", preventAll, true);
    document.removeEventListener("pointerup", preventAll, true);
  };

  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("contextmenu", preventAll, true); // contextmenu 등록 추가
  
  document.addEventListener("mousedown", preventAll, true);
  document.addEventListener("mouseup", preventAll, true);
  document.addEventListener("pointerdown", preventAll, true);
  document.addEventListener("pointerup", preventAll, true);
}

let adblockStyleElement = null;
let adblockObserver = null;

function normalizeWildcardSelector(selector) {
  if (!selector || typeof selector !== 'string') return selector;
  // #prefix_* 또는 #prefix* 형태를 [id^="prefix"] 형태로 자동 변환
  return selector.replace(/#([a-zA-Z0-9_\-]+)\*/g, (match, prefix) => {
    return `[id^="${prefix}"]`;
  });
}

function extractStringSelectors(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    if (!item) return '';
    let str = '';
    if (typeof item === 'string') {
      str = item;
    } else if (typeof item === 'object') {
      str = item.selector || item.pattern || item.value || item.text || '';
    }
    return normalizeWildcardSelector(str.trim());
  }).filter(Boolean);
}

function deduplicateRuleList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const result = [];

  list.forEach(item => {
    if (!item) return;
    const textKey = typeof item === 'string' ? item.trim() : ((item.selector || item.pattern || item.value || item.text || '').trim());
    if (textKey && !seen.has(textKey)) {
      seen.add(textKey);
      result.push(item);
    }
  });
  return result;
}

function parseRuleItem(item) {
  if (!item) return { text: "", createdAt: null };
  if (typeof item === "string") {
    return { text: item, createdAt: null };
  }
  return {
    text: item.selector || item.pattern || item.value || "",
    createdAt: item.createdAt || null,
  };
}

function formatShortDate(timestampOrIso) {
  if (!timestampOrIso) return "";
  const d = new Date(timestampOrIso);
  if (isNaN(d.getTime())) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${month}.${day} ${hours}:${minutes}`;
}

function applyAdblockRulesSync(coverSelectors = [], displayNoneSelectors = [], customStyleList = []) {
  coverSelectors = extractStringSelectors(coverSelectors);
  displayNoneSelectors = extractStringSelectors(displayNoneSelectors);

  let cssString = "";

  if (coverSelectors && coverSelectors.length > 0) {
    const baseRules = coverSelectors.join(", ") + " { position: relative !important; overflow: hidden !important; }";
    const overlayRules = coverSelectors.map(s => `${s}::after`).join(", ") + 
      " { content: '' !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; background-color: white !important; z-index: 99999 !important; pointer-events: auto !important; }";
    cssString += `${baseRules}\n${overlayRules}\n`;
  }

  if (displayNoneSelectors && displayNoneSelectors.length > 0) {
    const hideRules = displayNoneSelectors.join(", ") + " { display: none !important; }";
    cssString += `${hideRules}\n`;
  }

  if (customStyleList && customStyleList.length > 0) {
    customStyleList.forEach(item => {
      if (!item) return;
      const sel = typeof item === 'string' ? item : item.selector;
      const style = typeof item === 'string' ? '' : item.style;
      if (sel && style) {
        const normSel = normalizeWildcardSelector(sel);
        cssString += `${normSel} { ${style} }\n`;
      }
    });
  }

  if (!cssString) {
    if (adblockStyleElement) {
      adblockStyleElement.textContent = "";
    }
    return;
  }

  if (adblockStyleElement) {
    adblockStyleElement.textContent = cssString;
  } else {
    adblockStyleElement = document.createElement("style");
    adblockStyleElement.type = "text/css";
    adblockStyleElement.id = "dynamic-ad-blocker-style";
    adblockStyleElement.appendChild(document.createTextNode(cssString));

    const inject = () => {
      if (document.documentElement) {
        document.documentElement.appendChild(adblockStyleElement);
      } else {
        setTimeout(inject, 1);
      }
    };
    inject();
  }

  // 즉시 DOM 요소에 인라인 스타일 및 물리적 숨김 강제 적용
  const applyDirectStyles = () => {
    const cleanCover = extractStringSelectors(coverSelectors);
    const cleanHide = extractStringSelectors(displayNoneSelectors);

    if (cleanHide && cleanHide.length > 0) {
      cleanHide.forEach((sel) => {
        try {
          document.querySelectorAll(sel).forEach((el) => {
            el.style.setProperty("display", "none", "important");
            el.style.setProperty("visibility", "hidden", "important");
            el.style.setProperty("height", "0", "important");
            el.style.setProperty("min-height", "0", "important");
            el.style.setProperty("margin", "0", "important");
            el.style.setProperty("padding", "0", "important");
          });
        } catch (e) {}
      });
    }
    if (cleanCover && cleanCover.length > 0) {
      cleanCover.forEach((sel) => {
        try {
          document.querySelectorAll(sel).forEach((el) => {
            el.style.setProperty("position", "relative", "important");
            el.style.setProperty("overflow", "hidden", "important");
          });
        } catch (e) {}
      });
    }
  };

  applyDirectStyles();

  if (window.top === window.self) {
    console.log(
      `[Dynamic Ad Blocker] 적용된 광고 셀렉터 (흰색 덮기: ${coverSelectors.length}, 영역 제거: ${displayNoneSelectors.length})`,
    );
  }

  if (adblockObserver) {
    adblockObserver.disconnect();
  }

  adblockObserver = new MutationObserver(() => {
    applyDirectStyles();
  });

  const startObserver = () => {
    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      adblockObserver.observe(targetNode, {
        childList: true,
        subtree: true,
      });
    } else {
      setTimeout(startObserver, 10);
    }
  };
  startObserver();
}

function applyAdblockRules(coverSelectors = [], displayNoneSelectors = [], customStyleList = []) {
  applyAdblockRulesSync(coverSelectors, displayNoneSelectors, customStyleList);
}

// 1. GM_webRequest를 이용한 네트워크 수준 사전 차단
if (typeof GM_webRequest !== 'undefined') {
  const defaultBlockedUrls = [
    '*://*.googlesyndication.com/*',
    '*://*.doubleclick.net/*',
    '*://*.googletagservices.com/*',
    '*://*.google-analytics.com/*',
    '*://*.popads.net/*',
    '*://*.exoclick.com/*',
    '*://*.a-ads.com/*'
  ];

  // 로컬 캐시에서 사용자가 등록한 차단 패턴들을 수집
  const localRules = GM_getValue("cachedRules", []);
  const customBlockedUrls = [];
  localRules.forEach(rule => {
    if (rule.blockedUrlPatterns && Array.isArray(rule.blockedUrlPatterns)) {
      rule.blockedUrlPatterns.forEach(pattern => {
        if (pattern && typeof pattern === 'string') {
          customBlockedUrls.push(pattern);
        }
      });
    }
  });

  // 중복 제거 및 최종 패턴 구성
  const allBlockedPatterns = Array.from(new Set([...defaultBlockedUrls, ...customBlockedUrls]));
  
  const webRequestRules = allBlockedPatterns.map(pattern => ({
    selector: pattern,
    action: 'cancel'
  }));

  GM_webRequest(webRequestRules, function(info) {
    console.log(`[Dynamic Ad Blocker] Blocked request: ${info.url}`);
  });
}

// 2. 동기적 극초기 적용 (캐시 로드 - 매칭되는 모든 규칙 수집)
const currentHost = window.location.hostname;
const cachedBlackList = GM_getValue("cachedBlackList", []);
const isBlacklisted = cachedBlackList.includes(window.location.origin);

let rulesArray = GM_getValue("cachedRules", []);

if (!isBlacklisted && window.top === window.self) {
  let combinedCover = [];
  let combinedHide = [];
  let combinedStyle = [];

  rulesArray.forEach((v) => {
    const ruleHost = (v.host || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (isMatch(ruleHost, currentHost)) {
      if (v.selectorList) combinedCover.push(...v.selectorList);
      if (v.displayNoneSelectorList) combinedHide.push(...v.displayNoneSelectorList);
      if (v.customStyleList) combinedStyle.push(...v.customStyleList);
    }
  });

  if (combinedCover.length > 0 || combinedHide.length > 0 || combinedStyle.length > 0) {
    applyAdblockRulesSync(combinedCover, combinedHide, combinedStyle);
    console.log(`[Dynamic Ad Blocker] 극초기 캐시 적용 완료 (흰색덮기: ${combinedCover.length}, 영역제거: ${combinedHide.length})`);
  }
}

// 3. 자바스크립트 API 및 DOM 런타임 프록시 차단 (이중 방어선)
const blockDomains = [];
const defaultDomains = [
  'googlesyndication.com',
  'doubleclick.net',
  'googletagservices.com',
  'google-analytics.com',
  'popads.net',
  'exoclick.com',
  'a-ads.com'
];
blockDomains.push(...defaultDomains);

rulesArray.forEach(rule => {
  if (rule.blockedUrlPatterns && Array.isArray(rule.blockedUrlPatterns)) {
    rule.blockedUrlPatterns.forEach(pattern => {
      if (pattern && typeof pattern === 'string') {
        const domain = pattern
          .replace(/^\*:\/\/\*\./, '')
          .replace(/^\*:\/\//, '')
          .split('/')[0];
        if (domain) {
          blockDomains.push(domain);
        }
      }
    });
  }
});

const uniqueBlockDomains = Array.from(new Set(blockDomains));

if (window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
    if (url && uniqueBlockDomains.some(domain => url.includes(domain))) {
      console.log(`[Dynamic Ad Blocker] Blocked fetch request: ${url}`);
      return Promise.reject(new TypeError('Failed to fetch (Ad Blocked by Proxy)'));
    }
    return originalFetch.apply(this, arguments);
  };
}

const originalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url) {
  if (url && typeof url === 'string' && uniqueBlockDomains.some(domain => url.includes(domain))) {
    console.log(`[Dynamic Ad Blocker] Blocked XHR request: ${url}`);
    this.abort();
    return;
  }
  return originalXHROpen.apply(this, arguments);
};

// Element.prototype.setAttribute 안전 차단
if (typeof Element !== 'undefined' && Element.prototype && Element.prototype.setAttribute) {
  const origSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if (name && typeof name === 'string' && name.toLowerCase() === 'src') {
      const strVal = typeof value === 'string' ? value : String(value || '');
      if (strVal && uniqueBlockDomains.some(domain => strVal.includes(domain))) {
        console.log(`[Dynamic Ad Blocker] Blocked setAttribute(src): ${strVal}`);
        return;
      }
    }
    return origSetAttribute.apply(this, arguments);
  };
}

// HTMLScriptElement, HTMLImageElement, HTMLIFrameElement prototype.src 안전 훅
function hookElementSrc(elementClass) {
  if (typeof elementClass === 'undefined' || !elementClass || !elementClass.prototype) return;
  const desc = Object.getOwnPropertyDescriptor(elementClass.prototype, 'src');
  if (!desc || !desc.set || !desc.get) return;

  Object.defineProperty(elementClass.prototype, 'src', {
    get: function() {
      try {
        const val = desc.get.call(this);
        return typeof val === 'string' ? val : String(val || '');
      } catch (e) {
        return '';
      }
    },
    set: function(val) {
      const strVal = typeof val === 'string' ? val : String(val || '');
      if (strVal && uniqueBlockDomains.some(domain => strVal.includes(domain))) {
        console.log(`[Dynamic Ad Blocker] Blocked prototype setter(src): ${strVal}`);
        return;
      }
      try {
        return desc.set.call(this, val);
      } catch (e) {}
    },
    configurable: true,
    enumerable: desc.enumerable
  });
}

try {
  if (typeof HTMLScriptElement !== 'undefined') hookElementSrc(HTMLScriptElement);
  if (typeof HTMLImageElement !== 'undefined') hookElementSrc(HTMLImageElement);
  if (typeof HTMLIFrameElement !== 'undefined') hookElementSrc(HTMLIFrameElement);
} catch (e) {}

// (4) HTML 파서에 의해 삽입되는 정적 리소스 태그 관찰 차단 (MutationObserver)
const domObserver = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase();
        if (tag === 'script' || tag === 'iframe' || tag === 'img') {
          const src = node.src || node.getAttribute('src');
          if (src && typeof src === 'string' && uniqueBlockDomains.some(domain => src.includes(domain))) {
            console.log(`[Dynamic Ad Blocker] Blocked static node via Observer: <${tag} src="${src}">`);
            node.removeAttribute('src');
            node.remove();
          }
        }
        
        const subResources = node.querySelectorAll('script, iframe, img');
        subResources.forEach(sub => {
          const src = sub.src || sub.getAttribute('src');
          if (src && typeof src === 'string' && uniqueBlockDomains.some(domain => src.includes(domain))) {
            console.log(`[Dynamic Ad Blocker] Blocked static subnode via Observer: <${sub.tagName} src="${src}">`);
            sub.removeAttribute('src');
            sub.remove();
          }
        });
      }
    });
  });
});

const startDomObserver = () => {
  const target = document.body || document.documentElement;
  if (target) {
    domObserver.observe(target, {
      childList: true,
      subtree: true
    });
  } else {
    setTimeout(startDomObserver, 10);
  }
};
startDomObserver();

async function main() {
  if (window.top !== window.self) return;

  const gistConfig = getGistConfig();

  if (gistConfig.gistId && gistConfig.token) {
    try {
      const blackListGist = useGist(
        gistConfig.gistId, 
        gistConfig.token,
        gistConfig.blackListFileName || "ad_selector_blacklist.json",
      );
      
      const blackList = await blackListGist.get() || [];
      GM_setValue("cachedBlackList", blackList);

      if (blackList.includes(window.location.origin)) {
        applyAdblockRules([]);
        
        // 하루 동안 미노출 캐시 만료 검사
        const hideUntil = GM_getValue("hideReleaseUntil_" + window.location.origin, 0);
        if (Date.now() < hideUntil) {
          return;
        }

        makeButtonGroups({
          handleBlacklistClick: handleBlacklistReleaseClick,
          handleHideReleaseClick: handleHideReleaseForADay,
          handleGistConfigClick: () => showGistConfigModal(),
          isBlacklisted: true
        });
        return;
      }
    } catch (e) {
      console.error("[Dynamic Ad Blocker] 블랙리스트 로드 실패:", e);
    }
  }

  let freshRulesArray = [];
  if (gistConfig.gistId && gistConfig.token) {
    try {
      const { get } = useGist(
        gistConfig.gistId,
        gistConfig.token,
        gistConfig.fileName || "ad_selector_list.json",
      );
      freshRulesArray = (await get()) || [];
    } catch (e) {
      console.error("[Dynamic Ad Blocker] Gist 룰 로드 실패:", e);
    }
  }
  // Gist 룰과 로컬 캐시 룰 병합하여 방금 추가된 로컬 와일드카드 규칙이 덮어씌워져 손실되는 현상 방지
  const localCachedRules = GM_getValue("cachedRules", []);
  const ruleMap = new Map();
  freshRulesArray.forEach(r => {
    if (r && r.host) {
      r.selectorList = deduplicateRuleList(r.selectorList);
      r.displayNoneSelectorList = deduplicateRuleList(r.displayNoneSelectorList);
      r.customStyleList = deduplicateRuleList(r.customStyleList);
      ruleMap.set(r.host, r);
    }
  });
  localCachedRules.forEach(r => {
    if (r && r.host) {
      if (!ruleMap.has(r.host)) {
        r.selectorList = deduplicateRuleList(r.selectorList);
        r.displayNoneSelectorList = deduplicateRuleList(r.displayNoneSelectorList);
        r.customStyleList = deduplicateRuleList(r.customStyleList);
        ruleMap.set(r.host, r);
      } else {
        // 기존 항목이 있으면 선택자 목록 통합 후 중복 제거
        const existing = ruleMap.get(r.host);
        if (r.selectorList) {
          existing.selectorList = deduplicateRuleList([...(existing.selectorList || []), ...r.selectorList]);
        }
        if (r.displayNoneSelectorList) {
          existing.displayNoneSelectorList = deduplicateRuleList([...(existing.displayNoneSelectorList || []), ...r.displayNoneSelectorList]);
        }
        if (r.customStyleList) {
          existing.customStyleList = deduplicateRuleList([...(existing.customStyleList || []), ...r.customStyleList]);
        }
      }
    }
  });
  rulesArray = Array.from(ruleMap.values());
  GM_setValue("cachedRules", rulesArray);

  function checkAndApply(propsRulesArray) {
    const activeRules = propsRulesArray || rulesArray;
    let matched = false;

    console.log(`[AdBlocker Debug] checkAndApply 실행 - 현재창 Host: "${currentHost}" (URL: ${window.location.href})`);
    console.log(`[AdBlocker Debug] 전체 등록된 규칙 개수: ${activeRules.length}`);
    activeRules.forEach((r, idx) => {
      console.log(`[AdBlocker Debug] 룰 #${idx + 1} - Host: "${r.host}" (덮기: ${(r.selectorList || []).length}, 제거: ${(r.displayNoneSelectorList || []).length})`);
    });

    let combinedCover = [];
    let combinedHide = [];
    let combinedStyle = [];

    for (const rule of activeRules) {
      const ruleHost = rule.host.replace(/^https?:\/\//, "").replace(/\/$/, "");

      if (isMatch(ruleHost, currentHost)) {
        matched = true;
        if (rule.selectorList) combinedCover.push(...rule.selectorList);
        if (rule.displayNoneSelectorList) combinedHide.push(...rule.displayNoneSelectorList);
        if (rule.customStyleList) combinedStyle.push(...rule.customStyleList);
      }
    }

    if (matched) {
      console.log(
        `[AdBlocker Debug] 매칭 성공! 최종 적용 셀렉터 -> (덮기: ${combinedCover.length}, 제거: ${combinedHide.length}, 스타일: ${combinedStyle.length})`,
      );
      applyAdblockRules(combinedCover, combinedHide, combinedStyle);
    } else if (adblockStyleElement) {
      console.log(`[AdBlocker Debug] 매칭된 규칙 없음. 기존 주입 스타일 초기화.`);
      applyAdblockRules([], []);
    }
  }

  function showSelectorModal({ initialElement, initialSelector, type, onConfirm }) {
    const existingModal = document.getElementById("adblock-selector-modal");
    if (existingModal) existingModal.remove();

    let highlightContainer = document.getElementById("adblock-modal-highlight-container");
    if (!highlightContainer) {
      highlightContainer = document.createElement("div");
      highlightContainer.id = "adblock-modal-highlight-container";
      highlightContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 0;
        pointer-events: none;
        z-index: 1000000;
      `;
      document.body.appendChild(highlightContainer);
    }

    const elementStack = initialElement ? [initialElement] : [];
    let currentIndex = 0;

    function createHighlightBox(rect) {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      const box = document.createElement("div");
      box.style.cssText = `
        position: absolute;
        pointer-events: none;
        z-index: 1000000;
        border: 2px dashed #ff9800;
        background-color: rgba(255, 152, 0, 0.18);
        box-sizing: border-box;
        transition: all 0.15s ease-out;
        width: ${rect.width}px;
        height: ${rect.height}px;
        top: ${rect.top + scrollTop}px;
        left: ${rect.left + scrollLeft}px;
      `;
      return box;
    }

    function updateMultiOverlay(selectorStr, fallbackEl) {
      if (!highlightContainer) return;
      highlightContainer.innerHTML = "";

      let targetElements = [];
      const cleanSelector = selectorStr ? normalizeWildcardSelector(selectorStr.trim()) : "";

      if (cleanSelector) {
        try {
          const found = Array.from(document.querySelectorAll(cleanSelector));
          targetElements = found.filter(el => {
            if (!el || !el.getBoundingClientRect) return false;
            if (modalContainer && modalContainer.contains(el)) return false;
            if (highlightContainer.contains(el)) return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          });
        } catch (e) {}
      }

      if (targetElements.length === 0 && fallbackEl && fallbackEl.getBoundingClientRect) {
        if (document.body.contains(fallbackEl)) {
          targetElements = [fallbackEl];
        }
      }

      const renderList = targetElements.slice(0, 100);
      const frag = document.createDocumentFragment();

      renderList.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          frag.appendChild(createHighlightBox(rect));
        }
      });

      highlightContainer.appendChild(frag);
    }

    const modalContainer = document.createElement("div");
    modalContainer.id = "adblock-selector-modal";
    modalContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1000002;
      width: 400px;
      max-width: calc(100vw - 32px);
      background: #18181b;
      color: #f4f4f5;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      overflow: hidden;
      box-sizing: border-box;
    `;

    const actionName = type === 'displayNone' ? '영역 제거(display:none)' : (type === 'style' ? '스타일 주입' : '흰색 덮기');
    const isStyleType = type === 'style';

    let livePreviewStyle = document.getElementById("adblock-live-style-preview");
    if (!livePreviewStyle) {
      livePreviewStyle = document.createElement("style");
      livePreviewStyle.id = "adblock-live-style-preview";
      (document.head || document.documentElement).appendChild(livePreviewStyle);
    }

    modalContainer.innerHTML = `
      <div id="adblock-modal-resizer-left" style="position: absolute; left: 0; top: 0; width: 6px; height: 100%; cursor: ew-resize; z-index: 10;" title="드래그하여 너비 조절"></div>
      <div style="padding: 12px 16px; background: rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center; user-select: none;">
        <span style="font-weight: 600; font-size: 13px; color: #ff9800;">[${actionName}] 선택자 지정</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button id="adblock-modal-toggle-pos" style="background: none; border: none; color: #a1a1aa; font-size: 13px; cursor: pointer; padding: 2px 4px; line-height: 1;" title="상단/하단 위치 전환">⬆️</button>
          <button id="adblock-modal-maximize" style="background: none; border: none; color: #a1a1aa; font-size: 13px; cursor: pointer; padding: 2px 4px; line-height: 1;" title="높이 최대화 / 원래대로">🗖</button>
          <button id="adblock-modal-close" style="background: none; border: none; color: #a1a1aa; font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1;" title="닫기">&times;</button>
        </div>
      </div>
      <div id="adblock-modal-body-container" style="padding: 14px 16px; display: flex; flex-direction: column; flex: 1; overflow: hidden;">
        <div style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <span style="color: #a1a1aa; font-size: 12px; font-weight: 500;">요소 탐색:</span>
          <div style="display: flex; gap: 4px;">
            <button id="adblock-modal-parent-btn" style="padding: 5px 8px; background: #27272a; color: #f4f4f5; border: 1px solid #3f3f46; border-radius: 6px; font-size: 11px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 2px;" title="부모 요소로 이동">
              ▲ 부모
            </button>
            <button id="adblock-modal-child-btn" style="padding: 5px 8px; background: #27272a; color: #f4f4f5; border: 1px solid #3f3f46; border-radius: 6px; font-size: 11px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 2px;" disabled title="자식 요소로 이동">
              ▼ 자식
            </button>
            <button id="adblock-modal-prev-btn" style="padding: 5px 8px; background: #27272a; color: #f4f4f5; border: 1px solid #3f3f46; border-radius: 6px; font-size: 11px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 2px;" disabled title="이전 형제 요소로 이동">
              ◀ 이전
            </button>
            <button id="adblock-modal-next-btn" style="padding: 5px 8px; background: #27272a; color: #f4f4f5; border: 1px solid #3f3f46; border-radius: 6px; font-size: 11px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 2px;" disabled title="다음 형제 요소로 이동">
              ▶ 다음
            </button>
          </div>
        </div>
        <div id="adblock-modal-info" style="margin-bottom: 12px; padding: 6px 8px; background: #09090b; border-radius: 6px; font-size: 11px; color: #a1a1aa; font-family: monospace; border: 1px solid #27272a; height: 100px; max-height: 100px; overflow-y: auto; box-sizing: border-box; transition: flex 0.15s ease; scrollbar-width: none; -ms-overflow-style: none;">
        </div>
        <div style="margin-bottom: 10px;">
          <label style="display: block; color: #a1a1aa; font-size: 12px; margin-bottom: 4px; font-weight: 500;">선택자 (Selector):</label>
          <input type="text" id="adblock-modal-input" style="width: 100%; box-sizing: border-box; padding: 8px 10px; background: #09090b; color: #4ade80; border: 1px solid #3f3f46; border-radius: 6px; font-family: monospace; font-size: 12px; outline: none;" value="" />
        </div>
        <div style="margin-bottom: 10px;">
          <label style="display: block; color: #a1a1aa; font-size: 11px; margin-bottom: 4px; font-weight: 500;">추천 선택자 목록 (선택 시 자동 적용):</label>
          <select id="adblock-modal-candidate-select" style="width: 100%; box-sizing: border-box; padding: 7px 10px; background: #09090b; color: #4ade80; border: 1px solid #3f3f46; border-radius: 6px; font-family: monospace; font-size: 12px; outline: none; cursor: pointer; scrollbar-width: none; -ms-overflow-style: none;">
          </select>
        </div>
        ${isStyleType ? `
        <div style="margin-bottom: 14px;">
          <label style="display: block; color: #a1a1aa; font-size: 12px; margin-bottom: 4px; font-weight: 500;">주입할 CSS 스타일 (Style):</label>
          <textarea id="adblock-modal-style-input" placeholder="예: background: red !important; opacity: 0.5;" style="width: 100%; box-sizing: border-box; padding: 8px 10px; background: #09090b; color: #ffab40; border: 1px solid #3f3f46; border-radius: 6px; font-family: monospace; font-size: 12px; outline: none; height: 55px; resize: vertical;"></textarea>
        </div>
        ` : ''}
        <div style="margin-top: 10px; margin-bottom: 14px;">
          <label style="display: inline-flex; align-items: center; gap: 6px; color: #a1a1aa; font-size: 12px; cursor: pointer; user-select: none; line-height: 1;" title="도메인의 숫자 부분을 * 와일드카드로 저장하여 넘버링 도메인에 동시 적용">
            <input type="checkbox" id="adblock-modal-domain-wildcard" style="accent-color: #ff9800; cursor: pointer; flex-shrink: 0; margin: 0; vertical-align: middle;" ${hasNumericDomain(window.location.hostname) ? 'checked' : ''} />
            <span style="white-space: nowrap; display: inline-flex; align-items: center; gap: 4px; line-height: 1.2;">와일드카드 도메인 적용 <span style="color: #ffab40; font-family: monospace; font-size: 11px;">(${getWildcardDomain(window.location.hostname)})</span></span>
          </label>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button id="adblock-modal-cancel" style="padding: 6px 14px; background: #27272a; color: #d4d4d8; border: 1px solid #3f3f46; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 500; white-space: nowrap;">취소</button>
          <button id="adblock-modal-confirm" style="padding: 6px 16px; background: #ff9800; color: #09090b; font-weight: 600; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; white-space: nowrap;">확인 및 적용</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalContainer);

    const parentBtn = modalContainer.querySelector("#adblock-modal-parent-btn");
    const childBtn = modalContainer.querySelector("#adblock-modal-child-btn");
    const prevBtn = modalContainer.querySelector("#adblock-modal-prev-btn");
    const nextBtn = modalContainer.querySelector("#adblock-modal-next-btn");
    const maxBtn = modalContainer.querySelector("#adblock-modal-maximize");
    const togglePosBtn = modalContainer.querySelector("#adblock-modal-toggle-pos");
    const resizerLeft = modalContainer.querySelector("#adblock-modal-resizer-left");
    const inputEl = modalContainer.querySelector("#adblock-modal-input");
    const infoEl = modalContainer.querySelector("#adblock-modal-info");
    const confirmBtn = modalContainer.querySelector("#adblock-modal-confirm");
    const cancelBtn = modalContainer.querySelector("#adblock-modal-cancel");
    const closeBtn = modalContainer.querySelector("#adblock-modal-close");

    let isTopPos = false;
    togglePosBtn.onclick = () => {
      isTopPos = !isTopPos;
      if (isTopPos) {
        modalContainer.style.bottom = "auto";
        modalContainer.style.top = "30px";
        togglePosBtn.innerText = "⬇️";
      } else {
        modalContainer.style.top = "auto";
        modalContainer.style.bottom = "24px";
        togglePosBtn.innerText = "⬆️";
      }
    };
    const styleInput = isStyleType ? modalContainer.querySelector("#adblock-modal-style-input") : null;

    inputEl.value = initialSelector || '';

    function updateLiveStylePreview() {
      if (!isStyleType || !styleInput) return;
      const selVal = normalizeWildcardSelector(inputEl.value.trim());
      const cssText = styleInput.value.trim();

      if (selVal && cssText) {
        livePreviewStyle.textContent = `${selVal} { ${cssText} }`;
      } else {
        livePreviewStyle.textContent = '';
      }
    }

    inputEl.value = initialSelector || '';

    function createTreeItem(el, indentLevel, isCurrent, type) {
      const row = document.createElement('div');
      row.className = isCurrent ? 'adblock-tree-item adblock-tree-active' : 'adblock-tree-item';
      
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      const idStr = el.id ? `#${el.id}` : '';
      const classStr = el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
      
      row.style.cssText = `
        padding: 3px 6px;
        padding-left: ${indentLevel * 12 + 6}px;
        cursor: pointer;
        border-radius: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: background 0.1s;
        margin-bottom: 2px;
        user-select: none;
        ${isCurrent ? 'background: rgba(255, 152, 0, 0.25); color: #ffab40; font-weight: bold; border-left: 3px solid #ff9800;' : 'color: #a1a1aa;'}
      `;

      row.onmouseenter = () => {
        if (!isCurrent) row.style.background = 'rgba(255, 255, 255, 0.08)';
      };
      row.onmouseleave = () => {
        if (!isCurrent) row.style.background = 'transparent';
      };

      const icon = isCurrent ? '▶ ' : (type === 'anc' ? '▲ ' : (type === 'child' ? '└ ' : '• '));
      row.textContent = `${icon}<${tag}${idStr}${classStr}>`;
      return row;
    }

    function renderTree(curEl) {
      infoEl.innerHTML = '';
      if (!curEl) {
        infoEl.innerHTML = '<div style="color: #666; padding: 4px;">선택된 요소 없음 (수동 입력 중)</div>';
        return;
      }

      const ancestors = [];
      let parent = curEl.parentElement;
      while (parent && parent !== document.documentElement && parent !== document.body.parentNode && ancestors.length < 3) {
        ancestors.unshift(parent);
        parent = parent.parentElement;
      }

      let indent = 0;
      const frag = document.createDocumentFragment();

      ancestors.forEach((ancEl) => {
        const item = createTreeItem(ancEl, indent, false, 'anc');
        item.onclick = () => {
          let foundIdx = elementStack.indexOf(ancEl);
          if (foundIdx !== -1) {
            currentIndex = foundIdx;
          } else {
            elementStack.push(ancEl);
            currentIndex = elementStack.length - 1;
          }
          refreshUI();
        };
        frag.appendChild(item);
        indent++;
      });

      const parentEl = curEl.parentElement;
      const siblings = parentEl ? Array.from(parentEl.children) : [curEl];

      siblings.forEach((sibEl) => {
        const isCurrent = (sibEl === curEl);
        const item = createTreeItem(sibEl, indent, isCurrent, isCurrent ? 'cur' : 'sib');
        item.onclick = () => {
          if (!isCurrent) {
            elementStack[currentIndex] = sibEl;
            refreshUI();
          }
        };
        frag.appendChild(item);

        if (isCurrent && curEl.children && curEl.children.length > 0) {
          const children = Array.from(curEl.children).slice(0, 5);
          children.forEach((childEl) => {
            const childItem = createTreeItem(childEl, indent + 1, false, 'child');
            childItem.onclick = () => {
              if (currentIndex < elementStack.length - 1) {
                elementStack.splice(currentIndex + 1);
              }
              elementStack.push(childEl);
              currentIndex++;
              refreshUI();
            };
            frag.appendChild(childItem);
          });
          if (curEl.children.length > 5) {
            const moreEl = document.createElement('div');
            moreEl.style.paddingLeft = `${(indent + 1) * 12 + 6}px`;
            moreEl.style.color = '#666';
            moreEl.style.fontSize = '10px';
            moreEl.style.paddingTop = '2px';
            moreEl.textContent = `... 외 ${curEl.children.length - 5}개 자식`;
            frag.appendChild(moreEl);
          }
        }
      });

      infoEl.appendChild(frag);

      const activeItem = infoEl.querySelector('.adblock-tree-active');
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }

    function renderCandidateSelect(targetElement) {
      const selectEl = modalContainer.querySelector("#adblock-modal-candidate-select");
      if (!selectEl) return;
      selectEl.innerHTML = "";

      if (!targetElement) {
        const opt = document.createElement("option");
        opt.textContent = "선택된 요소 없음";
        opt.disabled = true;
        selectEl.appendChild(opt);
        return;
      }

      const candidateList = generateCandidateSelectors(targetElement);
      if (candidateList.length === 0) {
        const opt = document.createElement("option");
        opt.textContent = "추천 선택자 없음";
        opt.disabled = true;
        selectEl.appendChild(opt);
        return;
      }

      const curInputValue = inputEl.value.trim();

      candidateList.forEach(sel => {
        const opt = document.createElement("option");
        opt.value = sel;
        opt.textContent = sel;
        if (sel === curInputValue) {
          opt.selected = true;
        }
        selectEl.appendChild(opt);
      });

      selectEl.onchange = () => {
        const chosenVal = selectEl.value;
        if (chosenVal) {
          inputEl.value = chosenVal;
          const curEl = elementStack[currentIndex];
          updateMultiOverlay(chosenVal, curEl);
          updateLiveStylePreview();
          Toast.show(`선택자 적용: ${chosenVal}`);
        }
      };
    }

    function refreshUI() {
      const curEl = elementStack[currentIndex];
      if (curEl) {
        const sel = getUniqueSelector(curEl);
        if (sel) inputEl.value = sel;

        renderTree(curEl);
        renderCandidateSelect(curEl);
        updateMultiOverlay(inputEl.value, curEl);

        const canGoParent = curEl.parentElement && curEl.parentElement !== document.documentElement && curEl.parentElement !== document.body.parentNode;
        parentBtn.disabled = !canGoParent;
        parentBtn.style.opacity = canGoParent ? '1' : '0.4';
        parentBtn.style.cursor = canGoParent ? 'pointer' : 'not-allowed';

        const canGoPrev = !!curEl.previousElementSibling;
        prevBtn.disabled = !canGoPrev;
        prevBtn.style.opacity = canGoPrev ? '1' : '0.4';
        prevBtn.style.cursor = canGoPrev ? 'pointer' : 'not-allowed';

        const canGoNext = !!curEl.nextElementSibling;
        nextBtn.disabled = !canGoNext;
        nextBtn.style.opacity = canGoNext ? '1' : '0.4';
        nextBtn.style.cursor = canGoNext ? 'pointer' : 'not-allowed';
      } else {
        renderTree(null);
        parentBtn.disabled = true;
        parentBtn.style.opacity = '0.4';
        parentBtn.style.cursor = 'not-allowed';

        prevBtn.disabled = true;
        prevBtn.style.opacity = '0.4';
        prevBtn.style.cursor = 'not-allowed';

        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.4';
        nextBtn.style.cursor = 'not-allowed';
      }

      const canGoChild = currentIndex > 0;
      childBtn.disabled = !canGoChild;
      childBtn.style.opacity = canGoChild ? '1' : '0.4';
      childBtn.style.cursor = canGoChild ? 'pointer' : 'not-allowed';
    }

    refreshUI();

    parentBtn.onclick = () => {
      const curEl = elementStack[currentIndex];
      if (!curEl) return;

      if (currentIndex === elementStack.length - 1) {
        const parent = curEl.parentElement;
        if (parent && parent !== document.documentElement && parent !== document.body.parentNode) {
          elementStack.push(parent);
          currentIndex++;
        }
      } else {
        currentIndex++;
      }
      refreshUI();
    };

    childBtn.onclick = () => {
      if (currentIndex > 0) {
        currentIndex--;
        refreshUI();
      }
    };

    prevBtn.onclick = () => {
      const curEl = elementStack[currentIndex];
      if (curEl && curEl.previousElementSibling) {
        elementStack[currentIndex] = curEl.previousElementSibling;
        refreshUI();
      }
    };

    nextBtn.onclick = () => {
      const curEl = elementStack[currentIndex];
      if (curEl && curEl.nextElementSibling) {
        elementStack[currentIndex] = curEl.nextElementSibling;
        refreshUI();
      }
    };

    let isMaximized = false;
    maxBtn.onclick = () => {
      isMaximized = !isMaximized;
      if (isMaximized) {
        maxBtn.textContent = '🗗';
        modalContainer.style.top = '24px';
        modalContainer.style.bottom = '24px';
        modalContainer.style.height = 'calc(100vh - 48px)';
        modalContainer.style.display = 'flex';
        modalContainer.style.flexDirection = 'column';

        infoEl.style.height = 'auto';
        infoEl.style.maxHeight = 'none';
        infoEl.style.flex = '1';
      } else {
        maxBtn.textContent = '🗖';
        modalContainer.style.top = 'auto';
        modalContainer.style.bottom = '24px';
        modalContainer.style.height = 'auto';

        infoEl.style.height = '100px';
        infoEl.style.maxHeight = '100px';
        infoEl.style.flex = 'none';
      }
    };

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizerLeft.onmousedown = (e) => {
      e.preventDefault();
      isResizing = true;
      startX = e.clientX;
      startWidth = modalContainer.offsetWidth;

      document.addEventListener("mousemove", onMouseMoveResizer);
      document.addEventListener("mouseup", onMouseUpResizer);
    };

    function onMouseMoveResizer(e) {
      if (!isResizing) return;
      const dx = startX - e.clientX;
      const newWidth = Math.max(320, Math.min(window.innerWidth - 32, startWidth + dx));
      modalContainer.style.width = newWidth + "px";
    }

    function onMouseUpResizer() {
      isResizing = false;
      document.removeEventListener("mousemove", onMouseMoveResizer);
      document.removeEventListener("mouseup", onMouseUpResizer);
    }

    inputEl.oninput = () => {
      const curEl = elementStack[currentIndex];
      updateMultiOverlay(inputEl.value, curEl);
      updateLiveStylePreview();
    };

    if (styleInput) {
      styleInput.oninput = () => {
        updateLiveStylePreview();
      };
    }

    const closeModal = () => {
      onMouseUpResizer();
      modalContainer.remove();
      if (highlightContainer) {
        highlightContainer.remove();
      }
      if (livePreviewStyle) {
        livePreviewStyle.remove();
      }
      document.removeEventListener("keydown", onModalKeyDown);
    };

    const onModalKeyDown = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    document.addEventListener("keydown", onModalKeyDown);

    confirmBtn.onclick = () => {
      const val = normalizeWildcardSelector(inputEl.value.trim());
      const styleVal = isStyleType && styleInput ? styleInput.value.trim() : '';
      const wildcardCheckbox = modalContainer.querySelector("#adblock-modal-domain-wildcard");
      const useWildcard = wildcardCheckbox ? wildcardCheckbox.checked : false;
      closeModal();
      if (val && onConfirm) {
        onConfirm(isStyleType ? { selector: val, style: styleVal, useWildcardDomain: useWildcard } : { selector: val, useWildcardDomain: useWildcard });
      }
    };

    cancelBtn.onclick = () => closeModal();
    closeBtn.onclick = () => closeModal();
  }

  function handleSelectorAdd(finalSelector, type = 'cover', targetElement = null) {
    showSelectorModal({
      initialElement: targetElement,
      initialSelector: finalSelector,
      type: type,
      onConfirm: (result) => {
        // 선택 대상 요소가 지정되어 있으면 즉시 물리적으로 제거/숨김 처리
        if (targetElement && targetElement.style) {
          try {
            if (type === 'displayNone') {
              targetElement.style.setProperty("display", "none", "important");
              targetElement.style.setProperty("visibility", "hidden", "important");
              targetElement.style.setProperty("height", "0", "important");
            } else if (type === 'cover') {
              targetElement.style.setProperty("position", "relative", "important");
              targetElement.style.setProperty("overflow", "hidden", "important");
            }
          } catch (e) {}
        }

        const selectorStr = typeof result === 'object' ? result.selector : result;
        const styleStr = typeof result === 'object' ? result.style : '';
        const useWildcardDomain = typeof result === 'object' && result.useWildcardDomain;

        const targetHost = useWildcardDomain
          ? getWildcardDomain(window.location.origin)
          : window.location.origin;

        let currentPageRules = rulesArray.find((v) =>
          isMatch(v.host.replace(/^https?:\/\//, "").replace(/\/$/, ""), window.location.hostname),
        );

        if (useWildcardDomain) {
          const wildcardMatch = rulesArray.find((v) =>
            v.host === targetHost || isMatch(v.host.replace(/^https?:\/\//, "").replace(/\/$/, ""), window.location.hostname)
          );
          if (wildcardMatch) {
            currentPageRules = wildcardMatch;
            currentPageRules.host = targetHost;
          }
        }

        const newItem = {
          selector: selectorStr,
          style: styleStr,
          createdAt: Date.now()
        };

        if (!currentPageRules) {
          currentPageRules = {
            host: targetHost,
            selectorList: [],
            displayNoneSelectorList: [],
            customStyleList: [],
            blockedUrlPatterns: [],
          };
          rulesArray.push(currentPageRules);
        } else if (useWildcardDomain) {
          currentPageRules.host = targetHost;
        }

        if (type === 'displayNone') {
          if (!currentPageRules.displayNoneSelectorList) currentPageRules.displayNoneSelectorList = [];
          currentPageRules.displayNoneSelectorList.push(newItem);
          currentPageRules.displayNoneSelectorList = deduplicateRuleList(currentPageRules.displayNoneSelectorList);
        } else if (type === 'style') {
          if (!currentPageRules.customStyleList) currentPageRules.customStyleList = [];
          currentPageRules.customStyleList.push(newItem);
          currentPageRules.customStyleList = deduplicateRuleList(currentPageRules.customStyleList);
        } else {
          if (!currentPageRules.selectorList) currentPageRules.selectorList = [];
          currentPageRules.selectorList.push(newItem);
          currentPageRules.selectorList = deduplicateRuleList(currentPageRules.selectorList);
        }

        const gistConfig = getGistConfig();
        if (!gistConfig.gistId || !gistConfig.token) {
          Toast.show("Gist 설정 정보가 없습니다. 먼저 Gist ID와 Token을 설정해주세요.");
          showGistConfigModal();
          return;
        }

        const { set } = useGist(
          gistConfig.gistId,
          gistConfig.token,
          gistConfig.fileName || "ad_selector_list.json"
        );

        set(rulesArray);
        GM_setValue("cachedRules", rulesArray);
        checkAndApply(rulesArray);
        Toast.show(`규칙이 추가되었습니다: ${selectorStr}`);
      }
    });
  }

  async function handleManualClick() {
    let clipboardText = "";
    try {
      clipboardText = await navigator.clipboard.readText();
    } catch (e) {
      console.warn("[Dynamic Ad Blocker] 클립보드 접근 실패:", e);
    }
    const isHide = confirm("영역 제거(display:none) 방식을 사용하시겠습니까?\n\n[확인] -> 영역 제거 (display:none)\n[취소] -> 흰색 덮기");
    let targetEl = null;
    if (clipboardText) {
      try { targetEl = document.querySelector(clipboardText); } catch (e) {}
    }
    handleSelectorAdd(clipboardText, isHide ? 'displayNone' : 'cover', targetEl);
  }

  function handlePickerCoverClick() {
    startElementPicker((sel, el) => handleSelectorAdd(sel, 'cover', el));
  }

  function handlePickerHideClick() {
    startElementPicker((sel, el) => handleSelectorAdd(sel, 'displayNone', el));
  }

  async function handleBlacklistClick() {
    const gistConfig = getGistConfig();
    if (!gistConfig.gistId || !gistConfig.token) {
      Toast.show("Gist 설정 정보가 없습니다. 먼저 Gist ID와 Token을 설정해주세요.");
      showGistConfigModal();
      return;
    }

    const blackListGist = useGist(
      gistConfig.gistId, 
      gistConfig.token,
      gistConfig.blackListFileName || "ad_selector_blacklist.json",
    );
    const list = (await blackListGist.get()) || [];
    list.push(window.location.origin);
    const uniqueList = Array.from(new Set(list.map(JSON.stringify))).map((e) => JSON.parse(e));
    await blackListGist.set(uniqueList);
    GM_setValue("cachedBlackList", uniqueList);
    Toast.show('성공적으로 블랙리스트에 추가되었습니다.');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  async function handleBlacklistReleaseClick() {
    const gistConfig = getGistConfig();
    if (!gistConfig.gistId || !gistConfig.token) {
      Toast.show("Gist 설정 정보가 없습니다. 먼저 Gist ID와 Token을 설정해주세요.");
      showGistConfigModal();
      return;
    }

    const blackListGist = useGist(
      gistConfig.gistId, 
      gistConfig.token,
      gistConfig.blackListFileName || "ad_selector_blacklist.json",
    );
    const list = (await blackListGist.get()) || [];
    const updatedList = list.filter(origin => origin !== window.location.origin);
    await blackListGist.set(updatedList);
    GM_setValue("cachedBlackList", updatedList);
    Toast.show('성공적으로 블랙리스트에서 제외되었습니다. 적용을 위해 페이지를 새로고침합니다.');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  function handleHideReleaseForADay() {
    const expireTime = Date.now() + 24 * 60 * 60 * 1000;
    GM_setValue("hideReleaseUntil_" + window.location.origin, expireTime);
    
    const uiGroup = document.getElementById("adblock-ui-group");
    if (uiGroup) {
      uiGroup.remove();
    }
    Toast.show('해당 사이트의 해제 버튼이 하루 동안 미노출됩니다.');
  }

  async function handleUrlBlockClick() {
    startElementPicker(async (selectedSelector) => {
      const selectedElement = document.querySelector(selectedSelector);
      if (!selectedElement) {
        Toast.show('요소를 찾지 못했습니다.');
        return;
      }
      
      const detectedUrls = extractAllResourceUrls(selectedElement);
      const suggestedPatterns = detectedUrls.map(buildUrlPattern).filter(Boolean);
      const uniquePatterns = Array.from(new Set(suggestedPatterns));

      let promptMessage = "차단할 광고 URL 패턴을 입력해주세요. (예: *://*.adserver.com/*)";
      let defaultPattern = "";

      if (uniquePatterns.length > 0) {
        defaultPattern = uniquePatterns[0];
        promptMessage = "클릭한 영역에서 검출된 광고 도메인 목록입니다:\n" +
          uniquePatterns.map((p, idx) => `${idx + 1}. ${p}`).join('\n') +
          "\n\n차단할 광고 URL 패턴(들)을 입력해주세요. 쉼표(,)로 구분하여 여러 개를 추가할 수 있습니다. (예: 1, 2 또는 1, *://custom.com/*)";
      } else {
        Toast.show('차단 가능한 URL 주소를 추출하지 못했습니다. 수동 입력을 진행합니다.');
      }
      
      const userInput = prompt(promptMessage, defaultPattern);

      if (!userInput) return;

      const tokens = userInput.split(',').map(s => s.trim()).filter(Boolean);
      const addedPatterns = [];

      const now = Date.now();
      tokens.forEach(token => {
        const num = parseInt(token, 10);
        let pat = token;
        if (!isNaN(num) && num > 0 && num <= uniquePatterns.length) {
          pat = uniquePatterns[num - 1];
        }
        addedPatterns.push({ pattern: pat, createdAt: now });
      });

      if (addedPatterns.length === 0) return;

      let currentPageRules = rulesArray.find((v) =>
        isMatch(v.host.replace(/^https?:\/\//, ""), window.location.hostname),
      );

      if (currentPageRules) {
        if (!currentPageRules.blockedUrlPatterns) {
          currentPageRules.blockedUrlPatterns = [];
        }
        currentPageRules.blockedUrlPatterns.push(...addedPatterns);
      } else {
        rulesArray.push({
          host: window.location.origin,
          selectorList: [],
          blockedUrlPatterns: addedPatterns,
        });
      }

      const gistConfig = getGistConfig();
      if (!gistConfig.gistId || !gistConfig.token) {
        Toast.show("Gist 설정 정보가 없습니다. 먼저 Gist ID와 Token을 설정해주세요.");
        showGistConfigModal();
        return;
      }

      const { set } = useGist(
        gistConfig.gistId,
        gistConfig.token,
        gistConfig.fileName || "ad_selector_list.json"
      );

      set(rulesArray);
      GM_setValue("cachedRules", rulesArray);

      Toast.show('성공적으로 URL 차단 패턴(들)이 추가되었습니다. 적용을 위해 페이지를 새로고침합니다.');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    });
  }

function showDeleteModal({ coverSelectors = [], hideSelectors = [], customStyles = [], urlPatterns = [], onConfirm }) {
  if (!document.getElementById('adblock-modal-style')) {
    const style = document.createElement('style');
    style.id = 'adblock-modal-style';
    style.textContent = `
      .adblock-modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(4px);
        z-index: 1000001;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        box-sizing: border-box;
      }
      .adblock-modal-content {
        background: #181825;
        color: #cdd6f4;
        border-radius: 12px;
        width: 100%;
        max-width: 620px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        border: 1px solid #313244;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        box-sizing: border-box;
      }
      .adblock-modal-header {
        padding: 14px 18px;
        border-bottom: 1px solid #313244;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        font-size: 15px;
        background: #11111b;
      }
      .adblock-modal-close-btn {
        background: transparent;
        border: none;
        color: #a6adc8;
        font-size: 18px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .adblock-modal-close-btn:hover {
        background: #313244;
        color: #f38ba8;
      }
      .adblock-modal-body {
        padding: 14px 18px;
        overflow-y: auto;
        flex: 1;
      }
      .adblock-modal-section-title {
        font-weight: 600;
        color: #89b4fa;
        margin-top: 14px;
        margin-bottom: 8px;
        font-size: 13px;
      }
      .adblock-modal-section-title:first-child {
        margin-top: 0;
      }
      .adblock-modal-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 6px;
        background: #1e1e2e;
        margin-bottom: 6px;
        cursor: pointer;
        transition: background 0.15s ease;
        word-break: break-all;
        border: 1px solid #313244;
      }
      .adblock-modal-item:hover {
        background: #313244;
      }
      .adblock-modal-item input[type="checkbox"] {
        margin-top: 2px;
        cursor: pointer;
        accent-color: #f38ba8;
      }
      .adblock-modal-footer {
        padding: 12px 18px;
        border-top: 1px solid #313244;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #11111b;
      }
      .adblock-modal-tools {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .adblock-modal-btn {
        padding: 6px 12px;
        border-radius: 6px;
        border: none;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: opacity 0.15s ease;
      }
      .adblock-modal-btn:hover {
        opacity: 0.85;
      }
      .adblock-modal-btn-secondary {
        background: #313244;
        color: #cdd6f4;
      }
      .adblock-modal-btn-danger {
        background: #f38ba8;
        color: #11111b;
      }
      .adblock-modal-num-input {
        width: 100%;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid #313244;
        background: #11111b;
        color: #cdd6f4;
        font-size: 13px;
        box-sizing: border-box;
        margin-bottom: 12px;
        outline: none;
        transition: border-color 0.15s ease;
      }
      .adblock-modal-num-input:focus {
        border-color: #89b4fa;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  const overlay = document.createElement('div');
  overlay.className = 'adblock-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'adblock-modal-content';

  const header = document.createElement('div');
  header.className = 'adblock-modal-header';
  header.innerHTML = `
    <span>차단 항목 삭제</span>
    <button class="adblock-modal-close-btn">&times;</button>
  `;

  const body = document.createElement('div');
  body.className = 'adblock-modal-body';

  const inputContainer = document.createElement('div');
  inputContainer.innerHTML = `
    <input type="text" class="adblock-modal-num-input" placeholder="삭제할 번호 입력 (예: 1-3, 7, 9)" />
  `;
  const numInput = inputContainer.querySelector('input');
  body.appendChild(inputContainer);

  let totalIndex = 0;
  const checkboxes = [];

  function createSection(titleText, items, type) {
    if (!items || items.length === 0) return;

    const parsedItems = items.map((rawItem, idx) => {
      const parsed = parseRuleItem(rawItem);
      return {
        text: parsed.text,
        createdAt: parsed.createdAt,
        originalIndex: idx
      };
    });

    // 오래된 순 -> 최신순 오름차순 정렬 (최신 항목이 맨 밑에 출력)
    parsedItems.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    const title = document.createElement('div');
    title.className = 'adblock-modal-section-title';
    title.textContent = `${titleText} (${parsedItems.length})`;
    body.appendChild(title);

    parsedItems.forEach((item) => {
      totalIndex++;
      const itemEl = document.createElement('label');
      itemEl.className = 'adblock-modal-item';
      itemEl.style.display = 'flex';
      itemEl.style.alignItems = 'center';
      itemEl.style.justifyContent = 'space-between';
      
      const leftBox = document.createElement('div');
      leftBox.style.display = 'flex';
      leftBox.style.alignItems = 'center';
      leftBox.style.gap = '8px';
      leftBox.style.flex = '1';
      leftBox.style.minWidth = '0';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.type = type;
      cb.dataset.index = item.originalIndex;
      checkboxes.push(cb);

      cb.addEventListener('change', updateCount);

      const labelText = document.createElement('span');
      labelText.style.wordBreak = 'break-all';
      labelText.style.color = '#ffffff';
      labelText.textContent = `${totalIndex}. ${item.text}`;

      leftBox.appendChild(cb);
      leftBox.appendChild(labelText);
      itemEl.appendChild(leftBox);

      if (item.createdAt) {
        const dateSpan = document.createElement('span');
        dateSpan.style.fontSize = '11px';
        dateSpan.style.color = '#ffab40';
        dateSpan.style.whiteSpace = 'nowrap';
        dateSpan.style.marginLeft = '10px';
        dateSpan.style.background = 'rgba(255, 171, 64, 0.12)';
        dateSpan.style.padding = '2px 6px';
        dateSpan.style.borderRadius = '4px';
        dateSpan.style.fontFamily = 'monospace';
        dateSpan.textContent = formatShortDate(item.createdAt);
        itemEl.appendChild(dateSpan);
      }

      body.appendChild(itemEl);
    });
  }

  createSection('광고 선택자 (흰색 덮기)', coverSelectors, 'cover');
  createSection('광고 선택자 (영역 제거 - display:none)', hideSelectors, 'hide');
  createSection('커스텀 주입 스타일 (Custom Style)', customStyles, 'custom');
  createSection('차단 광고 링크 (URL Pattern)', urlPatterns, 'url');

  numInput.addEventListener('input', () => {
    const text = numInput.value.trim();
    const selectedIndices = new Set();
    if (text) {
      const parts = text.split(',').map(s => s.trim()).filter(Boolean);
      parts.forEach(part => {
        if (part.includes('-')) {
          const rangeParts = part.split('-').map(s => s.trim());
          if (rangeParts.length === 2) {
            const start = parseInt(rangeParts[0], 10);
            const end = parseInt(rangeParts[1], 10);
            if (!isNaN(start) && !isNaN(end)) {
              const min = Math.min(start, end);
              const max = Math.max(start, end);
              for (let i = min; i <= max; i++) {
                if (i >= 1 && i <= checkboxes.length) {
                  selectedIndices.add(i);
                }
              }
            }
          }
        } else {
          const num = parseInt(part, 10);
          if (!isNaN(num) && num >= 1 && num <= checkboxes.length) {
            selectedIndices.add(num);
          }
        }
      });
    }

    checkboxes.forEach((cb, idx) => {
      cb.checked = selectedIndices.has(idx + 1);
    });
    updateCount();
  });

  const footer = document.createElement('div');
  footer.className = 'adblock-modal-footer';

  const countSpan = document.createElement('span');
  countSpan.style.color = '#a6adc8';
  countSpan.textContent = '0개 선택됨';

  const tools = document.createElement('div');
  tools.className = 'adblock-modal-tools';

  const toggleAllBtn = document.createElement('button');
  toggleAllBtn.className = 'adblock-modal-btn adblock-modal-btn-secondary';
  toggleAllBtn.textContent = '전체선택';
  let isAllSelected = false;

  toggleAllBtn.addEventListener('click', () => {
    isAllSelected = !isAllSelected;
    checkboxes.forEach(cb => cb.checked = isAllSelected);
    toggleAllBtn.textContent = isAllSelected ? '선택해제' : '전체선택';
    updateCount();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'adblock-modal-btn adblock-modal-btn-danger';
  deleteBtn.textContent = '선택 항목 삭제';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'adblock-modal-btn adblock-modal-btn-secondary';
  cancelBtn.textContent = '취소';

  tools.appendChild(toggleAllBtn);
  tools.appendChild(cancelBtn);
  tools.appendChild(deleteBtn);

  footer.appendChild(countSpan);
  footer.appendChild(tools);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);

  function updateCount() {
    const checkedCount = checkboxes.filter(cb => cb.checked).length;
    countSpan.textContent = `${checkedCount}개 선택됨`;
  }

  function closeModal() {
    overlay.remove();
  }

  header.querySelector('.adblock-modal-close-btn').addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  deleteBtn.addEventListener('click', () => {
    const selected = checkboxes.filter(cb => cb.checked).map(cb => ({
      type: cb.dataset.type,
      index: parseInt(cb.dataset.index, 10)
    }));

    if (selected.length === 0) {
      Toast.show('삭제할 항목을 선택해주세요.');
      return;
    }

    closeModal();
    onConfirm(selected);
  });

  document.body.appendChild(overlay);
}

  function handleStyleInjectClick() {
    startElementPicker((sel, el) => handleSelectorAdd(sel, 'style', el));
  }

  async function handleDeleteListClick() {
    let currentPageRules = rulesArray.find((v) =>
      isMatch(v.host.replace(/^https?:\/\//, ""), window.location.hostname),
    );

    if (!currentPageRules) {
      Toast.show('이 사이트에 등록된 규칙이 없습니다.');
      return;
    }

    const coverSelectors = deduplicateRuleList(currentPageRules.selectorList || []);
    const hideSelectors = deduplicateRuleList(currentPageRules.displayNoneSelectorList || []);
    const customStyles = deduplicateRuleList(currentPageRules.customStyleList || []);
    const urlPatterns = deduplicateRuleList(currentPageRules.blockedUrlPatterns || []);

    if (coverSelectors.length === 0 && hideSelectors.length === 0 && customStyles.length === 0 && urlPatterns.length === 0) {
      Toast.show('이 사이트에 등록된 광고 선택자나 차단 링크가 없습니다.');
      return;
    }

    showDeleteModal({
      coverSelectors,
      hideSelectors,
      customStyles,
      urlPatterns,
      onConfirm: async (selectedItems) => {
        const coverToDelete = [];
        const hideToDelete = [];
        const customToDelete = [];
        const urlsToDelete = [];

        selectedItems.forEach(item => {
          if (item.type === 'cover') coverToDelete.push(item.index);
          else if (item.type === 'hide') hideToDelete.push(item.index);
          else if (item.type === 'custom') customToDelete.push(item.index);
          else if (item.type === 'url') urlsToDelete.push(item.index);
        });

        coverToDelete.sort((a, b) => b - a);
        hideToDelete.sort((a, b) => b - a);
        customToDelete.sort((a, b) => b - a);
        urlsToDelete.sort((a, b) => b - a);

        coverToDelete.forEach(idx => {
          currentPageRules.selectorList.splice(idx, 1);
        });

        hideToDelete.forEach(idx => {
          currentPageRules.displayNoneSelectorList.splice(idx, 1);
        });

        customToDelete.forEach(idx => {
          if (currentPageRules.customStyleList) {
            currentPageRules.customStyleList.splice(idx, 1);
          }
        });

        urlsToDelete.forEach(idx => {
          currentPageRules.blockedUrlPatterns.splice(idx, 1);
        });

        Toast.show('선택한 차단 항목이 삭제되었습니다. 적용을 위해 새로고침합니다.');

        GM_setValue("cachedRules", rulesArray);
        checkAndApply(rulesArray);

        const gistConfig = getGistConfig();
        if (!gistConfig.gistId || !gistConfig.token) {
          Toast.show("Gist 설정 정보가 없습니다. 먼저 Gist ID와 Token을 설정해주세요.");
          showGistConfigModal();
          return;
        }

        const { set } = useGist(
          gistConfig.gistId,
          gistConfig.token,
          gistConfig.fileName || "ad_selector_list.json"
        );

        set(rulesArray).finally(() => {
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        });
      }
    });
  }

  const setupFloatingButton = () => {
    const isBlacklisted = isDomainBlacklisted(window.location.hostname);
    makeButtonGroups({
      handleManualClick,
      handlePickerCoverClick,
      handlePickerHideClick,
      handleStyleInjectClick,
      handleBlacklistClick,
      handleUrlBlockClick,
      handleDeleteListClick,
      handleGistConfigClick: () => showGistConfigModal(),
      isBlacklisted
    });
  };

  setupFloatingButton();

  function ensureFloatingButtonExists() {
    if (!document.body) return;
    let uiGroup = document.getElementById("adblock-ui-group");

    if (!uiGroup || !document.body.contains(uiGroup)) {
      if (uiGroup) {
        document.body.appendChild(uiGroup);
      } else {
        setupFloatingButton();
        uiGroup = document.getElementById("adblock-ui-group");
      }
    }

    if (uiGroup && document.body) {
      if (document.body.lastElementChild !== uiGroup) {
        document.body.appendChild(uiGroup);
      }
      uiGroup.style.zIndex = "2147483647";
      uiGroup.style.display = "flex";
      uiGroup.style.visibility = "visible";
    }
  }

  setTimeout(ensureFloatingButtonExists, 3000);
  setTimeout(ensureFloatingButtonExists, 5000);
  setTimeout(ensureFloatingButtonExists, 10000);
  setInterval(ensureFloatingButtonExists, 5000);

  const initObserver = () => {
    if (!document.body) return;
    try {
      const observer = new MutationObserver(() => {
        ensureFloatingButtonExists();
      });
      observer.observe(document.body, { childList: true, subtree: false });
    } catch (e) {}
  };

  if (document.body) {
    initObserver();
  } else {
    document.addEventListener("DOMContentLoaded", initObserver);
  }

  clipboardEventListener({ handleClick: handleManualClick });
  useKeysPress(["Shift", "+"], handleManualClick);

  const supportedPages = rulesArray.some((v) =>
    isMatch(v.host.replace(/^https?:\/\//, ""), window.location.hostname),
  );
  if (!supportedPages) {
    if (adblockStyleElement) {
      applyAdblockRules([]);
    }
    return;
  }

  checkAndApply(rulesArray);
}

main();
