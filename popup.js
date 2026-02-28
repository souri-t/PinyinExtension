const pinyinToggle = document.getElementById('pinyin-toggle');
const translateToggle = document.getElementById('translate-toggle');
const langSelect = document.getElementById('lang-select');
const status = document.getElementById('status');

// 保存済みの状態を読み込んで UI に反映
chrome.storage.local.get(
  ['pinyinEnabled', 'translateEnabled', 'translateLang'],
  ({ pinyinEnabled, translateEnabled, translateLang }) => {
    pinyinToggle.checked = !!pinyinEnabled;
    translateToggle.checked = !!translateEnabled;
    langSelect.value = translateLang ?? 'ja';
    updateStatus(!!pinyinEnabled, !!translateEnabled);
  }
);

pinyinToggle.addEventListener('change', () => {
  const enabled = pinyinToggle.checked;
  updateStatus(enabled, translateToggle.checked);
  chrome.runtime.sendMessage({ type: 'SET_STATE', enabled });
});

translateToggle.addEventListener('change', () => {
  const enabled = translateToggle.checked;
  const lang = langSelect.value;
  updateStatus(pinyinToggle.checked, enabled);
  chrome.runtime.sendMessage({ type: 'SET_TRANSLATE_STATE', enabled, lang });
});

langSelect.addEventListener('change', () => {
  // 翻訳が有効中なら再翻訳のため一度OFFにして再度ONにする
  if (translateToggle.checked) {
    const lang = langSelect.value;
    chrome.runtime.sendMessage({ type: 'SET_TRANSLATE_STATE', enabled: false, lang });
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'SET_TRANSLATE_STATE', enabled: true, lang });
    }, 100);
  }
  chrome.storage.local.set({ translateLang: langSelect.value });
});

function updateStatus(pinyinOn, translateOn) {
  const lines = [];
  if (pinyinOn) lines.push('✅ 拼音: 表示中');
  if (translateOn) lines.push(`✅ 翻訳: 表示中（${langSelect.value === 'ja' ? '日本語' : 'English'}）`);
  if (lines.length === 0) lines.push('⏸ すべて無効');
  status.textContent = lines.join('\n');
}
