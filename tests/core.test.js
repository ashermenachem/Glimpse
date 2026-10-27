import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import '../extension/core.js';
const {grade,level,readCourses,calculate}=globalThis.MilkenGPA;
test('exact thresholds without upward rounding, extra credit capped',()=>{
 assert.equal(grade('89.99%').points,3.3);assert.equal(grade('90.00%').points,3.7);assert.equal(grade('103%').points,4);assert.equal(grade('0%').points,0);assert.equal(grade('A−').points,3.7);
 for(const s of ['', 'P','N/A','—','102 | Semester','90 points','-5%'])assert.equal(grade(s),null);
});
test('honors prefixes do not mistake a block or course description for level',()=>{
 assert.equal(level('Algebra I - 2 (H)'),'regular');assert.equal(level('H Jewish Law I - 2 (B)'),'honors');assert.equal(level('AP Biology'),'ap');assert.equal(level('History'),'regular');
});
test('read only the course grade element, deduplicate IDs, preserve missing grades',()=>{
 const doc=new JSDOM(`<a href="#academicclass/1/0">Navigation</a><div id="coursesContainer"><div class="row"><a href="?svcid=edu#academicclass/1/undefined/bulletinboard"><h3>Algebra (D)</h3></a><h5>Room | 1st Semester | School</h5><table><tr><td>9</td></tr></table><h3 class="showGrade">90.00%</h3></div><div class="row"><a href="#academicclass/1/0">Duplicate</a><h3 class="showGrade">0%</h3></div><div class="row"><a href="#academicclass/2/0">PE (F)</a><h3 class="showGrade">P</h3></div></div>`).window.document;
 const courses=readCourses(doc);assert.equal(courses.length,2);assert.equal(courses[0].grade.points,3.7);assert.equal(courses[0].term,'1st Semester');assert.equal(courses[1].grade,null);
});
test('credit weighting, exclusions, missing grades and F bonuses',()=>{
 const courses=[{id:'1',grade:grade('A'),level:'regular'},{id:'2',grade:grade('B'),level:'honors'},{id:'3',grade:grade('F'),level:'ap'},{id:'4',grade:null,level:'regular'}];
 const r=calculate(courses,{'1':{credits:2},'3':{included:false}});assert.equal(r.count,2);assert.equal(r.unweighted,11/3);assert.equal(r.weighted,11.5/3);
 assert.equal(calculate([courses[2]]).weighted,0);assert.equal(calculate([]).weighted,null);assert.equal(calculate(courses,{'1':{credits:NaN},'2':{credits:-1},'3':{credits:0}}).count,0);
});
