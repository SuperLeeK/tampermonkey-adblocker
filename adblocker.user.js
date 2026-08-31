// ==UserScript==
// @name         Dynamic Ad Blocker
// @namespace    ADBlocker
// @version      202608311114
// @description  Hides ads dynamically based on selectors from a GitHub Gist URL.
// @author       Zero
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_webRequest
// @grant        GM_registerMenuCommand
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

function registerTampermonkeyMenuCommands(isBlacklisted = false) {
  if (window.__adblockMenuRegistered) return;
  window.__adblockMenuRegistered = true;

  if (typeof GM_registerMenuCommand !== "undefined") {
    try {
      GM_registerMenuCommand("🎈 플로팅버튼 토글", () => {
        if (typeof window.__adblock_toggleFloatingButton === "function") {
          window.__adblock_toggleFloatingButton();
        } else {
          const uiGroup = document.getElementById("adblock-ui-group");
          if (uiGroup) {
            const isVisible = uiGroup.style.display !== "none" && uiGroup.style.visibility !== "hidden";
            if (isVisible) {
              window.__adblock_isFloatingHidden = true;
              uiGroup.style.display = "none";
              if (typeof Toast !== "undefined" && Toast.show) Toast.show("플로팅 버튼을 숨겼습니다.");
            } else {
              window.__adblock_isFloatingHidden = false;
              uiGroup.style.display = "flex";
              uiGroup.style.visibility = "visible";
              uiGroup.style.zIndex = "2147483647";
              if (document.body) document.body.appendChild(uiGroup);
              if (typeof Toast !== "undefined" && Toast.show) Toast.show("플로팅 버튼을 띄웠습니다.");
            }
          }
        }
      });

      GM_registerMenuCommand("🖼️ 이미지 블러 토글", () => {
        if (typeof window.__adblock_toggleImageBlur === "function") {
          window.__adblock_toggleImageBlur();
        }
      });

      GM_registerMenuCommand("🎧 이벤트 리스너 추적 결과", () => {
        if (typeof showCapturedEventsModal === "function") {
          showCapturedEventsModal();
        }
      });

      GM_registerMenuCommand("⚙️ Gist 설정", () => {
        if (typeof window.__adblock_openGistConfig === "function") {
          window.__adblock_openGistConfig();
        } else if (typeof showGistConfigModal === "function") {
          showGistConfigModal();
        }
      });

      GM_registerMenuCommand("🗑️ 설정 제거창", () => {
        if (typeof window.__adblock_openDeleteList === "function") {
          window.__adblock_openDeleteList();
        } else {
          if (typeof Toast !== "undefined" && Toast.show) Toast.show("설정 제거창을 열 수 없습니다.");
        }
      });

      const blacklistLabel = isBlacklisted ? "🟢 블랙리스트 해제" : "⛔ 블랙리스트 추가";
      GM_registerMenuCommand(blacklistLabel, () => {
        if (typeof window.__adblock_toggleBlacklist === "function") {
          window.__adblock_toggleBlacklist();
        } else {
          const isCurrentlyBlacklisted = typeof checkIsBlacklisted === "function" ? checkIsBlacklisted() : isBlacklisted;
          if (isCurrentlyBlacklisted && typeof handleBlacklistReleaseClick === "function") {
            handleBlacklistReleaseClick();
          } else if (!isCurrentlyBlacklisted && typeof handleBlacklistClick === "function") {
            handleBlacklistClick();
          } else {
            if (typeof Toast !== "undefined" && Toast.show) Toast.show("블랙리스트 액션을 실행할 수 없습니다.");
          }
        }
      });

      GM_registerMenuCommand("🔄 수동 업데이트", () => {
        const updateUrl = "https://github.com/SuperLeeK/tampermonkey-adblocker/raw/refs/heads/main/adblocker.user.js";
        window.location.href = updateUrl;
      });
    } catch (e) {}
  }
}

registerTampermonkeyMenuCommands();

(function initEventListenerTracker() {
  if (window.__adblockTrackerInitialized) return;
  window.__adblockTrackerInitialized = true;
  window.__adblockCapturedEvents = [];

  try {
    const targetProto = typeof EventTarget !== 'undefined' ? EventTarget.prototype : Element.prototype;
    const origAddEventListener = targetProto.addEventListener;

    targetProto.addEventListener = function(type, listener, options) {
      if (typeof listener === 'function') {
        try {
          const fnName = listener.name || '(익명 함수)';
          const fnCode = listener.toString();
          window.__adblockCapturedEvents.push({
            target: this,
            type: type,
            fnName: fnName,
            fnCode: fnCode,
            timestamp: Date.now()
          });
          if (window.__adblockCapturedEvents.length > 1500) {
            window.__adblockCapturedEvents.shift();
          }
        } catch (e) {}
      }
      return origAddEventListener.call(this, type, listener, options);
    };
  } catch (e) {}
})();

function showCapturedEventsModal() {
  const existing = document.getElementById("adblock-captured-events-modal");
  if (existing) existing.remove();

  const events = window.__adblockCapturedEvents || [];

  const modalContainer = document.createElement("div");
  modalContainer.id = "adblock-captured-events-modal";
  modalContainer.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000005;
    width: 650px;
    max-width: calc(100vw - 32px);
    max-height: 80vh;
    background: #18181b;
    color: #f4f4f5;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
  `;

  modalContainer.innerHTML = `
    <div style="padding: 12px 16px; background: rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center; user-select: none;">
      <span style="font-weight: 600; font-size: 13px; color: #a855f7;">🎧 이벤트 리스너 추적 목록 (<span id="adblock-events-count">${events.length}</span>개)</span>
      <button id="adblock-events-close" style="background: none; border: none; color: #a1a1aa; font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1;" title="닫기">&times;</button>
    </div>
    <div style="padding: 12px 16px; display: flex; gap: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: #09090b; align-items: center; flex-wrap: wrap;">
      <input type="text" id="adblock-events-search" placeholder="이벤트 타입, 함수명, DOM 태그 검색..." style="flex: 1; min-width: 180px; box-sizing: border-box; padding: 6px 10px; background: #18181b; color: #f4f4f5; border: 1px solid #3f3f46; border-radius: 6px; font-size: 12px; outline: none;" />
      <button id="adblock-events-console-log" style="padding: 6px 10px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 6px; font-size: 11px; cursor: pointer; font-weight: 500;">📋 콘솔 출력</button>
      <button id="adblock-events-clear" style="padding: 6px 10px; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; font-size: 11px; cursor: pointer; font-weight: 500;">🗑️ 기록 삭제</button>
    </div>
    <div id="adblock-events-list" style="flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; max-height: calc(80vh - 110px);">
    </div>
  `;

  document.body.appendChild(modalContainer);

  const getTargetDescription = (target) => {
    if (!target) return "(Unknown Target)";
    if (target === window) return "window";
    if (target === document) return "document";
    if (target.tagName) {
      let desc = target.tagName.toLowerCase();
      if (target.id) desc += `#${target.id}`;
      if (target.className && typeof target.className === "string") {
        const classes = target.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".");
        if (classes) desc += `.${classes}`;
      }
      return desc;
    }
    return String(target);
  };

  const renderList = (filter = "") => {
    const listEl = document.getElementById("adblock-events-list");
    const countEl = document.getElementById("adblock-events-count");
    if (!listEl) return;

    const currentEvents = window.__adblockCapturedEvents || [];
    const query = filter.trim().toLowerCase();

    const filtered = currentEvents.filter((item) => {
      if (!query) return true;
      const targetStr = getTargetDescription(item.target).toLowerCase();
      const typeStr = (item.type || "").toLowerCase();
      const fnStr = (item.fnName || "").toLowerCase();
      return targetStr.includes(query) || typeStr.includes(query) || fnStr.includes(query);
    });

    if (countEl) countEl.textContent = filtered.length;

    if (filtered.length === 0) {
      listEl.innerHTML = `<div style="text-align: center; padding: 24px; color: #71717a; font-size: 12px;">수집된 이벤트 리스너가 없거나 검색 결과가 없습니다.</div>`;
      return;
    }

    listEl.innerHTML = filtered.slice().reverse().map((item, idx) => {
      const targetDesc = getTargetDescription(item.target);
      const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "";
      const eventTypeColor = item.type === "click" ? "#f59e0b" : item.type === "scroll" ? "#3b82f6" : "#a855f7";

      return `
        <div style="background: #27272a; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 10px; font-size: 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span style="background: ${eventTypeColor}22; color: ${eventTypeColor}; border: 1px solid ${eventTypeColor}44; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px;">${item.type}</span>
              <span style="font-family: monospace; color: #4ade80; font-weight: 500;">${targetDesc}</span>
            </div>
            <span style="color: #71717a; font-size: 11px;">${timeStr}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; color: #a1a1aa; font-size: 11px;">
            <span>함수: <strong style="color: #e4e4e7;">${item.fnName || '(익명)'}</strong></span>
            <button class="adblock-events-highlight-btn" data-idx="${filtered.length - 1 - idx}" style="background: none; border: none; color: #60a5fa; cursor: pointer; text-decoration: underline; font-size: 11px;">요소 탐색</button>
          </div>
          <details style="margin-top: 2px;">
            <summary style="color: #71717a; cursor: pointer; font-size: 11px; user-select: none;">코드 보기</summary>
            <pre style="margin: 6px 0 0 0; padding: 8px; background: #09090b; color: #f4f4f5; border-radius: 4px; font-family: monospace; font-size: 11px; white-space: pre-wrap; word-break: break-all; max-height: 120px; overflow-y: auto;">${(item.fnCode || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          </details>
        </div>
      `;
    }).join("");

    listEl.querySelectorAll(".adblock-events-highlight-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const itemIdx = parseInt(e.target.getAttribute("data-idx"), 10);
        const item = filtered[itemIdx];
        if (item && item.target && item.target.scrollIntoView) {
          try {
            item.target.scrollIntoView({ behavior: "smooth", block: "center" });
            const origOutline = item.target.style.outline;
            item.target.style.outline = "3px solid #a855f7";
            setTimeout(() => {
              item.target.style.outline = origOutline;
            }, 2000);
            if (typeof Toast !== "undefined" && Toast.show) Toast.show("해당 요소로 이동했습니다.");
          } catch (err) {}
        } else {
          if (typeof Toast !== "undefined" && Toast.show) Toast.show("요소를 찾을 수 없거나 window/document 객체입니다.");
        }
      });
    });
  };

  renderList();

  document.getElementById("adblock-events-close")?.addEventListener("click", () => modalContainer.remove());

  document.getElementById("adblock-events-search")?.addEventListener("input", (e) => {
    renderList(e.target.value);
  });

  document.getElementById("adblock-events-console-log")?.addEventListener("click", () => {
    console.log("[AdBlocker Captured Events]", window.__adblockCapturedEvents);
    if (typeof Toast !== "undefined" && Toast.show) Toast.show("콘솔에 추적 결과를 출력했습니다 (F12 참고).");
  });

  document.getElementById("adblock-events-clear")?.addEventListener("click", () => {
    window.__adblockCapturedEvents = [];
    renderList();
    if (typeof Toast !== "undefined" && Toast.show) Toast.show("추적 기록이 삭제되었습니다.");
  });
}

