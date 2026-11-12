# tampermonkey-adblocker

## 페이지 전역 `WJL`

이 스크립트는 [web-javascript-lib](https://github.com/SuperLeeK/web-javascript-lib) 일부를 `@require`로 불러, 페이지(DevTools 콘솔, 페이지 스크립트, 다른 유저스크립트)에서 `WJL`로 쓸 수 있게 넘깁니다.

`window.WJL`이 이미 있으면 통째로 덮지 않습니다. 객체가 아니면 경고만 하고 건너뜁니다. 객체이면 없는 키만 넣고, 같은 키가 있으면 경고한 뒤 그 키는 그대로 둡니다.

`useGist`, `useGMStorage`, `useValue`, `API`는 페이지에 노출하지 않습니다. 의존 위젯은 `Toast`뿐입니다 (`useDownload`가 `Toast.success` / `Toast.error`를 사용).

`WJL.useDownload`는 `GM_download`와 `GM_xmlhttpRequest`로 파일을 저장합니다. 아무 도메인에서나 XHR 폴백이 되도록 `@connect *`를 열었습니다. 페이지 스크립트도 이 함수로 다운로드를 걸 수 있습니다.

추가된 헤더: `@grant GM_download`, `@connect *`.

### 노출 이름

- `WJL.bindUniversalButton`
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
