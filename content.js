(() => {
  const ATTR = 'data-pinyin-added';

  // 中国語文字を含むかチェック（CJK統合漢字）
  const CHINESE_RE = /[\u4e00-\u9fff\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}]/u;

  /**
   * テキストを中国語と非中国語のセグメントに分割する
   * 例: "Hello 你好 World" → ["Hello ", "你好", " World"]
   */
  function splitByChinese(text) {
    return text.split(/([\u4e00-\u9fff\u3400-\u4dbf]+)/u).filter(Boolean);
  }

  /**
   * 中国語のテキストノードを <ruby> タグに変換して置換する
   */
  function annotateNode(textNode) {
    const text = textNode.nodeValue;
    if (!text || !CHINESE_RE.test(text)) return;

    const parent = textNode.parentNode;
    // すでに ruby タグの中にある場合はスキップ
    if (!parent || parent.closest('ruby') || parent.closest(`[${ATTR}]`)) return;

    const segments = splitByChinese(text);
    const fragment = document.createDocumentFragment();
    let hasChinese = false;

    for (const segment of segments) {
      if (CHINESE_RE.test(segment)) {
        hasChinese = true;
        // pinyinPro.segment で各文字の拼音を取得
        const chars = pinyinPro.segment(segment);
        for (const { origin, result } of chars) {
          const ruby = document.createElement('ruby');
          ruby.setAttribute(ATTR, '1');
          ruby.appendChild(document.createTextNode(origin));
          const rt = document.createElement('rt');
          rt.textContent = result;
          ruby.appendChild(rt);
          fragment.appendChild(ruby);
        }
      } else {
        fragment.appendChild(document.createTextNode(segment));
      }
    }

    if (hasChinese) {
      parent.replaceChild(fragment, textNode);
    }
  }

  /**
   * DOM全体を走査してテキストノードに拼音を付与する
   */
  function enablePinyin() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          // script/style タグや既に変換済みの要素はスキップ
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName?.toLowerCase();
          if (['script', 'style', 'noscript', 'textarea', 'input'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.closest(`[${ATTR}]`)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      nodes.push(node);
    }
    nodes.forEach(annotateNode);
  }

  /**
   * 付与した拼音 (<ruby> タグ) を除去して元のテキストに戻す
   */
  function disablePinyin() {
    const rubies = document.querySelectorAll(`ruby[${ATTR}]`);
    rubies.forEach((ruby) => {
      const text = document.createTextNode(ruby.firstChild?.textContent ?? '');
      ruby.replaceWith(text);
    });
    // 隣接テキストノードを統合
    document.body.normalize();
  }

  // バックグラウンドスクリプトからのメッセージを受信
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TOGGLE_PINYIN') {
      if (message.enabled) {
        enablePinyin();
      } else {
        disablePinyin();
      }
    }
  });

  // ページ読み込み時に保存済みの状態を確認して適用
  chrome.storage.local.get('pinyinEnabled', ({ pinyinEnabled }) => {
    if (pinyinEnabled) {
      enablePinyin();
    }
  });
})();
