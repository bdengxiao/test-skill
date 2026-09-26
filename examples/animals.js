const ellipse=(cx,cy,rx,ry,fill)=>({tag:'ellipse',attrs:{cx,cy,rx,ry,fill}});
const path=(d,fill,stroke='none',width=1)=>({tag:'path',attrs:{d,fill,stroke,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round'}});
const eye=(x=334,y=174)=>ellipse(x,y,3,4,'#243b35');
const contact=(anchor,origin,color,width=10,bend=20)=>({tag:'path',attrs:{'data-anchor':anchor,'data-origin':origin,'data-bend':bend,fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round'}});
const legs=(color)=>[contact('pedal-b','291,269',color,10,-22),contact('pedal-a','305,269',color),contact('hand','317,221',color,10,4)];
const normal=(species,color,features)=>({species,nodes:[...legs(color),ellipse(296,239,33,45,color),...features]});
export const compactAnimals={
  pelican:normal('pelican','#fdfcf3',[path('M306 222 Q337 209 315 191 Q301 172 322 162 Q342 153 346 177 L336 212Z','#fdfcf3'),path('M339 176L397 186L342 199Z','#e4ae51'),path('M339 184Q366 210 388 187Z','#e7ca83'),ellipse(293,237,24,31,'#dce1d4'),eye(330,174)]),
  cat:normal('cat','#c98557',[path('M273 256Q221 259 243 221','none','#c98557',12),path('M299 198L296 151L320 165L342 150L347 197Z','#c98557'),ellipse(323,189,29,25,'#c98557'),eye(336,185),path('M342 196L350 198L343 202Z','#624736'),path('M334 205h23M332 210l22 5','none','#624736',2)]),
  rabbit:normal('rabbit','#d1c3dc',[ellipse(277,261,12,12,'#ede4ef'),ellipse(310,150,9,38,'#d1c3dc'),ellipse(332,146,9,38,'#d1c3dc'),ellipse(311,148,3,27,'#b18fb0'),ellipse(332,145,3,27,'#b18fb0'),ellipse(324,195,26,26,'#d1c3dc'),eye(338,191)]),
  penguin:normal('penguin','#304e55',[ellipse(302,239,22,34,'#fff6dc'),ellipse(315,192,26,27,'#304e55'),ellipse(326,196,17,18,'#fff6dc'),path('M337 192L365 202L338 206Z','#d6a14c'),eye(331,189)]),
  frog:normal('frog','#86a959',[ellipse(321,198,38,25,'#86a959'),ellipse(300,178,12,13,'#a5c77a'),ellipse(336,177,12,13,'#a5c77a'),eye(303,176),eye(339,175),path('M309 210Q330 220 344 207','none','#385739',3)]),
  monkey:normal('monkey','#a27d58',[path('M271 255Q225 295 225 238Q226 217 244 233','none','#a27d58',10),ellipse(295,186,12,14,'#a27d58'),ellipse(341,184,12,14,'#a27d58'),ellipse(319,190,27,29,'#a27d58'),ellipse(325,197,21,21,'#ead2a9'),eye(336,188)]),
  giraffe:normal('giraffe','#d8ae59',[path('M298 232L300 114L321 113L329 229Z','#d8ae59'),ellipse(325,108,28,17,'#d8ae59'),path('M310 97L308 82M328 94L329 80','none','#896639',6),ellipse(308,150,6,9,'#9e753d'),ellipse(317,183,7,10,'#9e753d'),ellipse(289,234,9,12,'#9e753d'),eye(339,105)]),
  snake:{species:'snake',nodes:[contact('pedal-b','291,263','#81a16c',13,-45),contact('pedal-a','307,260','#81a16c',13,40),contact('hand','326,213','#81a16c',13,-20),path('M292 278C247 253 328 242 290 215C255 193 291 160 323 177C351 195 304 207 294 234','none','#81a16c',23),ellipse(329,178,21,13,'#81a16c'),eye(337,173),path('M348 180h12l6-5m-6 5l6 5','none','#bf6954',2)]},
  octopus:{species:'octopus',nodes:[contact('pedal-b','287,235','#ab7f9e',11,-42),contact('pedal-a','315,235','#ab7f9e',11,45),contact('hand','321,221','#ab7f9e',11,-7),path('M277 231Q235 218 245 257M284 241Q256 280 241 265M298 240Q284 291 266 285M312 240Q349 294 364 271M324 232Q361 252 370 238','none','#ab7f9e',11),ellipse(300,208,38,42,'#ab7f9e'),ellipse(289,201,7,10,'#fff6e8'),ellipse(313,201,7,10,'#fff6e8'),eye(291,202),eye(315,202),path('M293 220Q303 227 311 219','none','#69425b',3)]}
};
export const labels={pelican:'鹈鹕',cat:'猫',rabbit:'兔子',penguin:'企鹅',frog:'青蛙',monkey:'猴子',giraffe:'长颈鹿',snake:'蛇',octopus:'章鱼'};
const joint=(anchor,origin,color,width=7,bend=20)=>{const n=contact(anchor,origin,color,width,bend);n.attrs['data-profile']='joint';return n;};
const wing=(origin,fill,stroke)=>({tag:'path',attrs:{'data-anchor':'hand','data-origin':origin,'data-profile':'wing',fill,stroke,'stroke-width':2,'stroke-linejoin':'round'}});
const e=(x,y,rx,ry,fill)=>ellipse(x,y,rx,ry,fill);
const p=path;
const face=(x,y)=>[e(x,y,5,6,'#fffaf0'),e(x+1,y,2.5,3.5,'#253c40'),e(x+2,y-1.5,1,1,'#ffffff')];
export const animals={...compactAnimals,
  pelican:{species:'pelican',nodes:[
    joint('pedal-b','281,264','#b87940',6,-20),
    p('M279 241Q255 240 244 224L254 251L272 260Z','#e9dac0','#7b8174',1.5),
    p('M274 268Q248 248 264 218Q274 200 297 199Q315 198 307 179Q294 150 312 136Q327 121 344 136Q357 151 342 168Q328 181 334 203Q343 232 318 262Q299 278 274 268Z','#fff8e5','#7a867a',1.7),
    p('M279 263Q262 247 271 227Q281 211 298 216Q316 230 303 250Q291 267 279 263Z','#e1ddc8'),
    p('M336 146L402 160Q411 167 397 170L342 176Q348 162 336 146Z','#dda048','#98743e',1.2),
    p('M340 163L400 167Q380 200 351 190Q341 183 340 163Z','#eac77d','#b79354',1.2),
    p('M347 170Q363 184 382 177','none','#f8e1a1',2),
    p('M338 151L401 162','none','#f4cf7a',2),...face(329,146),
    p('M312 136Q324 126 337 137','none','#a8a896',2),
    p('M302 197L329 195L330 205L303 207Z','#ca7650'),
    p('M306 204L279 199L287 215L304 211Z','#db9260','#a86645',1),
    joint('pedal-a','306,264','#d59b50',6,20),
    wing('292,215','#e6e1ca','#8b9686'),
    p('M296 225Q315 229 329 229M294 232Q311 239 325 236M293 240L311 245','none','#bdc4af',2),
    p('M306 132Q299 123 309 120Q316 117 317 125','none','#7a867a',2)
  ]},
  cat:{species:'cat',nodes:[
    joint('pedal-b','288,268','#966747',9,-20),
    p('M272 257Q236 270 237 233Q233 208 218 222','none','#9c704f',12),
    p('M273 273Q255 249 269 219Q282 197 310 211Q331 228 319 258L308 275Z','#c89568','#735b46',1.5),
    p('M289 258Q280 239 294 221Q312 223 311 246Z','#e7c79e'),
    p('M294 207L290 160L311 171Q325 162 335 171L354 158L351 197Q336 219 313 212Z','#c89568','#735b46',1.5),
    p('M296 170L307 177L298 185Z M339 177L349 168L346 186Z','#ca9483'),
    p('M319 192Q341 181 351 195Q361 209 341 211L322 208Z','#efdbb8'),
    ...face(337,187),e(352,199,4,3,'#76534d'),
    p('M349 203Q345 209 338 204M354 201l16-3M354 206l15 3M308 190l-11-2M312 177l3 9M322 173l1 10','none','#795c45',1.6),
    joint('pedal-a','309,267','#c89568',9),contact('hand','310,222','#c89568',9,4),
    p('M283 221l-10 3M280 230l-11 4M278 241l-8 4','none','#936c4b',3),
    p('M299 212L325 211L324 218L299 219Z','#678e8e'),e(319,221,3,4,'#d7ad56')
  ]},
  rabbit:{species:'rabbit',nodes:[
    joint('pedal-b','288,269','#a399ad',10,-20),e(268,259,13,13,'#f3edf0'),
    p('M278 274Q259 251 273 223Q286 201 310 211Q333 232 316 270Z','#c6baca','#8b8195',1.5),e(297,240,19,27,'#ece2e5'),
    p('M307 183Q279 114 294 105Q310 99 318 176Z','#c6baca','#8b8195',1.5),
    p('M325 176Q317 98 335 101Q351 103 337 182Z','#c6baca','#8b8195',1.5),
    p('M308 162Q295 119 298 116M330 163Q329 120 334 114','none','#b88f9b',5),
    p('M298 192Q298 168 326 173Q347 176 349 198L361 204Q360 218 340 219Q310 222 298 205Z','#c6baca','#8b8195',1.5),
    e(343,207,14,10,'#ece2e5'),...face(337,191),e(360,203,3,3,'#a87784'),
    p('M351 213l9 1M348 218l10 4','none','#8b8195',1.5),
    joint('pedal-a','311,267','#c6baca',11),contact('hand','319,224','#c6baca',9,3),
    p('M304 219L329 216L331 224L305 227Z','#c18c60')
  ]},
  penguin:{species:'penguin',nodes:[
    joint('pedal-b','286,269','#b78546',7,-20),
    p('M279 273Q258 242 274 208Q280 193 289 187Q287 156 308 148Q338 144 345 173Q348 195 332 207Q344 243 322 271Z','#334f59','#263e47',1.5),
    p('M292 266Q274 243 287 213Q301 199 304 177Q310 165 320 173Q332 180 328 204Q338 241 315 268Z','#f9e6c1'),
    p('M333 177L370 189L336 196Z','#e0a655','#a57439',1.2),...face(327,170),
    joint('pedal-a','312,268','#d4a254',7),wing('293,217','#456773','#2d4b55'),
    p('M296 226Q319 235 337 229','none','#698793',2),
    p('M288 208Q305 221 334 205L334 213Q308 228 287 216Z','#c16f4c'),
    p('M289 214L270 238L282 241L298 221Z','#c16f4c')
  ]}
};
// Give the remaining body plans articulated feet without changing snakes or tentacles.
for(const name of ['frog','monkey','giraffe']){
  animals[name]=structuredClone(compactAnimals[name]);
  for(const node of animals[name].nodes)if(node.attrs['data-anchor']?.startsWith('pedal'))node.attrs['data-profile']='joint';
  animals[name].nodes.push(p(name==='frog'?'M282 225Q274 245 287 259':name==='monkey'?'M278 234Q269 251 282 265':'M298 121Q306 145 301 171','none',name==='frog'?'#c2d890':name==='monkey'?'#ceb18a':'#efd28a',3));
}
animals.frog.nodes.push(p('M307 215Q320 226 335 213','none','#426642',1.5),e(293,231,4,5,'#b9cc82'),e(284,243,3,4,'#b9cc82'),e(319,204,6,3,'#aec47a'));
animals.monkey.nodes.push(p('M320 207Q329 214 337 204','none','#73593f',2),e(297,185,5,8,'#d3a582'),p('M306 170Q318 157 328 169','none','#785b43',2),p('M307 219L329 216L330 223L308 227Z','#799b87'));
animals.giraffe.nodes.push(p('M298 211L294 126L299 118','none','#8e663a',4),p('M329 117Q340 122 347 114','none','#8e663a',1.5),e(313,218,6,8,'#9e753d'),e(282,256,5,7,'#9e753d'),p('M302 106l-14-8 5 13Z','#d8ae59','#8e663a',1));
animals.snake=structuredClone(compactAnimals.snake);
animals.snake.nodes.push(p('M281 208l7-4m-1 24 8-4m-12 23 9-3m15-67 6-7','none','#c2d7a0',3),e(339,172,2,3,'#213c32'),p('M328 184Q337 189 343 183','none','#4c714b',1.5));
animals.octopus=structuredClone(compactAnimals.octopus);
animals.octopus.nodes.push(p('M276 195Q284 168 308 174','none','#cfabc5',3),e(281,216,4,2,'#cc9fb8'),e(324,215,4,2,'#cc9fb8'),p('M247 249h3m3 17h3m17 15h3m20 5h3m47-5h3m17-12h3m4-27h3','none','#dec3d2',3));
