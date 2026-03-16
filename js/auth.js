const AUTH = {
  apiBase:      '/sistema-municipal/api',
  loginPage:    '/sistema-municipal/index.html',
  dashboardPage:'/sistema-municipal/pages/dashboard.html'
};

async function sessionExists() {
  try { const r=await fetch(AUTH.apiBase+'/check_session.php'); const d=await r.json(); return d.ok; } catch{return false;}
}
async function getSession() {
  try { const r=await fetch(AUTH.apiBase+'/check_session.php'); return await r.json(); } catch{return{ok:false};}
}
function logout() { window.location.href=AUTH.apiBase+'/logout.php'; }
async function requireAuth() { if(!await sessionExists()) window.location.href=AUTH.loginPage; }

async function login(username,password, csrfToken){
  try{
    const r=await fetch(AUTH.apiBase+'/login.php',{
      method:'POST',
      headers:{
        'Content-Type':'application/json'
      },
      body:JSON.stringify({username,password,csrf_token:csrfToken})
    });
    return await r.json();
  }
  catch{return{ok:false,error:'Error de conexión con el servidor.'};}
}
async function changePassword(current,password,confirm){
  try{const r=await fetch(AUTH.apiBase+'/change_password.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({current,password,confirm})});return await r.json();}
  catch{return{ok:false,error:'Error de conexión.'};}
}

function showAlert(elId, msg, type='error'){
  const el=document.getElementById(elId); if(!el)return;
  const span=el.querySelector('span'); if(span)span.textContent=msg;
  el.className='alert alert--'+(type==='success'?'success':type==='warning'?'warning':'error');
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function hideAlert(elId){ const el=document.getElementById(elId); if(el)el.classList.remove('show'); }

function escHtml(s){ return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function openModal(id){ document.getElementById(id)?.classList.add('open'); }
function closeModal(id){ document.getElementById(id)?.classList.remove('open'); }

function formatDate(s){ if(!s)return'—'; const d=new Date(s+'T12:00:00'); return d.toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'}); }
function formatBytes(b){ if(b<1024)return b+'B'; if(b<1048576)return(b/1024).toFixed(1)+'KB'; return(b/1048576).toFixed(1)+'MB'; }
