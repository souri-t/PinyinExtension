const STORAGE_KEY = 'pinyinEnabled';

// 初期状態を false に設定
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ [STORAGE_KEY]: false });
});

// ポップアップからのメッセージを受け取り、アクティブタブに転送する
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_STATE') {
    chrome.storage.local.set({ [STORAGE_KEY]: message.enabled }, () => {
      // アクティブタブのコンテンツスクリプトに状態変更を通知
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
    return true; // 非同期レスポンスを使用
  }
});
