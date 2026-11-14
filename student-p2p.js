(()=>{
const L=window.MARS_LIVE;if(!L||L.role!=='student')return;
const deviceKey=KEY+'_device',pendingKey=KEY+'_pending';let device=localStorage.getItem(deviceKey);if(!device){device=crypto.randomUUID().replaceAll('-','');localStorage.setItem(deviceKey,device)}
let label=localStorage.getItem(deviceKey+'_label')||CONFIG.name+' · '+device.slice(0,4),seq=0,joined=false,busy=false,dirty=0,sent=0,readyPhase=-1,phase=CONFIG.initialUpdate?.phase||0,orderKey='',lastStatus='Подключаемся…',conflict=false,booted=false,applying=false;
const originalSave=save,originalRender=render,originalStock=stock;const previews=new Map();
const identityFlagKey=KEY+'_identity_pending';let identityDirty=new Set(),latestIdentity=null;
try{const keys=JSON.parse(localStorage.getItem(identityFlagKey));if(Array.isArray(keys))for(const k of keys)if(['name','motto'].includes(k))identityDirty.add(k)}catch{}
function keepIdentityFlags(){try{if(identityDirty.size)localStorage.setItem(identityFlagKey,JSON.stringify([...identityDirty]));else localStorage.removeItem(identityFlagKey)}catch{}}
function identityHeading(){
 const name=safeName(),pill=document.querySelector('.team-pill');if(pill)pill.textContent=(TEAM?'Омега':'Альфа')+' · '+name;
 document.title='Марс 2050 · '+name;
 if(page==='home'){const heading=document.querySelector('.main>header h1');if(heading)heading.textContent=name}
}
function acceptIdentity(identity){
 if(!identity||typeof identity.name!=='string'||typeof identity.motto!=='string')return;latestIdentity=identity;
 for(const k of ['name','motto'])if(!identityDirty.has(k)){
  data.passport[k]=identity[k];const input=document.getElementById(k==='name'?'colony-name':'colony-motto');if(input&&input.value!==identity[k]){const start=input.selectionStart,end=input.selectionEnd;input.value=identity[k];if(document.activeElement===input&&typeof start==='number')input.setSelectionRange(Math.min(start,input.value.length),Math.min(end,input.value.length))}
 }
 identityHeading();
}
if(typeof updatePassport==='function'){
 const baseUpdatePassport=updatePassport;
 updatePassport=function(k,value){if(['name','motto'].includes(k)){identityDirty.add(k);keepIdentityFlags()}baseUpdatePassport(k,value);if(k==='name')identityHeading()};
}
function sentIdentity(patch,reply){
 for(const k of Object.keys(patch))if(data.passport[k]===patch[k])identityDirty.delete(k);keepIdentityFlags();
 if(reply?.identity)latestIdentity=reply.identity;if(latestIdentity)acceptIdentity(latestIdentity);
}

if(typeof guideHTML==='function'){const oldGuide=guideHTML;guideHTML=()=>oldGuide().replace('<h3>Как передать результат</h3><p>Нажмите «Сохранить проект» и передайте скачанный JSON ведущему. В нём будут паспорт, рисунки, ответы и соглашения. Можно отдельно скачать рисунок PNG и показать его на экране.</p>','<h3>Как передать результат</h3><p>Рисунки, ответы и заявки отправляются ведущему автоматически. Когда закончите, нажмите «Работа готова — сообщить ведущему». Дождитесь подтверждения получения. Кнопка скачивания сохраняет резервную копию на вашем компьютере.</p>').replace('Если ведущий прислал файл обновления, загрузите его кнопкой «Обновление ведущего». Ваши рисунки и записи сохранятся.','Новые задания, события и запасы приходят из пульта автоматически. Ваши рисунки и записи сохраняются.').replaceAll('«Сохранить проект»','«Скачать резервную копию»')}
if(typeof passportHTML==='function'){const oldPassport=passportHTML;passportHTML=()=>oldPassport().replace('Хранитель отмечает изменения после сообщения ведущего. Эти кнопки ведут вашу копию паспорта.','Запасы приходят из пульта автоматически. Расходы подтверждает ведущий.').replace('Новая постройка — 2 материала.','Солнечная станция стоит 2 материала; водосборник, укрытие или свой объект — 2 материала и 1 энергия.')}

if(typeof eventHTML==='function'){
 const previousEventHTML=eventHTML;
 eventHTML=function(i){if(phase<(i?4:2)||!data.currentEvents?.[i])return '<p class="notice">Событие ещё не объявлено ведущим.</p>';return previousEventHTML(i)};
}
if(typeof missionsHTML==='function'){
 const previousMissionsHTML=missionsHTML;
 missionsHTML=function(){
  if(phase===0)return '<section class="panel stack"><h2>Задания откроются по ходу игры</h2><p>Сейчас знакомство: придумайте название колонии и распределите роли. Первую миссию откроет ведущий.</p></section>';
  const count=phase>=5?3:phase>=3?2:1,active=[1,3,5].indexOf(phase),holder=document.createElement('div');holder.innerHTML=previousMissionsHTML();
  const eventSection=holder.querySelector('#event-code-0')?.closest('section');
  for(const [i,card] of [...holder.querySelectorAll('.mission-card')].entries()){
   if(i>=count){card.remove();continue}
   card.dataset.mission=String(i+1);
   if(i!==active){const detail=document.createElement('details');detail.className='panel stack past-mission';const summary=document.createElement('summary');summary.textContent='Миссия '+(i+1)+' · '+missionData()[i].title+' · открыто ранее';detail.append(summary);const content=document.createElement('div');content.className='stack';content.innerHTML=card.innerHTML;detail.append(content);card.replaceWith(detail)}
  }
  let events=0;
  for(let i=0;i<2;i++){
   const slot=holder.querySelector('#event-code-'+i)?.closest('.stack');if(!slot)continue;
   if(phase<(i?4:2)||!data.currentEvents?.[i])slot.remove();else{events++;slot.dataset.event=String(i+1)}
  }
  if(eventSection){if(!events)eventSection.remove();else{const note=eventSection.querySelector('p.notice');if(note)note.textContent='Объявленные события приходят из пульта автоматически. Здесь остаются ваши ответы.'}}
  if([2,4].includes(phase)&&!data.currentEvents?.[phase===2?0:1]){const waiting=document.createElement('section');waiting.className='panel stack';waiting.innerHTML='<h2>Ожидаем объявление события</h2><p>Ведущий выбирает карточку. Она появится здесь автоматически.</p>';holder.querySelector('.two')?.prepend(waiting)}
  const grid=holder.querySelector('.two');if(grid&&grid.children.length===1)grid.style.gridTemplateColumns='minmax(0,1fr)';return holder.innerHTML;
 };
}

function terrainBackground(ctx,id){
 ctx.save();ctx.fillStyle='#fffdf7';ctx.fillRect(0,0,1000,700);
 const fills=['#e7dfd2','#efe4cf','#e1d3c1','#dcebe6'];CONFIG.sectors.forEach((s,i)=>{const x=i%2*500,y=Math.floor(i/2)*350;ctx.fillStyle=fills[i];ctx.fillRect(x+9,y+9,482,332);ctx.strokeStyle='#bdc5ba';ctx.lineWidth=1;ctx.strokeRect(x+9,y+9,482,332)});
 // Landforms are fixed across computers, so route references stay consistent.
 ctx.save();ctx.lineWidth=1.5;ctx.strokeStyle='#b8ac99';ctx.globalAlpha=.62;
 for(let n=0;n<4;n++){ctx.beginPath();ctx.moveTo(45,175+n*21);ctx.bezierCurveTo(155,100+n*20,235,310+n*8,445,215+n*22);ctx.stroke()}
 ctx.strokeStyle='#c4b596';for(let n=0;n<5;n++){ctx.beginPath();ctx.moveTo(545,220+n*17);ctx.bezierCurveTo(655,170+n*16,765,305+n*7,950,226+n*17);ctx.stroke()}
 ctx.restore();
 function rock(x,y,r){ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.moveTo(-r,-r*.22);ctx.lineTo(-r*.3,-r*.82);ctx.lineTo(r*.65,-r*.45);ctx.lineTo(r,r*.32);ctx.lineTo(0,r*.7);ctx.lineTo(-r,r*.3);ctx.closePath();ctx.fillStyle='#b5ad9f';ctx.strokeStyle='#8e8a7c';ctx.lineWidth=1.2;ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-r*.3,-r*.82);ctx.lineTo(0,r*.1);ctx.lineTo(r,r*.32);ctx.stroke();ctx.restore()}
 [[75,140,14],[120,260,17],[180,190,11],[238,285,20],[300,178,13],[375,260,18],[430,138,12],[557,306,10],[810,155,8],[905,302,10],[65,609,13],[410,410,13]].forEach(a=>rock(...a));
 // Crater basin and its successive rim contours.
 ctx.fillStyle='#d3c3ad';ctx.beginPath();ctx.ellipse(260,545,163,105,-.12,0,Math.PI*2);ctx.fill();
 for(let n=0;n<3;n++){ctx.beginPath();ctx.ellipse(260,545,163-n*19,105-n*12,-.12,0,Math.PI*2);ctx.strokeStyle=n===0?'#ad9c87':'#bca991';ctx.lineWidth=n===0?2:1.2;ctx.stroke()}
 ctx.strokeStyle='#b4a18b';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(210,470);ctx.lineTo(225,499);ctx.lineTo(214,526);ctx.lineTo(240,547);ctx.lineTo(223,582);ctx.lineTo(235,620);ctx.stroke();
 // Visible ice patches are a terrain clue, rather than an automatic resource award.
 function ice(x,y,rx,ry){ctx.save();ctx.translate(x,y);ctx.rotate(-.24);ctx.fillStyle='#eef8f5';ctx.strokeStyle='#9dc4be';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#c2ddda';for(let i=-rx+10;i<rx;i+=15){ctx.beginPath();ctx.moveTo(i,-ry*.45);ctx.lineTo(i+12,ry*.45);ctx.stroke()}ctx.restore()}
 ice(638,477,49,22);ice(817,573,72,31);ice(898,443,33,17);ice(597,616,28,13);
 ctx.save();ctx.globalAlpha=.37;ctx.strokeStyle='#9ca99c';ctx.lineWidth=.7;ctx.setLineDash([3,6]);for(let x=100;x<1000;x+=100){ctx.beginPath();ctx.moveTo(x,12);ctx.lineTo(x,683);ctx.stroke()}for(let y=100;y<700;y+=100){ctx.beginPath();ctx.moveTo(12,y);ctx.lineTo(975,y);ctx.stroke()}ctx.restore();
 CONFIG.sectors.forEach((s,i)=>{const x=i%2*500,y=Math.floor(i/2)*350;ctx.fillStyle='#52665f';ctx.font='bold 26px Arial';ctx.fillText(s[0],x+25,y+40);ctx.font='16px Arial';ctx.fillText(s[1],x+25,y+64)});
 function survey(x,y,label){ctx.save();ctx.translate(x,y);ctx.fillStyle='#fbefc9';ctx.strokeStyle='#a78b42';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(13,0);ctx.lineTo(0,13);ctx.lineTo(-13,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#82672f';ctx.font='bold 15px Arial';ctx.fillText(label,18,5);ctx.restore()}survey(392,180,'Р1');survey(105,455,'Р2');
 ctx.font='14px Arial';ctx.fillStyle='#7c7c6c';ctx.fillText('Каменные гряды',285,324);ctx.fillText('Пологие дюны',757,324);ctx.fillText('Край кратера',80,665);ctx.fillText('Ледяные пятна',808,665);
 // Coordinate labels and a compass help children describe routes verbally.
 ctx.font='bold 13px Arial';ctx.fillStyle='#5a6a62';ctx.textAlign='center';for(let i=0;i<10;i++)ctx.fillText(String.fromCharCode(65+i),i*100+50,696);for(let i=0;i<7;i++)ctx.fillText(String(i+1),5,i*100+53);
 ctx.save();ctx.translate(941,111);ctx.fillStyle='#fffdf5ee';ctx.strokeStyle='#91a798';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,27,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#456d60';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,18);ctx.lineTo(0,-18);ctx.moveTo(-18,0);ctx.lineTo(18,0);ctx.stroke();ctx.fillStyle='#456d60';ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(-5,-10);ctx.lineTo(5,-10);ctx.closePath();ctx.fill();ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText('С',0,-34);ctx.fillText('Ю',0,43);ctx.fillText('З',-38,4);ctx.fillText('В',38,4);ctx.restore();
 ctx.restore();
}
if(typeof background==='function'){const previousBackground=background;background=function(ctx,id){if(id==='base'||id==='expedition')terrainBackground(ctx,id);else previousBackground(ctx,id)}}
function mapLegend(){
 if(page!=='drawing'||!['base','expedition'].includes(board))return;const canvas=document.getElementById('board-canvas');if(!canvas)return;
 let legend=document.getElementById('live-map-legend');if(!legend){legend=document.createElement('p');legend.id='live-map-legend';legend.className='notice';legend.innerHTML='Скалы, кратер и ледяные пятна — ориентиры для планирования. Р1 и Р2 — точки для разведки. Координаты: буква и цифра, например C5. <b id="map-cursor"></b>';document.querySelector('.drawing-wrap')?.after(legend)}
 if(!canvas.dataset.coordinates){canvas.dataset.coordinates='1';canvas.addEventListener('pointermove',event=>{const rect=canvas.getBoundingClientRect(),x=Math.max(0,Math.min(999,(event.clientX-rect.left)*1000/rect.width)),y=Math.max(0,Math.min(699,(event.clientY-rect.top)*700/rect.height)),label=document.getElementById('map-cursor');if(label)label.textContent='Курсор: '+String.fromCharCode(65+Math.floor(x/100))+(1+Math.floor(y/100))})}
}

const BLUEPRINTS={solar:{name:'Солнечная станция',purpose:'Разворачиваем готовые панели и заряжаем батареи. Запуск даёт +2 энергии один раз.',cost:'2 материала → +2 энергии'},water:{name:'Водосборник',purpose:'Запускаем установку добычи воды из льда. Тратим 1 энергию и получаем +2 воды один раз.',cost:'2 материала и 1 энергия → +2 воды'},shelter:{name:'Укрытие от бури',purpose:'Защищаем людей и запасы от пыли. На схеме покажем вход и защищённое место.',cost:'2 материала и 1 энергия'},custom:{name:'Свой объект или улучшение',purpose:'',cost:'2 материала и 1 энергия'}};
let selectedBlueprint='custom';
function proposalCost(p){return BLUEPRINTS[p?.kind]?.cost||BLUEPRINTS.custom.cost}
window.marsChooseBlueprint=function(kind){if(!Object.hasOwn(BLUEPRINTS,kind))return;selectedBlueprint=kind;const name=document.getElementById('proposal-name'),purpose=document.getElementById('proposal-purpose');if(name)name.value=kind==='custom'?'':BLUEPRINTS[kind].name;if(purpose)purpose.value=BLUEPRINTS[kind].purpose;document.getElementById('blueprint-choice')?.replaceChildren('Выбрано: '+BLUEPRINTS[kind].name+' · '+BLUEPRINTS[kind].cost);name?.focus()};
if(typeof addProposal==='function'){const originalAddProposal=addProposal;addProposal=function(){const count=data.buildings.length;originalAddProposal();if(data.buildings.length>count){data.buildings.at(-1).kind=selectedBlueprint;selectedBlueprint='custom';save();openBoard('base')}}}
function concreteHelp(){
 if(page==='home'){
  const purpose=document.querySelector('.main>header .notice');if(purpose)purpose.textContent='Готовим две колонии к пылевой буре: запасы воды, энергия и защищённое место для людей.';
  const input=document.getElementById('proposal-name'),panel=input?.closest('section');
  if(panel&&!document.getElementById('building-catalog')){const catalog=document.createElement('section');catalog.id='building-catalog';catalog.className='role-card stack';catalog.innerHTML='<h3>Что можно построить</h3><p class="notice">1. Выберите вариант. 2. Укажите сектор. 3. Добавьте заявку и отметку на карту. 4. Дождитесь подтверждения ведущего.</p><div class="row">'+Object.entries(BLUEPRINTS).map(([k,v])=>`<button class="small warm" onclick="marsChooseBlueprint('${k}')">${esc(v.name)} · ${esc(v.cost)}</button>`).join('')+'</div><p id="blueprint-choice" class="notice">Можно изменить название и объяснение выбранного объекта. Результат запуска начисляется один раз.</p>';input.closest('.two')?.before(catalog)}
  const stocks=document.querySelector('.stocks')?.closest('section');if(stocks&&!document.getElementById('resource-explanation')){const explanation=document.createElement('details');explanation.id='resource-explanation';explanation.innerHTML='<summary>Куда идут ресурсы и как их пополнить</summary><p class="notice">Материалы идут на постройки и аварийное восстановление. В исследовании можно получить +2 материала за принятую разведку, потратив 1 воду и 1 энергию. Ещё помогают договорённости и отдельные события.</p><p class="notice">Вода нужна людям: после миссий 2 и 3 списывается по 1 воде и энергии на жизнь колонии. Энергия также нужна для запуска водосборника и сборки укрытия. Солнечная станция даёт +2 энергии, водосборник — +2 воды при запуске.</p><p class="notice">Для пережидания бури каждой колонии нужны ещё 1 вода и 1 энергия. Сохраняйте этот запас к финалу.</p>';stocks.append(explanation)}
 }
 if(page==='missions')for(const card of document.querySelectorAll('[data-mission]')){
  const n=Number(card.dataset.mission);if(n<3&&!card.querySelector('[data-build-link]')){const button=document.createElement('button');button.className='warm';button.dataset.buildLink='1';button.textContent='Выбрать постройку в «Нашем штабе»';button.onclick=()=>setPage('home');card.append(button)}
 }
 if(page==='agreement'){
  const plan=document.getElementById('final-plan')?.closest('section');if(plan){if(phase<6){plan.replaceChildren();plan.innerHTML='<h2>Общее испытание — позже</h2><p class="notice">Перед бурей ведущий откроет разные сведения двум командам. Тогда появится задание на один общий план защиты.</p>'}else if(!document.getElementById('storm-plan-help')){const help=document.createElement('div');help.id='storm-plan-help';help.className='role-card stack';help.innerHTML='<h3>Зачем нужен общий план</h3><p>Пылевая буря угрожает людям, оборудованию и запасам. Обе колонии должны успеть подготовить защиту. Соедините сведения из личных карточек, затем выберите способ действий.</p><div class="row"><button class="small warm" onclick="marsPlanOutline(\'stay\')">Защитить модули на месте</button><button class="small warm" onclick="marsPlanOutline(\'move\')">Перейти в защищённое место</button></div><p class="notice">Впишите: где укроются обе команды, кто что сделает, по 1 воде и энергии на бурю, риск и запасной способ. Покажите защиту или маршрут на схеме.</p>';document.getElementById('final-plan').before(help)}}
 }
}
window.marsPlanOutline=function(strategy){const outline=(strategy==='stay'?'Способ: защищаем модули на месте.':'Способ: переходим в защищённое место.')+'\nАльфа укрывается: …\nОмега укрывается: …\nДо бури делаем: 1) … 2) … 3) …\nОтветственные: …\nНа время бури: по 1 воде и 1 энергии каждой колонии.\nРиск и запасной способ: …';data.finalPlan=data.finalPlan.trim()?data.finalPlan+'\n\n'+outline:outline;data.finalPlan=data.finalPlan.slice(0,3000);save();render()};

if(typeof guideHTML==='function'){const beforeConcreteGuide=guideHTML;guideHTML=()=>beforeConcreteGuide().replace('Постройка или улучшение — 2 материала. После миссий 2 и 3 — по 1 воде и энергии.','Солнечная станция: 2 материала → +2 энергии. Водосборник: 2 материала и 1 энергия → +2 воды. Укрытие или своё улучшение: 2 материала и 1 энергия. Результат запуска выдаётся один раз. После миссий 2 и 3 каждая колония тратит по 1 воде и энергии. Принятая разведка стоит 1 воду и 1 энергию, даёт +2 материала один раз. На бурю сохраните ещё по 1 воде и энергии.').replace('Секретную карточку открывайте своим кодом перед финалом.','Личные сведения откроются, когда ведущий выдаст их вашей команде.').replace('<h3>Четыре шага</h3>','<h3>Что делаем по этапам</h3><ol><li>Высадка: поставьте бесплатный модуль и выберите ресурсную установку в «Нашем штабе».</li><li>Жизнь колонии: сделайте укрытие, покажите вход, людей и запасы, распределите обязанности.</li><li>Разведка: проведите маршрут к Р1 или Р2 и обратно, отметьте риск и запасной путь, договоритесь с соседями.</li><li>Перед бурей: соедините личные сведения, покажите защиту обеих колоний и запишите общий порядок действий.</li></ol><p>Для постройки выберите готовый вариант в «Нашем штабе», укажите сектор, добавьте заявку и отметку на карту. Ведущий увидит заявку и подтвердит расход.</p><h3>Четыре шага</h3>')}

async function api(path,body){return window.marsTransport.request(path,body)}
function status(s){lastStatus=s;const el=document.getElementById('live-student-status');if(el)el.textContent=s}
function currentTitle(){return ['Знакомство','Миссия 1 · высадка','Первое событие','Миссия 2 · жизнь колонии','Второе событие','Миссия 3 · исследование','Общее испытание','Защита','Итоги'][phase]}
function decorate(){
 identityHeading();mapLegend();concreteHelp();
 document.getElementById('live-student-bar')?.remove();const el=document.createElement('section');el.id='live-student-bar';el.style.cssText='padding:12px 25px;background:#e4eedf;border-bottom:1px solid #cddbc6;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap';
 el.innerHTML=`<div><b>${esc(currentTitle())}</b><span class="notice" style="margin-left:12px">Комната ${L.room.slice(0,8).toUpperCase()} · ПК ${device.slice(0,4).toUpperCase()}</span><div id="live-student-status" style="font-size:12px;color:#466553">${esc(lastStatus)}</div></div><div class="row"><button class="small" onclick="marsGoCurrent()">К текущему заданию</button><button class="warm" id="live-ready" onclick="marsMarkReady()" ${readyPhase===phase?'disabled':''}>${readyPhase===phase?'✓ Работа готова':'Работа готова — сообщить ведущему'}</button></div>`;document.querySelector('.top').after(el);
 const saveButton=Array.from(document.querySelectorAll('.top button')).find(b=>b.textContent==='Сохранить проект');if(saveButton){saveButton.textContent='Скачать резервную копию';saveButton.className='small'}
 for(const b of document.querySelectorAll('button'))if(['Обновление ведущего','Загрузить обновление от ведущего'].includes(b.textContent))b.style.display='none';for(const input of document.querySelectorAll('[id^=event-code-]'))input.closest('.row').style.display='none';
 const note=document.querySelector('.side-note');if(note)note.textContent='Рисунки, ответы и заявки передаются ведущему автоматически. У каждого компьютера своя работа. Общий проект собирайте на основном компьютере штаба.';
 const foot=document.querySelector('.bottom-note');if(foot)foot.textContent='Изменения отправляются через интернет. При обрыве связи работа остаётся на этом компьютере и отправится после подключения. Перед закрытием дождитесь «Ведущий получил изменения».';
 for(const [i,proposal] of Array.from(document.querySelectorAll('.proposal')).entries()){const item=data.buildings[i],label=proposal.querySelector('span.notice');if(item&&label)label.textContent=(data.teacherUpdate?.approvedRequests?.includes(item.id)?'✓ Подтверждено ведущим': 'Ожидает подтверждения ведущим · '+proposalCost(item))}
 for(const btn of document.querySelectorAll('.stock button')){btn.disabled=true;btn.closest('.row').style.display='none'}
 if((L.protocolVersion||0)<2&&!document.getElementById('old-teacher-warning')){const warning=document.createElement('p');warning.id='old-teacher-warning';warning.className='toast';warning.textContent='Сообщите ведущему: для новых названий и уведомлений нужен обновлённый пульт v5.';document.getElementById('live-student-bar').after(warning)}
 if(page==='secret'&&!data.secret){const panel=document.querySelector('.secret-code')?.closest('.panel');if(panel)panel.innerHTML='<div class="eyebrow">ЛИЧНЫЕ СВЕДЕНИЯ КОМАНДЫ</div><h2>Ждём сигнала ведущего</h2><p>Перед общим испытанием ведущий откроет вашу карточку. Она появится здесь автоматически.</p>'}
}
render=function(){originalRender();decorate()};
save=function(){originalSave();if(!applying){dirty++;readyPhase=-1;const readyButton=document.getElementById('live-ready');if(readyButton){readyButton.disabled=false;readyButton.textContent='Работа готова — сообщить ведущему'}localStorage.setItem(pendingKey,'1');status('Есть изменения · отправляем ведущему…');clearTimeout(window.marsPushTimer);window.marsPushTimer=setTimeout(push,800)}};
stock=function(){message('Запасы подтверждает ведущий. Они обновятся здесь автоматически.')};
window.marsGoCurrent=()=>{if(phase===6&&!data.secret)setPage('secret');else if(phase===6||phase===7)setPage('agreement');else if(phase===0)setPage('roles');else setPage('missions')};
window.marsMarkReady=()=>{readyPhase=phase;dirty++;localStorage.setItem(pendingKey,'1');status('Отправляем готовую работу…');decorate();push()};
async function preview(snapshot,id){const hash=JSON.stringify(snapshot.boards[id]);if(previews.get(id)?.hash===hash)return previews.get(id).src;await prepareImages(snapshot.boards[id]);const full=document.createElement('canvas');paintBoard(full,id,snapshot.boards[id]);const canvas=document.createElement('canvas');canvas.width=768;canvas.height=538;canvas.getContext('2d').drawImage(full,0,0,768,538);let src=canvas.toDataURL('image/jpeg',.78);if(src.length>180000)src=canvas.toDataURL('image/jpeg',.4);if(src.length>180000){canvas.width=512;canvas.height=358;canvas.getContext('2d').drawImage(full,0,0,512,358);src=canvas.toDataURL('image/jpeg',.4)}previews.set(id,{hash,src});return src}
async function push(){
 if(!joined||busy||conflict||dirty===sent)return;busy=true;const stamp=dirty,snapshot=clone(data),atPhase=phase,isReady=readyPhase===phase,identityPatch=Object.fromEntries([...identityDirty].map(k=>[k,data.passport[k]]));snapshot.secret=null;
 try{const views={};for(const id of BOARD_IDS)views[id]=await preview(snapshot,id);const project={game:'mars2050-student',version:1,kitId:CONFIG.kitId,team:TEAM,savedAt:new Date().toISOString(),data:snapshot,previews:views};const x=await api('project',{device,seq:seq+1,phase:atPhase,ready:isReady,profileProtocol:1,identityPatch,project});seq=x.seq;sent=stamp;sentIdentity(identityPatch,x);originalSave();if(dirty===stamp){localStorage.removeItem(pendingKey);status((isReady?'✓ Ведущий получил готовую работу':'✓ Ведущий получил изменения')+' · '+new Date(x.savedAt).toLocaleTimeString('ru-RU'))}else status('Отправляем следующие изменения…')}
 catch(e){if(e.status===409&&e.seq>seq){seq=e.seq;status('Восстанавливаем отправку после обрыва…')}else if([400,413].includes(e.status)){conflict=true;status(e.message+' Скачайте резервную копию.')}else if(e.status===507){status(e.message)}else status('Нет связи с ведущим · работа сохранена здесь, повторим отправку')}
 finally{busy=false;if(dirty!==sent&&!conflict)setTimeout(push,1800)}
}
function applyOrder(x){if(!x||!validUpdate(x))return;if(x.identity)acceptIdentity(x.identity);const comparable=JSON.stringify({...x,sentAt:null});if(comparable===orderKey)return;orderKey=comparable;const changed=phase!==x.phase;phase=x.phase;if(changed)readyPhase=-1;applying=true;data.teacherUpdate=x;data.stocks=clone(x.stocks);data.stockSource='Актуальный запас из пульта ведущего.';if(Array.isArray(x.openedEvents)){data.currentEvents??=[null,null];for(let i=0;i<2;i++)if(x.openedEvents[i])data.currentEvents[i]=clone(x.openedEvents[i])}if(x.event&&[2,4].includes(x.phase)){const i=x.phase===2?0:1;data.currentEvents??=[null,null];data.currentEvents[i]=clone(x.event);const n=CONFIG.events.findIndex(e=>e.id===x.event.id);if(n>=0)data.eventChoices[i]=n}originalSave();applying=false;if(!document.activeElement?.matches('input,textarea,select')&&!draft)render();else decorate()}
async function poll(initial=false){const x=await api('poll?device='+device+'&restore='+(initial?'1':'0'));if(initial){seq=x.own?.seq||0;if(x.own?.project&&validData(x.own.project.data,false)&&!localStorage.getItem(pendingKey)){data=clone(x.own.project.data);originalSave();if(x.own.ready&&x.own.phase===x.phase)readyPhase=x.phase}booted=true}if(x.own?.seq>seq)seq=x.own.seq;applyOrder(x.order);if(x.secret&&!data.secret){data.secret=x.secret;originalSave();if(page==='secret'&&!document.activeElement?.matches('input,textarea'))render()}if(initial){render();dirty++;await push()}}
async function start(){try{await api('join',{device,label});joined=true;await poll(true);status(lastStatus)}catch(e){status(e.message);joined=false}}
decorate();start();setInterval(async()=>{if(!joined){start();return}try{await poll(!booted);if(dirty!==sent)push()}catch{status('Нет связи · работа сохранена на этом компьютере')}},3000);
window.marsTransport.onorder=msg=>{applyOrder(msg.body);if(msg.secret&&!data.secret){data.secret=msg.secret;originalSave();if(page==='secret')render()}};for(const msg of window.marsTransport.queue.splice(0))window.marsTransport.onorder(msg);addEventListener('beforeunload',()=>window.marsTransport.peer?.destroy());
addEventListener('online',()=>{if(joined)push();else start()});
})();
