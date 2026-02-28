const STORAGE_KEY = 'pinyinEnabled';

// 初期状態を false に設定
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    [STORAGE_KEY]: false,
    translateEnabled: false,
    translateLang: 'ja',
  });
});

// ポップアップからのメッセージを受け取り処理する
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 拼音 ON/OFF
  if (message.type === 'SET_STATE') {
    chrome.storage.local.set({ [STORAGE_KEY]: message.enabled }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'TOGGLE_PINYIN',
            enabled: message.enabled,
          });
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
            chrome.tabs.sendMessage(tabs[0].id, {
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

  // 翻訳リクエスト（content.js から段落テキストを受け取り翻訳して返す）
  if (message.type === 'TRANSLATE_PARAGRAPH') {
    const { text, lang } = message;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        // レスポンス形式: [[[translated, original, ...], ...], ...]
        const translated = data[0]?.map((item) => item[0] ?? '').join('') ?? '';
        sendResponse({ translated });
      })
      .catch((err) => {
        console.error('[Pinyin Tool] Translation error:', err);
        sendResponse({ translated: null, error: err.message });
      });
    return true; // 非同期レスポンス
  }
});
