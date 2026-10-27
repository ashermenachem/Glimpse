/* Shared by the extension, preview and regression tests. No network or storage. */
(function (root) {
  const SCALE = [
    [97,'A+',4], [93,'A',4], [90,'A−',3.7], [87,'B+',3.3], [83,'B',3],
    [80,'B−',2.7], [77,'C+',2.3], [73,'C',2], [70,'C−',1.7],
    [67,'D+',1.3], [63,'D',1], [60,'D−',0.7], [0,'F',0]
  ];
  function grade(raw) {
    const s = String(raw ?? '').trim().replace(/−/g,'-');
    const letters = {'A+':[4,'A+'],'A':[4,'A'],'A-':[3.7,'A−'],'B+':[3.3,'B+'],'B':[3,'B'],'B-':[2.7,'B−'],'C+':[2.3,'C+'],'C':[2,'C'],'C-':[1.7,'C−'],'D+':[1.3,'D+'],'D':[1,'D'],'D-':[0.7,'D−'],'F':[0,'F']};
    if (Object.hasOwn(letters,s.toUpperCase())) { const [points,letter] = letters[s.toUpperCase()]; return {points,letter,raw:s}; }
    if (!/^\d{1,3}(?:\.\d+)?\s*%$/.test(s)) return null;
    const value = Number(s.replace('%',''));
    if (value > 100) { /* Extra credit may exceed 100; an A remains capped at 4. */ }
    const row = SCALE.find(([min])=>value>=min);
    return row ? {points:row[2],letter:row[1],raw:s} : null;
  }
  function level(name) { return /^(?:AP\b|Advanced Placement\b)/i.test(name) ? 'ap' : /^(?:H\b|Honors\b)/i.test(name) ? 'honors' : 'regular'; }
  function readCourses(doc) {
    const seen = new Set();
    return Array.from(doc.querySelectorAll('#coursesContainer > .row')).flatMap(row=>{
      const link = row.querySelector('a[href*="#academicclass/"]');
      const id = link?.getAttribute('href')?.match(/academicclass\/(\d+)/)?.[1];
      if (!id || seen.has(id)) return [];
      seen.add(id);
      const name = link.textContent.replace(/\s+/g,' ').trim();
      const raw = row.querySelector('.showGrade')?.textContent.trim() ?? '';
      return [{id,name,raw,grade:grade(raw),level:level(name),term:row.querySelector('h5')?.textContent.split('|')[1]?.trim() || 'Current term'}];
    });
  }
  function calculate(courses, overrides={}, settings={honors:0.5,ap:1}) {
    let creditTotal=0,unweighted=0,weighted=0;
    const included=[];
    for (const course of courses) {
      const override=overrides[course.id] || {};
      const credits=Number(override.credits ?? 1);
      if (!course.grade || override.included===false || !Number.isFinite(credits) || credits<=0 || credits>20) continue;
      const courseLevel=override.level ?? course.level;
      const bonus=course.grade.points===0 ? 0 : Number(settings[courseLevel] ?? 0);
      const points=course.grade.points;
      creditTotal+=credits; unweighted+=points*credits; weighted+=(points+bonus)*credits;
      included.push({...course,credits,points,weightedPoints:points+bonus});
    }
    return {count:included.length,credits:creditTotal,unweighted:creditTotal?unweighted/creditTotal:null,weighted:creditTotal?weighted/creditTotal:null,included};
  }
  root.MilkenGPA = {SCALE,grade,level,readCourses,calculate};
})(globalThis);
