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
   * 要素のテキストを取得する（<rt>タグ内のピンインと翻訳スパンは除外）
   */
  function getTextWithoutRt(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('rt').forEach((rt) => rt.remove());
    clone.querySelectorAll(`[${TRANS_ATTR}]`).forEach((e) => e.remove());
    return clone.textContent;
  }

  /**
   * 要素のテキスト内容から中国語文字数を返す（ピンイン・翻訳除外）
   */
  function countChinese(el) {
    return (getTextWithoutRt(el).match(CHINESE_GLOBAL_RE) ?? []).length;
  }

  /**
   * 翻訳対象のブロック要素を収集する（翻訳スパンが未挿入のもの）
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
   * ブロック要素内のテキストノードを収集する（rt・翻訳スパン内を除外）
   */
  function collectVisibleTextNodes(el) {
    const nodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest('rt')) return NodeFilter.FILTER_REJECT;
        if (parent.closest(`[${TRANS_ATTR}]`)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    return nodes;
  }

  /**
   * 翻訳スパンを1つ作成してブロック末尾に追加する
   */
  function appendSingleTranslation(el, text) {
    const span = document.createElement('span');
    span.className = 'pinyin-trans-inline';
    span.setAttribute(TRANS_ATTR, '1');
    span.textContent = text;
    el.appendChild(span);
  }

  /**
   * 翻訳配列をインラインで挿入する
   * DOM内の句読点（。！？）を順に探し、各句読点の直後に対応する翻訳を挿入する。
   * translatedParts: string[] — 文ごとの翻訳テキスト配列
   */
  function insertInlineTranslations(el, translatedParts) {
    if (!translatedParts || translatedParts.length === 0) return;

    const DELIMITERS = new Set(['。', '！', '？']);
    const textNodes = collectVisibleTextNodes(el);
    let partIdx = 0;

    for (let i = 0; i < textNodes.length && partIdx < translatedParts.length; i++) {
      let tn = textNodes[i];
      let text = tn.nodeValue;

      for (let j = 0; j < text.length && partIdx < translatedParts.length; j++) {
        if (DELIMITERS.has(text[j])) {
          const splitPos = j + 1; // 句読点の直後

          if (splitPos < text.length) {
            // テキストノードの途中 → splitText で分割
            const afterNode = tn.splitText(splitPos);
            const span = document.createElement('span');
            span.className = 'pinyin-trans-inline';
            span.setAttribute(TRANS_ATTR, '1');
            span.textContent = translatedParts[partIdx];
            tn.parentNode.insertBefore(span, afterNode);
            partIdx++;
            // 分割後のノードで再スキャン
            tn = afterNode;
            text = tn.nodeValue;
            j = -1; // for ループの j++ で 0 になる
          } else {
            // テキストノードの末尾 → ruby 内なら ruby の後に挿入
            const insertAfter =
              tn.parentElement?.closest(`ruby[${ATTR}]`) || tn;
            const span = document.createElement('span');
            span.className = 'pinyin-trans-inline';
            span.setAttribute(TRANS_ATTR, '1');
            span.textContent = insertAfter.parentNode
              ? translatedParts[partIdx]
              : translatedParts[partIdx];
            insertAfter.parentNode.insertBefore(span, insertAfter.nextSibling);
            partIdx++;
          }
        }
      }
    }

    // 残りの翻訳（句読点が見つからなかった分）→ ブロック末尾に追加
    for (let i = partIdx; i < translatedParts.length; i++) {
      appendSingleTranslation(el, translatedParts[i]);
    }
  }

  /**
   * 翻訳を有効化する
   * 各ブロック要素のテキストを句読点（。！？）で分割し、
   * 改行区切りでAPIに送信。応答を改行で分割して文ごとにインライン挿入する。
   */
  function enableTranslation(lang) {
    const blocks = collectTranslatableBlocks();
    const SENTENCE_SPLIT_RE = /(?<=[。！？])/;

    for (const el of blocks) {
      // <rt>・翻訳スパンを除外してテキストを取得
      const text = getTextWithoutRt(el);
      if (!text.trim()) continue;

      // 文を句読点で分割
      const sentenceParts = text.split(SENTENCE_SPLIT_RE).filter((s) => s.trim());
      const needsSplit = sentenceParts.length > 1;

      // 複数文の場合: 改行区切りで送信（APIが改行を保持するため分割可能）
      const apiText = needsSplit ? sentenceParts.join('\n') : text;

      // ローディング表示（インライン）
      const loadingSpan = document.createElement('span');
      loadingSpan.className = 'pinyin-trans-loading';
      loadingSpan.setAttribute(TRANS_ATTR, '1');
      loadingSpan.textContent = ' ⏳';
      el.appendChild(loadingSpan);

      // background.js に翻訳を依頼
      chrome.runtime.sendMessage(
        { type: 'TRANSLATE_PARAGRAPH', text: apiText, lang },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn('[Pinyin Tool] Message error:', chrome.runtime.lastError.message);
          }
          // ローディング表示を削除
          if (loadingSpan.isConnected) loadingSpan.remove();

          if (!response?.sentences) return;

          // API応答の翻訳テキストを結合
          const fullTranslation = response.sentences
            .map((s) => s.translated)
            .join('');

          if (needsSplit) {
            // 改行で分割して文ごとの翻訳を取得
            const translatedParts = fullTranslation
              .split('\n')
              .filter((s) => s.trim());

            if (translatedParts.length === sentenceParts.length) {
              // 文数一致 → 句読点位置にインライン挿入
              insertInlineTranslations(el, translatedParts);
            } else {
              // 数不一致 → フォールバック: ブロック末尾に追加
              appendSingleTranslation(el, fullTranslation.replace(/\n/g, ''));
            }
          } else {
            // 単一文 → ブロック末尾に追加
            appendSingleTranslation(el, fullTranslation);
          }
        }
      );
    }
  }

  /**
   * 翻訳スパンを除去し、分割されたテキストノードを統合する
   */
  function disableTranslation() {
    document.querySelectorAll(`[${TRANS_ATTR}]`).forEach((el) => el.remove());
    // splitText で分割されたテキストノードを再結合
    document.body.normalize();
  }

  // ---- メッセージリスナー ----

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'TOGGLE_PINYIN') {
      if (message.enabled) {
        enablePinyin();
      } else {
        disablePinyin();
      }
      sendResponse({ success: true });
    }
    if (message.type === 'TOGGLE_TRANSLATION') {
      if (message.enabled) {
        enableTranslation(message.lang);
      } else {
        disableTranslation();
      }
      sendResponse({ success: true });
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