function getReactAndDomHandlers(el) {
  if (!el || typeof el !== 'object' || !el.tagName) return [];
  const handlers = [];

  // 1. React Props & Fiber Handlers
  try {
    const keys = Object.keys(el);
    const reactKey = keys.find(k => 
      k.startsWith('__reactProps$') || k.startsWith('__reactEventHandlers$') || k.startsWith('__reactFiber$')
    );

    if (reactKey && el[reactKey]) {
      let props = el[reactKey];
      if (props.memoizedProps) props = props.memoizedProps;
      if (props) {
        Object.keys(props).forEach(propKey => {
          if (propKey.startsWith('on') && typeof props[propKey] === 'function') {
            const fn = props[propKey];
            handlers.push({
              source: 'React Component',
              eventType: propKey.substring(2).toLowerCase(),
              propName: propKey,
              fnName: fn.name || '(익명 React 핸들러)',
              fnCode: fn.toString(),
              fn: fn
            });
          }
        });
      }
    }
  } catch (e) {}

  // 2. Inline DOM Handlers (onclick, onchange, etc.)
  try {
    for (let prop in el) {
      if (prop.startsWith('on') && typeof el[prop] === 'function') {
        const fn = el[prop];
        handlers.push({
          source: 'DOM Inline',
          eventType: prop.substring(2).toLowerCase(),
          propName: prop,
          fnName: fn.name || '(익명 Inline 핸들러)',
          fnCode: fn.toString(),
          fn: fn
        });
      }
    }
  } catch (e) {}

  // 3. Captured addEventListener match
  try {
    if (window.__adblockCapturedEvents) {
      window.__adblockCapturedEvents.forEach(evt => {
        if (evt.target === el || (el.contains && evt.target && el.contains(evt.target))) {
          handlers.push({
            source: 'addEventListener',
            eventType: evt.type,
            propName: `addEventListener('${evt.type}')`,
            fnName: evt.fnName,
            fnCode: evt.fnCode
          });
        }
      });
    }
  } catch (e) {}

  return handlers;
}

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

function normalizeDomain(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '').trim().toLowerCase();
}

function checkIsBlacklisted() {
  try {
    const cached = GM_getValue("cachedBlackList", []);
    const currentHost = normalizeDomain(window.location.hostname || window.location.host || window.location.origin);
    if (!currentHost) return false;

    return cached.some(item => {
      const normItem = normalizeDomain(item);
      if (!normItem) return false;
      if (normItem === currentHost) return true;
      if (typeof isMatch === 'function' && isMatch(normItem, currentHost)) return true;
      return false;
    });
  } catch (e) {
    return false;
  }
}

function getImageBlurStorageKey() {
  let host = "";
  try {
    if (window.top && window.top.location && window.top.location.hostname) {
      host = window.top.location.hostname;
    }
  } catch (e) {
    if (document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        host = refUrl.hostname;
      } catch (err) {}
    }
  }
  if (!host && window.location && window.location.hostname) {
    host = window.location.hostname;
  }
  if (!host) host = "global";
  return "adblock_image_blur_enabled_" + host;
}

function isImageBlurEnabled() {
  return GM_getValue(getImageBlurStorageKey(), true);
}

