'use strict';
// chrome.storage.session is held in memory and is cleared when Chrome restarts.
const KEY = 'glimpseLatestCourses';
const MAX_AGE = 24 * 60 * 60 * 1000;
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !sender.tab || typeof sender.url !== 'string') return;
  let senderUrl;
  try { senderUrl = new URL(sender.url); } catch { return; }
  if (senderUrl.origin !== 'https://milkenschool.myschoolapp.com' || !message || typeof message.type !== 'string') return;
  if (message.type === 'glimpse:save') {
    if (typeof message.owner !== 'string' || !message.owner.trim() || message.owner.length > 200 || !Array.isArray(message.courses) || !message.courses.length || message.courses.length > 100) return;
    const courses = message.courses.map(c => ({id:String(c.id || '').slice(0,80), name:String(c.name || '').slice(0,300), raw:String(c.raw || '').slice(0,40), term:String(c.term || '').slice(0,100)}));
    if (courses.some(c => !/^\d+$/.test(c.id) || !c.name)) return;
    chrome.storage.session.set({[KEY]:{owner:message.owner, courses, savedAt:Date.now()}}).then(() => respond({ok:true}), () => respond({ok:false}));
    return true;
  }
  if (message.type === 'glimpse:load') {
    if (typeof message.owner !== 'string' || !message.owner.trim()) return;
    chrome.storage.session.get(KEY).then(data => {
      const record=data[KEY];
      if (!record || record.owner !== message.owner || !Number.isFinite(record.savedAt) || record.savedAt > Date.now() || Date.now()-record.savedAt > MAX_AGE) return respond(null);
      respond(record);
    }, () => respond(null));
    return true;
  }
  if (message.type === 'glimpse:clear') {
    chrome.storage.session.remove(KEY).then(() => respond({ok:true}), () => respond({ok:false}));
    return true;
  }
});
