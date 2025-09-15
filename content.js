// 화면의 사용자/어시스턴트 메시지를 주기적으로 수집
const seen = new Set();
const text = el => el?.innerText?.trim() || "";

function collect() {
  const users = document.querySelectorAll('[data-message-author-role="user"]');
  const bots  = document.querySelectorAll('[data-message-author-role="assistant"]');
  const n = Math.min(users.length, bots.length);
  const out = [];
  for (let i=0;i<n;i++) {
    const q = text(users[i]), a = text(bots[i]);
    const key = (q.slice(0,200)+"|"+a.slice(0,200)).toLowerCase();
    if (q && a && !seen.has(key)) {
      seen.add(key);
      out.push({ q, a, ts: Date.now(), source: "ChatGPT" });
    }
  }
  if (out.length) chrome.runtime.sendMessage({ type: "QAS_BATCH", items: out });
}

new MutationObserver(collect).observe(document.body, {subtree:true, childList:true});
window.addEventListener('scroll', collect);
collect();

// 수동 저장 버튼(간단)
const btn = document.createElement('button');
btn.textContent = "Save latest Q&A to Notion";
Object.assign(btn.style, { position:'fixed', right:'16px', bottom:'16px', zIndex:999999, padding:'10px 14px', borderRadius:'10px' });
btn.onclick = () => chrome.runtime.sendMessage({ type: "SAVE_RECENT" });
document.body.appendChild(btn);
