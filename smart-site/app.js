import {getAll,put,getMeta,setMeta,exportAll,initializeLocalDatabase} from "./db.js";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fa=n=>Number(n||0).toLocaleString("fa-IR");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const names={dashboard:"داشبورد عملیاتی",projects:"مدیریت پروژه‌ها",issues:"مسائل و پیگیری",reports:"گزارش‌های کارگاه",organization:"سازمان و برند",license:"لایسنس"};
let projects=[],issues=[],reports=[];
function notify(msg,error=false){const b=$("#appStatus");b.textContent=msg;b.style.display="block";b.style.borderColor=error?"#8a4545":"#72572f";b.style.background=error?"#351d22":"#302719";b.style.color=error?"#ffb0a8":"#eac58a";}
function clearNotice(){$("#appStatus").style.display="none";}
function show(view){$$(".view").forEach(x=>x.classList.toggle("active",x.id===view));$$(".nav button").forEach(x=>x.classList.toggle("active",x.dataset.view===view));$("#pageTitle").textContent=names[view]||"SMART SITE";}
function modal(id){$("#"+id).classList.add("open");} function closeAll(){$$(".modal").forEach(x=>x.classList.remove("open"));}
function uid(){return crypto.randomUUID?crypto.randomUUID():"ss-"+Date.now()+"-"+Math.random().toString(16).slice(2);}
async function loadWorkspace(){
 [projects,issues,reports]=await Promise.all([getAll("projects"),getAll("issues"),getAll("daily_reports")]);
 projects.sort((a,b)=>b.created_at.localeCompare(a.created_at));issues.sort((a,b)=>b.created_at.localeCompare(a.created_at));reports.sort((a,b)=>b.report_date.localeCompare(a.report_date));
 const branding=await getMeta("branding"),v=branding?.value||{};
 $("#brandName").textContent=v.display_name||"SMART SITE";$("#orgName").value=v.display_name||"";$("#orgColor").value=v.primary_color||"#e3a33b";document.documentElement.style.setProperty("--accent",v.primary_color||"#e3a33b");
 const opts=projects.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join("");
 ['#issueForm select[name="project_id"]','#reportForm select[name="project_id"]'].forEach(s=>{const el=$(s);if(el)el.innerHTML=opts||'<option value="">ابتدا پروژه ایجاد کنید</option>';});
 render();clearNotice();
}
function render(){
 $("#kProjects").textContent=fa(projects.length);$("#kIssues").textContent=fa(issues.filter(x=>!["resolved","closed"].includes(x.status)).length);$("#kReports").textContent=fa(reports.length);$("#kProgress").textContent=fa(projects.length?Math.round(projects.reduce((a,x)=>a+Number(x.progress||0),0)/projects.length):0)+"٪";
 $("#dashProjects").innerHTML=projects.length?projects.map(p=>'<div class="project"><div class="project-head"><span class="project-name">'+esc(p.name)+'</span><span class="tag">'+fa(p.progress)+'٪</span></div><div class="project-meta">'+esc(p.client_name||p.location||"بدون اطلاعات تکمیلی")+'</div><div class="bar"><i style="width:'+Math.max(0,Math.min(100,Number(p.progress)||0))+'%"></i></div></div>').join(""):'<div class="empty">هنوز پروژه‌ای ثبت نشده است.</div>';
 $("#projectList").innerHTML=projects.length?'<table class="table"><thead><tr><th>پروژه</th><th>کارفرما</th><th>موقعیت</th><th>پیشرفت</th><th>وضعیت</th></tr></thead><tbody>'+projects.map(p=>'<tr><td>'+esc(p.name)+'</td><td>'+esc(p.client_name||"—")+'</td><td>'+esc(p.location||"—")+'</td><td>'+fa(p.progress)+'٪</td><td>'+esc(p.status)+'</td></tr>').join("")+'</tbody></table>':'<div class="empty">پروژه‌ای ثبت نشده است.</div>';
 const open=issues.filter(x=>!["resolved","closed"].includes(x.status));
 $("#dashIssues").innerHTML=open.length?open.slice(0,6).map(i=>'<div class="item"><i class="dot"></i><div><strong>'+esc(i.title)+'</strong><small>'+esc(projects.find(p=>p.id===i.project_id)?.name||"پروژه")+' · '+esc(i.priority)+'</small></div></div>').join(""):'<div class="empty">مورد بازی برای پیگیری وجود ندارد.</div>';
 $("#issueList").innerHTML=issues.length?'<table class="table"><thead><tr><th>عنوان</th><th>پروژه</th><th>اولویت</th><th>وضعیت</th><th>اقدام</th></tr></thead><tbody>'+issues.map(i=>'<tr><td>'+esc(i.title)+'</td><td>'+esc(projects.find(p=>p.id===i.project_id)?.name||"—")+'</td><td>'+esc(i.priority)+'</td><td><span class="tag '+(["resolved","closed"].includes(i.status)?"ok":"warn")+'">'+esc(i.status)+'</span></td><td>'+(["resolved","closed"].includes(i.status)?"—":'<button class="btn" data-resolve="'+esc(i.id)+'">بستن</button>')+'</td></tr>').join("")+'</tbody></table>':'<div class="empty">مسئله‌ای ثبت نشده است.</div>';
 $("#reportList").innerHTML=reports.length?'<table class="table"><thead><tr><th>تاریخ</th><th>پروژه</th><th>نیروی حاضر</th><th>شرح عملیات</th></tr></thead><tbody>'+reports.map(r=>'<tr><td>'+esc(r.report_date)+'</td><td>'+esc(projects.find(p=>p.id===r.project_id)?.name||"—")+'</td><td>'+fa(r.workforce_count)+'</td><td>'+esc(r.completed_work||"")+'</td></tr>').join("")+'</tbody></table>':'<div class="empty">گزارش روزانه‌ای ثبت نشده است.</div>';
}
async function saveForm(form,store,payload){const now=new Date().toISOString();await put(store,{id:uid(),...payload,created_at:now,updated_at:now});form.reset();closeAll();await loadWorkspace();notify("اطلاعات در حافظه همین دستگاه ذخیره شد.");}
$("#nav").addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b)show(b.dataset.view);});
document.addEventListener("click",async e=>{
 const m=e.target.closest("[data-modal]");if(m){if(!projects.length&&(m.dataset.modal==="issueModal"||m.dataset.modal==="reportModal")){notify("برای ثبت این مورد ابتدا یک پروژه تعریف کنید.",true);return;}modal(m.dataset.modal);}
 if(e.target.matches("[data-close]"))closeAll();const g=e.target.closest("[data-goto]");if(g)show(g.dataset.goto);if(e.target.classList.contains("modal"))closeAll();
 const r=e.target.closest("[data-resolve]");if(r){try{const item=issues.find(x=>x.id===r.dataset.resolve);if(item){item.status="resolved";item.resolved_at=new Date().toISOString();item.updated_at=item.resolved_at;await put("issues",item);await loadWorkspace();notify("وضعیت مسئله به‌روزرسانی شد.");}}catch(err){notify(err.message,true);}}
});
$("#quickAdd").onclick=()=>modal("projectModal");
$("#projectForm").addEventListener("submit",async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{await saveForm(e.target,"projects",{name:d.name,client_name:d.client||null,location:d.location||null,progress:Math.min(100,Math.max(0,Number(d.progress)||0)),status:"active"});}catch(err){notify(err.message,true);}});
$("#issueForm").addEventListener("submit",async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),priority={"عادی":"medium","بالا":"high","بحرانی":"critical"}[d.priority]||"medium";try{await saveForm(e.target,"issues",{project_id:d.project_id,title:d.title,description:d.detail||null,responsible_name:d.responsible_user_id||null,priority,status:"open"});}catch(err){notify(err.message,true);}});
$("#reportForm").addEventListener("submit",async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{await saveForm(e.target,"daily_reports",{project_id:d.project_id,report_date:d.date,weather:d.weather||null,workforce_count:d.workers===""?null:Number(d.workers),completed_work:d.completed_work,next_day_plan:d.next_day_plan||null,safety_notes:d.safety_notes||null,delays_and_constraints:d.delays_and_constraints||null});}catch(err){notify(err.message,true);}});
$("#saveBrand").onclick=async()=>{try{const display_name=$("#orgName").value.trim(),primary_color=$("#orgColor").value.trim();if(!/^#[0-9a-f]{6}$/i.test(primary_color))throw new Error("کد رنگ باید به قالب HEX مانند #E3A33B باشد.");await setMeta("branding",{display_name,primary_color,updated_at:new Date().toISOString()});document.documentElement.style.setProperty("--accent",primary_color);$("#brandName").textContent=display_name||"SMART SITE";notify("هویت سازمانی روی همین دستگاه ذخیره شد.");}catch(err){notify(err.message,true);}};
$("#exportBtn").onclick=async()=>{try{const data=await exportAll(),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download="smart-site-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify("نسخه پشتیبان محلی آماده شد.");}catch(err){notify(err.message,true);}};
$("#today").textContent=new Intl.DateTimeFormat("fa-IR",{dateStyle:"full"}).format(new Date());
try{await initializeLocalDatabase();await loadWorkspace();notify(navigator.onLine?"پایگاه داده محلی فعال است؛ ثبت و مشاهده اطلاعات به اینترنت وابسته نیست.":"حالت آفلاین فعال است؛ پایگاه داده محلی آماده استفاده است.");}catch(err){notify("راه‌اندازی پایگاه داده محلی ناموفق بود: "+err.message,true);}
window.addEventListener("online",()=>notify("اینترنت برقرار شد؛ اطلاعات همچنان فقط در دیتابیس محلی هستند."));window.addEventListener("offline",()=>notify("اینترنت قطع شد؛ کار با داده‌های محلی ادامه دارد."));
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
