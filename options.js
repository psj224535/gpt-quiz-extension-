document.getElementById('save').addEventListener('click', async () => {
    const NOTION_TOKEN = document.getElementById('token').value.trim();
    const NOTION_DB_ID = document.getElementById('dbid').value.trim();
    await chrome.storage.sync.set({ NOTION_TOKEN, NOTION_DB_ID });
    alert('Saved!');
  });
  
  // 초기값 로드
  (async () => {
    const { NOTION_TOKEN, NOTION_DB_ID } = await chrome.storage.sync.get(["NOTION_TOKEN","NOTION_DB_ID"]);
    if (NOTION_TOKEN) document.getElementById('token').value = NOTION_TOKEN;
    if (NOTION_DB_ID) document.getElementById('dbid').value = NOTION_DB_ID;
  })();
  