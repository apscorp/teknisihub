const CONFIG={API_URL:"https://script.google.com/macros/s/AKfycbz64G4TV8VE4ky2RfwRE3Yxhl9D8wjirBL0OKYNDQsfYtH7A8Qg2Wdg11h7R7kf1XUC/exec"}; // TeknisiHub V5.2
let state={orders:[],techs:[],customers:[],user:null};
let loginRole="ADMIN"
const DEMO=CONFIG.API_URL.includes("PASTE_");

function setLoginRole(role){
  loginRole=role;
  document.getElementById("roleAdmin").classList.toggle("active",role==="ADMIN");
  document.getElementById("roleTech").classList.toggle("active",role==="TEKNISI");
  document.getElementById("loginUser").placeholder=role==="ADMIN"?"Username admin":"Username teknisi";
  document.getElementById("loginPass").placeholder=role==="ADMIN"?"Password":"Password / PIN";
  document.getElementById("loginHint").textContent=role==="ADMIN"?"Admin demo: admin / 123456":"Akun teknisi dibuat oleh Admin. Default awal: password 123456.";
}
async function login(){
  const username=document.getElementById("loginUser").value.trim();
  const password=document.getElementById("loginPass").value;
  if(!username||!password){alert("Username dan password wajib diisi.");return}
  try{
    const r=await api("login",{username,password,role:loginRole});
    if(!r.ok){alert(r.error||"Login gagal.");return}
    state.user=r.user; localStorage.setItem("th_session",JSON.stringify(r));
    boot();
  }catch(e){alert("Login gagal: "+e.message)}
}
function logout(){localStorage.removeItem("th_session");location.reload()}
function boot(){
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  const u=state.user||{};
  document.getElementById("sidebarUser").innerHTML=`<b>${esc(u.name||u.username||"User")}</b><br>${esc(u.role||"")}`;
  applyRoleUI();
  showPage(u.role==="TEKNISI"?"portal":"dashboard");
  loadData();
}
async function restoreSession(){
  const raw=localStorage.getItem("th_session");
  if(!raw)return;
  try{
    const s=JSON.parse(raw);
    if(!s.token||!s.user)return;
    if(DEMO){state.user=s.user;boot();return}
    const r=await api("me",{token:s.token});
    if(r.ok){state.user=r.user;boot()}else localStorage.removeItem("th_session");
  }catch(e){localStorage.removeItem("th_session")}
}
function applyRoleUI(){
  const isTech=state.user?.role==="TEKNISI";
  document.querySelectorAll(".nav button").forEach(b=>{
    const page=b.dataset.page;
    b.classList.toggle("hidden",isTech && !["portal"].includes(page));
  });
}
async function api(action,payload={}){
  if(DEMO){return mockApi(action,payload)}
  const session=JSON.parse(localStorage.getItem("th_session")||"{}");
  const r=await fetch(CONFIG.API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,...payload,token:payload.token||session.token||""})});
  return await r.json();
}
async function loadData(){
  try{
    let r=await api("list");
    if(r.ok===false)throw new Error(r.error||"Gagal memuat data");
    state.orders=r.orders||[];state.techs=r.techs||[];state.customers=r.customers||[];
    document.getElementById("syncText").textContent=DEMO?"Demo Mode":"Google Sheets Connected";
    refreshAll();
  }catch(e){alert("Gagal memuat data: "+e.message)}
}
function refreshAll(){renderDashboard();renderOrders();renderDispatch();renderTechs();renderCustomers();renderFinance();renderPortal()}
function showPage(id){
  document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  document.querySelectorAll(".nav button").forEach(x=>x.classList.toggle("active",x.dataset.page===id));
  const names={dashboard:"Dashboard",orders:"Order",dispatch:"Dispatch",techs:"Teknisi",customers:"Customer",finance:"Keuangan",portal:"Portal Teknisi"};
  document.getElementById("pageTitle").textContent=names[id];
  ({dashboard:renderDashboard,orders:renderOrders,dispatch:renderDispatch,techs:renderTechs,customers:renderCustomers,finance:renderFinance,portal:renderPortal}[id]||renderDashboard)();
}
function money(n){return "Rp"+Number(n||0).toLocaleString("id-ID")}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function badge(s){let c=String(s||"").toLowerCase();return `<span class="badge ${c.includes("online")?"online":c.includes("busy")?"busy":c.includes("pending")?"pending":c.includes("batal")?"danger":""}">${esc(s||"-")}</span>`}
function uid(p){return p+"_"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

async function api(action,payload={}){
  if(DEMO){return mockApi(action,payload)}
  const r=await fetch(CONFIG.API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,...payload})});
  return await r.json();
}
async function loadData(){
  try{let r=await api("list");state.orders=r.orders||[];state.techs=r.techs||[];state.customers=r.customers||[];document.getElementById("syncText").textContent=DEMO?"Demo Mode":"Google Sheets Connected";refreshAll()}
  catch(e){alert("Gagal memuat data: "+e.message)}
}
function refreshAll(){renderDashboard();renderOrders();renderDispatch();renderTechs();renderCustomers();renderFinance();populatePortalTechs();renderPortal()}

