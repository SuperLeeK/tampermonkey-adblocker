# tampermonkey-adblocker

## 페이지 전역 `WJL`

이 스크립트는 [web-javascript-lib](https://github.com/SuperLeeK/web-javascript-lib) 일부를 `@require`로 불러, 페이지(DevTools 콘솔, 페이지 스크립트, 다른 유저스크립트)에서 `WJL`로 쓸 수 있게 넘깁니다.

`window.WJL`이 이미 있으면 통째로 덮지 않습니다. 객체가 아니면 경고만 하고 건너뜁니다. 객체이면 없는 키만 넣고, 같은 키가 있으면 경고한 뒤 그 키는 그대로 둡니다.

`window.wjl`은 같은 객체를 가리킵니다. `wjl.X === WJL.X` 입니다. `wjl`이 이미 있는데 객체가 아니면 경고만 하고 건너뜁니다. 객체이면 없는 키만 같은 참조로 채웁니다.

`useGist`, `useGMStorage`, `useValue`, `API`는 페이지에 노출하지 않습니다. 의존 위젯은 `Toast`뿐입니다 (`useDownload`가 `Toast.success` / `Toast.error`를 사용).

`WJL.useDownload`는 `GM_download`와 `GM_xmlhttpRequest`로 파일을 저장합니다. 아무 도메인에서나 XHR 폴백이 되도록 `@connect *`를 열었습니다. 페이지 스크립트도 이 함수로 다운로드를 걸 수 있습니다.

추가된 헤더: `@grant GM_download`, `@connect *`.

### 노출 이름

- `WJL.bindUniversalButton`, `WJL.bindUniversalButtonAsync` (`@require`에 함수가 있을 때만)
- `WJL.bound` (라이브러리 레지스트리의 라이브 뷰. 있을 때만)
- `WJL.useKeyPress`, `WJL.useKeysPress`, `WJL.useGetKeyPress`, `WJL.useGetKeysPress`
- `WJL.useDownload.download`, `WJL.useDownload.version`
- `WJL.Toast.show`, `WJL.Toast.success`, `WJL.Toast.error`, `WJL.Toast.warning`, `WJL.Toast.info`, `WJL.Toast.init`, `WJL.Toast.config`, `WJL.Toast.createContainer`
- `WJL.cssToObject`, `WJL.objectToCss`, `WJL.queryStringToObject`, `WJL.objectToQueryString`
- `WJL.waitFor`, `WJL.waitForSeconds`, `WJL.waitForSelector`
- `WJL.findElement`, `WJL.findElements`, `WJL.findElementByTextContent`, `WJL.findElementsByTextContent`
- `WJL.findElementByProperty`, `WJL.findElementsByProperty`
- `WJL.triggerToElement`, `WJL.clickToElement`

### 예

```javascript
WJL.Toast.success('저장했습니다');

const off = WJL.useKeyPress('k', function (event) {
  console.log(event.key);
});

WJL.waitForSelector('h1', function (el) {
  console.log(el.textContent);
});

WJL.useDownload.download(
  ['https://example.com/a.png'],
  'images',
  { concurrency: 2 },
  function (progress) { console.log(progress.percent); }
).then(function (result) {
  console.log(result.successes, result.failures);
});
```

### `WJL.bindUniversalButtonAsync` / `WJL.bound`

`libs/bindUniversalButton.js`가 `bindUniversalButtonAsync`를 제공할 때만 페이지에 올립니다. 옛 `@require` 캐시에는 이 함수가 없을 수 있어서, 없으면 키를 만들지 않습니다.

```javascript
bindUniversalButton(options?)        // cleanup 함수
bindUniversalButtonAsync(options?)   // Promise<{name, fn, mode, element} | null>
```

`options.name`이 있으면 이름 입력 폼을 건너뜁니다. `options.register` 기본값은 `true` (false면 페이지 전역 할당만 생략). `options.target` 기본값은 `unsafeWindow`가 있으면 그 객체, 없으면 `window`. 취소하면 Promise는 `null`입니다.

레지스트리는 라이브러리의 같은 객체입니다.

`bindUniversalButton.bound === bindUniversalButtonAsync.bound === window.WJLBound`

(`unsafeWindow`가 있으면 그 쪽 `WJLBound`도 같은 참조입니다.)

`WJL.bound`는 그 객체의 라이브 뷰입니다. 나중에 등록한 함수도 페이지에서 바로 호출할 수 있습니다. Firefox에서는 `exportFunction`으로 넘깁니다.

```javascript
const picked = await WJL.bindUniversalButtonAsync({ name: 'tempFn' });
if (picked) picked.fn();

WJL.bound.tempFn();
wjl.bound.tempFn();
```

### `actionList`

호스트 규칙에 `actionList`를 두면 "언제(`when`) + 무엇을(`do`)"이 실행됩니다. 매칭되는 호스트의 목록을 모아 기존 규칙처럼 중복을 제거합니다. `selectValueList`는 그대로 동작합니다 (값 강제는 `forceSelectValue`).

```json
"actionList": [
  {"name":"더보기","when":{"type":"appear","selector":"button:has-text(더보기)"},"do":{"type":"click","selector":"button:has-text(더보기)"},"once":true},
  {"name":"버튼 묶기","when":{"type":"load","delay":800},"do":{"type":"wjl","fn":"bindUniversalButtonAsync","args":[{"name":"tempFn"}]}},
  {"name":"전부 펼치기","when":{"type":"menu"},"do":{"type":"code","code":"document.querySelectorAll('details').forEach(function (el) { el.open = true; })"}}
]
```

`do`는 객체 하나이거나, 순서대로 `await` 하는 배열입니다. `:has-text()`, `:contains()` 선택자는 `querySelectorAllExtended`로 찾습니다.

트리거:

- `load` — 로드 후 실행. `delay` 밀리초(기본 0).
- `appear` — 선택자가 보이면 실행. 요소마다 `WeakMap`으로 한 번만 처리해 클릭이 반복되지 않습니다. `select` / `setValue`가 아직 실패하면 그 요소는 다시 시도합니다. `once: true`면 첫 성공 뒤 규칙을 멈춥니다.
- `urlchange` — `pushState` / `replaceState` / `popstate` / `hashchange`.
- `interval` — `interval`, `ms`, `delay` 중 하나. 500ms 미만은 500ms로 올립니다. 생략하면 1000ms.
- `menu` — 현재 호스트에 맞는 규칙마다 `GM_registerMenuCommand` 한 개. 최상위 프레임만.
- `key` — 단축키와 같은 키 문법 (`ctrl+s`, 한/영 쌍). 입력 칸에 포커스가 있으면 무시합니다.

액션:

- `click` — 요소를 클릭합니다. `appear`가 넘긴 요소가 있고 선택자가 같으면 그 요소만 클릭합니다.
- `select` — `forceSelectValue`. `selector`, `value`.
- `setValue` — `input` / `textarea`. React가 알아채도록 프로토타입 setter와 `input` / `change` 이벤트를 씁니다.
- `wjl` — `fn` 이름의 WJL 함수를 `args`로 호출하고, Promise면 기다립니다.
- `code` — `new Function`. 본문에 `await`가 있으면 async 함수로 컴파일합니다. 인자: `el`, `targetElement`, `e`, `event`, `WJL`, `wjl`.

`code` 액션은 Gist에 적힌 자바스크립트를 유저스크립트 권한으로 모든 페이지에서 실행합니다. Gist 토큰을 안전하게 보관하세요.

단축키의 클릭 / `new Function` 실행도 같은 `runAction`을 탑니다. 설정 제거창과 디버그 로그에 `actionList` 개수가 포함됩니다.

메뉴 토글(`이미지 블러`, `플로팅버튼`)은 Tampermonkey 4.20+ 에서 `{id, autoClose}`로 같은 항목의 문구를 갱신합니다 (`ON`/`OFF`, `표시`/`숨김`). 오래된 매니저는 캡션만 등록하고, `GM_unregisterMenuCommand`가 있으면 그걸로 바꿉니다. 플로팅 버튼 자체는 빼지 않습니다.