function applyImageBlurStyle(enabled) {
  if (checkIsBlacklisted()) {
    enabled = false;
  }

  let style = document.getElementById("adblock-image-blur-style");
  if (enabled) {
    if (!style) {
      style = document.createElement("style");
      style.id = "adblock-image-blur-style";
      style.textContent = `
        img:not(#adblock-ui-group img):not(.adblock-ui-fab-toggle img),
        picture:not(#adblock-ui-group picture),
        video:not(#adblock-ui-group video),
        canvas:not(#adblock-ui-group canvas),
        [style*="background-image"]:not(#adblock-ui-group *),
        [style*="background: url"]:not(#adblock-ui-group *),
        [style*="background:url"]:not(#adblock-ui-group *) {
          filter: blur(14px) !important;
          -webkit-filter: blur(14px) !important;
          transition: filter 0.2s ease-in-out, -webkit-filter 0.2s ease-in-out !important;
        }
        .adblock-blur-hovered,
        .adblock-blur-hovered *,
        img.adblock-blur-hovered,
        picture.adblock-blur-hovered,
        video.adblock-blur-hovered,
        canvas.adblock-blur-hovered,
        img:not(#adblock-ui-group img):not(.adblock-ui-fab-toggle img):hover,
        picture:not(#adblock-ui-group picture):hover,
        video:not(#adblock-ui-group video):hover,
        canvas:not(#adblock-ui-group canvas):hover,
        [style*="background-image"]:not(#adblock-ui-group *):hover,
        [style*="background: url"]:not(#adblock-ui-group *):hover,
        [style*="background:url"]:not(#adblock-ui-group *):hover {
          filter: none !important;
          -webkit-filter: none !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    }

    if (!window.__adblockBlurEventsBound) {
      window.__adblockBlurEventsBound = true;
      let lastHoveredSet = new Set();

      const updateBlurHoverState = (e) => {
        if (!isImageBlurEnabled()) return;

        let targetEls = [];
        try {
          if (document.elementsFromPoint) {
            targetEls = document.elementsFromPoint(e.clientX, e.clientY) || [];
          }
        } catch (err) {}

        const currentSet = new Set();

        targetEls.forEach(el => {
          if (!el || el.closest("#adblock-ui-group")) return;

          if (el.matches("img, picture, video, canvas, [style*='background-image'], [style*='background:']")) {
            currentSet.add(el);
          }
          const childImg = el.querySelector("img, picture, video, canvas, [style*='background-image'], [style*='background:']");
          if (childImg) {
            currentSet.add(childImg);
          }
        });

        lastHoveredSet.forEach(el => {
          if (!currentSet.has(el)) {
            el.classList.remove("adblock-blur-hovered");
          }
        });

        currentSet.forEach(el => {
          el.classList.add("adblock-blur-hovered");
        });

        lastHoveredSet = currentSet;
      };

      document.addEventListener("mousemove", updateBlurHoverState, { capture: true, passive: true });
    }
  } else {
    if (style) style.remove();
    document.querySelectorAll(".adblock-blur-hovered").forEach(el => el.classList.remove("adblock-blur-hovered"));
  }
}

// 극초기 자동 실행
applyImageBlurStyle(isImageBlurEnabled());

window.__adblock_toggleImageBlur = function() {
  const nextState = !isImageBlurEnabled();
  GM_setValue(getImageBlurStorageKey(), nextState);
  applyImageBlurStyle(nextState);
  
  const blurBtn = document.getElementById("adblock-image-blur-btn");
  if (blurBtn) {
    blurBtn.textContent = nextState ? "🖼️ 이미지 블러 ON" : "🖼️ 이미지 블러 OFF";
    blurBtn.style.backgroundColor = nextState ? "#22c55e" : "#eab308";
    blurBtn.style.borderColor = nextState ? "#4ade80" : "#fde047";
    blurBtn.style.color = "#09090b";
  }

  if (typeof Toast !== "undefined" && Toast.show) {
    Toast.show(nextState ? "이미지 80% 블러 모드가 켜졌습니다. (Hover 시 원본 보기)" : "이미지 블러 모드가 꺼졌습니다.");
  }
};

function makeButtonGroups({ handleManualClick, handlePickerCoverClick, handlePickerHideClick, handleStyleInjectClick, handleShortcutClick, handleBlacklistClick, handleUrlBlockClick, handleDeleteListClick, handleHideReleaseClick, handleGistConfigClick, isBlacklisted = false }) {
  if (!document.getElementById('adblock-responsive-style')) {
    const responsiveStyle = document.createElement('style');
    responsiveStyle.id = 'adblock-responsive-style';
    responsiveStyle.textContent = `
      #adblock-modal-info, #adblock-selector-modal {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      #adblock-modal-candidate-select {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        height: 38px !important;
        line-height: 1.4 !important;
        padding: 6px 30px 6px 10px !important;
        background-color: #09090b !important;
        color: #4ade80 !important;
        border: 1px solid #3f3f46 !important;
        border-radius: 6px !important;
        font-family: monospace !important;
        font-size: 12px !important;
        outline: none !important;
        -webkit-appearance: none !important;
        -moz-appearance: none !important;
        appearance: none !important;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234ade80' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
        background-repeat: no-repeat !important;
        background-position: right 10px center !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        display: block !important;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      #adblock-modal-candidate-select option {
        background-color: #09090b !important;
        color: #4ade80 !important;
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
        pointer-events: none !important;
        transform: none !important;
        filter: none !important;
        clip: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        background: transparent !important;
        box-sizing: border-box !important;
        float: none !important;
        width: auto !important;
        height: auto !important;
        max-width: none !important;
        max-height: none !important;
      }
      #adblock-ui-group * {
        box-sizing: border-box !important;
      }
      .adblock-ui-fab-toggle {
        width: 42px !important;
        height: 42px !important;
        border-radius: 50% !important;
        background: #2563eb !important;
        background-image: none !important;
        color: #ffffff !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35) !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 18px !important;
        transition: transform 0.2s ease, background 0.2s ease !important;
        outline: none !important;
        margin: 0 !important;
        padding: 0 !important;
        float: none !important;
        line-height: 1 !important;
        position: relative !important;
        top: auto !important;
        right: auto !important;
        bottom: auto !important;
        left: auto !important;
        pointer-events: auto !important;
      }
      .adblock-ui-fab-toggle:hover {
        transform: scale(1.08) !important;
        background: #1d4ed8 !important;
      }
      .adblock-ui-menu-wrapper {
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        opacity: 0 !important;
        visibility: hidden !important;
        transform: translateY(12px) scale(0.92) !important;
        transform-origin: bottom left !important;
        pointer-events: none !important;
        transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.22s !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        background: transparent !important;
        float: none !important;
        position: relative !important;
        width: auto !important;
        height: auto !important;
      }
      #adblock-ui-group.is-open .adblock-ui-menu-wrapper {
        opacity: 1 !important;
        visibility: visible !important;
        transform: translateY(0) scale(1) !important;
        pointer-events: auto !important;
      }
      #adblock-ui-group .adblock-ui-menu-wrapper button,
      #adblock-ui-group .adblock-ui-menu-wrapper .btn {
        margin: 0 !important;
        float: none !important;
        position: relative !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25) !important;
        white-space: nowrap !important;
        text-align: center !important;
        font-family: system-ui, -apple-system, sans-serif !important;
        width: auto !important;
        max-width: none !important;
      }
      @media screen and (max-width: 768px) {
        #adblock-ui-group {
          left: 12px !important;
          bottom: 12px !important;
          gap: 6px !important;
        }
        .adblock-ui-fab-toggle {
          width: 36px !important;
          height: 36px !important;
          font-size: 15px !important;
        }
        #adblock-ui-group .adblock-ui-menu-wrapper button,
        #adblock-ui-group .adblock-ui-menu-wrapper .btn {
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
  fabToggle.className = 'adblock-ui-fab-toggle';
  fabToggle.title = '광고 차단 메뉴';
  fabToggle.innerHTML = '🛡️';

  const menuWrapper = document.createElement('div');
  menuWrapper.className = 'adblock-ui-menu-wrapper';

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

  const pickerCoverBtn = new Button({
    text: "선택자(흰색덮기)",
    variant: "success",
    size: "small",
    onClick: handlePickerCoverClick || (() => Toast.show("블랙리스트에 등록된 사이트에서는 사용할 수 없습니다.")),
  });

  const pickerHideBtn = new Button({
    text: "선택자(영역제거)",
    variant: "success",
    size: "small",
    onClick: handlePickerHideClick || (() => Toast.show("블랙리스트에 등록된 사이트에서는 사용할 수 없습니다.")),
  });

  const urlBlockBtn = new Button({
    text: "광고링크추가",
    variant: "warning",
    size: "small",
    onClick: handleUrlBlockClick || (() => Toast.show("블랙리스트에 등록된 사이트에서는 사용할 수 없습니다.")),
  });

  const styleInjectBtn = new Button({
    text: "스타일주입",
    variant: "danger",
    size: "small",
    onClick: handleStyleInjectClick || (() => Toast.show("블랙리스트에 등록된 사이트에서는 사용할 수 없습니다.")),
  });
  if (styleInjectBtn && styleInjectBtn.element) {
    styleInjectBtn.element.style.backgroundColor = '#f38ba8';
    styleInjectBtn.element.style.color = '#11111b';
    styleInjectBtn.element.style.fontWeight = '600';
    styleInjectBtn.element.style.borderColor = '#f38ba8';
  }

  const shortcutBtn = new Button({
    text: "⌨️ 단축키지정",
    variant: "warning",
    size: "small",
    onClick: handleShortcutClick || (() => Toast.show("블랙리스트에 등록된 사이트에서는 사용할 수 없습니다.")),
  });
  if (shortcutBtn && shortcutBtn.element) {
    shortcutBtn.element.style.setProperty("background-color", "#a855f7", "important");
    shortcutBtn.element.style.setProperty("background", "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)", "important");
    shortcutBtn.element.style.setProperty("color", "#ffffff", "important");
    shortcutBtn.element.style.setProperty("font-weight", "600", "important");
    shortcutBtn.element.style.setProperty("border-color", "#a855f7", "important");
  }

  const deleteListBtn = new Button({
    text: "설정제거창",
    variant: "danger",
    size: "small",
    onClick: handleDeleteListClick || (() => Toast.show("블랙리스트에 등록된 사이트에서는 사용할 수 없습니다.")),
  });

  const blacklistBtn = new Button({
    text: isBlacklisted ? "🟢 블랙리스트 해제" : "⛔ 블랙리스트 추가",
    variant: isBlacklisted ? "success" : "danger",
    size: "small",
    onClick: handleBlacklistClick,
  });

  const isBlurActive = isImageBlurEnabled();
  const imageBlurBtn = new Button({
    text: isBlurActive ? "🖼️ 이미지 블러 ON" : "🖼️ 이미지 블러 OFF",
    variant: isBlurActive ? "success" : "warning",
    size: "small",
    onClick: () => {
      window.__adblock_toggleImageBlur();
    },
  });
  if (imageBlurBtn && imageBlurBtn.element) {
    imageBlurBtn.element.id = "adblock-image-blur-btn";
    imageBlurBtn.element.style.backgroundColor = isBlurActive ? '#22c55e' : '#eab308';
    imageBlurBtn.element.style.color = '#09090b';
    imageBlurBtn.element.style.fontWeight = '600';
    imageBlurBtn.element.style.borderColor = isBlurActive ? '#4ade80' : '#fde047';
  }

  pickerCoverBtn.appendTo(menuWrapper);
  pickerHideBtn.appendTo(menuWrapper);
  urlBlockBtn.appendTo(menuWrapper);
  styleInjectBtn.appendTo(menuWrapper);
  shortcutBtn.appendTo(menuWrapper);
  imageBlurBtn.appendTo(menuWrapper);
  deleteListBtn.appendTo(menuWrapper);
  blacklistBtn.appendTo(menuWrapper);

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

      // --- Anti-DevTools Detection Defense ---
      // 1. Function("debugger") 및 eval("debugger") 무력화
      try {
        const origFunction = Function.prototype.constructor;
        const handler = {
          construct(target, args) {
            if (args[0] && typeof args[0] === 'string' && args[0].includes('debugger')) {
              return function() {};
            }
            return new target(...args);
          },
          apply(target, thisArg, args) {
            if (args[0] && typeof args[0] === 'string' && args[0].includes('debugger')) {
              return function() {};
            }
            return target.apply(thisArg, args);
          }
        };
        window.Function = new Proxy(Function, handler);
      } catch (e) {}

      // 2. console.clear() 및 감지 트랩 무력화
      try {
        if (typeof console !== 'undefined' && console.clear) {
          console.clear = function() {
            console.warn("[Dynamic Ad Blocker] Suppressed console.clear() devtools detection sweep.");
          };
        }
      } catch (e) {}

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

  // 1. 정확히 지정한 도메인만 일치 (Strict Exact Match)
  if (cleanRule === cleanTarget) {
    return true;
  }

  // 2. 와일드카드(*)가 포함된 경우만 패턴 매칭
  if (cleanRule.includes("*")) {
    const escaped = cleanRule.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    const wildcardRegexStr = escaped.replace(/\*/g, ".*");
    const regexStr = "^" + wildcardRegexStr + "$";
    try {
      const regex = new RegExp(regexStr);
      return regex.test(cleanTarget);
    } catch (e) {
      return false;
    }
  }

  return false;
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
    const idSel = '#' + CSS.escape(cleanId);
    try {
      if (document.querySelectorAll(idSel).length === 1) {
        return idSel;
      }
    } catch (e) {}
    return idSel;
  }
  
  const tagName = el.tagName.toLowerCase();
  if (el.className && typeof el.className === 'string') {
    const classList = Array.from(el.classList).filter(c => c && c !== 'adblock-picker-overlay');
    if (classList.length > 0) {
      const classSel = tagName + '.' + classList.map(c => CSS.escape(c.trim())).join('.');
      try {
        if (document.querySelectorAll(classSel).length === 1) {
          return classSel;
        }
      } catch (e) {}
    }
  }

  let selector = tagName;
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