function renderDashboard(){
  const active=state.orders.filter(o=>!["SELESAI","DIBATALKAN"].includes(o.status)).length;
  const online=state.techs.filter(t=>t.status==="ONLINE").length;
  const rev=state.orders.filter(o=>o.status==="SELESAI").reduce((a,o)=>a+Number(o.finalPrice||o.price||0),0);
  kpiOrders.textContent=state.orders.length;kpiActive.textContent=active;kpiOnline.textContent=online;kpiRevenue.textContent=money(rev);
  const arr=[...state.orders].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,8);
  recentOrders.innerHTML=arr.length?`<div class="table-wrap"><table class="table"><tr><th>Customer</th><th>Layanan</th><th>Teknisi</th><th>Status</th><th>Harga</th></tr>${arr.map(o=>`<tr><td>${esc(o.customerName)}<br><small>${esc(o.customerPhone)}</small></td><td>${esc(o.service)}</td><td>${esc(techName(o.technicianId)||"Belum")}</td><td>${badge(o.status)}</td><td>${money(o.finalPrice||o.price)}</td></tr>`).join("")}</table></div>`:"<div class='empty'>Belum ada order</div>";
}
function renderOrders(){
 const q=(orderSearch?.value||"").toLowerCase();
 const arr=state.orders.filter(o=>[o.customerName,o.customerPhone,o.address,o.service].join(" ").toLowerCase().includes(q));
 ordersTable.innerHTML=`<div class="table-wrap"><table class="table"><tr><th>Customer</th><th>Layanan</th><th>Alamat</th><th>Teknisi</th><th>Status</th><th>Harga</th><th>Aksi</th></tr>${arr.map(o=>`<tr><td><b>${esc(o.customerName)}</b><br>${esc(o.customerPhone)}</td><td>${esc(o.service)}<br>${esc(o.priority)}</td><td>${esc(o.address)}</td><td>${esc(techName(o.technicianId)||"-")}</td><td>${badge(o.status)}</td><td>${money(o.finalPrice||o.price)}</td><td><div class="actions">${o.status==="DITAWARKAN"?`<button onclick="showPage('portal')">Portal</button>`:""}${["DITERIMA","ON_PROGRESS"].includes(o.status)?`<button onclick="setOrderStatus('${o.id}','${o.status==="DITERIMA"?"ON_PROGRESS":"SELESAI"}')">${o.status==="DITERIMA"?"Mulai":"Selesaikan"}</button>`:""}${!["SELESAI","DIBATALKAN"].includes(o.status)?`<button onclick="setOrderStatus('${o.id}','DIBATALKAN')">Batal</button>`:""}</div></td></tr>`).join("")}</table></div>`;
}
function renderDispatch(){
 const arr=state.orders.filter(o=>["BARU","DITAWARKAN"].includes(o.status));
 dispatchList.innerHTML=arr.length?arr.map(o=>{const matches=matchingTechs(o);return `<div class="offer"><h3>${esc(o.customerName)} — ${esc(o.service)}</h3><p>${esc(o.address)}</p><p>${esc(o.complaint||"")} · ${money(o.price)}</p><p>Teknisi sesuai: <b>${matches.length}</b> (${matches.map(t=>esc(t.name)).join(", ")||"tidak ada"})</p><div class="actions">${o.status==="BARU"?`<button onclick="broadcast('${o.id}')">Broadcast ke ${matches.length} teknisi</button>`:""}<button class="secondary" onclick="showPage('portal')">Buka Portal</button></div></div>`}).join(""):"<div class='empty'>Tidak ada order yang perlu didispatch</div>";
}
function renderTechs(){
 const q=(techSearch?.value||"").toLowerCase();const arr=state.techs.filter(t=>[t.name,t.area,t.skills].join(" ").toLowerCase().includes(q));
 techsTable.innerHTML=`<div class="table-wrap"><table class="table"><tr><th>Teknisi</th><th>Area</th><th>Skill</th><th>Tools</th><th>Status</th><th>Aksi</th></tr>${arr.map(t=>`<tr><td><b>${esc(t.name)}</b><br>${esc(t.phone)}</td><td>${esc(t.area)}</td><td>${esc(t.skills)}</td><td>${esc(t.tools)}</td><td>${badge(t.status)}</td><td><button onclick="toggleTech('${t.id}')">${t.status==="ONLINE"?"Offline":"Online"}</button></td></tr>`).join("")}</table></div>`;
}
function renderCustomers(){
 customersTable.innerHTML=`<div class="table-wrap"><table class="table"><tr><th>Nama</th><th>HP</th><th>Alamat</th><th>Total Order</th></tr>${state.customers.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td>${esc(c.address)}</td><td>${state.orders.filter(o=>o.customerPhone===c.phone).length}</td></tr>`).join("")}</table></div>`;
}
function renderFinance(){
 const done=state.orders.filter(o=>o.status==="SELESAI"),rev=done.reduce((a,o)=>a+Number(o.finalPrice||o.price||0),0),fee=done.reduce((a,o)=>a+Number(o.techFee||0),0);
 finRevenue.textContent=money(rev);finTechFee.textContent=money(fee);finMargin.textContent=money(rev-fee);
 financeTable.innerHTML=done.length?`<div class="table-wrap"><table class="table"><tr><th>Order</th><th>Customer</th><th>Harga</th><th>Fee Teknisi</th><th>Margin</th></tr>${done.map(o=>`<tr><td>${esc(o.id)}</td><td>${esc(o.customerName)}</td><td>${money(o.finalPrice||o.price)}</td><td>${money(o.techFee)}</td><td>${money(Number(o.finalPrice||o.price||0)-Number(o.techFee||0))}</td></tr>`).join("")}</table></div>`:"<div class='empty'>Belum ada order selesai</div>";
}

function openOrderModal(){
 modalTitle.textContent="Order Baru";
 modalBody.innerHTML=`<div class="form-grid">
 <div class="form-group"><label>Nama Customer</label><input id="fName"></div>
 <div class="form-group"><label>No. HP</label><input id="fPhone"></div>
 <div class="form-group full"><label>Alamat</label><textarea id="fAddress"></textarea></div>
 <div class="form-group"><label>Layanan</label><select id="fService"><option>AC</option><option>Washing Machine</option><option>Refrigerator</option><option>Water Heater</option><option>Other</option></select></div>
 <div class="form-group"><label>Prioritas</label><select id="fPriority"><option>NORMAL</option><option>URGENT</option></select></div>
 <div class="form-group full"><label>Keluhan</label><textarea id="fComplaint"></textarea></div>
 <div class="form-group"><label>Harga Customer</label><input id="fPrice" type="number" value="150000"></div>
 <div class="form-group"><label>Fee Teknisi</label><input id="fFee" type="number" value="100000"></div></div>
 <div class="form-actions"><button class="secondary" onclick="closeModal()">Batal</button><button onclick="saveOrder()">Simpan</button></div>`;
 document.getElementById("modal").classList.remove("hidden");
}
async function saveOrder(){
  const $ = id => document.getElementById(id);
  const customerName = $("fName").value.trim();
  const customerPhone = $("fPhone").value.trim();
  const address = $("fAddress").value.trim();
  const service = $("fService").value;
  const priority = $("fPriority").value;
  const complaint = $("fComplaint").value.trim();
  const price = Number($("fPrice").value || 0);
  const techFee = Number($("fFee").value || 0);

  if(!customerName || !customerPhone || !address || !service){
    alert("Nama customer, No. HP, alamat, dan layanan wajib diisi.");
    return;
  }

  const btn = [...document.querySelectorAll("#modalBody button")].find(b => b.textContent.trim() === "Simpan");
  if(btn){ btn.disabled = true; btn.textContent = "Menyimpan..."; }

  try{
    const o={
      id:uid("ORD"),
      createdAt:new Date().toISOString(),
      customerName,
      customerPhone,
      address,
      service,
      priority,
      complaint,
      price,
      techFee,
      technicianId:"",
      finalPrice:price,
      status:"BARU",
      offeredTechnicianIds:"",
      acceptedAt:"",
      completedAt:""
    };
    const result = await api("createOrder",{order:o});
    if(result && result.ok === false) throw new Error(result.error || "Order gagal disimpan.");
    closeModal();
    await loadData();
    showPage("orders");
  }catch(err){
    alert("Gagal menyimpan order: " + err.message);
    if(btn){ btn.disabled = false; btn.textContent = "Simpan"; }
  }
}
function openTechModal(){
 modalTitle.textContent="Tambah Teknisi";
 modalBody.innerHTML=`<div class="form-grid">
 <div class="form-group"><label>Nama</label><input id="tName"></div><div class="form-group"><label>No. HP</label><input id="tPhone"></div>
 <div class="form-group"><label>Area</label><input id="tArea" placeholder="Cileungsi, Jonggol, Gunung Putri"></div>
 <div class="form-group"><label>Skill</label><input id="tSkills" placeholder="AC, Washing Machine"></div>
 <div class="form-group"><label>Tools</label><input id="tTools" placeholder="Own tools"></div><div class="form-group"><label>Vehicle</label><input id="tVehicle"></div>
 <div class="form-group"><label>Payment</label><input id="tPayment" placeholder="Bank / e-wallet"></div>
 <div class="form-group"><label>Status</label><select id="tStatus"><option>ONLINE</option><option>OFFLINE</option><option>PENDING</option></select></div>
 <div class="form-group"><label>Username Login</label><input id="tUsername" placeholder="Contoh: budi.ac"></div>
 <div class="form-group"><label>Password / PIN Awal</label><input id="tPassword" value="123456"></div></div>
 <div class="form-actions"><button class="secondary" onclick="closeModal()">Batal</button><button onclick="saveTech()">Simpan</button></div>`;
 document.getElementById("modal").classList.remove("hidden");
}
async function saveTech(){
  const t={id:uid("TEC"),createdAt:new Date().toISOString(),name:tName.value,phone:tPhone.value,area:tArea.value,skills:tSkills.value,tools:tTools.value,vehicle:tVehicle.value,payment:tPayment.value,status:tStatus.value,lastOnline:tStatus.value==="ONLINE"?new Date().toISOString():""};
  const username=document.getElementById("tUsername").value.trim()||t.phone;
  const password=document.getElementById("tPassword").value||"123456";
  if(!t.name||!t.phone||!username||!password){alert("Nama, HP, username, dan password wajib diisi.");return}
  try{
    const r=await api("createTech",{tech:t,user:{username,password,role:"TEKNISI",technicianId:t.id,name:t.name,status:"ACTIVE"}});
    if(r.ok===false)throw new Error(r.error||"Gagal membuat teknisi.");
    closeModal();await loadData();
    alert(`Akun teknisi berhasil dibuat.\\nUsername: ${username}\\nPassword/PIN: ${password}`);
  }catch(e){alert("Gagal membuat teknisi: "+e.message)}
}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
function techName(id){return state.techs.find(t=>t.id===id)?.name||""}
function matchingTechs(o){const key=String(o.service||"").toLowerCase();return state.techs.filter(t=>t.status==="ONLINE"&&String(t.skills||"").toLowerCase().split(",").some(s=>s.trim()===key||key.includes(s.trim())||s.trim().includes(key)))}
async function broadcast(id){
 const o=state.orders.find(x=>x.id===id),m=matchingTechs(o);if(!m.length){alert("Tidak ada teknisi ONLINE yang skill-nya sesuai.");return}
 await api("offerOrder",{orderId:id,technicianIds:m.map(t=>t.id)});await loadData();alert("Order dibroadcast ke "+m.length+" teknisi.")
}
async function toggleTech(id){const t=state.techs.find(x=>x.id===id);const s=t.status==="ONLINE"?"OFFLINE":"ONLINE";await api("updateTech",{id,status:s,lastOnline:s==="ONLINE"?new Date().toISOString():t.lastOnline});await loadData()}
async function setOrderStatus(id,status){await api("updateOrder",{id,status,completedAt:status==="SELESAI"?new Date().toISOString():""});await loadData()}

function renderPortal(){
  if(state.user?.role!=="TEKNISI"){
    portalProfile.innerHTML="<div class='empty'>Portal Teknisi hanya dapat digunakan oleh akun teknisi.</div>";
    portalOffers.innerHTML="<div class='empty'>Login sebagai teknisi untuk melihat order.</div>";
    return;
  }
  const id=state.user.technicianId;
  const t=state.techs.find(x=>x.id===id);
  if(!t){
    portalProfile.innerHTML="<div class='empty'>Data teknisi belum ditemukan.</div>";
    portalOffers.innerHTML="";
    return;
  }
  portalProfile.innerHTML=`<div class="portal-profile"><b>${esc(t.name)}</b><span>${esc(t.phone)}</span><span>${esc(t.area)}</span><span>Skill: ${esc(t.skills)}</span><span>Status: ${badge(t.status)}</span><button onclick="portalStatus('${t.id}')">${t.status==="ONLINE"?"Set Offline":"Set Online"}</button></div>`;
  const offers=state.orders.filter(o=>String(o.offeredTechnicianIds||"").split(",").includes(id)&&["DITAWARKAN","DITERIMA","ON_PROGRESS"].includes(o.status));
  portalOffers.innerHTML=offers.length?offers.map(o=>`<div class="offer"><h3>${esc(o.service)} — ${money(o.price)}</h3><p><b>${esc(o.customerName)}</b> · ${esc(o.customerPhone)}</p><p>${esc(o.address)}</p><p>${esc(o.complaint||"")}</p><div class="actions">${o.status==="DITAWARKAN"?`<button onclick="accept('${o.id}','${id}')">Terima Order</button><button class="secondary" onclick="reject('${o.id}','${id}')">Tolak</button>`:""}${o.status==="DITERIMA"?`<button onclick="techProgress('${o.id}')">Mulai Pengerjaan</button>`:""}${o.status==="ON_PROGRESS"?`<button onclick="techComplete('${o.id}')">Selesai</button>`:""}</div></div>`).join(""):"<div class='empty'>Tidak ada order yang ditawarkan.</div>";
}
async function portalStatus(id){const t=state.techs.find(x=>x.id===id),s=t.status==="ONLINE"?"OFFLINE":"ONLINE";await api("updateTech",{id,status:s,lastOnline:s==="ONLINE"?new Date().toISOString():t.lastOnline});await loadData();renderPortal()}
async function accept(orderId,techId){const r=await api("acceptOrder",{orderId,technicianId:techId});if(r.ok!==false){await loadData();showPage("portal")}else alert(r.error||"Order sudah diambil teknisi lain.")}
async function reject(orderId,techId){await api("rejectOffer",{orderId,technicianId:techId});await loadData();renderPortal()}
async function techProgress(id){await api("updateOrder",{id,status:"ON_PROGRESS"});await loadData();renderPortal()}
async function techComplete(id){await api("updateOrder",{id,status:"SELESAI",completedAt:new Date().toISOString()});const o=state.orders.find(x=>x.id===id);if(o?.technicianId)await api("updateTech",{id:o.technicianId,status:"ONLINE",lastOnline:new Date().toISOString()});await loadData();renderPortal()}

function mockApi(action,payload){
  if(action==="login"){
    if(payload.role==="ADMIN"&&payload.username==="admin"&&payload.password==="123456")
      return Promise.resolve({ok:true,token:"demo-admin",user:{username:"admin",name:"Administrator",role:"ADMIN",technicianId:""}});
    const t=state.techs.find(x=>x.username===payload.username && x.password===payload.password);
    if(payload.role==="TEKNISI"&&t)return Promise.resolve({ok:true,token:"demo-"+t.id,user:{username:t.username,name:t.name,role:"TEKNISI",technicianId:t.id}});
    return Promise.resolve({ok:false,error:"Username atau password salah."});
  }
  if(action==="me")return Promise.resolve({ok:true,user:state.user});
  if(action==="list")return Promise.resolve({ok:true,orders:state.orders,techs:state.techs,customers:state.customers});
  if(action==="createOrder"){
    state.orders.push(payload.order);let c=state.customers.find(x=>x.phone===payload.order.customerPhone);
    if(c){c.name=payload.order.customerName;c.address=payload.order.address}
    else state.customers.push({id:uid("CUS"),createdAt:new Date().toISOString(),name:payload.order.customerName,phone:payload.order.customerPhone,address:payload.order.address});
    return Promise.resolve({ok:true})
  }
  if(action==="createTech"){
    const t={...payload.tech,username:payload.user.username,password:payload.user.password};
    state.techs.push(t);return Promise.resolve({ok:true})
  }
  if(action==="updateTech"){let t=state.techs.find(x=>x.id===payload.id);if(t)Object.assign(t,payload);return Promise.resolve({ok:true})}
  if(action==="updateOrder"){let o=state.orders.find(x=>x.id===payload.id);if(o)Object.assign(o,payload);return Promise.resolve({ok:true})}
  if(action==="offerOrder"){let o=state.orders.find(x=>x.id===payload.orderId);if(o){o.status="DITAWARKAN";o.offeredTechnicianIds=payload.technicianIds.join(",")}return Promise.resolve({ok:true})}
  if(action==="rejectOffer"){let o=state.orders.find(x=>x.id===payload.orderId);if(o){let ids=String(o.offeredTechnicianIds).split(",").filter(x=>x&&x!==payload.technicianId);o.offeredTechnicianIds=ids.join(",");if(!ids.length&&o.status==="DITAWARKAN")o.status="BARU"}return Promise.resolve({ok:true})}
  if(action==="acceptOrder"){let o=state.orders.find(x=>x.id===payload.orderId);if(!o||o.status!=="DITAWARKAN")return Promise.resolve({ok:false,error:"Order sudah diambil / tidak tersedia"});if(!String(o.offeredTechnicianIds).split(",").includes(payload.technicianId))return Promise.resolve({ok:false,error:"Teknisi tidak diundang"});o.technicianId=payload.technicianId;o.status="DITERIMA";o.acceptedAt=new Date().toISOString();let t=state.techs.find(x=>x.id===payload.technicianId);if(t)t.status="BUSY";return Promise.resolve({ok:true})}
  return Promise.resolve({ok:true})
}
