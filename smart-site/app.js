import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const config = window.SMART_SITE_CONFIG;
const statusBox = $("#appStatus");
const fa = (n) => Number(n || 0).toLocaleString("fa-IR");
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const names = {dashboard:"داشبورد عملیاتی",projects:"مدیریت پروژه‌ها",issues:"مسائل و پیگیری",reports:"گزارش‌های کارگاه",organization:"سازمان و برند",license:"مدیریت لایسنس"};
let client, session, tenantId, tenantRole, projects=[], issues=[], reports=[], members=[];

function notify(message, error=false) {
  statusBox.textContent = message;
  statusBox.style.display = "block";
  statusBox.style.borderColor = error ? "#8a4545" : "#72572f";
  statusBox.style.background = error ? "#351d22" : "#302719";
  statusBox.style.color = error ? "#ffb0a8" : "#eac58a";
}
function clearNotice(){ statusBox.style.display="none"; }
function show(view) {
  $$(".view").forEach(x=>x.classList.toggle("active",x.id===view));
  $$(".nav button").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
  $("#pageTitle").textContent=names[view]||"SMART SITE";
}
function modal(id){$("#"+id).classList.add("open")}
function closeAll(){$$(".modal").forEach(x=>x.classList.remove("open"))}
function requireTenant(){if(!tenantId)throw new Error("ابتدا یک سازمان معتبر انتخاب کنید.");}
async function loadTenants(){
  const {data: memberships,error}=await client.from("tenant_members").select("tenant_id,role").eq("user_id",session.user.id);
  if(error)throw error;
  if(!memberships?.length){notify("این حساب هنوز عضو هیچ سازمانی نیست. ابتدا از صفحه ورود، سازمان جدید ایجاد کنید.",true);return false;}
  const ids=memberships.map(x=>x.tenant_id);
  const {data: tenants,error:tenantError}=await client.from("tenants").select("id,name,status,default_locale").in("id",ids).order("name");
  if(tenantError)throw tenantError;
  const active=(tenants||[]).filter(t=>t.status==="active");
  if(!active.length){notify("هیچ سازمان فعالی برای این حساب در دسترس نیست.",true);return false;}
  const select=$("#tenantSelect");
  select.innerHTML=active.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join("");
  const saved=sessionStorage.getItem("smart_site_tenant");
  tenantId=active.some(t=>t.id===saved)?saved:active[0].id;
  select.value=tenantId;
  tenantRole=memberships.find(x=>x.tenant_id===tenantId)?.role||"viewer";
  $("#userEmail").textContent=session.user.email+" · "+tenantRole;
  await loadWorkspace();
  return true;
}
async function loadWorkspace(){
  requireTenant();
  const [p,i,r,m,b]=await Promise.all([
    client.from("projects").select("*").eq("tenant_id",tenantId).order("created_at",{ascending:false}),
    client.from("issues").select("*,projects(name)").eq("tenant_id",tenantId).order("created_at",{ascending:false}),
    client.from("daily_reports").select("*,projects(name)").eq("tenant_id",tenantId).order("report_date",{ascending:false}),
    client.from("tenant_members").select("user_id,role").eq("tenant_id",tenantId),
    client.from("tenant_branding").select("*").eq("tenant_id",tenantId).maybeSingle()
  ]);
  for(const result of [p,i,r,m,b])if(result.error)throw result.error;
  projects=p.data||[];issues=i.data||[];reports=r.data||[];members=m.data||[];
  const branding=b.data;
  $("#brandName").textContent=branding?.display_name||"SMART SITE";
  $("#orgName").value=branding?.display_name||"";
  $("#orgColor").value=branding?.primary_color||"#e3a33b";
  if(branding?.primary_color)document.documentElement.style.setProperty("--accent",branding.primary_color);
  fillProjectSelects();fillMemberSelect();render();clearNotice();
}
function fillProjectSelects(){
  const opts=projects.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join("");
  ['#issueForm select[name="project_id"]','#reportForm select[name="project_id"]'].forEach(sel=>{
    const el=$(sel);if(el)el.innerHTML=opts||'<option value="">ابتدا پروژه ایجاد کنید</option>';
  });
}
function fillMemberSelect(){
  const el=$('#issueForm select[name="responsible_user_id"]');if(!el)return;
  el.innerHTML='<option value="">تعیین نشده</option>'+members.map(m=>'<option value="'+esc(m.user_id)+'">'+esc(m.user_id.slice(0,8)+"… · "+m.role)+'</option>').join("");
}
function render(){
  $("#kProjects").textContent=fa(projects.length);
  $("#kIssues").textContent=fa(issues.filter(x=>!["resolved","closed"].includes(x.status)).length);
  $("#kReports").textContent=fa(reports.length);
  $("#kProgress").textContent=fa(projects.length?Math.round(projects.reduce((a,x)=>a+Number(x.progress||0),0)/projects.length):0)+"٪";
  const projectHtml=projects.length?projects.map(p=>'<div class="project"><div class="project-head"><span class="project-name">'+esc(p.name)+'</span><span class="tag">'+fa(p.progress)+'٪</span></div><div class="project-meta">'+esc(p.client_name||p.location||"بدون اطلاعات تکمیلی")+'</div><div class="bar"><i style="width:'+Math.max(0,Math.min(100,Number(p.progress)||0))+'%"></i></div></div>').join(""):'<div class="empty">هنوز پروژه‌ای ثبت نشده است.</div>';
  $("#dashProjects").innerHTML=projectHtml;
  $("#projectList").innerHTML=projects.length?'<table class="table"><thead><tr><th>پروژه</th><th>کارفرما</th><th>موقعیت</th><th>پیشرفت</th><th>وضعیت</th></tr></thead><tbody>'+projects.map(p=>'<tr><td>'+esc(p.name)+'</td><td>'+esc(p.client_name||"—")+'</td><td>'+esc(p.location||"—")+'</td><td>'+fa(p.progress)+'٪</td><td>'+esc(p.status)+'</td></tr>').join("")+'</tbody></table>':'<div class="empty">پروژه‌ای ثبت نشده است.</div>';
  const open=issues.filter(x=>!["resolved","closed"].includes(x.status));
  $("#dashIssues").innerHTML=open.length?open.slice(0,6).map(i=>'<div class="item"><i class="dot"></i><div><strong>'+esc(i.title)+'</strong><small>'+esc(i.projects?.name||"پروژه")+' · '+esc(i.priority)+'</small></div></div>').join(""):'<div class="empty">مورد بازی برای پیگیری وجود ندارد.</div>';
  $("#issueList").innerHTML=issues.length?'<table class="table"><thead><tr><th>عنوان</th><th>پروژه</th><th>اولویت</th><th>وضعیت</th><th>اقدام</th></tr></thead><tbody>'+issues.map(i=>'<tr><td>'+esc(i.title)+'</td><td>'+esc(i.projects?.name||"—")+'</td><td>'+esc(i.priority)+'</td><td><span class="tag '+(["resolved","closed"].includes(i.status)?"ok":"warn")+'">'+esc(i.status)+'</span></td><td>'+(["resolved","closed"].includes(i.status)?"—":'<button class="btn" data-resolve="'+esc(i.id)+'">بستن</button>')+'</td></tr>').join("")+'</tbody></table>':'<div class="empty">مسئله‌ای ثبت نشده است.</div>';
  $("#reportList").innerHTML=reports.length?'<table class="table"><thead><tr><th>تاریخ</th><th>پروژه</th><th>نیروی حاضر</th><th>شرح عملیات</th></tr></thead><tbody>'+reports.map(r=>'<tr><td>'+esc(r.report_date)+'</td><td>'+esc(r.projects?.name||"—")+'</td><td>'+fa(r.workforce_count)+'</td><td>'+esc(r.completed_work||"")+'</td></tr>').join("")+'</tbody></table>':'<div class="empty">گزارش روزانه‌ای ثبت نشده است.</div>';
}
async function submitForm(form,table,payload){
  requireTenant();
  const {error}=await client.from(table).insert({...payload,tenant_id:tenantId});
  if(error)throw error;
  form.reset();closeAll();await loadWorkspace();
}
$("#nav").addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b)show(b.dataset.view)});
document.addEventListener("click",async e=>{
  const m=e.target.closest("[data-modal]");if(m){if(!projects.length&&(m.dataset.modal==="issueModal"||m.dataset.modal==="reportModal")){notify("برای ثبت این مورد ابتدا یک پروژه تعریف کنید.",true);return;}modal(m.dataset.modal);}
  if(e.target.matches("[data-close]"))closeAll();
  const g=e.target.closest("[data-goto]");if(g)show(g.dataset.goto);
  if(e.target.classList.contains("modal"))closeAll();
  const resolve=e.target.closest("[data-resolve]");
  if(resolve){try{const {error}=await client.from("issues").update({status:"resolved",resolved_at:new Date().toISOString()}).eq("id",resolve.dataset.resolve).eq("tenant_id",tenantId);if(error)throw error;await loadWorkspace();}catch(err){notify(err.message,true);}}
});
$("#quickAdd").onclick=()=>modal("projectModal");
$("#projectForm").addEventListener("submit",async e=>{
  e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
  try{await submitForm(e.target,"projects",{name:d.name,client_name:d.client||null,location:d.location||null,progress:Math.min(100,Math.max(0,Number(d.progress)||0)),status:"active"});}catch(err){notify(err.message,true);}
});
$("#issueForm").addEventListener("submit",async e=>{
  e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
  const priority={"عادی":"medium","بالا":"high","بحرانی":"critical"}[d.priority]||"medium";
  try{await submitForm(e.target,"issues",{project_id:d.project_id,title:d.title,description:d.detail||null,responsible_user_id:d.responsible_user_id||null,priority,status:"open"});}catch(err){notify(err.message,true);}
});
$("#reportForm").addEventListener("submit",async e=>{
  e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
  try{await submitForm(e.target,"daily_reports",{project_id:d.project_id,report_date:d.date,weather:d.weather||null,workforce_count:d.workers===""?null:Number(d.workers),completed_work:d.completed_work,next_day_plan:d.next_day_plan||null,safety_notes:d.safety_notes||null,delays_and_constraints:d.delays_and_constraints||null});}catch(err){notify(err.message,true);}
});
$("#tenantSelect").addEventListener("change",async e=>{
  tenantId=e.target.value;sessionStorage.setItem("smart_site_tenant",tenantId);
  tenantRole="viewer";try{const {data,error}=await client.from("tenant_members").select("role").eq("tenant_id",tenantId).eq("user_id",session.user.id).single();if(error)throw error;tenantRole=data.role;$("#userEmail").textContent=session.user.email+" · "+tenantRole;await loadWorkspace();}catch(err){notify(err.message,true);}
});
$("#signOutBtn").onclick=async()=>{const {error}=await client.auth.signOut();if(error)notify(error.message,true);else location.href="./auth.html";};
$("#saveBrand").onclick=async()=>{
  try{requireTenant();const display_name=$("#orgName").value.trim(),primary_color=$("#orgColor").value.trim();if(!/^#[0-9a-f]{6}$/i.test(primary_color))throw new Error("کد رنگ باید به قالب HEX مانند #E3A33B باشد.");const {error}=await client.from("tenant_branding").upsert({tenant_id:tenantId,display_name,primary_color,updated_at:new Date().toISOString()},{onConflict:"tenant_id"});if(error)throw error;document.documentElement.style.setProperty("--accent",primary_color);$("#brandName").textContent=display_name||"SMART SITE";notify("تنظیمات برند سازمان ذخیره شد.");}catch(err){notify(err.message,true);}
};
$("#exportBtn").onclick=()=>{
  const data={tenant_id:tenantId,projects,issues,reports,exported_at:new Date().toISOString()};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download="smart-site-"+tenantId+".json";a.click();URL.revokeObjectURL(url);
};
$("#today").textContent=new Intl.DateTimeFormat("fa-IR",{dateStyle:"full"}).format(new Date());
if(!config?.supabaseUrl||!config?.supabaseAnonKey||config.supabaseUrl.includes("YOUR_PROJECT_REF")||config.supabaseAnonKey.includes("YOUR_SUPABASE")){
  notify("اتصال پایگاه داده تنظیم نشده است. فایل supabase-config.example.js را به supabase-config.js کپی کرده و مقادیر پروژه Supabase را وارد کنید.",true);
}else{
  try{
    client=createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data,error}=await client.auth.getSession();if(error)throw error;
    session=data.session;
    if(!session){location.replace("./auth.html");}
    else{const ok=await loadTenants();if(!ok)$("#appStatus").innerHTML+=' <a href="./auth.html" style="color:#f0bd73">مدیریت حساب و ایجاد سازمان</a>';}
    client.auth.onAuthStateChange((_event,next)=>{session=next;if(!next)location.replace("./auth.html");});
  }catch(err){notify(err.message||"خطا در راه‌اندازی سامانه.",true);}
}
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
