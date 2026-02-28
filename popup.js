const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

// 現在の状態を読み込んで UI に反映
chrome.storage.local.get('pinyinEnabled', ({ pinyinEnabled }) => {
  toggle.checked = !!pinyinEnabled;
  updateStatus(!!pinyinEnabled);
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  updateStatus(enabled);

  // バックグラウンドに状態変更を通知
  chrome.runtime.sendMessage({ type: 'SET_STATE', enabled });
});

function updateStatus(enabled) {
  status.textContent = enabled ? '✅ 有効（このページに拼音を表示中）' : '⏸ 無効';
}
