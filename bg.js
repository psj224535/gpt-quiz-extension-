let buffer = [];

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === "QAS_BATCH") {
    buffer.push(...msg.items);
  }
  if (msg.type === "SAVE_RECENT") {
    const latest = dedupe(buffer).slice(-5);  // 최근 5개 저장 예
    for (const it of latest) {
      const enriched = enrich(it);            // 퀴즈/태깅 등 후처리
      await saveToNotion(enriched);
    }
  }
});

function dedupe(arr) {
  const m = new Map();
  for (const x of arr) {
    const k = (x.q.trim()+"|"+x.a.trim()).toLowerCase();
    if (!m.has(k)) m.set(k, x);
  }
  return [...m.values()];
}

function enrich(item) {
  // 간단 주제 추론/클로즈 생성(규칙 기반 v1)
  //수신 + 퀴즈 생성 + notion 저장
  const topic = inferTopic(item.q, item.a);
  const { quizQ, quizA } = makeCloze(item.a);
  return { ...item, topic, quizQ, quizA };
}

function inferTopic(q, a) {
  const s = (q+" "+a).toLowerCase();
  if (s.includes("tcp") || s.includes("congestion")) return "Networks";
  if (s.includes("sql") || s.includes("join")) return "Databases";
  if (s.includes("fip") || s.includes("cat")) return "Vet/Bio";
  return "General";
}

function makeCloze(ans) {
  const words = ans.split(/\s+/);
  if (words.length < 7) return { quizQ: ans, quizA: ans };
  const i = Math.max(1, Math.floor(words.length/3));
  const j = Math.min(words.length-2, i+2);
  const masked = words.slice();
  masked[i] = "_____";
  masked[j] = "_____";
  return { quizQ: masked.join(" "), quizA: ans };
}

async function saveToNotion({ q, a, ts, source, topic, quizQ, quizA }) {
  const { NOTION_TOKEN, NOTION_DB_ID } = await chrome.storage.sync.get(["NOTION_TOKEN","NOTION_DB_ID"]);
  if (!NOTION_TOKEN || !NOTION_DB_ID) {
    console.warn("Notion credentials missing; set in Options.");
    return;
  }
  await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    body: JSON.stringify({
      parent: { database_id: NOTION_DB_ID },
      properties: {
        "Question": { "title": [{ "text": { "content": q.slice(0,200) } }] },
        "Answer":   { "rich_text": [{ "text": { "content": a.slice(0,1900) } }] },
        "Topic":    { "multi_select": [{ "name": topic }] },
        "Source":   { "select": { "name": source } },
        "Last Reviewed": { "date": { "start": new Date(ts).toISOString() } },
        "Next Review":   { "date": { "start": new Date(Date.now()+86400000).toISOString() } }
      },
      children: quizQ ? [{
        "object": "block",
        "type": "toggle",
        "toggle": {
          "rich_text": [{ "text": { "content": `Quiz: ${quizQ}` } }],
          "children": [{
            "object": "block",
            "type": "paragraph",
            "paragraph": { "rich_text": [{ "text": { "content": `Answer: ${quizA}` } }] }
          }]
        }
      }] : []
    })
  });
}
