const URL_ATTRIBUTES = new Set(["href", "src"]);

function isSafeUrl(value) {
  return /^(https:\/\/|\/(?!\/)|\?|#)/.test(value);
}

// innerHTML を使わずに要素を組み立てる。文字列の子要素はすべてテキストとして入るので、
// 外部のデータにタグが混ざっていても HTML として解釈されることはない。
export function h(tag, props = {}, ...children) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) {
      continue;
    }
    if (key === "class") {
      element.className = value;
    } else if (key.startsWith("on") && typeof value === "function") {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (URL_ATTRIBUTES.has(key) && !isSafeUrl(String(value))) {
      continue;
    } else {
      element.setAttribute(key, value === true ? "" : String(value));
    }
  }

  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) {
      continue;
    }
    element.append(child instanceof Node ? child : String(child));
  }
  return element;
}
