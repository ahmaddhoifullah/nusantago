/* Parser invoice Nusanta Go: dipakai untuk teks PDF maupun hasil OCR */
var ZL=.33,ZR=.62;
function mkLine(l){l.it.sort(function(a,b){return a.x-b.x});var z=[[],[],[]];l.it.forEach(function(i){z[i.x<ZL?0:i.x<ZR?1:2].push(i.s)});return{L:z[0].join(' '),M:z[1].join(' '),R:z[2].join(' '),all:l.it.map(function(i){return i.s}).join(' ')}}
/* words: [{text,confidence,bbox:{x0,y0,x1,y1}}] dari Tesseract; W = lebar gambar */
function wordsToLines(words,W){
 var its=words.filter(function(w){return w.text&&w.text.trim()&&w.confidence>25}).map(function(w){return{s:w.text.trim(),x:w.bbox.x0/W,y:(w.bbox.y0+w.bbox.y1)/2,h:w.bbox.y1-w.bbox.y0}});
 var hs=its.map(function(i){return i.h}).sort(function(a,b){return a-b}),tol=(hs[hs.length>>1]||20)*.55;
 its.sort(function(a,b){return a.y-b.y});
 var lines=[],c=null;
 its.forEach(function(i){if(c&&Math.abs(c.y-i.y)<=tol){c.it.push(i);c.y=(c.y*(c.it.length-1)+i.y)/c.it.length}else{c={y:i.y,it:[i]};lines.push(c)}});
 return lines.map(mkLine);
}
var NUM=function(s){return parseInt(String(s==null?'':s).replace(/\D/g,''),10)||0};
function parse(lines,fname){
 var all=lines.map(function(l){return l.all}).join(' ');
 var no=(all.match(/NT\/INV\/[\w\/]+/)||[fname])[0];
 var pi=lines.findIndex(function(l){return /PNR|Booking/i.test(l.all)}),pnr='';
 if(pi>=0&&lines[pi+1]){var tk=lines[pi+1].all.split(/\s+/);for(var k=tk.length-1;k>=0;k--){if(/^[A-Za-z0-9]{5,6}$/.test(tk[k])){pnr=tk[k].replace(/l/g,'I').toUpperCase();break}}}
 var s=lines.findIndex(function(l){return /Maskapai/i.test(l.all)});
 var e=lines.findIndex(function(l){return /Passenger need|e-ticket|Passenger Detail/i.test(l.all)});
 var seg=lines.slice(s+2,e<0?undefined:e),A=/[\(\[]([A-Z]{3})[\)\]]/,D=/\d{1,2} [A-Z][a-z]{2} \d{4}/;
 var o=[],d=[],dt=[],cl=[],m;
 seg.forEach(function(l){
  if(m=l.L.match(A))o.push(m[1]);else if(m=l.L.match(D))dt.push(m[0]);
  if(m=l.R.match(A))d.push(m[1]);
  if(/economy|business|first/i.test(l.M))cl.push(l.M.replace(/^[\s|]+/,''));
 });
 var segs=o.map(function(x,i){return{r:x+' - '+(d[i]||'?'),dt:dt[i]||'',c:cl[i]||''}});
 var pax=[],total=0;
 lines.forEach(function(l){
  var t=l.all.split(/\s+/),pr=t[t.length-1],isP=/^\d{1,3}([.,]\d{3})+$/.test(pr);
  if(isP&&/^Total$/i.test(t[0])&&t.length<=2){total=NUM(pr);return}
  if(!isP)return;
  var ti=t.findIndex(function(w){return /^(MR|MRS|MS|MISS|MSTR|MSS|INF|CHD)$/.test(w)});
  if(ti<0||ti>2)return;
  var end=t.length-1,tkn='-',c=t[end-1]||'';
  if(/^\d[\d-]{7,}$/.test(c)){tkn=c;end--}else if(/^[-–—_~.|]*$/.test(c)){end--}
  var name=t.slice(ti+1,end).join(' ').replace(/[^A-Za-z ]/g,'').replace(/\s+/g,' ').trim();
  if(name)pax.push({n:t[ti]+' '+name,tk:tkn,p:NUM(pr)});
 });
 var rows=pax.map(function(x){return{n:x.n,pnr:pnr,tk:x.tk,c:segs.map(function(g){return g.c}),r:segs.map(function(g){return g.r}),dt:segs.map(function(g){return g.dt}),p:x.p}});
 return{id:++uid,file:fname,no:no,pnr:pnr,total:total,rows:rows,sum:rows.reduce(function(a,b){return a+b.p},0)};
}
