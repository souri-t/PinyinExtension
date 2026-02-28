const STORAGE_KEY = 'pinyinEnabled';

// 初期状態を設定（既存の値は上書きしない）
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['pinyinEnabled', 'translateEnabled', 'translateLang'], (result) => {
    const defaults = {};
    if (result.pinyinEnabled === undefined) defaults.pinyinEnabled = false;
    if (result.translateEnabled === undefined) defaults.translateEnabled = false;
    if (result.translateLang === undefined) defaults.translateLang = 'ja';
    if (Object.keys(defaults).length > 0) {
      chrome.storage.local.set(defaults);
    }
  });
});

/**
 * タブに Chrome メッセージを送信する。
 * 拡張機能の再読み込み後など content.js が失われている場合は
 * scripting.executeScript で再注入してからリトライする。
 */
function sendToTab(tabId, message) {
  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) {
      // content.js が未注入（ページをまたいだ再読み込みなど）→ 再注入してリトライ
      chrome.scripting.executeScript(
        { target: { tabId }, files: ['lib/pinyin-pro.js', 'content.js'] },
        () => {
          if (chrome.runtime.lastError) return; // 注入不可ページ（chrome:// 等）
          chrome.tabs.sendMessage(tabId, message);
        }
      );
    }
  });
}

// ポップアップからのメッセージを受け取り処理する
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 拼音 ON/OFF
  if (message.type === 'SET_STATE') {
    chrome.storage.local.set({ [STORAGE_KEY]: message.enabled }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          sendToTab(tabs[0].id, { type: 'TOGGLE_PINYIN', enabled: message.enabled });
        }
      });
      sendResponse({ success: true });
    });
    return true;
  }

  // 翻訳 ON/OFF + 言語変更
  if (message.type === 'SET_TRANSLATE_STATE') {
    chrome.storage.local.set(
      { translateEnabled: message.enabled, translateLang: message.lang },
      () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            sendToTab(tabs[0].id, {
              type: 'TOGGLE_TRANSLATION',
              enabled: message.enabled,
              lang: message.lang,
            });
          }
        });
        sendResponse({ success: true });
      }
    );
    return true;
  }

  // 翻訳リクエスト（content.js から段落テキストを受け取り文単位で翻訳して返す）
  if (message.type === 'TRANSLATE_PARAGRAPH') {
    const { text, lang } = message;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        // レスポンス形式: [[[translated, original, ...], ...], ...]
        // 文単位の配列として返す
        const sentences = (data[0] ?? [])
          .filter((item) => item[1])  // 原文のないエントリを除外
          .map((item) => ({
            original: item[1],
            translated: item[0] ?? '',
          }));
        sendResponse({ sentences });
      })
      .catch((err) => {
        console.error('[Pinyin Tool] Translation error:', err);
        sendResponse({ sentences: null, error: err.message });
      });
    return true; // 非同期レスポンス
  }
});
