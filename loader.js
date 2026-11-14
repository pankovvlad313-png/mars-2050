(()=>{
const q=new URLSearchParams(location.hash.slice(1)),room=q.get('room'),team=Number(q.get('team')),key=q.get('key'),status=document.getElementById('connection-status');
if(!/^[a-f0-9]{32}$/.test(room||'')||![0,1].includes(team)||!/^[A-Za-z0-9_-]{32}$/.test(key||'')){status.textContent='Откройте полную ссылку своей команды, которую передал ведущий.';return}
const deviceKey='mars2050_workbook_'+room+'_'+(team?'omega':'alpha')+'_device';let device=localStorage.getItem(deviceKey);if(!device){device=crypto.randomUUID().replaceAll('-','');localStorage.setItem(deviceKey,device)}
let peer,conn,loaded=false,connecting=false,retryTimer;const pending=new Map(),transport={peer:null,conn:null,onorder:null,queue:[]};window.marsTransport=transport;
function message(text){if(!loaded)status.textContent=text;else{const el=document.getElementById('live-student-status');if(el)el.textContent=text}}
function retry(){clearTimeout(retryTimer);retryTimer=setTimeout(connect,3500)}
transport.request=(path,body)=>new Promise((resolve,reject)=>{if(!conn?.open)return reject(Error('Нет связи с ведущим'));const id=crypto.randomUUID(),timeout=setTimeout(()=>{pending.delete(id);reject(Error('Ведущий не ответил. Повторим отправку.'))},15000);pending.set(id,{resolve,reject,timeout});try{conn.send({type:'rpc',id,path,body})}catch(e){clearTimeout(timeout);pending.delete(id);reject(e)}});
function lost(){connecting=false;for(const p of pending.values()){clearTimeout(p.timeout);p.reject(Error('Связь прервалась'))}pending.clear();message('Нет связи с ведущим · работа останется на этом компьютере');retry()}
function receive(msg){
 if(msg?.type==='rpc-result'){const p=pending.get(msg.id);if(!p)return;clearTimeout(p.timeout);pending.delete(msg.id);if(msg.status>=400)p.reject(Object.assign(Error(msg.body?.error||'Ошибка отправки'),{status:msg.status,seq:msg.body?.seq}));else p.resolve(msg.body);return}
 if(msg?.type==='order'){if(transport.onorder)transport.onorder(msg);else transport.queue.push(msg);return}
 if(msg?.type==='fatal'){message(msg.error);return}
 if(msg?.type==='bootstrap'&&!loaded){loaded=true;window.MARS_LIVE={...msg.live,key};const init='<script>window.MARS_LIVE='+JSON.stringify(window.MARS_LIVE).replaceAll('<','\\u003c')+';<\/script>';const html=msg.html.replace('<script>',init+'<script>').replace('</body>','<script src="./student-p2p.js?v=6"><\/script></body>');document.open();document.write(html);document.close()}
}
function connect(){if(connecting||conn?.open)return;if(!peer||peer.destroyed){start();return}if(peer.disconnected){try{peer.reconnect()}catch{};retry();return}connecting=true;message('Подключаемся к пульту ведущего…');const active=peer.connect('mars2050-'+room,{reliable:true,serialization:'binary'});conn=active;transport.conn=active;active.on('open',()=>{if(conn!==active)return;connecting=false;active.send({type:'hello',room,team,key,device})});active.on('data',msg=>{if(conn===active)receive(msg)});active.on('close',()=>{if(conn===active)lost()});active.on('error',()=>{if(conn===active)lost()});setTimeout(()=>{if(conn===active&&connecting&&!active.open){active.close();lost()}},12000)}
function start(){try{peer=new Peer({secure:true,debug:0,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:['turn:eu-0.turn.peerjs.com:3478','turn:us-0.turn.peerjs.com:3478','turn:eu-0.turn.peerjs.com:3478?transport=tcp','turn:us-0.turn.peerjs.com:3478?transport=tcp'],username:'peerjs',credential:'peerjsp'}]}});transport.peer=peer;peer.on('open',connect);peer.on('error',()=>{message('Не удалось соединиться. Попросите ведущего проверить, что пульт открыт.');connecting=false;retry()});peer.on('disconnected',()=>{if(!conn?.open)retry()})}catch{message('Для этой игры нужен актуальный Chrome или Edge.')}}
start();
})();