function scoreSelectorCandidate(sel, targetEl) {
  if (!sel) return -1000;
  let score = 500;

  // 1. 단독 ID (#id) 선택자 우대 (+500)
  if (/^[a-z0-9_-]*#[a-zA-Z0-9_-]+$/i.test(sel)) {
    score += 500;
  }

  // 2. 단독 클래스 (.class 또는 tag.class) 선택자 우대 (+300)
  if (/^[a-z0-9_-]*\.[a-zA-Z0-9_-]+$/i.test(sel)) {
    score += 300;
  }

  // 3. 속성 선택자 우대 (+250)
  if (/\[[a-zA-Z0-9_-]+(=|\*=|\^=|\$=)/.test(sel)) {
    score += 250;
  }

  // 4. nth-child 포함 시 감점 (-150 per match)
  const nthMatches = sel.match(/:nth-child/g);
  if (nthMatches) {
    score -= nthMatches.length * 150;
  }

  // 5. 직속 자식/하위 조상 경로 깊이 감점 (-40 per depth)
  const depthMatches = sel.match(/[>\s]/g);
  if (depthMatches) {
    score -= depthMatches.length * 40;
  }

  // 6. 길이에 따른 미세 감점 (짧을수록 선호)
  score -= sel.length;

  // 7. 실시간 유일성 평가 (페이지에서 targetEl을 포함하거나 오직 targetEl 1개만 지칭하는 경우 우대)
  if (targetEl && typeof document !== 'undefined') {
    try {
      const found = querySelectorAllExtended(sel);
      if (found.length === 1 && found[0] === targetEl) {
        score += 400; // 오직 1개 요소만 가리키는 완전 유일 독립 선택자
      } else if (found.includes(targetEl)) {
        score += 150;
      }
    } catch (e) {}
  }

  return score;
}

function generateCandidateSelectors(el) {
  if (!el || el.nodeType !== 1) return [];

  const candidates = [];
  const tagName = el.tagName.toLowerCase();

  // 1. ID 기반 후보
  if (el.id && typeof el.id === 'string' && el.id.trim()) {
    const cleanId = el.id.trim();
    candidates.push('#' + CSS.escape(cleanId));
    candidates.push(`${tagName}#${CSS.escape(cleanId)}`);
  }

  // 2. 클래스 기반 후보
  if (el.className && typeof el.className === 'string') {
    const classList = Array.from(el.classList).filter(c => c && c !== 'adblock-picker-overlay');
    if (classList.length > 0) {
      const fullClass = classList.map(c => CSS.escape(c.trim())).join('.');
      candidates.push('.' + fullClass);
      candidates.push(`${tagName}.${fullClass}`);

      classList.forEach(c => {
        const clean = c.trim();
        if (clean.length >= 2) {
          candidates.push('.' + CSS.escape(clean));
          candidates.push(`${tagName}.${CSS.escape(clean)}`);

          const classPrefixMatch = clean.match(/^([a-zA-Z0-9_-]+?)\d+$/);
          if (classPrefixMatch && classPrefixMatch[1] && classPrefixMatch[1].length >= 3) {
            candidates.push(`[class*="${classPrefixMatch[1]}"]`);
          }
        }
      });
    }
  }

  // 3. 속성 / 데이터(Data) / 커스텀 속성 후보
  if (el.attributes) {
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      const name = attr.name.toLowerCase();
      const val = attr.value.trim();

      if (name === "style" || name === "class" || name.startsWith("on")) continue;

      if (name.startsWith("data-") || name.startsWith("aria-") || ["role", "name", "type", "id", "src", "href", "x-show"].includes(name) || name.includes("-")) {
        if (val) {
          if (val.length < 50) {
            candidates.push(`[${name}="${CSS.escape(val)}"]`);
            candidates.push(`${tagName}[${name}="${CSS.escape(val)}"]`);

            const valMatch = val.match(/^([a-zA-Z0-9_-]+?)[\[\d_-]+/);
            if (valMatch && valMatch[1] && valMatch[1].length >= 3) {
              candidates.push(`[${name}*="${valMatch[1]}"]`);
            }
          } else {
            candidates.push(`[${name}]`);
          }
        } else {
          candidates.push(`[${name}]`);
        }
      }
    }
  }

  // 4. 부모 조합 간결 경로 후보
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

  // 5. 기본 계층 풀 경로 선택자
  const primary = getUniqueSelector(el);
  if (primary) candidates.push(primary);

  // 6. 단순 태그명
  candidates.push(tagName);

  const uniqueList = Array.from(new Set(candidates)).filter(s => s && s.trim().length > 0);

  // 가중치 점수에 따라 내림차순 정렬하여 가장 간결하고 유일하며 독립적인 선택자가 1순위(index 0)가 되도록 함
  uniqueList.sort((a, b) => scoreSelectorCandidate(b, el) - scoreSelectorCandidate(a, el));

  return uniqueList;
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

function startElementPicker(onSelect, options = {}) {
  if (isPickerActive) return;
  isPickerActive = true;

  const isPurple = options && options.theme === 'purple';
  const borderStyle = isPurple ? "3px dashed #cba6f7" : "3px dashed orange";
  const bgStyle = isPurple ? "rgba(203, 166, 247, 0.25)" : "rgba(255, 152, 0, 0.2)";

  Toast.show(isPurple ? '단축키를 할당할 영역을 클릭하세요. (취소: ESC)' : '가릴 광고 영역을 클릭하세요. (취소: ESC)');

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
  pickerOverlayElement.style.border = borderStyle;
  pickerOverlayElement.style.backgroundColor = bgStyle;
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

function isExtendedSelector(selector) {
  if (!selector || typeof selector !== 'string') return false;
  return selector.includes(':has-text(') || selector.includes(':contains(');
}

function querySelectorAllExtended(selectorStr) {
  if (!selectorStr || typeof selectorStr !== 'string') return [];

  const hasTextIdx = selectorStr.indexOf(':has-text(');
  const containsIdx = selectorStr.indexOf(':contains(');

  if (hasTextIdx === -1 && containsIdx === -1) {
    try {
      return Array.from(document.querySelectorAll(selectorStr));
    } catch (e) {
      return [];
    }
  }

  const keyword = (hasTextIdx !== -1) ? ':has-text(' : ':contains(';
  const targetIdx = (hasTextIdx !== -1) ? hasTextIdx : containsIdx;

  const prefix = selectorStr.substring(0, targetIdx).trim();
  const rest = selectorStr.substring(targetIdx + keyword.length);

  const closeParenIdx = rest.indexOf(')');
  if (closeParenIdx === -1) {
    try {
      return Array.from(document.querySelectorAll(selectorStr));
    } catch (e) {
      return [];
    }
  }

  let textPattern = rest.substring(0, closeParenIdx).trim();
  const suffix = rest.substring(closeParenIdx + 1).trim();

  let baseSelector = prefix || '*';
  let childSelector = '';

  if (suffix) {
    if (prefix.includes(':has(') && suffix.startsWith(')')) {
      let count = 0;
      let closeIdx = -1;
      for (let i = 0; i < suffix.length; i++) {
        if (suffix[i] === ')') {
          count++;
          closeIdx = i;
          break;
        }
      }
      if (closeIdx !== -1) {
        baseSelector = prefix + suffix.substring(0, closeIdx + 1);
        childSelector = suffix.substring(closeIdx + 1).trim();
      } else {
        baseSelector = prefix + suffix;
      }
    } else if (suffix.startsWith('>') || suffix.startsWith(' ') || suffix.startsWith('+') || suffix.startsWith('~')) {
      childSelector = suffix;
    } else {
      baseSelector = prefix + suffix;
    }
  }

  // 감싸는 따옴표 제거 ('BL' 또는 "BL" -> BL)
  if ((textPattern.startsWith("'") && textPattern.endsWith("'")) ||
      (textPattern.startsWith('"') && textPattern.endsWith('"'))) {
    textPattern = textPattern.slice(1, -1);
  }

  let candidates = [];
  try {
    candidates = Array.from(document.querySelectorAll(baseSelector));
  } catch (e) {
    return [];
  }

  const filtered = candidates.filter(el => {
    if (!el) return false;
    const text = el.textContent || '';

    // 정규식 패턴인 경우 (예: /BL/i)
    if (textPattern.startsWith('/') && textPattern.lastIndexOf('/') > 0) {
      const lastSlashIdx = textPattern.lastIndexOf('/');
      const patternStr = textPattern.slice(1, lastSlashIdx);
      const flags = textPattern.slice(lastSlashIdx + 1);
      try {
        const regex = new RegExp(patternStr, flags);
        return regex.test(text);
      } catch (e) {
        return false;
      }
    }

    return text.includes(textPattern);
  });

  if (childSelector) {
    const results = [];
    filtered.forEach(parentEl => {
      try {
        const subChildren = parentEl.querySelectorAll(`:scope ${childSelector}`);
        results.push(...Array.from(subChildren));
      } catch (e) {}
    });
    return Array.from(new Set(results));
  }

  return filtered;
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
  let textVal = item.selector || item.pattern || item.value || "";
  if (!textVal && item.key && item.target) {
    textVal = `'${item.key}' 키 -> ${item.target}`;
  }
  return {
    text: textVal,
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

  // 일반 선택자와 :has-text() 같은 확장 선택자를 분리
  const stdCover = coverSelectors.filter(s => !isExtendedSelector(s));
  const stdHide = displayNoneSelectors.filter(s => !isExtendedSelector(s));

  let cssString = "";

  if (stdCover && stdCover.length > 0) {
    const baseRules = stdCover.join(", ") + " { position: relative !important; overflow: hidden !important; }";
    const overlayRules = stdCover.map(s => `${s}::after`).join(", ") + 
      " { content: '' !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; background-color: white !important; z-index: 99999 !important; pointer-events: auto !important; }";
    cssString += `${baseRules}\n${overlayRules}\n`;
  }

  if (stdHide && stdHide.length > 0) {
    const hideRules = stdHide.join(", ") + " { display: none !important; }";
    cssString += `${hideRules}\n`;
  }

  if (customStyleList && customStyleList.length > 0) {
    customStyleList.forEach(item => {
      if (!item) return;
      const sel = typeof item === 'string' ? item : item.selector;
      const style = typeof item === 'string' ? '' : item.style;
      if (sel && style) {
        const normSel = normalizeWildcardSelector(sel);
        if (!isExtendedSelector(normSel)) {
          cssString += `${normSel} { ${style} }\n`;
        }
      }
    });
  }

  if (adblockStyleElement) {
    adblockStyleElement.textContent = cssString;
  } else if (cssString) {
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

  // 즉시 DOM 요소에 인라인 스타일 및 물리적 숨김 강제 적용 (확장 선택자 포함)
  const applyDirectStyles = () => {
    const cleanCover = extractStringSelectors(coverSelectors);
    const cleanHide = extractStringSelectors(displayNoneSelectors);

    if (cleanHide && cleanHide.length > 0) {
      cleanHide.forEach((sel) => {
        try {
          querySelectorAllExtended(sel).forEach((el) => {
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
          querySelectorAllExtended(sel).forEach((el) => {
            el.style.setProperty("position", "relative", "important");
            el.style.setProperty("overflow", "hidden", "important");
          });
        } catch (e) {}
      });
    }
    if (customStyleList && customStyleList.length > 0) {
      customStyleList.forEach(item => {
        if (!item) return;
        const sel = typeof item === 'string' ? item : item.selector;
        const style = typeof item === 'string' ? '' : item.style;
        if (sel && style) {
          const normSel = normalizeWildcardSelector(sel);
          if (isExtendedSelector(normSel)) {
            try {
              querySelectorAllExtended(normSel).forEach(el => {
                el.style.cssText += `; ${style}`;
              });
            } catch (e) {}
          }
        }
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
function deduplicateShortcutList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const result = [];
  list.forEach(item => {
    if (!item) return;
    const textKey = typeof item === 'string' ? item.trim() : `${item.key}_${item.target}`;
    if (textKey && !seen.has(textKey)) {
      seen.add(textKey);
      result.push(item);
    }
  });
  return result;
}

  // Gist 룰을 정상적으로 불러온 경우 Gist 원격 데이터(Single Source of Truth)를 최우선으로 반영하여
  // 타 기기나 Gist에서 삭제한 선택자가 이전 로컬 캐시와 병합되어 다시 부활하는 현상을 방지
  if (freshRulesArray && freshRulesArray.length > 0) {
    const ruleMap = new Map();
    freshRulesArray.forEach(r => {
      if (r && r.host) {
        r.selectorList = deduplicateRuleList(r.selectorList);
        r.displayNoneSelectorList = deduplicateRuleList(r.displayNoneSelectorList);
        r.customStyleList = deduplicateRuleList(r.customStyleList);
        r.shortcuts = deduplicateShortcutList(r.shortcuts);
        ruleMap.set(r.host, r);
      }
    });
    rulesArray = Array.from(ruleMap.values());
    GM_setValue("cachedRules", rulesArray);
  } else {
    // Gist 로드 실패 시 또는 미설정 시 기존 로컬 캐시 활용
    const localCachedRules = GM_getValue("cachedRules", []);
    const ruleMap = new Map();
    localCachedRules.forEach(r => {
      if (r && r.host) {
        r.selectorList = deduplicateRuleList(r.selectorList);
        r.displayNoneSelectorList = deduplicateRuleList(r.displayNoneSelectorList);
        r.customStyleList = deduplicateRuleList(r.customStyleList);
        r.shortcuts = deduplicateShortcutList(r.shortcuts);
        ruleMap.set(r.host, r);
      }
    });
    rulesArray = Array.from(ruleMap.values());
    GM_setValue("cachedRules", rulesArray);
  }

  const KOR_ENG_MAP = {
    'q': 'ㅂ', 'w': 'ㅈ', 'e': 'ㄷ', 'r': 'ㄱ', 't': 'ㅅ', 'y': 'ㅛ', 'u': 'ㅕ', 'i': 'ㅑ', 'o': 'ㅐ', 'p': 'ㅔ',
    'a': 'ㅁ', 's': 'ㄴ', 'd': 'ㅇ', 'f': 'ㄹ', 'g': 'ㅎ', 'h': 'ㅗ', 'j': 'ㅓ', 'k': 'ㅏ', 'l': 'ㅣ',
    'z': 'ㅋ', 'x': 'ㅌ', 'c': 'ㅊ', 'v': 'ㅍ', 'b': 'ㅠ', 'n': 'ㅜ', 'm': 'ㅡ',
    'Q': 'ㅃ', 'W': 'ㅉ', 'E': 'ㄸ', 'R': 'ㄲ', 'T': 'ㅆ', 'O': 'ㅖ', 'P': 'ㅖ',
  };

  const ENG_KOR_MAP = {};
  Object.keys(KOR_ENG_MAP).forEach(eng => {
    ENG_KOR_MAP[KOR_ENG_MAP[eng]] = eng.toLowerCase();
  });

  function getKorEngPair(char) {
    if (!char) return [char];
    const lower = char.toLowerCase();
    if (KOR_ENG_MAP[lower]) {
      return Array.from(new Set([char, KOR_ENG_MAP[lower]]));
    }
    if (ENG_KOR_MAP[char]) {
      return Array.from(new Set([char, ENG_KOR_MAP[char]]));
    }
    return [char];
  }

  function parseAndExpandShortcutKeys(keyInput) {
    let rawItems = [];
    if (Array.isArray(keyInput)) {
      rawItems = keyInput.map(k => String(k).trim()).filter(Boolean);
    } else if (typeof keyInput === 'string') {
      let str = keyInput.trim();
      const regex = /([a-zA-Z0-9+_]+)?\(([^)]+)\)/g;
      let match;
      let expandedStrs = [str];

      while ((match = regex.exec(str)) !== null) {
        const fullMatch = match[0];
        const prefix = match[1] || '';
        const innerKeys = match[2].split(',').map(k => k.trim()).filter(Boolean);
        const replacedParts = innerKeys.map(k => `${prefix}${k}`);
        
        const newExpanded = [];
        expandedStrs.forEach(s => {
          if (s.includes(fullMatch)) {
            replacedParts.forEach(rp => {
              newExpanded.push(s.replace(fullMatch, rp));
            });
          } else {
            newExpanded.push(s);
          }
        });
        expandedStrs = newExpanded;
      }

      rawItems = [];
      expandedStrs.forEach(s => {
        s.split(',').forEach(item => {
          const trimmed = item.trim();
          if (trimmed) rawItems.push(trimmed);
        });
      });
    }

    const resultList = [];
    const addedKeys = new Set();

    rawItems.forEach(item => {
      const parts = item.split('+').map(p => p.trim()).filter(Boolean);
      if (parts.length === 0) return;

      if (parts.length === 1) {
        const singleKey = parts[0];
        const pairs = getKorEngPair(singleKey);
        pairs.forEach(pk => {
          if (!addedKeys.has(pk)) {
            addedKeys.add(pk);
            resultList.push({ isCombo: false, keys: [pk], raw: pk });
          }
        });
      } else {
        const modifiers = parts.slice(0, -1);
        const lastKey = parts[parts.length - 1];
        const pairs = getKorEngPair(lastKey);

        pairs.forEach(pk => {
          const comboList = [...modifiers, pk];
          const comboKeyStr = comboList.join('+').toLowerCase();
          if (!addedKeys.has(comboKeyStr)) {
            addedKeys.add(comboKeyStr);
            resultList.push({ isCombo: true, keys: comboList, raw: comboKeyStr });
          }
        });
      }
    });

    return resultList;
  }

  let activeShortcutCleanups = [];

  function initSiteShortcuts(activeRules = rulesArray) {
    activeShortcutCleanups.forEach(cleanup => {
      try { cleanup(); } catch (e) {}
    });
    activeShortcutCleanups = [];

    const matchedShortcuts = [];
    activeRules.forEach(r => {
      if (!r || !r.host) return;
      const ruleHost = (r.host || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
      if (isMatch(ruleHost, currentHost) && Array.isArray(r.shortcuts)) {
        matchedShortcuts.push(...r.shortcuts);
      }
    });

    const cleanShortcuts = deduplicateShortcutList(matchedShortcuts);
    if (cleanShortcuts.length === 0) return;

    console.log(`[Dynamic Ad Blocker] 매칭된 단축키 ${cleanShortcuts.length}개 바인딩 완료:`, cleanShortcuts);

    cleanShortcuts.forEach(sc => {
      if (!sc) return;
      const keyVal = typeof sc === 'string' ? sc : sc.key;
      const targetVal = typeof sc === 'object' ? sc.target : '';
      if (!keyVal || !targetVal) return;

      const expandedItems = parseAndExpandShortcutKeys(keyVal);
      if (expandedItems.length === 0) return;

      const handleShortcutAction = (e) => {
        const activeEl = document.activeElement;
        if (activeEl) {
          const tag = activeEl.tagName ? activeEl.tagName.toUpperCase() : '';
          if (tag === 'INPUT' || tag === 'TEXTAREA' || activeEl.isContentEditable) {
            return;
          }
        }

        try {
          const found = targetVal ? querySelectorAllExtended(targetVal) : [];
          const el = found.length > 0 ? found[0] : (targetVal ? document.querySelector(targetVal) : null);

          if (sc.isFunc || sc.code) {
            console.log(`[Dynamic Ad Blocker] 단축키 JS/JSX 코드 실행 ('${keyVal}'):`, sc.code);
            const fn = new Function('el', 'targetElement', 'e', 'event', sc.code);
            fn(el, el, e, e);
          } else if (el) {
            console.log(`[Dynamic Ad Blocker] 단축키 트리거 ('${keyVal}') -> 클릭:`, targetVal, el);
            el.click();
          }
        } catch (err) {
          console.error(`[Dynamic Ad Blocker] 단축키 실행 에러:`, err);
        }
      };

      // 1. useKeyPress / useKeysPress 등록
      expandedItems.forEach(item => {
        if (!item.isCombo) {
          const singleKey = item.keys[0];
          if (typeof useKeyPress === 'function') {
            const unbind = useKeyPress(singleKey, handleShortcutAction);
            if (typeof unbind === 'function') activeShortcutCleanups.push(unbind);
          }
        } else {
          const normalizedKeys = item.keys.map(k => {
            const lk = k.toLowerCase();
            if (lk === 'ctrl' || lk === 'control') return 'Control';
            if (lk === 'shift') return 'Shift';
            if (lk === 'alt') return 'Alt';
            if (lk === 'meta' || lk === 'cmd') return 'Meta';
            return k;
          });

          if (typeof useKeysPress === 'function') {
            const unbind = useKeysPress(normalizedKeys, handleShortcutAction);
            if (typeof unbind === 'function') activeShortcutCleanups.push(unbind);
          } else if (typeof useKeyPress === 'function') {
            const unbind = useKeyPress(item.keys[item.keys.length - 1], handleShortcutAction);
            if (typeof unbind === 'function') activeShortcutCleanups.push(unbind);
          }
        }
      });

      // 2. 캡처링 전역 keydown 이벤트 리스너 (이벤트 씹힘/충돌 방지 백업)
      const directKeyHandler = (e) => {
        if (!e || !e.key) return;

        const activeEl = document.activeElement;
        if (activeEl) {
          const tag = activeEl.tagName ? activeEl.tagName.toUpperCase() : '';
          if (tag === 'INPUT' || tag === 'TEXTAREA' || activeEl.isContentEditable) {
            return;
          }
        }

        const isMatched = expandedItems.some(item => {
          const targetKey = item.keys[item.keys.length - 1].toLowerCase();
          const currentKey = e.key.toLowerCase();
          if (targetKey !== currentKey) return false;

          if (!item.isCombo) {
            return !e.ctrlKey && !e.altKey && !e.metaKey;
          } else {
            const mods = item.keys.slice(0, -1).map(m => m.toLowerCase());
            const needCtrl = mods.includes('ctrl') || mods.includes('control');
            const needShift = mods.includes('shift');
            const needAlt = mods.includes('alt');
            const needMeta = mods.includes('meta') || mods.includes('cmd');

            return (
              (needCtrl === !!e.ctrlKey) &&
              (needShift === !!e.shiftKey) &&
              (needAlt === !!e.altKey) &&
              (needMeta === !!e.metaKey)
            );
          }
        });

        if (!isMatched) return;

        try {
          const found = targetVal ? querySelectorAllExtended(targetVal) : [];
          const el = found.length > 0 ? found[0] : (targetVal ? document.querySelector(targetVal) : null);

          if (sc.isFunc || sc.code) {
            console.log(`[Dynamic Ad Blocker] keydown JS/JSX 코드 실행 ('${e.key}'):`, sc.code);
            e.preventDefault();
            e.stopPropagation();
            const fn = new Function('el', 'targetElement', 'e', 'event', sc.code);
            fn(el, el, e, e);
          } else if (el) {
            console.log(`[Dynamic Ad Blocker] keydown 트리거 ('${e.key}') -> 클릭:`, targetVal, el);
            e.preventDefault();
            e.stopPropagation();
            el.click();
          }
        } catch (err) {}
      };

      window.addEventListener('keydown', directKeyHandler, true);
      activeShortcutCleanups.push(() => {
        window.removeEventListener('keydown', directKeyHandler, true);
      });
    });
  }

  initSiteShortcuts(rulesArray);

  function checkAndApply(propsRulesArray) {
    const activeRules = propsRulesArray || rulesArray;
    let matched = false;

    console.log(`[AdBlocker Debug] checkAndApply 실행 - 현재창 Host: "${currentHost}" (URL: ${window.location.href})`);
    console.log(`[AdBlocker Debug] 전체 등록된 규칙 개수: ${activeRules.length}`);
    activeRules.forEach((r, idx) => {
      console.log(`[AdBlocker Debug] 룰 #${idx + 1} - Host: "${r.host}" (덮기: ${(r.selectorList || []).length}, 제거: ${(r.displayNoneSelectorList || []).length}, 단축키: ${(r.shortcuts || []).length})`);
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

    initSiteShortcuts(activeRules);

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

    let elementStack = initialElement ? [initialElement] : [];
    if (elementStack.length === 0 && initialSelector) {
      try {
        const found = querySelectorAllExtended(initialSelector);
        if (found.length > 0 && found[0]) {
          elementStack = [found[0]];
        }
      } catch (e) {}
    }
    let currentIndex = 0;
    const isShortcutType = type === 'shortcut';
    const highlightBorder = isShortcutType ? '2px dashed #cba6f7' : '2px dashed #ff9800';
    const highlightBg = isShortcutType ? 'rgba(203, 166, 247, 0.22)' : 'rgba(255, 152, 0, 0.18)';

    const defaultSel = initialSelector || (elementStack[0] ? (generateCandidateSelectors(elementStack[0])[0] || getUniqueSelector(elementStack[0])) : '선택자');
    const defaultFuncCode = `document.querySelector("${defaultSel}").click();`;

    function createHighlightBox(rect) {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      const box = document.createElement("div");
      box.style.cssText = `
        position: absolute;
        pointer-events: none;
        z-index: 1000000;
        border: ${highlightBorder};
        background-color: ${highlightBg};
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
          const found = querySelectorAllExtended(cleanSelector);
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

    const actionName = isShortcutType ? '단축키 지정' : (type === 'displayNone' ? '영역 제거(display:none)' : (type === 'style' ? '스타일 주입' : '흰색 덮기'));
    const isStyleType = type === 'style';
    const headerTitleColor = isShortcutType ? '#cba6f7' : '#ff9800';

    let livePreviewStyle = document.getElementById("adblock-live-style-preview");
    if (!livePreviewStyle) {
      livePreviewStyle = document.createElement("style");
      livePreviewStyle.id = "adblock-live-style-preview";
      (document.head || document.documentElement).appendChild(livePreviewStyle);
    }

    modalContainer.innerHTML = `
      <div id="adblock-modal-resizer-left" style="position: absolute; left: 0; top: 0; width: 6px; height: 100%; cursor: ew-resize; z-index: 10;" title="드래그하여 너비 조절"></div>
      <div style="padding: 12px 16px; background: rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center; user-select: none;">
        <span style="font-weight: 600; font-size: 13px; color: ${headerTitleColor};">[${actionName}] 선택자 지정</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button id="adblock-modal-toggle-pos" style="background: none; border: none; color: #a1a1aa; font-size: 13px; cursor: pointer; padding: 2px 4px; line-height: 1;" title="상단/하단 위치 전환">⬆️</button>
          <button id="adblock-modal-maximize" style="background: none; border: none; color: #a1a1aa; cursor: pointer; padding: 2px 4px; display: inline-flex; align-items: center; justify-content: center; line-height: 1;" title="높이 최대화 / 원래대로">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          </button>
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
        <div style="margin-bottom: 10px; width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden;">
          <label style="display: block; color: #a1a1aa; font-size: 11px; margin-bottom: 4px; font-weight: 500;">추천 선택자 목록 (선택 시 자동 적용):</label>
          <select id="adblock-modal-candidate-select" style="width: 100%; max-width: 100%; box-sizing: border-box; height: 38px; padding: 6px 30px 6px 10px; background-color: #09090b; color: #4ade80; border: 1px solid #3f3f46; border-radius: 6px; font-family: monospace; font-size: 12px; outline: none; cursor: pointer; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; display: block;">
          </select>
        </div>
        ${isShortcutType ? `
        <div style="margin-bottom: 14px;">
          <label style="display: block; color: #a1a1aa; font-size: 12px; margin-bottom: 4px; font-weight: 500;">할당할 단축키 (Key):</label>
          <input type="text" id="adblock-modal-shortcut-key-input" placeholder="예: a 또는 d 또는 ArrowLeft" style="width: 100%; box-sizing: border-box; padding: 8px 10px; background: #09090b; color: #cba6f7; border: 1px solid #3f3f46; border-radius: 6px; font-family: monospace; font-size: 12px; font-weight: bold; outline: none;" value="" />
        </div>
        <div id="adblock-modal-code-wrapper" style="margin-bottom: 14px;">
          <label style="display: block; color: #cba6f7; font-size: 12px; margin-bottom: 4px; font-weight: 500;">실행할 JS/JSX 코드 (Function):</label>
          <textarea id="adblock-modal-code-input" style="width: 100%; box-sizing: border-box; padding: 8px 10px; background: #09090b; color: #cba6f7; border: 1px solid #cba6f7; border-radius: 6px; font-family: monospace; font-size: 11px; outline: none; height: 75px; resize: vertical;">${defaultFuncCode}</textarea>
        </div>
        ` : ''}
        ${isStyleType ? `
        <div style="margin-bottom: 14px;">
          <label style="display: block; color: #a1a1aa; font-size: 12px; margin-bottom: 4px; font-weight: 500;">주입할 CSS 스타일 (Style):</label>
          <textarea id="adblock-modal-style-input" placeholder="예: background: red !important; opacity: 0.5;" style="width: 100%; box-sizing: border-box; padding: 8px 10px; background: #09090b; color: #ffab40; border: 1px solid #3f3f46; border-radius: 6px; font-family: monospace; font-size: 12px; outline: none; height: 55px; resize: vertical;"></textarea>
        </div>
        ` : ''}
        <div style="margin-top: 10px; margin-bottom: 14px;">
          <label style="display: flex; align-items: center; gap: 8px; color: #a1a1aa; font-size: 12px; cursor: pointer; user-select: none; line-height: 1.3;" title="도메인의 숫자 부분을 * 와일드카드로 저장하여 넘버링 도메인에 동시 적용">
            <input type="checkbox" id="adblock-modal-domain-wildcard" style="width: 16px; height: 16px; min-width: 16px; min-height: 16px; accent-color: #ff9800; cursor: pointer; flex-shrink: 0; margin: 0;" ${hasNumericDomain(window.location.hostname) ? 'checked' : ''} />
            <span style="display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px; line-height: 1.3;">와일드카드 도메인 적용 <span style="color: #ffab40; font-family: monospace; font-size: 11px;">(${getWildcardDomain(window.location.hostname)})</span></span>
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

    if (inputEl) {
      inputEl.oninput = () => {
        const curVal = inputEl.value.trim();
        if (isShortcutType && codeInput) {
          const currentCode = codeInput.value.trim();
          if (!currentCode || currentCode.includes('document.querySelector(')) {
            codeInput.value = `document.querySelector("${curVal}").click();`;
          }
        }
        const curEl = elementStack[currentIndex];
        updateMultiOverlay(curVal, curEl);
        updateLiveStylePreview();
      };
    }

    function updateLiveStylePreview() {
      if (!isStyleType || !styleInput) return;
      const selVal = normalizeWildcardSelector(inputEl.value.trim());
      const cssText = styleInput.value.trim();

      if (selVal && cssText && !isExtendedSelector(selVal)) {
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
        ${isCurrent ? (isShortcutType ? 'background: rgba(203, 166, 247, 0.25); color: #cba6f7; font-weight: bold; border-left: 3px solid #cba6f7;' : 'background: rgba(255, 152, 0, 0.25); color: #ffab40; font-weight: bold; border-left: 3px solid #ff9800;') : (type === 'anc' ? 'color: #89b4fa;' : 'color: #cdd6f4;')}
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

    const codeInput = isShortcutType ? modalContainer.querySelector("#adblock-modal-code-input") : null;
    if (isShortcutType && codeInput) {
      const defaultSel = initialSelector || (initialElement ? (generateCandidateSelectors(initialElement)[0] || getUniqueSelector(initialElement)) : '');
      codeInput.value = `() => {\n  document.querySelector("${defaultSel}").click();\n}`;
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

      const curInputValue = inputEl ? inputEl.value.trim() : '';

      candidateList.forEach(sel => {
        const opt = document.createElement("option");
        opt.value = sel;
        opt.textContent = sel.length > 70 ? sel.substring(0, 67) + "..." : sel;
        opt.style.cssText = "background-color: #09090b; color: #4ade80;";
        if (sel === curInputValue) {
          opt.selected = true;
        }
        selectEl.appendChild(opt);
      });

      selectEl.onchange = () => {
        const chosenVal = selectEl.value;
        if (chosenVal && inputEl) {
          inputEl.value = chosenVal;
          if (isShortcutType && codeInput) {
            codeInput.value = `document.querySelector("${chosenVal}").click();`;
          }
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
        const candidateList = generateCandidateSelectors(curEl);
        const bestSel = candidateList.length > 0 ? candidateList[0] : getUniqueSelector(curEl);
        if (inputEl) inputEl.value = bestSel;

        if (isShortcutType && codeInput) {
          const currentCode = codeInput.value.trim();
          if (!currentCode || currentCode.includes('document.querySelector(')) {
            codeInput.value = `document.querySelector("${bestSel}").click();`;
          }
        }

        renderTree(curEl);
        renderCandidateSelect(curEl);
        updateMultiOverlay(bestSel, curEl);

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
        maxBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="9" width="12" height="12" rx="1.5"/><path d="M9 9V4.5A1.5 1.5 0 0 1 10.5 3H19.5A1.5 1.5 0 0 1 21 4.5V13.5A1.5 1.5 0 0 1 19.5 15H15"/></svg>';
        modalContainer.style.top = '24px';
        modalContainer.style.bottom = '24px';
        modalContainer.style.height = 'calc(100vh - 48px)';
        modalContainer.style.display = 'flex';
        modalContainer.style.flexDirection = 'column';

        infoEl.style.height = 'auto';
        infoEl.style.maxHeight = 'none';
        infoEl.style.flex = '1';
      } else {
        maxBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';
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
      const val = inputEl ? normalizeWildcardSelector(inputEl.value.trim()) : '';
      const styleVal = isStyleType && styleInput ? styleInput.value.trim() : '';
      const shortcutKeyInput = isShortcutType ? modalContainer.querySelector("#adblock-modal-shortcut-key-input") : null;
      const shortcutKeyVal = shortcutKeyInput ? shortcutKeyInput.value.trim() : '';
      const codeInput = isShortcutType ? modalContainer.querySelector("#adblock-modal-code-input") : null;
      const codeVal = isShortcutType && codeInput ? codeInput.value.trim() : '';
      const wildcardCheckbox = modalContainer.querySelector("#adblock-modal-domain-wildcard");
      const useWildcard = wildcardCheckbox ? wildcardCheckbox.checked : false;

      if (isShortcutType) {
        if (!shortcutKeyVal || !codeVal) {
          alert("할당할 단축키 키와 실행할 JS/JSX 코드는 필수 입력 항목입니다.");
          return;
        }
      }

      closeModal();
      if ((val || (isShortcutType && codeVal)) && onConfirm) {
        if (isStyleType) {
          onConfirm({ selector: val, style: styleVal, useWildcardDomain: useWildcard });
        } else if (isShortcutType) {
          const matchSel = codeVal.match(/document\.querySelector\((['"])(.*?)\1\)/);
          const extractedSel = matchSel ? matchSel[2] : val;
          onConfirm({ selector: extractedSel, key: shortcutKeyVal, isFunc: true, code: codeVal, useWildcardDomain: useWildcard });
        } else {
          onConfirm({ selector: val, useWildcardDomain: useWildcard });
        }
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

  window.__adblock_toggleBlacklist = () => {
    const isCurBlacklisted = typeof checkIsBlacklisted === 'function' ? checkIsBlacklisted() : false;
    if (isCurBlacklisted) {
      handleBlacklistReleaseClick();
    } else {
      handleBlacklistClick();
    }
  };

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

function handleShortcutAdd(finalSelector, targetElement = null) {
  showSelectorModal({
    initialElement: targetElement,
    initialSelector: finalSelector,
    type: 'shortcut',
    onConfirm: (result) => {
      const selectorStr = typeof result === 'object' ? result.selector : result;
      const keyStr = typeof result === 'object' ? result.key : '';
      const useWildcardDomain = typeof result === 'object' && result.useWildcardDomain;

      if (!selectorStr || !keyStr) {
        Toast.show("단축키 키와 선택자는 필수입니다.");
        return;
      }

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

      const isFunc = typeof result === 'object' && result.isFunc;
      const codeStr = typeof result === 'object' && result.code ? result.code : '';

      const newItem = {
        key: keyStr,
        target: selectorStr,
        isFunc: isFunc,
        code: codeStr,
        action: isFunc ? 'code' : 'click',
        createdAt: Date.now()
      };

      if (!currentPageRules) {
        currentPageRules = {
          host: targetHost,
          selectorList: [],
          displayNoneSelectorList: [],
          customStyleList: [],
          blockedUrlPatterns: [],
          shortcuts: [],
        };
        rulesArray.push(currentPageRules);
      } else if (useWildcardDomain) {
        currentPageRules.host = targetHost;
      }

      if (!currentPageRules.shortcuts) currentPageRules.shortcuts = [];
      currentPageRules.shortcuts.push(newItem);
      currentPageRules.shortcuts = deduplicateShortcutList(currentPageRules.shortcuts);

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
      initSiteShortcuts(rulesArray);
      Toast.show(`단축키 추가 완료: '${keyStr}' -> ${selectorStr}`);
    }
  });
}

function handleShortcutPickerClick() {
  startElementPicker((sel, el) => handleShortcutAdd(sel, el), { theme: 'purple' });
}

function showDeleteModal({ coverSelectors = [], hideSelectors = [], customStyles = [], urlPatterns = [], shortcuts = [], onConfirm }) {
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
      .adblock-modal-item.is-checked {
        background: rgba(243, 139, 168, 0.18) !important;
        border-color: #f38ba8 !important;
      }
      .adblock-modal-item input[type="checkbox"] {
        appearance: checkbox !important;
        -webkit-appearance: checkbox !important;
        width: 16px !important;
        height: 16px !important;
        min-width: 16px !important;
        display: inline-block !important;
        opacity: 1 !important;
        visibility: visible !important;
        position: static !important;
        margin-top: 2px !important;
        margin-right: 2px !important;
        cursor: pointer !important;
        accent-color: #f38ba8 !important;
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
    <span>⚙️ 설정 제거 창</span>
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
  createSection('단축키 규칙 (Shortcuts)', shortcuts, 'shortcut');

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
    let checkedCount = 0;
    checkboxes.forEach(cb => {
      const itemEl = cb.closest('.adblock-modal-item');
      if (cb.checked) {
        checkedCount++;
        if (itemEl) itemEl.classList.add('is-checked');
      } else {
        if (itemEl) itemEl.classList.remove('is-checked');
      }
    });
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
    const shortcuts = deduplicateShortcutList(currentPageRules.shortcuts || []);

    if (coverSelectors.length === 0 && hideSelectors.length === 0 && customStyles.length === 0 && urlPatterns.length === 0 && shortcuts.length === 0) {
      Toast.show('이 사이트에 등록된 설정 항목이 없습니다.');
      return;
    }

    showDeleteModal({
      coverSelectors,
      hideSelectors,
      customStyles,
      urlPatterns,
      shortcuts,
      onConfirm: async (selectedItems) => {
        const coverToDelete = [];
        const hideToDelete = [];
        const customToDelete = [];
        const urlsToDelete = [];
        const shortcutsToDelete = [];

        selectedItems.forEach(item => {
          if (item.type === 'cover') coverToDelete.push(item.index);
          else if (item.type === 'hide') hideToDelete.push(item.index);
          else if (item.type === 'custom') customToDelete.push(item.index);
          else if (item.type === 'url') urlsToDelete.push(item.index);
          else if (item.type === 'shortcut') shortcutsToDelete.push(item.index);
        });

        coverToDelete.sort((a, b) => b - a);
        hideToDelete.sort((a, b) => b - a);
        customToDelete.sort((a, b) => b - a);
        urlsToDelete.sort((a, b) => b - a);
        shortcutsToDelete.sort((a, b) => b - a);

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

        shortcutsToDelete.forEach(idx => {
          if (currentPageRules.shortcuts) {
            currentPageRules.shortcuts.splice(idx, 1);
          }
        });

        Toast.show('선택한 차단/단축키 항목이 삭제되었습니다. 적용을 위해 새로고침합니다.');

        GM_setValue("cachedRules", rulesArray);
        checkAndApply(rulesArray);
        initSiteShortcuts(rulesArray);

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
    const isBlacklisted = checkIsBlacklisted();

    window.__adblock_openGistConfig = () => showGistConfigModal();
    window.__adblock_openDeleteList = handleDeleteListClick;
    window.__adblock_toggleBlacklist = isBlacklisted ? handleBlacklistReleaseClick : handleBlacklistClick;

    registerTampermonkeyMenuCommands(isBlacklisted);

    if (isBlacklisted) {
      // 블랙리스트 사이트에서는 플로팅 버튼 그룹 생성 안함 (혹시 있으면 제거)
      const existing = document.getElementById("adblock-ui-group");
      if (existing) existing.remove();
      return;
    }

    makeButtonGroups({
      handleManualClick,
      handlePickerCoverClick,
      handlePickerHideClick,
      handleStyleInjectClick,
      handleShortcutClick: handleShortcutPickerClick,
      handleBlacklistClick: isBlacklisted ? handleBlacklistReleaseClick : handleBlacklistClick,
      handleUrlBlockClick,
      handleDeleteListClick,
      handleGistConfigClick: () => showGistConfigModal(),
      isBlacklisted
    });
  };

  setupFloatingButton();

  function ensureFloatingButtonExists() {
    if (checkIsBlacklisted()) {
      const existing = document.getElementById("adblock-ui-group");
      if (existing) existing.remove();
      return;
    }

    if (window.__adblock_isFloatingHidden) return;
    const targetParent = document.body || document.documentElement;
    if (!targetParent) return;

    let uiGroup = document.getElementById("adblock-ui-group");

    if (!uiGroup || !targetParent.contains(uiGroup)) {
      if (uiGroup) {
        targetParent.appendChild(uiGroup);
      } else {
        setupFloatingButton();
        uiGroup = document.getElementById("adblock-ui-group");
      }
    }

    if (uiGroup && targetParent) {
      if (targetParent.lastElementChild !== uiGroup) {
        targetParent.appendChild(uiGroup);
      }
      uiGroup.style.zIndex = "2147483647";
      uiGroup.style.display = "flex";
      uiGroup.style.visibility = "visible";
      uiGroup.style.opacity = "1";
    }
  }

  window.__adblock_ensureFloatingButton = ensureFloatingButtonExists;
  
  if (!window.__adblock_observerBound) {
    window.__adblock_observerBound = true;
    try {
      const observer = new MutationObserver(() => {
        ensureFloatingButtonExists();
      });
      if (document.documentElement) {
        observer.observe(document.documentElement, { childList: true });
      }
    } catch (e) {}
    setInterval(ensureFloatingButtonExists, 2000);
  }
  window.__adblock_toggleFloatingButton = function() {
    let uiGroup = document.getElementById("adblock-ui-group");
    const isCurrentlyVisible = uiGroup && uiGroup.style.display !== "none" && uiGroup.style.visibility !== "hidden";

    if (isCurrentlyVisible) {
      window.__adblock_isFloatingHidden = true;
      if (uiGroup) {
        uiGroup.style.display = "none";
      }
      if (typeof Toast !== "undefined" && Toast.show) {
        Toast.show("플로팅 버튼을 숨겼습니다.");
      }
    } else {
      window.__adblock_isFloatingHidden = false;
      ensureFloatingButtonExists();
      if (typeof Toast !== "undefined" && Toast.show) {
        Toast.show("플로팅 버튼을 띄웠습니다.");
      }
    }
  };

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
