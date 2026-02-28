(() => {
  const ATTR = 'data-pinyin-added';
  const TRANS_ATTR = 'data-translation-added';
  // 翻訳対象の最小中国語文字数
  const MIN_CHINESE_CHARS = 5;
  // 翻訳対象のブロック要素タグ
  const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'blockquote', 'figcaption', 'dt', 'dd']);

  // 中国語文字を含むかチェック（CJK統合漢字）
  const CHINESE_RE = /[\u4e00-\u9fff\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}]/u;
  const CHINESE_GLOBAL_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/gu;

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
          // 翻訳ブロック内はスキップ
          if (parent.closest(`[${TRANS_ATTR}]`)) return NodeFilter.FILTER_REJECT;
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

  // ---- 翻訳機能 ----

  /**
   * 要素のテキスト内容から中国語文字数を返す
   */
  function countChinese(el) {
    return (el.textContent.match(CHINESE_GLOBAL_RE) ?? []).length;
  }

  /**
   * 翻訳対象のブロック要素を収集する（翻訳ブロックが未挿入のもの）
   */
  function collectTranslatableBlocks() {
    const elements = document.body.querySelectorAll(
      Array.from(BLOCK_TAGS).join(',')
    );
    return Array.from(elements).filter((el) => {
      // 既に翻訳済み、または翻訳ブロック自身はスキップ
      if (el.closest(`[${TRANS_ATTR}]`) || el.querySelector(`[${TRANS_ATTR}]`)) return false;
      // script/style 内はスキップ
      if (el.closest('script, style, noscript')) return false;
      return countChinese(el) >= MIN_CHINESE_CHARS;
    });
  }

  /**
   * 翻訳ブロックを段落の直後に挿入する
   */
  function insertTranslationBlock(el, translatedText, lang) {
    const block = document.createElement('div');
    block.className = 'pinyin-translation';
    block.setAttribute(TRANS_ATTR, '1');

    const langLabel = lang === 'ja' ? '🇯🇵 日本語訳' : '🇺🇸 English';
    block.innerHTML = `<span class="pinyin-translation-label">${langLabel}</span>${translatedText}`;

    el.insertAdjacentElement('afterend', block);
  }

  /**
   * 翻訳を有効化する（各段落を非同期で翻訳）
   */
  async function enableTranslation(lang) {
    const blocks = collectTranslatableBlocks();
    for (const el of blocks) {
      const text = el.textContent.trim();
      if (!text) continue;

      // ローディング表示
      const loadingBlock = document.createElement('div');
      loadingBlock.className = 'pinyin-translation pinyin-translation-loading';
      loadingBlock.setAttribute(TRANS_ATTR, '1');
      loadingBlock.textContent = '翻訳中...';
      el.insertAdjacentElement('afterend', loadingBlock);

      // background.js に翻訳を依頼
      chrome.runtime.sendMessage(
        { type: 'TRANSLATE_PARAGRAPH', text, lang },
        (response) => {
          if (loadingBlock.isConnected) {
            if (response?.translated) {
              insertTranslationBlock(el, response.translated, lang);
            }
            loadingBlock.remove();
          }
        }
      );
    }
  }

  /**
   * 翻訳ブロックを除去する
   */
  function disableTranslation() {
    document.querySelectorAll(`[${TRANS_ATTR}]`).forEach((el) => el.remove());
  }

  // ---- メッセージリスナー ----

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TOGGLE_PINYIN') {
      if (message.enabled) {
        enablePinyin();
      } else {
        disablePinyin();
      }
    }
    if (message.type === 'TOGGLE_TRANSLATION') {
      if (message.enabled) {
        enableTranslation(message.lang);
      } else {
        disableTranslation();
      }
    }
  });

  // ページ読み込み時に保存済みの状態を確認して適用
  chrome.storage.local.get(
    ['pinyinEnabled', 'translateEnabled', 'translateLang'],
    ({ pinyinEnabled, translateEnabled, translateLang }) => {
      if (pinyinEnabled) enablePinyin();
      if (translateEnabled) enableTranslation(translateLang ?? 'ja');
    }
  );
})();
