let currentUser = null;
const API = AUTH.apiBase;

// Toast Notification System
class ToastNotification {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }

  show(message, type = 'info', title = null, duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '×',
      error: '×',
      warning: '!',
      info: 'i'
    };

    const titles = {
      success: 'Éxito',
      error: 'Error',
      warning: 'Advertencia',
      info: 'Información'
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type]}</div>
      <div class="toast-content">
        <div class="toast-title">${title || titles[type]}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Cerrar">×</button>
    `;

    this.container.appendChild(toast);

    // Event listeners
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.remove(toast));

    // Auto remove
    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }

    return toast;
  }

  remove(toast) {
    if (!toast || toast.classList.contains('removing')) return;
    
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  success(message, title = null, duration = 5000) {
    return this.show(message, 'success', title, duration);
  }

  error(message, title = null, duration = 8000) {
    return this.show(message, 'error', title, duration);
  }

  warning(message, title = null, duration = 6000) {
    return this.show(message, 'warning', title, duration);
  }

  info(message, title = null, duration = 5000) {
    return this.show(message, 'info', title, duration);
  }
}

// Global toast instance
const toast = new ToastNotification();

// Reemplazar alert() con toast notifications o mostrar en elemento de error
window.showAlert = function(idOrMessage, messageOrType = 'info', title = null) {
  // Detectar si es un ID de elemento de error (termina en Err, Error, Err2, etc.)
  const isElementId = typeof idOrMessage === 'string' && 
    (idOrMessage.endsWith('Err') || idOrMessage.endsWith('Error') || idOrMessage.match(/Err\d+$/));
  
  if (isElementId && typeof messageOrType === 'string') {
    // Es llamada del tipo showAlert('elementId', 'mensaje de error')
    const el = document.getElementById(idOrMessage);
    if (el) {
      el.style.display = 'flex';
      const span = el.querySelector('span');
      if (span) span.textContent = messageOrType;
      else el.textContent = messageOrType;
    } else {
      // Fallback a toast si el elemento no existe
      toast.show(messageOrType, 'error');
    }
  } else {
    // Es llamada del tipo showAlert('mensaje', 'tipo', 'titulo')
    toast.show(idOrMessage, messageOrType, title);
  }
};

window.hideAlert = function(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
};

// Modern Confirmation Modal System
class ConfirmModal {
  constructor() {
    this.overlay = null;
    this.modal = null;
    this.currentResolve = null;
    this.init();
  }

  init() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'confirm-modal-overlay';
    this.overlay.innerHTML = `
      <div class="confirm-modal danger">
        <div class="confirm-modal-icon">!</div>
        <div class="confirm-modal-title">Confirmar Acción</div>
        <div class="confirm-modal-message"></div>
        <div class="confirm-modal-buttons">
          <button class="confirm-modal-btn confirm-modal-btn-cancel">Cancelar</button>
          <button class="confirm-modal-btn confirm-modal-btn-confirm">Confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    // Event listeners
    this.overlay.querySelector('.confirm-modal-btn-cancel').addEventListener('click', () => this.hide(false));
    this.overlay.querySelector('.confirm-modal-btn-confirm').addEventListener('click', () => this.hide(true));
    
    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide(false);
      }
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
        this.hide(false);
      }
    });
  }

  show(message, title = 'Confirmar Acción', type = 'danger') {
    return new Promise((resolve) => {
      this.currentResolve = resolve;
      
      const modal = this.overlay.querySelector('.confirm-modal');
      const icon = this.overlay.querySelector('.confirm-modal-icon');
      const titleEl = this.overlay.querySelector('.confirm-modal-title');
      const messageEl = this.overlay.querySelector('.confirm-modal-message');
      const confirmBtn = this.overlay.querySelector('.confirm-modal-btn-confirm');

      // Update content
      titleEl.textContent = title;
      messageEl.textContent = message;
      
      // Update styling based on type
      modal.className = `confirm-modal ${type}`;
      confirmBtn.className = `confirm-modal-btn confirm-modal-btn-confirm${type === 'warning' ? ' warning' : ''}`;
      
      // Update icon
      const icons = {
        danger: '!',
        warning: '!',
        info: 'i'
      };
      icon.textContent = icons[type] || '!';

      // Show modal
      this.overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  hide(confirmed) {
    this.overlay.classList.remove('active');
    document.body.style.overflow = '';
    
    setTimeout(() => {
      if (this.currentResolve) {
        this.currentResolve(confirmed);
        this.currentResolve = null;
      }
    }, 300);
  }
}

// Global confirm modal instance
const confirmModal = new ConfirmModal();

// Reemplazar confirm() con modal moderno
window.showConfirm = function(message, title = 'Confirmar Acción', type = 'danger') {
  return confirmModal.show(message, title, type);
};

document.addEventListener('DOMContentLoaded', async () => {
  const session = await getSession();
  if (!session.ok) { window.location.href = AUTH.loginPage; return; }

  currentUser = session.user || session;
  window._certApiBase = API + '/certificados.php';
  document.getElementById('userDisplay').textContent  = currentUser.nombre || currentUser.username;
  const rolMap = { administrador:'Administrador', funcionario:'Funcionario', consulta:'Solo Lectura' };
  const badge  = document.getElementById('rolBadge');
  badge.textContent = rolMap[currentUser.rol] || currentUser.rol;
  badge.classList.add('rol-'+currentUser.rol);

  // Mostrar sección admin a administradores y funcionarios
  if (currentUser.rol === 'administrador' || currentUser.rol === 'funcionario') {
    document.getElementById('navAdmin').style.display = 'block';
  }

  await loadPage('home', document.querySelector('.nav-item.active'));
  checkAlertas();
});

async function loadPage(page, navEl) {
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  const main = document.getElementById('mainContent');

  switch(page) {
    case 'home':          await renderHome(main); break;
    case 'organizaciones':await renderOrganizaciones(main); break;
    case 'proyectos':     await renderProyectos(main); break;
    case 'subvenciones':  await renderProyectos(main); break;
    case 'directivos_mod': await renderDirectivos(main); break;
    case 'certificados':  await renderCertificados(main); break;
    case 'reportes':      await renderReportes(main); break;
    case 'usuarios':      await renderUsuarios(main); break;
    case 'historial':     await renderHistorial(main); break;
    case 'accesos':       await renderAccesos(main); break;
    case 'backups':       await renderBackups(main); break;
    case 'importar':      await renderImportar(main); break;
    case 'papelera':      await renderPapelera(main); break;
    default: main.innerHTML = '<p>Página no encontrada.</p>';
  }
}

async function renderHome(main) {
  // Cargar Chart.js si no está disponible
  if (!window.Chart) {
    await new Promise((res,rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h2>Panel de Inicio</h2><p>Resumen del sistema de organizaciones comunitarias.</p></div>
    </div>
    <div class="stats-grid" id="statsGrid">
      ${[1,2,3,4].map(()=>`<div class="stat-card"><div class="stat-val">—</div><div class="stat-lbl">Cargando…</div></div>`).join('')}
    </div>
    <div id="alertaBanner" style="margin-top:8px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px" id="chartsRow">
      <div class="stat-card" style="padding:20px">
        <div style="font-size:.8rem;color:var(--muted);margin-bottom:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Socios por tipo de organización</div>
        <div style="position:relative;height:240px">
          <canvas id="chartSocios"></canvas>
        </div>
      </div>
      <div class="stat-card" style="padding:20px">
        <div style="font-size:.8rem;color:var(--muted);margin-bottom:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Organizaciones por tipo</div>
        <div style="position:relative;height:240px">
          <canvas id="chartTipos"></canvas>
        </div>
      </div>
    </div>
    ${currentUser?.rol==='administrador' ? `
    <div class="stat-card" style="margin-top:16px;padding:20px" id="accesosPanel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:.8rem;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em">Actividad reciente del sistema</div>
      </div>
      <div id="accesosStats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
        ${[1,2,3,4].map(()=>`<div style="background:rgba(255,255,255,.04);border-radius:8px;padding:12px;text-align:center"><div style="font-size:1.4rem;font-weight:700;color:var(--gold)">—</div><div style="font-size:.75rem;color:var(--muted)">Cargando</div></div>`).join('')}
      </div>
    </div>` : ''}`;

  try {
    const [orgs, dirs, pjs, stats, dirsAlert] = await Promise.all([
      fetch(API+'/organizaciones.php?action=list').then(r=>r.json()),
      fetch(API+'/organizaciones.php?action=alertas').then(r=>r.json()),
      fetch(API+'/organizaciones.php?action=alertas_pj').then(r=>r.json()),
      fetch(API+'/organizaciones.php?action=stats_dashboard').then(r=>r.json()),
      fetch(API+'/directivos.php?action=alertas').then(r=>r.json()).catch(()=>({ok:false})),
    ]);

    if (orgs.ok) {
      const data = orgs.data;
      const activas    = data.filter(o=>o.estado==='Activa').length;
      const inactivas  = data.filter(o=>o.estado==='Inactiva').length;
      const suspendidas= data.filter(o=>o.estado==='Suspendida').length;
      const vencidas   = data.filter(o=>o.estado_directiva==='Vencida'||o.dias_vence<0).length;
      document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card"><div class="stat-val">${data.length}</div><div class="stat-lbl">Total organizaciones</div></div>
        <div class="stat-card"><div class="stat-val" style="color:#6fcf97">${activas}</div><div class="stat-lbl">Activas</div></div>
        <div class="stat-card"><div class="stat-val" style="color:#e57373">${vencidas}</div><div class="stat-lbl">Dir. Vencidas</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--muted)">${inactivas+suspendidas}</div><div class="stat-lbl">Inactivas / Suspendidas</div></div>`;
    }

    // Alertas
    let banners = '';
    if (dirs.ok && dirs.data.length) {
      banners += `<div class="alert-banner" onclick="loadPage('organizaciones',document.querySelectorAll('.nav-item')[1])">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
          <div><strong class="count">${dirs.data.length}</strong> directiva${dirs.data.length>1?'s':''} por vencer en los próximos 30 días — <u>Ver organizaciones</u></div>
        </div>`;
    }
    if (pjs.ok && pjs.data.length) {
      banners += `<div class="alert-banner" style="border-color:rgba(251,191,36,.4);background:rgba(251,191,36,.08)" onclick="loadPage('organizaciones',document.querySelectorAll('.nav-item')[1])">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" style="color:#fbbf24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
          <div><strong class="count" style="color:#fbbf24">${pjs.data.length}</strong> personalidad${pjs.data.length>1?'es jurídicas':' jurídica'} por vencer en los próximos 30 días — <u>Ver organizaciones</u></div>
        </div>`;
    }
    if (dirsAlert?.ok && dirsAlert.data?.length) {
      banners += `<div class="alert-banner" style="border-color:rgba(139,92,246,.4);background:rgba(139,92,246,.08)" onclick="loadPage('directivos_mod',document.querySelector('[onclick*=directivos_mod]'))">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" style="color:#8b5cf6"><path stroke-linecap="round" stroke-linejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"/></svg>
          <div><strong class="count" style="color:#8b5cf6">${dirsAlert.data.length}</strong> directivo${dirsAlert.data.length>1?'s':''} con cargo por vencer en los próximos 30 días — <u>Ver directivos</u></div>
        </div>`;
    }
    if (banners) document.getElementById('alertaBanner').innerHTML = banners;

    // Gráficos
    if (stats.ok) {
      const COLORS = ['#c9a84c','#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'];

      // Gráfico 1: socios por tipo
      const canvasSocios = document.getElementById('chartSocios');
      if (canvasSocios && stats.socios?.length) {
        Chart.getChart(canvasSocios)?.destroy();
        new Chart(canvasSocios, {
          type: 'bar',
          data: {
            labels: stats.socios.map(r=>r.tipo||'Sin tipo'),
            datasets: [{ label:'N° Socios', data: stats.socios.map(r=>r.total_socios||0),
              backgroundColor: COLORS, borderRadius: 6, borderSkipped: false }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend:{ display:false } },
            scales: {
              x: { grid:{ color:'rgba(255,255,255,.06)' }, ticks:{ color:'#8a9ab0', font:{size:11} } },
              y: { grid:{ display:false }, ticks:{ color:'#c9a84c', font:{size:11} } }
            }
          }
        });
      }

      // Gráfico 2: organizaciones por tipo
      const canvasTipos = document.getElementById('chartTipos');
      if (canvasTipos && stats.por_tipo?.length) {
        Chart.getChart(canvasTipos)?.destroy();
        new Chart(canvasTipos, {
          type: 'doughnut',
          data: {
            labels: stats.por_tipo.map(r=>r.tipo||'Sin tipo'),
            datasets: [{ data: stats.por_tipo.map(r=>r.total||0),
              backgroundColor: COLORS, borderWidth: 2, borderColor:'#0d1b2a' }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position:'bottom', labels:{ color:'#8a9ab0', font:{size:11}, padding:12 } }
            }
          }
        });
      }
    }

    // Stats de accesos (solo admin)
    if (currentUser?.rol==='administrador') {
      const ac = await fetch(API+'/accesos.php?action=stats').then(r=>r.json()).catch(()=>({ok:false}));
      if (ac.ok) {
        document.getElementById('accesosStats').innerHTML = `
          <div style="background:rgba(255,255,255,.04);border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:1.5rem;font-weight:700;color:var(--gold)">${ac.data.hoy}</div>
            <div style="font-size:.75rem;color:var(--muted)">Accesos hoy</div>
          </div>
          <div style="background:rgba(255,255,255,.04);border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:1.5rem;font-weight:700;color:#6fcf97">${ac.data.semana}</div>
            <div style="font-size:.75rem;color:var(--muted)">Últimos 7 días</div>
          </div>
          <div style="background:rgba(255,255,255,.04);border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:1.5rem;font-weight:700;color:#3b82f6">${ac.data.usuarios}</div>
            <div style="font-size:.75rem;color:var(--muted)">Usuarios activos (7d)</div>
          </div>
          <div style="background:rgba(255,255,255,.04);border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:1.5rem;font-weight:700;color:#ef4444">${ac.data.fallidos}</div>
            <div style="font-size:.75rem;color:var(--muted)">Intentos fallidos (24h)</div>
          </div>`;
      }
    }
  } catch(e) { /* Error handled */ }
}

async function renderOrganizaciones(main) {
  const canEdit = currentUser && ['administrador','funcionario'].includes(currentUser.rol);

  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h2>Organizaciones</h2><p>Registro y gestión de organizaciones comunitarias.</p></div>
      <div class="page-header-right">
        ${canEdit?`<button class="btn btn-primary" onclick="openOrgModal()">+ Nueva organización</button>`:''}
      </div>
    </div>
    <div id="orgAlerta"></div>
    <div class="toolbar">
      <div class="search-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z"/></svg>
        <input type="text" id="orgBusqueda" placeholder="Buscar por nombre o RUT…" autocomplete="off"/>
      </div>
      <select id="orgFiltroEstado"><option value="">Todos los estados</option><option>Activa</option><option>Inactiva</option><option>Suspendida</option></select>
      <select id="orgFiltroTipo"><option value="">Todos los tipos</option></select>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Nombre</th><th>RUT</th><th>Tipo</th><th>Estado</th><th>Directiva</th><th>Socios</th><th>Fondos</th><th>Acciones</th>
        </tr></thead>
        <tbody id="orgTbody"><tr><td colspan="8"><div class="table-empty"><div class="icon">⏳</div>Cargando…</div></td></tr></tbody>
      </table>
      <div class="pagination"><span id="orgPageInfo"></span><div class="pagination-btns" id="orgPageBtns"></div></div>
    </div>`;

  // Cargar tipos para filtro
  const tipos = await fetch(API+'/organizaciones.php?action=tipos').then(r=>r.json());
  if (tipos.ok) {
    const sel = document.getElementById('orgFiltroTipo');
    tipos.data.forEach(t=>{ const o=document.createElement('option'); o.value=t.id; o.textContent=t.nombre; sel.appendChild(o); });
  }

  let orgData=[], orgPage=1; const PER=10;

  async function loadOrgs() {
    
    // Verificar que los elementos existan antes de continuar
    const searchEl = document.getElementById('orgBusqueda');
    const estadoEl = document.getElementById('orgFiltroEstado');
    const tipoEl = document.getElementById('orgFiltroTipo');
    const tbodyEl = document.getElementById('orgTbody');
    
    if (!searchEl || !estadoEl || !tipoEl || !tbodyEl) {
      /* Elementos DOM no encontrados */
      setTimeout(() => loadOrgs(), 100);
      return;
    }
    
    const s=searchEl.value.trim();
    const e=estadoEl.value;
    const t=tipoEl.value;
    const p=new URLSearchParams({action:'list'});
    if(s)p.set('search',s); if(e)p.set('estado',e); if(t)p.set('tipo',t);
    
    const url = API+'/organizaciones.php?'+p+'&_t='+Date.now();
    
    try {
      const r=await fetch(url); 
      
      if (!r.ok) {
        document.getElementById('orgTbody').innerHTML=`<tr><td colspan="8"><div class="table-empty"><div class="icon">!</div>Error ${r.status}: ${r.statusText}</div></td></tr>`;
        return;
      }
      
      const d=await r.json();
      
      if(d.ok){
        orgData=d.data;
        orgPage=1;
        renderOrgTable();
      }
      else {
        document.getElementById('orgTbody').innerHTML=`<tr><td colspan="8"><div class="table-empty"><div class="icon">!</div>Error: ${d.error||'Error desconocido'}</div></td></tr>`;
      }
    } catch(e){
      /* Error en loadOrgs */
      const tbodyEl = document.getElementById('orgTbody');
      if (tbodyEl) {
        tbodyEl.innerHTML=`<tr><td colspan="8"><div class="table-empty"><div class="icon">!</div>Error de conexión: ${e.message}</div></td></tr>`;
      } else {
        /* Elemento orgTbody no encontrado */
      }
    }
  }

  function renderOrgTable(){
    const tbody=document.getElementById('orgTbody');
    const total=orgData.length, pages=Math.max(1,Math.ceil(total/PER));
    orgPage=Math.min(orgPage,pages);
    const slice=orgData.slice((orgPage-1)*PER, orgPage*PER);
    if(!total){tbody.innerHTML=`<tr><td colspan="8"><div class="table-empty"><div class="icon">📭</div>Sin resultados.</div></td></tr>`;document.getElementById('orgPageInfo').textContent='';document.getElementById('orgPageBtns').innerHTML='';return;}
    tbody.innerHTML=slice.map(o=>{
      const est={Activa:'badge--green',Inactiva:'badge--gray',Suspendida:'badge--red'}[o.estado]||'badge--gray';
      // Nota: estado_directiva y dias_vence ya no vienen en la consulta list simplificada
      const dir='badge--gray';
      const alerta='';
      return `<tr>
        <td><strong>${escHtml(o.nombre)}</strong></td>
        <td class="muted">${escHtml(o.rut)}</td>
        <td class="muted">${escHtml(o.tipo_nombre||'—')}</td>
        <td><span class="badge ${est}">${o.estado}</span></td>
        <td><span class="muted">—</span></td>
        <td class="muted">${o.numero_socios??0}</td>
        <td>${o.habilitada_fondos?'<span class="badge badge--green">Habilitada</span>':'<span class="badge badge--gray">No</span>'}</td>
        <td><div class="row-actions">
          <button class="btn-icon btn-icon--view" style="opacity:1 !important; cursor:pointer !important;" title="Ver detalle" onclick="verOrg(${o.id})"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></button>
          ${canEdit?`<button class="btn-icon btn-icon--edit" style="opacity:1 !important; cursor:pointer !important;" title="Editar" onclick="editOrg(${o.id})"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg></button>`:'<span style="opacity:0.3; cursor:not-allowed;" title="Sin permisos de edición"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg></span>'}
          ${currentUser.rol!=='consulta'?`<button class="btn-icon btn-icon--del" style="opacity:1 !important; cursor:pointer !important;" title="Eliminar" onclick="confirmDelOrg(${o.id},'${escHtml(o.nombre).replace(/'/g,"\\'")}')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg></button>`:''}
        </div></td></tr>`;
    }).join('');
    document.getElementById('orgPageInfo').textContent=`${(orgPage-1)*PER+1}–${Math.min(orgPage*PER,total)} de ${total}`;
    const btns=document.getElementById('orgPageBtns'); btns.innerHTML='';
    const makeBtn = (txt, page, disabled) => {
      const b = document.createElement('button');
      b.className = 'btn-page' + (disabled?' disabled':'');
      b.textContent = txt; b.disabled = disabled;
      b.onclick = () => { orgPage = page; renderOrgTable(); };
      return b;
    };
    btns.appendChild(makeBtn('« Primera', 1, orgPage<=1));
    btns.appendChild(makeBtn('‹', orgPage-1, orgPage<=1));
    const delta = 2;
    for (let i = Math.max(1,orgPage-delta); i <= Math.min(pages,orgPage+delta); i++) {
      const b = document.createElement('button');
      b.className = 'btn-page' + (i===orgPage?' active':'');
      b.textContent = i; b.onclick = () => { orgPage=i; renderOrgTable(); };
      btns.appendChild(b);
    }
    btns.appendChild(makeBtn('›', orgPage+1, orgPage>=pages));
    btns.appendChild(makeBtn('Última »', pages, orgPage>=pages));
  }

  let searchTimer;
  document.getElementById('orgBusqueda').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(loadOrgs,350);});
  document.getElementById('orgFiltroEstado').addEventListener('change',loadOrgs);
  document.getElementById('orgFiltroTipo').addEventListener('change',loadOrgs);

  // Exponer funciones al scope global
  window.verOrg    = function(orgId) { 
    return openOrgDetail(orgId);
  };
  window.editOrg   = function(orgId) { 
    return openOrgModal(orgId);
  };
  window.openOrgModal = function(id) {
    return orgFormModal(id, tipos.data, loadOrgs);
  };
  window.confirmDelOrg = (id,nombre) => {
    const modalId = 'modalConfirmDelOrg';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();
    
    // Verificar si es administrador o funcionario
    const isAdmin = currentUser && ['administrador','funcionario'].includes(currentUser.rol);
    
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="${modalId}" onclick="if(event.target.id==='${modalId}')document.getElementById('${modalId}')?.remove()">
        <div class="modal" style="max-width:450px;text-align:center">
          <div style="font-size:2.5rem;margin-bottom:12px"></div>
          <h3 style="margin-bottom:8px">¿Eliminar organización?</h3>
          <p class="subtitle" style="margin-bottom:20px">¿Estás seguro de eliminar <strong>${escHtml(nombre)}</strong>?</p>
          
          ${isAdmin ? `
          <div style="margin-bottom:20px;">
            <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;color:var(--muted);">
              <input type="checkbox" id="eliminacionDefinitiva" style="margin:0;">
              <span>Eliminar definitivamente (no se podrá restaurar)</span>
            </label>
          </div>
          ` : ''}
          
          <div class="modal-footer" style="justify-content:center;gap:12px;flex-wrap:wrap;">
            <button class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancelar</button>
            ${isAdmin ? `
            <button class="btn btn-warning" id="${modalId}BtnPapelera">Mover a papelera</button>
            <button class="btn btn-danger" id="${modalId}BtnDefinitivo">Eliminar definitivamente</button>
            ` : `
            <button class="btn btn-danger" id="${modalId}Btn">Mover a papelera</button>
            `}
          </div>
        </div>
      </div>
    `);
    
    const handleDelete = (definitiva = false) => {
      const btnId = definitiva ? `${modalId}BtnDefinitivo` : (isAdmin ? `${modalId}BtnPapelera` : `${modalId}Btn`);
      const btn = document.getElementById(btnId);
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px"></span>' + (definitiva ? 'Eliminando...' : 'Moviendo a papelera...');
      
      const url = definitiva ? `${API}/organizaciones.php?id=${id}&definitiva=true` : `${API}/organizaciones.php?id=${id}`;
      
      fetch(url,{method:'DELETE',headers:{'Cache-Control':'no-cache'}}).then(r=>r.json()).then(d=>{
        document.getElementById(modalId)?.remove();
        if(d.ok) {
          // Forzar actualización inmediata con timestamp
          setTimeout(() => loadOrgs(), 100);
        }
        else {
          document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay open" id="${modalId}Error">
              <div class="modal" style="max-width:360px;text-align:center">
                <div style="font-size:2rem;margin-bottom:12px"></div>
                <h3 style="margin-bottom:8px">Error</h3>
                <p class="subtitle">${d.error || 'Error al eliminar'}</p>
                <div class="modal-footer" style="justify-content:center">
                  <button class="btn btn-secondary" onclick="document.getElementById('${modalId}Error')?.remove()">Aceptar</button>
                </div>
              </div>
            </div>
          `);
        }
      });
    };
    
    if (isAdmin) {
      document.getElementById(`${modalId}BtnPapelera`).onclick = () => handleDelete(false);
      document.getElementById(`${modalId}BtnDefinitivo`).onclick = () => handleDelete(true);
    } else {
      document.getElementById(`${modalId}Btn`).onclick = () => handleDelete(false);
    }
  };
  
  // Limpiar filtros antes de carga inicial para mostrar todos los datos
  const searchInput = document.getElementById('orgBusqueda');
  const estadoSelect = document.getElementById('orgFiltroEstado');
  const tipoSelect = document.getElementById('orgFiltroTipo');
  if (searchInput) searchInput.value = '';
  if (estadoSelect) estadoSelect.value = '';
  if (tipoSelect) tipoSelect.value = '';
  
  // Forzar limpieza después de que el navegador aplique autocompletado (Chrome)
  setTimeout(() => {
    const si = document.getElementById('orgBusqueda');
    if (si) si.value = '';
  }, 100);
  
  // Intentar cargar inmediatamente, si falla reintentar después
  try {
    await loadOrgs();
  } catch (e) {
    setTimeout(() => loadOrgs(), 100);
  }
  
  // Escuchar restauraciones desde papelera
  window.addEventListener('storage', function(e) {
    if (e.key === 'papelera_restore') {
      const data = JSON.parse(e.newValue);
      /* Elemento restaurado desde papelera */
      
      // Actualizar listas según el tipo
      if (data.tipo === 'organizaciones') {
        loadOrgs();
      } else if (data.tipo === 'proyectos') {
        loadProyectos();
      }
    }
  });
  
  // Escuchar eventos personalizados de papelera
  window.addEventListener('papeleraRestore', function(e) {
    /* Evento de restauración recibido */
    
    if (e.detail.tipo === 'organizaciones') {
      loadOrgs();
    } else if (e.detail.tipo === 'proyectos') {
      loadProyectos();
    }
  });
  
  // Escuchar mensajes postMessage de la papelera (alternativa a localStorage)
  window.addEventListener('message', function(e) {
    if (e.data.type === 'papelera_restore') {
      /* Mensaje postMessage recibido */
      
      if (e.data.data.tipo === 'organizaciones') {
        loadOrgs();
      } else if (e.data.data.tipo === 'proyectos') {
        loadProyectos();
      }
    }
  });
}

async function orgFormModal(orgId=null, tipos=[], onSave=()=>{}) {
  // Cargar datos si es edición
  let org = null;
  if (orgId) {
    const r = await fetch(API+'/organizaciones.php?action=get&id='+orgId).then(r=>r.json());
    if (r.ok) org = r.data;
  }

  const tipoOpts = tipos.map(t=>`<option value="${t.id}" ${org?.tipo_id==t.id?'selected':''}>${escHtml(t.nombre)}</option>`).join('');
  const isEdit   = !!org;

  // Inyectar modal si no existe
  let overlay = document.getElementById('modalOrgForm');
  if (overlay) overlay.remove();

  document.body.insertAdjacentHTML('beforeend',`
  <div class="modal-overlay open" id="modalOrgForm">
    <div class="modal modal--xl">
      <button class="modal-close" onclick="closeModal('modalOrgForm')">✕</button>
      <h3>${isEdit?'Editar':'Nueva'} Organización</h3>
      <p class="subtitle">${isEdit?'Modifica los datos de la organización.':'Completa los datos de la nueva organización.'}</p>
      <div id="orgFormErr" class="alert alert--error"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg><span></span></div>
      <div class="modal-body">
        <div class="form-section">
          <div class="form-section-title">Datos Generales</div>
          <div class="form-grid">
            <div class="form-group span-2"><label>Nombre de la organización *</label><input type="text" id="fNombre" value="${escHtml(org?.nombre||'')}" placeholder="Nombre completo"/></div>
            <div class="form-group"><label>RUT *</label><input type="text" id="fRut" value="${escHtml(org?.rut||'')}" placeholder="12.345.678-9"/></div>
            <div class="form-group"><label>Tipo de organización</label><select id="fTipo"><option value="">— Seleccionar —</option>${tipoOpts}</select></div>
            <div class="form-group"><label>N° Registro Municipal (PJ)</label><input type="text" id="fRegMun" value="${escHtml(org?.numero_registro_mun||'')}"/></div>
            <div class="form-group"><label>Fecha de constitución</label><input type="date" id="fFechaConst" value="${org?.fecha_constitucion||''}"/></div>
            <div class="form-group"><label>N° Inscripción Registro Civil</label><input type="text" id="fPJnac" value="${escHtml(org?.numero_pj_nacional||org?.numero_decreto||org?.numero_registro_mun||'')}" placeholder="N° de registro de personalidad jurídica"/></div>
            <div class="form-group"><label>Vencimiento PJ</label><input type="date" id="fVencPJ" value="${org?.fecha_vencimiento_pj||''}"/></div>
            <div class="form-group"><label>Estado *</label><select id="fEstado"><option ${org?.estado==='Activa'||!org?'selected':''}>Activa</option><option ${org?.estado==='Inactiva'?'selected':''}>Inactiva</option><option ${org?.estado==='Suspendida'?'selected':''}>Suspendida</option></select></div>
            <div class="form-group"><label>Habilitada para fondos</label><select id="fFondos"><option value="0" ${!org?.habilitada_fondos?'selected':''}>No habilitada</option><option value="1" ${org?.habilitada_fondos?'selected':''}>Habilitada</option></select></div>
          </div>
        </div>
        <div class="form-section">
          <div class="form-section-title">Ubicación</div>
          <div class="form-grid">
            <div class="form-group"><label>Tipo de dirección</label><select id="fTipoDir">
              <option value="Sede" ${(org?.tipo_direccion||'Sede')==='Sede'?'selected':''}>Sede de la organización</option>
              <option value="Directivo" ${org?.tipo_direccion==='Directivo'?'selected':''}>Domicilio de directivo</option>
            </select></div>
            <div class="form-group span-2"><label>Dirección *</label><input type="text" id="fDir" value="${escHtml(org?.direccion||'')}" placeholder="Av. Ejemplo 123"/></div>
            <div class="form-group"><label>Sector / Barrio (U.V.)</label><input type="text" id="fSector" value="${escHtml(org?.sector_barrio||'')}"/></div>
            <div class="form-group"><label>Comuna</label><input type="text" id="fComuna" value="Pucón" readonly style="opacity:.6;cursor:not-allowed"/></div>
            <div class="form-group"><label>Región</label><input type="text" id="fRegion" value="${escHtml(org?.region||'La Araucanía')}"/></div>
            <div class="form-group"><label>Código Postal</label><input type="number" id="fCodPostal" min="1000000" max="9999999" value="${escHtml(org?.codigo_postal||'')}"/></div>
          </div>
        </div>
        <div class="form-section">
          <div class="form-section-title">Contacto</div>
          <div class="form-grid">
            <div class="form-group"><label>Teléfono principal</label><input type="tel" id="fTel1" inputmode="tel" pattern="[0-9 +()-]*" value="${escHtml(org?.telefono_principal||'')}"/></div>
            <div class="form-group"><label>Teléfono secundario</label><input type="tel" id="fTel2" inputmode="tel" pattern="[0-9 +()-]*" value="${escHtml(org?.telefono_secundario||'')}"/></div>
            <div class="form-group"><label>Correo electrónico</label><input type="email" id="fCorreo" value="${escHtml(org?.correo||'')}"/></div>
            <div class="form-group"><label>Redes sociales</label><input type="text" id="fRRSS" value="${escHtml(org?.redes_sociales||'')}" placeholder="Facebook, Instagram…"/></div>
          </div>
        </div>
        <div class="form-section">
          <div class="form-section-title">Datos Administrativos</div>
          <div class="form-grid">
            <div class="form-group"><label>N° de socios</label><input type="number" id="fSocios" value="${org?.numero_socios??0}" min="0"/></div>
            <div class="form-group"><label>Área de acción</label><input type="text" id="fArea" value="${escHtml(org?.area_accion||'')}" placeholder="Deporte, Cultura…"/></div>
            <div class="form-group"><label>Representante legal</label><input type="text" id="fRepLegal" value="${escHtml(org?.representante_legal||'')}"/></div>
            <div class="form-group span-2"><label>Observaciones internas</label><textarea id="fObs" rows="3">${escHtml(org?.observaciones||'')}</textarea></div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('modalOrgForm')">Cancelar</button>
        <button class="btn btn-primary" id="btnSaveOrg" onclick="saveOrg(${orgId||'null'})">
          <span id="btnSaveOrgTxt">Guardar</span>
          <div class="spinner" id="spinSaveOrg" style="display:none"></div>
        </button>
      </div>
    </div>
  </div>`);

  window.saveOrg = async function(id) {
    const payload = {
      nombre: document.getElementById('fNombre').value.trim(),
      rut: document.getElementById('fRut').value.trim(),
      tipo_id: document.getElementById('fTipo').value||null,
      numero_registro_mun: document.getElementById('fRegMun').value||null,
      fecha_constitucion: document.getElementById('fFechaConst').value||null,
      personalidad_juridica: document.getElementById('fPJnac').value ? 1 : 0,
      numero_decreto: document.getElementById('fPJnac').value||null,
      numero_pj_nacional: document.getElementById('fPJnac').value||null,
      fecha_vencimiento_pj: document.getElementById('fVencPJ').value||null,
      estado: document.getElementById('fEstado').value,
      habilitada_fondos: document.getElementById('fFondos').value,
      tipo_direccion: document.getElementById('fTipoDir').value,
      direccion: document.getElementById('fDir').value.trim(),
      sector_barrio: document.getElementById('fSector').value||null,
      comuna: 'Pucón',
      region: document.getElementById('fRegion').value||'La Araucanía',
      codigo_postal: document.getElementById('fCodPostal').value||null,
      telefono_principal: document.getElementById('fTel1').value||null,
      telefono_secundario: document.getElementById('fTel2').value||null,
      correo: document.getElementById('fCorreo').value||null,
      redes_sociales: document.getElementById('fRRSS').value||null,
      numero_socios: parseInt(document.getElementById('fSocios').value)||0,
      area_accion: document.getElementById('fArea').value||null,
      representante_legal: document.getElementById('fRepLegal').value||null,
      observaciones: document.getElementById('fObs').value||null,
    };
    if (id) payload.id = id;
    const btn=document.getElementById('btnSaveOrg');
    btn.disabled=true; document.getElementById('btnSaveOrgTxt').style.display='none'; document.getElementById('spinSaveOrg').style.display='block';
    const url = API+'/organizaciones.php';
    
    try {
        /* Debug saveOrg */
        
        const response = await fetch(url, {method: id ? 'PUT' : 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
        /* Response status received */
        
        const text = await response.text();
        /* Response text received */
        
        // Intentar parsear como JSON
        let r;
        try {
            r = JSON.parse(text);
            /* JSON parsed */
        } catch (e) {
            /* JSON parse error */
            showAlert('orgFormErr', 'Error del servidor: respuesta inválida. Status: ' + response.status);
            btn.disabled=false; document.getElementById('btnSaveOrgTxt').style.display=''; document.getElementById('spinSaveOrg').style.display='none';
            return;
        }
        
        btn.disabled=false; document.getElementById('btnSaveOrgTxt').style.display=''; document.getElementById('spinSaveOrg').style.display='none';
        
        if(r.ok) {
            /* Save successful */
            closeModal('modalOrgForm');
            onSave();
        } else {
            /* Save failed */
            showAlert('orgFormErr', r.error || 'Error al guardar.');
        }
    } catch (err) {
        /* Fetch error */
        showAlert('orgFormErr', 'Error de conexión: ' + err.message);
        btn.disabled=false; document.getElementById('btnSaveOrgTxt').style.display=''; document.getElementById('spinSaveOrg').style.display='none';
    }
  };
}

async function openOrgDetail(orgId) {
  const [orgR, dirsR, docsR] = await Promise.all([
    fetch(API+'/organizaciones.php?action=get&id='+orgId).then(r=>r.json()),
    fetch(API+'/directivas.php?org_id='+orgId).then(r=>r.json()),
    fetch(API+'/documentos.php?org_id='+orgId).then(r=>r.json()),
  ]);
  if (!orgR.ok) { alert('Error al cargar la organización.'); return; }
  const o = orgR.data;
  const dirs = dirsR.ok ? dirsR.data : [];
  const docs = docsR.ok ? docsR.data : [];
  const canEdit = currentUser && ['administrador','funcionario'].includes(currentUser.rol);

  let overlay = document.getElementById('modalOrgDetail');
  if (overlay) overlay.remove();

  // Directiva actual (la más reciente)
  const dirActual = dirs.length > 0 ? dirs[0] : null;

  document.body.insertAdjacentHTML('beforeend',`
  <div class="modal-overlay open" id="modalOrgDetail" onclick="if(event.target.id==='modalOrgDetail')closeModal('modalOrgDetail')">
    <div class="modal modal--xl">
      <button class="modal-close" onclick="closeModal('modalOrgDetail')">✕</button>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px;flex-wrap:wrap">
        <div>
          <h3 style="font-size:1.3rem">${escHtml(o.nombre)}</h3>
          <p class="subtitle" style="margin:4px 0 0">RUT: ${escHtml(o.rut)} &nbsp;·&nbsp; ${escHtml(o.tipo_nombre||'Sin tipo')}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="badge ${{Activa:'badge--green',Inactiva:'badge--gray',Suspendida:'badge--red'}[o.estado]}">${o.estado}</span>
          ${o.habilitada_fondos?'<span class="badge badge--gold">Habilitada fondos</span>':''}
        </div>
      </div>
      <div class="tabs">
        <button class="tab-btn active" onclick="switchTab('detInfo',this)">📋 Información</button>
        <button class="tab-btn" onclick="switchTab('detDir',this)">👥 Directiva</button>
        <button class="tab-btn" onclick="switchTab('detDocs',this)">📁 Documentos</button>
      </div>
      <div class="modal-body" style="max-height:calc(100vh - 280px)">

        <!-- INFO -->
        <div id="detInfo" class="tab-panel active">
          <div class="detail-grid" style="margin-bottom:20px">
            <div class="detail-item"><div class="lbl">N° Registro Municipal (PJ)</div><div class="val">${escHtml(o.numero_registro_mun||'—')}</div></div>
            <div class="detail-item"><div class="lbl">Fecha Constitución</div><div class="val">${formatDate(o.fecha_constitucion)}</div></div>
            <div class="detail-item"><div class="lbl">N° Inscripción Registro Civil</div><div class="val">${escHtml(o.numero_pj_nacional||o.numero_decreto||'—')}</div></div>
            ${o.fecha_vencimiento_pj ? `<div class="detail-item"><div class="lbl">Vencimiento PJ</div><div class="val" style="color:${new Date(o.fecha_vencimiento_pj+'T12:00:00')<new Date()?'#ef4444':'inherit'}">${formatDate(o.fecha_vencimiento_pj)}</div></div>` : ''}
            <div class="detail-item"><div class="lbl">Dirección (${escHtml(o.tipo_direccion||'Sede')})</div><div class="val">${escHtml(o.direccion)}</div></div>
            <div class="detail-item"><div class="lbl">Sector/Barrio</div><div class="val">${escHtml(o.sector_barrio||'—')}</div></div>
            <div class="detail-item"><div class="lbl">Comuna</div><div class="val">${escHtml(o.comuna)}</div></div>
            <div class="detail-item"><div class="lbl">Región</div><div class="val">${escHtml(o.region)}</div></div>
            <div class="detail-item"><div class="lbl">Teléfono</div><div class="val">${escHtml(o.telefono_principal||'—')}</div></div>
            <div class="detail-item"><div class="lbl">Correo</div><div class="val">${escHtml(o.correo||'—')}</div></div>
            <div class="detail-item"><div class="lbl">N° Socios</div><div class="val">${o.numero_socios}</div></div>
            <div class="detail-item"><div class="lbl">Área de Acción</div><div class="val">${escHtml(o.area_accion||'—')}</div></div>
            <div class="detail-item span-2"><div class="lbl">Observaciones</div><div class="val">${escHtml(o.observaciones||'—')}</div></div>
          </div>
        </div>

        <!-- DIRECTIVA -->
        <div id="detDir" class="tab-panel">
          ${canEdit?`<div style="display:flex;justify-content:flex-end;margin-bottom:14px"><button class="btn btn-primary btn-sm" onclick="openDirModal(${o.id})">+ Nueva directiva</button></div>`:''}
          ${dirs.length===0?'<div class="table-empty"><div class="icon">📭</div>Sin directivas registradas.</div>':
            dirs.map(d=>`
            <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:16px;margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
                <div>
                  <span class="badge ${d.estado==='Vigente'?'badge--green':'badge--red'}">${d.estado}</span>
                </div>
                <div style="font-size:.78rem;color:var(--muted)">${formatDate(d.fecha_inicio)} - ${formatDate(d.fecha_termino)} &nbsp;·&nbsp; ${d.total_cargos} cargos</div>
                <div style="display:flex;gap:6px;align-items:center">
                  ${canEdit?`<button class="btn btn-ghost btn-sm" onclick="openCargosModal(${d.id},'${escHtml(o.nombre).replace(/'/g,"\\'")}')">Ver cargos</button>`:''}
                  ${canEdit?`<button class="btn btn-danger btn-sm" onclick="confirmDelDir(${d.id},'Directiva del ${formatDate(d.fecha_inicio)} al ${formatDate(d.fecha_termino)}')">Eliminar</button>`:''}
                </div>
              </div>
            </div>`).join('')}
        </div>

        <!-- DOCUMENTOS -->
        <div id="detDocs" class="tab-panel">
          ${canEdit?`<div style="margin-bottom:16px"><button class="btn btn-primary btn-sm" onclick="openDocModal(${o.id})">+ Subir documento</button></div>`:''}
          ${docs.length===0?'<div class="table-empty"><div class="icon">📁</div>Sin documentos.</div>':
            docs.map(d=>`
            <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:8px;margin-bottom:8px">
              <div style="font-size:1.4rem">${d.mime_type.includes('pdf')?'📄':d.mime_type.includes('image')?'🖼️':'📎'}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:.85rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(d.nombre)}</div>
                <div style="font-size:.72rem;color:var(--muted)">${escHtml(d.tipo)} &nbsp;·&nbsp; ${formatBytes(d.tamanio_bytes)} &nbsp;·&nbsp; ${escHtml(d.subido_por||'—')}</div>
              </div>
              <a href="${AUTH.apiBase}/documentos.php?download=${d.id}" class="btn btn-ghost btn-sm" download>⬇ Descargar</a>
              ${canEdit?`<button class="btn btn-danger btn-sm" onclick="delDoc(${d.id},this)">Eliminar</button>`:''}
            </div>`).join('')}
        </div>

      </div>
    </div>
  </div>`);

  window.switchTab = function(name,btn){
    document.querySelectorAll('#modalOrgDetail .tab-panel').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('#modalOrgDetail .tab-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById(name).classList.add('active');
    btn.classList.add('active');
  };

  window.openDirModal = function(orgId){ dirFormModal(orgId, ()=>{ closeModal('modalOrgDetail'); openOrgDetail(orgId); }); };
  window.openCargosModal = function(dirId,orgNombre){ cargosModal(dirId,orgNombre); };
  window.openDocModal = function(orgId){ docUploadModal(orgId, ()=>{ closeModal('modalOrgDetail'); openOrgDetail(orgId); }); };
  window.delDoc = async function(docId, btn){
    const modalId = 'modalConfirmDelDoc';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();
    
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="${modalId}" onclick="if(event.target.id==='${modalId}')document.getElementById('${modalId}')?.remove()">
        <div class="modal" style="max-width:360px;text-align:center">
          <div style="font-size:2.5rem;margin-bottom:12px">🗑️</div>
          <h3 style="margin-bottom:8px">¿Eliminar documento?</h3>
          <p class="subtitle" style="margin-bottom:20px">¿Estás seguro de eliminar este documento?</p>
          <div class="modal-footer" style="justify-content:center;gap:12px">
            <button class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancelar</button>
            <button class="btn btn-danger" id="${modalId}Btn">Sí, eliminar</button>
          </div>
        </div>
      </div>
    `);
    
    document.getElementById(`${modalId}Btn`).onclick = async () => {
      document.getElementById(modalId)?.remove();
      btn.disabled=true;
      const r=await fetch(API+'/documentos.php?id='+docId,{method:'DELETE'}).then(r=>r.json());
      if(r.ok){closeModal('modalOrgDetail');openOrgDetail(orgId);}
      else {
        document.body.insertAdjacentHTML('beforeend', `
          <div class="modal-overlay open" id="${modalId}Error">
            <div class="modal" style="max-width:360px;text-align:center">
              <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
              <h3 style="margin-bottom:8px">Error</h3>
              <p class="subtitle">${r.error || 'Error al eliminar'}</p>
              <div class="modal-footer" style="justify-content:center">
                <button class="btn btn-secondary" onclick="document.getElementById('${modalId}Error')?.remove()">Aceptar</button>
              </div>
            </div>
          </div>
        `);
      }
    };
  };

}

function dirFormModal(orgId = null, onSave=()=>{}) {
  /* Creando directiva */
  
  let m = document.getElementById('modalDirForm');
  if (!m) {
    // Crear modal solo si no existe
    document.body.insertAdjacentHTML('beforeend',`
    <div class="modal-overlay" id="modalDirForm">
      <div class="modal">
        <button class="modal-close" onclick="closeModal('modalDirForm')">×</button>
        <h3>Nueva Directiva</h3>
        <p class="subtitle">Registra una nueva directiva. La actual pasará al historial.</p>
        <div id="dirFormErr" class="alert alert--error"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg><span></span></div>
        <div class="form-group">
          <label>Organización *</label>
          <div style="position: relative;">
            <input type="text" id="directiva_org_input_2024_unique" placeholder="Escriba el nombre de la organización..." style="position: relative; z-index: 999;" />
          </div>
        </div>
        <div class="form-group"><label>Fecha de inicio *</label><input type="date" id="dfInicio"/></div>
        <div class="form-group"><label>Fecha de término *</label><input type="date" id="dfTermino"/></div>
        <div class="form-group"><label>Estado</label><select id="dfEstado"><option>Vigente</option><option>Vencida</option></select></div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('modalDirForm')">Cancelar</button>
          <button class="btn btn-primary" onclick="saveDirForm()">Guardar directiva</button>
        </div>
      </div>
    </div>`);
    m = document.getElementById('modalDirForm');
    
      }
  
  // Solo mostrar el modal existente
  m.classList.add('open');
  
  // Limpiar valores solo si el campo está vacío
  const campo = document.getElementById('directiva_org_input_2024_unique');
  if (campo && !campo.value) {
    campo.focus();
  }
  
  window.saveDirForm = async function(){
    const orgName = document.getElementById('directiva_org_input_2024_unique').value.trim();
    /* saveDirForm llamado */
    
    // Validar que se haya ingresado una organización
    if (!orgName || orgName.trim() === '') {
      showAlert('dirFormErr','Debe ingresar el nombre de una organización.');
      return;
    }
    
    // Buscar la organización por nombre
    try {
      const response = await fetch(API+'/organizaciones.php?action=list&_t='+Date.now(), {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.ok && data.data) {
        const org = data.data.find(o => 
          o.nombre.toLowerCase() === orgName.trim().toLowerCase()
        );
        
        if (!org) {
          showAlert('dirFormErr','No se encontró una organización con ese nombre.');
          return;
        }
        
        const orgId = org.id;
        /* Organización encontrada */
        
        const i=document.getElementById('dfInicio').value, t=document.getElementById('dfTermino').value;
        if(!i||!t){showAlert('dirFormErr','Ambas fechas son requeridas.');return;}
        
        const payload = {
          organizacion_id: parseInt(orgId),
          fecha_inicio: i,
          fecha_termino: t,
          estado: document.getElementById('dfEstado').value
        };
        
        /* Enviando payload */
        
        const r=await fetch(API+'/directivas.php',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify(payload)}).then(r=>r.json());
        if(r.ok){
          showAlert('dirFormErr','Directiva creada exitosamente (ID: ' + r.id + ')','success');
          setTimeout(() => {
            closeModal('modalDirForm');
            onSave();
          }, 2000);
        }
        else showAlert('dirFormErr',r.error||'Error al guardar.');
      } else {
        showAlert('dirFormErr', 'Error al buscar organizaciones: ' + (data.error || 'Error desconocido'));
      }
    } catch (error) {
      /* Error buscando organización */
      showAlert('dirFormErr', 'Error de conexión al buscar organización');
    }
  };
}

// Función setupOrgSearch eliminada - ahora usamos campo de texto simple

async function cargosModal(dirId, orgNombre='') {
  const r = await fetch(API+'/directivas.php?id='+dirId).then(r=>r.json());
  if(!r.ok){alert('Error al cargar cargos.');return;}
  const dir = r.data;
  const cargos = dir.cargos||[];
  const CARGOS_LIST=['Presidente','Presidenta','Vicepresidente','Vicepresidenta','Secretario','Secretaria','Tesorero','Tesorera','1° Director','2° Director','3° Director','Suplente'];
  const OBL=['Presidente','Presidenta','Secretario','Secretaria','Tesorero','Tesorera'];

  let m=document.getElementById('modalCargos');if(m)m.remove();
  document.body.insertAdjacentHTML('beforeend',`
  <div class="modal-overlay open" id="modalCargos">
    <div class="modal modal--lg">
      <button class="modal-close" onclick="closeModal('modalCargos')">✕</button>
      <h3>Cargos de Directiva</h3>
      <p class="subtitle">${escHtml(orgNombre)} &nbsp;·&nbsp; ${formatDate(dir.fecha_inicio)} — ${formatDate(dir.fecha_termino)}</p>
      <div class="modal-body" style="max-height:calc(100vh - 280px)">
        <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
          <button class="btn btn-primary btn-sm" onclick="openAddCargo(${dirId})">+ Agregar cargo</button>
        </div>
        <div id="cargosListEl">
          ${cargos.length===0?'<div class="table-empty"><div class="icon">👥</div>Sin cargos registrados.</div>':
            cargos.map(c=>`
            <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:8px;margin-bottom:8px">
              <div style="flex:1">
                <div style="font-size:.85rem;color:var(--cream);font-weight:600">${escHtml(c.cargo)} ${OBL.includes(c.cargo)?'<span style="color:var(--gold);font-size:.65rem">OBLIGATORIO</span>':''}</div>
                <div style="font-size:.78rem;color:var(--muted)">${escHtml(c.nombre_titular)} ${c.rut_titular?'· '+escHtml(c.rut_titular):''}</div>
              </div>
              <span class="badge ${c.estado_cargo==='Activo'?'badge--green':c.estado_cargo==='Vacante'?'badge--orange':'badge--gray'}">${c.estado_cargo}</span>
            </div>`).join('')}
        </div>
        <div id="addCargoForm" style="display:none;margin-top:16px;padding:16px;background:rgba(22,32,50,.8);border:1px solid rgba(201,168,76,.15);border-radius:10px">
          <div class="form-section-title" style="margin-bottom:12px">Nuevo cargo</div>
          <div id="cargoFormErr" class="alert alert--error"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg><span></span></div>
          <div class="form-grid">
            <div class="form-group"><label>Cargo *</label><select id="cfCargo"><option value="">— Seleccionar —</option>${CARGOS_LIST.map(c=>`<option>${c}</option>`).join('')}</select></div>
            <div class="form-group"><label>Estado</label><select id="cfEstado"><option>Activo</option><option>Vacante</option><option>Reemplazado</option></select></div>
            <div class="form-group"><label>Nombre titular *</label><input type="text" id="cfNombre" placeholder="Nombre completo"/></div>
            <div class="form-group"><label>RUT titular</label><input type="text" id="cfRut" placeholder="12.345.678-9"/></div>
            <div class="form-group"><label>Teléfono</label><input type="tel" id="cfTel" inputmode="tel" pattern="[0-9 +()-]*"/></div>
            <div class="form-group"><label>Correo</label><input type="email" id="cfCorreo"/></div>
          </div>
          <div style="display:flex;gap:10px;margin-top:8px">
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('addCargoForm').style.display='none'">Cancelar</button>
            <button class="btn btn-primary btn-sm" onclick="saveCargo(${dirId})">Guardar cargo</button>
          </div>
        </div>
      </div>
    </div>
  </div>`);

  window.openAddCargo = ()=>{ document.getElementById('addCargoForm').style.display='block'; };
  window.saveCargo = async function(dId){
    const cargo=document.getElementById('cfCargo').value, nombre=document.getElementById('cfNombre').value.trim();
    if(!cargo||!nombre){showAlert('cargoFormErr','Cargo y nombre son requeridos.');return;}
    const r=await fetch(API+'/directivas.php?action=cargo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({directiva_id:dId,cargo,nombre_titular:nombre,rut_titular:document.getElementById('cfRut').value||null,telefono:document.getElementById('cfTel').value||null,correo:document.getElementById('cfCorreo').value||null,estado_cargo:document.getElementById('cfEstado').value})}).then(r=>r.json());
    if(r.ok){closeModal('modalCargos');cargosModal(dId,orgNombre);}
    else showAlert('cargoFormErr',r.error||'Error al guardar.');
  };
}

function docUploadModal(orgId, onSave=()=>{}) {
  let m=document.getElementById('modalDocUp');if(m)m.remove();
  document.body.insertAdjacentHTML('beforeend',`
  <div class="modal-overlay open" id="modalDocUp">
    <div class="modal">
      <button class="modal-close" onclick="closeModal('modalDocUp')">✕</button>
      <h3>Subir Documento</h3>
      <p class="subtitle">PDF, Word o Excel. Máximo 10 MB.</p>
      <div id="docErr" class="alert alert--error"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg><span></span></div>
      <div class="form-group"><label>Tipo de documento *</label><select id="docTipo"><option value="">— Seleccionar —</option><option>Estatutos</option><option>Acta Constitución</option><option>Acta Última Elección</option><option>Certificado Vigencia</option><option>RUT Organización</option><option>Otro</option></select></div>
      <div class="form-group"><label>Nombre del documento *</label><input type="text" id="docNombre" placeholder="Ej: Estatutos 2024"/></div>
      <div class="form-group"><label>Archivo *</label><input type="file" id="docArchivo" accept=".pdf,.doc,.docx,.xls,.xlsx" style="padding:10px 14px"/></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('modalDocUp')">Cancelar</button>
        <button class="btn btn-primary" id="btnUpDoc" onclick="uploadDoc(${orgId})"><span id="btnUpDocTxt">Subir</span><div class="spinner" id="spinUpDoc" style="display:none"></div></button>
      </div>
    </div>
  </div>`);
  window.uploadDoc = async function(oid){
    const tipo=document.getElementById('docTipo').value, nombre=document.getElementById('docNombre').value.trim(), file=document.getElementById('docArchivo').files[0];
    if(!tipo||!nombre||!file){showAlert('docErr','Todos los campos son requeridos.');return;}
    const btn=document.getElementById('btnUpDoc');
    btn.disabled=true;document.getElementById('btnUpDocTxt').style.display='none';document.getElementById('spinUpDoc').style.display='block';
    const fd=new FormData();fd.append('organizacion_id',oid);fd.append('tipo',tipo);fd.append('nombre',nombre);fd.append('archivo',file);
    const r=await fetch(API+'/documentos.php',{method:'POST',body:fd}).then(r=>r.json());
    btn.disabled=false;document.getElementById('btnUpDocTxt').style.display='';document.getElementById('spinUpDoc').style.display='none';
    if(r.ok){closeModal('modalDocUp');onSave();}
    else showAlert('docErr',r.error||'Error al subir.');
  };
}

function renderReportes(main) {
  const reportes = [
    {tipo:'organizaciones_activas', titulo:'Organizaciones Activas',       desc:'Listado completo con datos generales de organizaciones activas.',              icon:'🏢'},
    {tipo:'directivas_vigentes',    titulo:'Directivas Vigentes',           desc:'Directivas en estado vigente con fechas de inicio y término.',                icon:'👥'},
    {tipo:'directivas_vencidas',    titulo:'Directivas Vencidas',           desc:'Organizaciones cuya directiva está vencida.',                                  icon:'⚠️'},
    {tipo:'directivos',             titulo:'Directivos',                    desc:'Todos los integrantes de directivas vigentes con sus cargos y contactos.',     icon:'🪪'},
    {tipo:'sedes',                  titulo:'Sedes y Domicilios',            desc:'Direcciones, sectores/U.V. y datos de contacto de todas las organizaciones.',  icon:'📍'},
    {tipo:'socios_por_tipo',        titulo:'Socios por Tipo',               desc:'Estadística de socios agrupados por tipo de organización.',                    icon:'📊'},
    {tipo:'directivos_cargos',      titulo:'Directivos por Cargo',          desc:'Listado de todos los directivos activos con cargo y datos de contacto.',        icon:'🪪'},
    {tipo:'directivos_direcciones', titulo:'Direcciones de Directivos',     desc:'Direcciones registradas de todos los directivos activos.',                       icon:'📍'},
    {tipo:'estadisticas_personas',  titulo:'Estadísticas de Personas',      desc:'Resumen de socios y directivos por organización y tipo.',                        icon:'📈'},
  ];
  main.innerHTML = `
    <div class="page-header"><div class="page-header-left"><h2>Reportes</h2><p>Exporta listados a Excel o PDF.</p></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;opacity:0;animation:fadeUp .5s .1s forwards">
      ${reportes.map(r=>`
        <div style="background:rgba(22,32,50,.6);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:24px">
          <div style="font-size:2rem;margin-bottom:12px">${r.icon}</div>
          <h3 style="font-family:var(--font-display);color:var(--cream);font-size:1.5rem;margin-bottom:6px">${r.titulo}</h3>
          <p style="font-size:1.1rem;color:var(--muted);margin-bottom:20px;line-height:1.5">${r.desc}</p>
          <div style="display:flex;gap:8px">
            <a href="${AUTH.apiBase}/reportes.php?tipo=${r.tipo}&formato=excel" class="btn btn-secondary btn-sm" download>📊 Excel</a>
            <a href="${AUTH.apiBase}/reportes.php?tipo=${r.tipo}&formato=pdf" class="btn btn-ghost btn-sm" target="_blank">📄 PDF</a>
          </div>
        </div>`).join('')}
    </div>`;
}

async function renderUsuarios(main) {
  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h2>Usuarios</h2><p>Gestión de accesos al sistema.</p></div>
      <div class="page-header-right"><button class="btn btn-primary" onclick="openUserModal()">+ Nuevo usuario</button></div>
    </div>
    <div class="table-wrap" style="opacity:0;animation:fadeUp .5s .1s forwards">
      <table class="data-table">
        <thead><tr><th>Nombre</th><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody id="userTbody"><tr><td colspan="6"><div class="table-empty"><div class="icon">⏳</div>Cargando…</div></td></tr></tbody>
      </table>
    </div>`;

  async function loadUsers(){
    /* loadUsers DEBUG */
    try {
      const response = await fetch(API+'/usuarios.php');
      console.log('Response status:', response.status);
      const text = await response.text();
      console.log('Response text:', text);
      
      let r;
      try {
        r = JSON.parse(text);
      } catch (e) {
        console.error('JSON parse error:', e);
        document.getElementById('userTbody').innerHTML=`<tr><td colspan="6"><div class="table-empty">Error: Respuesta inválida del servidor</div></td></tr>`;
        return;
      }
      
      /* Parsed response */
      if(!r.ok){
        const errorMsg = r.error && r.error.includes('rol administrador') ? r.error : (r.error || 'Error al cargar');
        document.getElementById('userTbody').innerHTML=`<tr><td colspan="6"><div class="table-empty">${errorMsg}</div></td></tr>`;
        return;
      }
      
      const rolColors={administrador:'badge--gold',funcionario:'badge--blue',consulta:'badge--gray'};
      document.getElementById('userTbody').innerHTML=r.data.map(u=>`
      <tr>
        <td><strong>${escHtml(u.nombre_completo||'—')}</strong></td>
        <td class="muted">${escHtml(u.username)}</td>
        <td class="muted">${escHtml(u.email)}</td>
        <td><span class="badge ${rolColors[u.rol]||'badge--gray'}">${u.rol}</span></td>
        <td>${u.activo?'<span class="badge badge--green">Activo</span>':'<span class="badge badge--red">Inactivo</span>'}</td>
        <td><div class="row-actions">
          <button class="btn-icon btn-icon--edit" onclick="openUserModal(${u.id})"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg></button>
          ${u.id!==currentUser.id?`<button class="btn-icon btn-icon--del" onclick="delUser(${u.id},'${escHtml(u.username).replace(/'/g,"\\'")}')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244-2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg></button>`:''}
        </div></td>
      </tr>`).join('');
    } catch (err) {
      /* Error en loadUsers */
      document.getElementById('userTbody').innerHTML=`<tr><td colspan="6"><div class="table-empty">Error: ${err.message}</div></td></tr>`;
    }
  }
  loadUsers();

  window.openUserModal = async function(id=null){
    let u=null;
    if(id){const r=await fetch(API+'/usuarios.php').then(r=>r.json());if(r.ok)u=r.data.find(x=>x.id===id);}
    let m=document.getElementById('modalUser');if(m)m.remove();
    document.body.insertAdjacentHTML('beforeend',`
    <div class="modal-overlay open" id="modalUser">
      <div class="modal">
        <button class="modal-close" onclick="closeModal('modalUser')">✕</button>
        <h3>${u?'Editar':'Nuevo'} usuario</h3>
        <p class="subtitle">${u?'Modifica los datos del usuario.':'Crea un nuevo acceso al sistema.'}</p>
        <div id="userFormErr" class="alert alert--error"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg><span></span></div>
        <div class="form-group"><label>Nombre completo</label><input type="text" id="ufNombre" value="${escHtml(u?.nombre_completo||'')}"/></div>
        <div class="form-group"><label>Usuario *</label><input type="text" id="ufUsername" value="${escHtml(u?.username||'')}" ${u?'readonly style="opacity:.6"':''}/></div>
        <div class="form-group"><label>Email *</label><input type="email" id="ufEmail" value="${escHtml(u?.email||'')}"/></div>
        <div class="form-group"><label>Rol *</label><select id="ufRol"><option value="administrador" ${u?.rol==='administrador'?'selected':''}>Administrador</option><option value="funcionario" ${u?.rol==='funcionario'||!u?'selected':''}>Funcionario</option><option value="consulta" ${u?.rol==='consulta'?'selected':''}>Solo Lectura</option></select></div>
        <div class="form-group"><label>${u?'Nueva contraseña (dejar vacío para no cambiar)':'Contraseña *'}</label><input type="password" id="ufPass" placeholder="Mínimo 8 caracteres"/></div>
        ${u?`<div class="form-group"><label>Estado</label><select id="ufActivo"><option value="1" ${u.activo?'selected':''}>Activo</option><option value="0" ${!u.activo?'selected':''}>Inactivo</option></select></div>`:''}
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal('modalUser')">Cancelar</button>
          <button class="btn btn-primary" onclick="saveUser(${u?.id||'null'})">Guardar</button>
        </div>
      </div>
    </div>`);
    window.saveUser = async function(uid){
      const payload={username:document.getElementById('ufUsername').value.trim(),email:document.getElementById('ufEmail').value.trim(),rol:document.getElementById('ufRol').value,nombre_completo:document.getElementById('ufNombre').value.trim()};
      const p=document.getElementById('ufPass').value;
      if(p)payload.password=p;
      if(uid){payload.id=uid;if(document.getElementById('ufActivo'))payload.activo=document.getElementById('ufActivo').value;}
      const r=await fetch(API+'/usuarios.php',{method:uid?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json());
      if(r.ok){closeModal('modalUser');loadUsers();}
      else showAlert('userFormErr',r.error||'Error al guardar.');
    };
  };
  window.delUser=async function(id,name){
    const modalId = 'modalConfirmDelUser';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();
    
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="${modalId}" onclick="if(event.target.id==='${modalId}')document.getElementById('${modalId}')?.remove()">
        <div class="modal" style="max-width:360px;text-align:center">
          <div style="font-size:2.5rem;margin-bottom:12px">🗑️</div>
          <h3 style="margin-bottom:8px">¿Eliminar usuario?</h3>
          <p class="subtitle" style="margin-bottom:20px">¿Estás seguro de eliminar al usuario <strong>${escHtml(name)}</strong>?</p>
          <div class="modal-footer" style="justify-content:center;gap:12px">
            <button class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancelar</button>
            <button class="btn btn-danger" id="${modalId}Btn">Sí, eliminar</button>
          </div>
        </div>
      </div>
    `);
    
    document.getElementById(`${modalId}Btn`).onclick = async () => {
      document.getElementById(modalId)?.remove();
      const r=await fetch(API+'/usuarios.php?id='+id,{method:'DELETE'}).then(r=>r.json());
      if(r.ok)loadUsers();
      else {
        document.body.insertAdjacentHTML('beforeend', `
          <div class="modal-overlay open" id="${modalId}Error">
            <div class="modal" style="max-width:360px;text-align:center">
              <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
              <h3 style="margin-bottom:8px">Error</h3>
              <p class="subtitle">${r.error || 'Error al eliminar'}</p>
              <div class="modal-footer" style="justify-content:center">
                <button class="btn btn-secondary" onclick="document.getElementById('${modalId}Error')?.remove()">Aceptar</button>
              </div>
            </div>
          </div>
        `);
      }
    };
  };
}

async function doChangePass(){
  const c=document.getElementById('cpCurrent').value, n=document.getElementById('cpNew').value, cf=document.getElementById('cpConfirm').value;
  hideAlert('cpError'); hideAlert('cpSuccess');
  if(!c||!n||!cf){showAlert('cpError','Completa todos los campos.');return;}
  const btn=document.getElementById('btnCP');
  btn.disabled=true;document.getElementById('btnCPTxt').style.display='none';document.getElementById('spinCP').style.display='block';
  const r=await changePassword(c,n,cf);
  btn.disabled=false;document.getElementById('btnCPTxt').style.display='';document.getElementById('spinCP').style.display='none';
  if(r.ok){showAlert('cpSuccess','','success');['cpCurrent','cpNew','cpConfirm'].forEach(id=>document.getElementById(id).value='');}
  else showAlert('cpError',r.error||'Error.');
}

async function checkAlertas(){
  const r=await fetch(AUTH.apiBase+'/organizaciones.php?action=alertas').then(r=>r.json()).catch(()=>({ok:false}));
  if(r.ok&&r.data.length){
  }
}

const ESTADOS_PROYECTO = {
  postulando: { label:'Postulando',  color:'#3b82f6' },
  aprobado:   { label:'Aprobado',    color:'#22c55e' },
  rechazado:  { label:'Rechazado',   color:'#ef4444' },
  ejecutando: { label:'Ejecutando',  color:'#f59e0b' },
  cerrado:    { label:'Cerrado',     color:'#6b7280' },
};

function fmtMoney(v){ if(!v && v!==0) return '—'; return '$'+Number(v).toLocaleString('es-CL'); }

async function renderProyectos(main) {
  main.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">Subvenciones</h2><p class="subtitle">Seguimiento de subvenciones y fondos por organización</p></div>
      ${currentUser.rol!=='consulta'?`<button class="btn btn-primary" onclick="openProyForm()">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
        Nueva subvención
      </button>`:''}
    </div>
    <div class="table-toolbar">
      <input class="search-input" id="proySearch" placeholder="Buscar subvención u organización…" oninput="filterProyectos()" style="max-width:320px" autocomplete="search" name="proysearch" readonly onfocus="this.removeAttribute('readonly')" onblur="this.setAttribute('readonly','readonly')"/>
      <select id="proyEstadoFil" class="filter-select" onchange="filterProyectos()">
        <option value="">Todos los estados</option>
        ${Object.entries(ESTADOS_PROYECTO).map(([v,e])=>`<option value="${v}">${e.label}</option>`).join('')}
      </select>
    </div>
    <div class="table-wrap"><table class="data-table" id="proyTable">
      <thead><tr>
        <th>Proyecto</th><th>Organización</th><th>Fondo</th>
        <th>Monto solicitado</th><th>Monto aprobado</th>
        <th>Estado</th><th>Fecha postulación</th><th></th>
      </tr></thead>
      <tbody id="proyBody"><tr><td colspan="8" class="empty-cell"><div class="spinner" style="margin:0 auto"></div></td></tr></tbody>
    </table></div>`;

  // Limpiar campo de búsqueda antes de cargar (evita autocompletado del navegador)
  const searchInput = document.getElementById('proySearch');
  if (searchInput) searchInput.value = '';
  
  // Forzar limpieza después de que el navegador aplique autocompletado (Chrome)
  setTimeout(() => {
    const si = document.getElementById('proySearch');
    if (si) si.value = '';
  }, 100);

  await loadProyectos();
}

let _proyAll = [];
async function loadProyectos() {
  if (!document.getElementById('proyBody')) return;
  const r = await fetch(API+'/proyectos.php?action=list_all&_t='+Date.now()).then(r=>r.json()).catch(()=>({ok:false}));
  _proyAll = r.ok ? r.data : [];
  renderProyRows(_proyAll);
}

function filterProyectos() {
  const q   = document.getElementById('proySearch')?.value.toLowerCase() || '';
  const est = document.getElementById('proyEstadoFil')?.value || '';
  renderProyRows(_proyAll.filter(p =>
    (!q   || p.nombre.toLowerCase().includes(q) || (p.org_nombre||'').toLowerCase().includes(q)) &&
    (!est || p.estado === est)
  ));
}

function renderProyRows(list) {
  const tbody = document.getElementById('proyBody');
  if (!tbody) return;
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="8" class="empty-cell">No hay proyectos registrados.</td></tr>`; return; }
  tbody.innerHTML = list.map(p => {
    const e = ESTADOS_PROYECTO[p.estado] || {label:p.estado, color:'#6b7280'};
    return `<tr>
      <td><strong>${escHtml(p.nombre)}</strong>${p.fondo_programa?`<br><span class="muted" style="font-size:.75rem">${escHtml(p.fondo_programa)}</span>`:''}</td>
      <td class="muted">${escHtml(p.org_nombre||'—')}</td>
      <td class="muted">${escHtml(p.fondo_programa||'—')}</td>
      <td class="muted">${fmtMoney(p.monto_solicitado)}</td>
      <td class="muted">${fmtMoney(p.monto_aprobado)}</td>
      <td><span class="status-badge" style="background:${e.color}22;color:${e.color};border:1px solid ${e.color}44">${e.label}</span></td>
      <td class="muted">${formatDate(p.fecha_postulacion)}</td>
      <td class="actions">
        <button class="btn btn-ghost btn-sm" onclick="openProyDetail(${p.id})" title="Ver detalle">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="15" height="15"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </button>
        ${currentUser.rol!=='consulta'?`
        <button class="btn btn-ghost btn-sm" onclick="openProyForm(${p.id})" title="Editar">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="15" height="15"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>
        </button>
        <button class="btn btn-ghost btn-sm text-danger" onclick="delProy(${p.id},'${escHtml(p.nombre)}')" title="Eliminar">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="15" height="15"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
        </button>`:''}
      </td>
    </tr>`;
  }).join('');
}

async function openProyForm(id=null) {
  // Cargar organizaciones para el select
  const orgsR = await fetch(API+'/organizaciones.php?action=list&page=1&per_page=999').then(r=>r.json()).catch(()=>({ok:false}));
  const orgs  = orgsR.ok ? orgsR.data : [];
  window._orgsCache = orgs;

  let p = null;
  if (id) {
    const r = await fetch(API+'/proyectos.php?action=get&id='+id).then(r=>r.json()).catch(()=>({ok:false}));
    if (r.ok) p = r.data;
  }

  const estadoOpts = Object.entries(ESTADOS_PROYECTO)
    .map(([v,e])=>`<option value="${v}" ${p?.estado===v?'selected':''}>${e.label}</option>`).join('');
  const orgOpts = orgs.map(o=>`<option value="${o.id}" ${p?.organizacion_id==o.id?'selected':''}>${escHtml(o.nombre)}</option>`).join('');

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="modalProyForm">
      <div class="modal" style="max-width:min(640px,92vw)">
        <button class="modal-close" onclick="document.getElementById('modalProyForm')?.remove()">✕</button>
        <h3>${p?'Editar proyecto':'Nueva subvención'}</h3>
        <p class="subtitle">${p?'Modifica los datos de la subvención.':'Registra una nueva subvención o postulación a fondos.'}</p>
        <div id="proyFormErr" class="alert alert--error"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg><span></span></div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group span-2">
              <label>Organización *</label>
              <input type="text" id="pfOrgInput" list="pfOrgList"
                placeholder="Escribe para buscar organización…"
                autocomplete="off"
                value="${p ? (orgs.find(o=>o.id==p.organizacion_id)?.nombre||'') : ''}"
                oninput="syncOrgId(this,_orgsCache)"/>
              <datalist id="pfOrgList">${orgs.map(o=>`<option value="${escHtml(o.nombre)}"></option>`).join('')}</datalist>
              <input type="hidden" id="pfOrg" value="${p?.organizacion_id||''}"/>
              <div id="pfOrgSel" style="font-size:.78rem;color:var(--gold);margin-top:3px;min-height:16px">
                ${p && orgs.find(o=>o.id==p.organizacion_id) ? '✔ '+escHtml(orgs.find(o=>o.id==p.organizacion_id)?.nombre||'') : ''}
              </div>
            </div>
            <div class="form-group span-2"><label>Nombre de la subvención *</label><input type="text" id="pfNombre" value="${escHtml(p?.nombre||'')}" placeholder="Nombre de la subvención"/></div>
            <div class="form-group span-2"><label>Descripción</label><textarea id="pfDesc" rows="2">${escHtml(p?.descripcion||'')}</textarea></div>
            <div class="form-group"><label>Fondo / Programa</label><input type="text" id="pfFondo" value="${escHtml(p?.fondo_programa||'')}" placeholder="FNDR, PMU, FOSIS…"/></div>
            <div class="form-group"><label>Estado</label><select id="pfEstado">${estadoOpts}</select></div>
            <div class="form-group"><label>Monto solicitado ($)</label><input type="number" id="pfMontSol" value="${p?.monto_solicitado??''}" min="0" step="1000"/></div>
            <div class="form-group"><label>Monto aprobado ($)</label><input type="number" id="pfMontApr" value="${p?.monto_aprobado??''}" min="0" step="1000"/></div>
            <div class="form-group"><label>Fecha postulación</label><input type="date" id="pfFechaPost" value="${p?.fecha_postulacion||''}"/></div>
            <div class="form-group"><label>Fecha resolución</label><input type="date" id="pfFechaRes" value="${p?.fecha_resolucion||''}"/></div>
            <div class="form-group span-2"><label>Observaciones</label><textarea id="pfObs" rows="2">${escHtml(p?.observaciones||'')}</textarea>
            <div class="form-group"><label>Año de postulación</label><input type="number" id="pfAnioPost" value="${p?.anio_postulacion||new Date().getFullYear()}" min="2000" max="2100"/></div>
            <div class="form-group"><label>Veces que ha postulado</label><input type="number" id="pfVeces" value="${p?.veces_postulado??1}" min="1"/></div>
            <div class="form-group"><label>¿Ha obtenido subvención?</label><select id="pfObtuvo"><option value="0" ${!p?.obtuvo_subvencion?'selected':''}>No</option><option value="1" ${p?.obtuvo_subvencion?'selected':''}>Sí</option></select></div>
            <div class="form-group"><label>Año que obtuvo subvención</label><input type="number" id="pfAnioObt" value="${p?.anio_obtuvo_subvencion||''}" min="2000" max="2100" placeholder="Solo si obtuvo"/></div>
</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalProyForm')?.remove()">Cancelar</button>
          <button class="btn btn-primary" onclick="saveProy(${p?.id||'null'})">Guardar</button>
        </div>
      </div>
    </div>`);

  window.saveProy = async function(pid) {
    /* saveProy DEBUG */
    const payload = {
      organizacion_id: document.getElementById('pfOrg')?.value || document.getElementById('pfOrgInput')?.value,
      nombre:          document.getElementById('pfNombre').value.trim(),
      descripcion:     document.getElementById('pfDesc').value.trim(),
      fondo_programa:  document.getElementById('pfFondo').value.trim(),
      estado:          document.getElementById('pfEstado').value,
      monto_solicitado:document.getElementById('pfMontSol').value,
      monto_aprobado:  document.getElementById('pfMontApr').value,
      fecha_postulacion:document.getElementById('pfFechaPost').value,
      fecha_resolucion: document.getElementById('pfFechaRes').value,
      observaciones:        document.getElementById('pfObs').value.trim(),
      anio_postulacion:     document.getElementById('pfAnioPost').value||null,
      veces_postulado:      document.getElementById('pfVeces').value||1,
      obtuvo_subvencion:    document.getElementById('pfObtuvo').value,
      anio_obtuvo_subvencion: document.getElementById('pfAnioObt').value||null,
    };
    console.log('Payload:', payload);
    if (!payload.nombre) { showAlert('proyFormErr','El nombre es obligatorio.'); return; }
    if (!payload.organizacion_id) { showAlert('proyFormErr','Debe seleccionar una organización.'); return; }

    const url    = pid ? API+'/proyectos.php?id='+pid : API+'/proyectos.php';
    const method = pid ? 'PUT' : 'POST';
    
    try {
      const response = await fetch(url, {method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
      const text = await response.text();
      console.log('Response:', text);
      
      let r;
      try {
        r = JSON.parse(text);
      } catch (e) {
        console.error('JSON parse error:', e);
        showAlert('proyFormErr', 'Error: respuesta inválida del servidor');
        return;
      }
      
      if (r.ok) { 
        document.getElementById('modalProyForm')?.remove(); 
        loadProyectos(); 
      } else {
        showAlert('proyFormErr', r.error || 'Error al guardar.');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      showAlert('proyFormErr', 'Error de conexión: ' + err.message);
    }
  };
}

async function openProyDetail(id) {
  const [pr, dr] = await Promise.all([
    fetch(API+'/proyectos.php?action=get&id='+id).then(r=>r.json()),
    fetch(API+'/proyectos.php?action=documentos&id='+id).then(r=>r.json()),
  ]);
  if (!pr.ok) { alert('Error al cargar proyecto'); return; }
  const p  = pr.data;
  const docs = dr.ok ? dr.data : [];
  const e  = ESTADOS_PROYECTO[p.estado] || {label:p.estado, color:'#6b7280'};

  const docRows = docs.length
    ? docs.map(d=>`<div class="doc-row">
        <div class="doc-info">
          <span class="doc-icon">📄</span>
          <div><div class="doc-name">${escHtml(d.nombre_original)}</div>
          <div class="doc-meta">${escHtml(d.tipo)} · ${(d.tamanio_bytes/1024).toFixed(1)} KB</div></div>
        </div>
        <div class="doc-actions">
          <a class="btn btn-ghost btn-sm" href="${API}/proyectos.php?action=descargar&id=${d.id}" target="_blank">Descargar</a>
          ${currentUser.rol!=='consulta'?`<button class="btn btn-ghost btn-sm text-danger" onclick="delDocProy(${d.id},${id})">Eliminar</button>`:''}
        </div>
      </div>`).join('')
    : '<p class="muted" style="font-size:.85rem;padding:8px 0">Sin documentos adjuntos.</p>';

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="modalProyDetail" onclick="if(event.target.id==='modalProyDetail')this.remove()">
      <div class="modal" style="max-width:min(640px,92vw)">
        <button class="modal-close" onclick="document.getElementById('modalProyDetail')?.remove()">✕</button>
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:20px">
          <div style="flex:1">
            <h3 style="font-size:1.2rem;margin:0 0 4px">${escHtml(p.nombre)}</h3>
            <p class="subtitle" style="margin:0">${escHtml(p.org_nombre||'—')}</p>
          </div>
          <span class="status-badge" style="background:${e.color}22;color:${e.color};border:1px solid ${e.color}44;flex-shrink:0">${e.label}</span>
        </div>
        <div class="detail-grid">
          <div class="detail-item"><div class="lbl">Fondo / Programa</div><div class="val">${escHtml(p.fondo_programa||'—')}</div></div>
          <div class="detail-item"><div class="lbl">Fecha postulación</div><div class="val">${formatDate(p.fecha_postulacion)}</div></div>
          <div class="detail-item"><div class="lbl">Monto solicitado</div><div class="val">${fmtMoney(p.monto_solicitado)}</div></div>
          <div class="detail-item"><div class="lbl">Monto aprobado</div><div class="val">${fmtMoney(p.monto_aprobado)}</div></div>
          <div class="detail-item"><div class="lbl">Fecha resolución</div><div class="val">${formatDate(p.fecha_resolucion)}</div></div>
          <div class="detail-item"><div class="lbl">Registrado por</div><div class="val">${escHtml(p.creado_por||'—')}</div></div>
          ${p.descripcion?`<div class="detail-item span-2"><div class="lbl">Descripción</div><div class="val">${escHtml(p.descripcion)}</div></div>`:''}
          ${p.observaciones?`<div class="detail-item span-2"><div class="lbl">Observaciones</div><div class="val">${escHtml(p.observaciones)}</div></div>`:''}
          <div class="detail-item"><div class="lbl">Año postulación</div><div class="val">${p.anio_postulacion||'—'}</div></div>
          <div class="detail-item"><div class="lbl">Veces postulado</div><div class="val">${p.veces_postulado||1}</div></div>
          <div class="detail-item"><div class="lbl">Obtuvo subvención</div><div class="val">${p.obtuvo_subvencion?'<span style="color:#22c55e">Sí</span>':'No'}</div></div>
          ${p.anio_obtuvo_subvencion?`<div class="detail-item"><div class="lbl">Año que obtuvo</div><div class="val">${p.anio_obtuvo_subvencion}</div></div>`:''}
        </div>
        <div style="margin-top:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <strong style="font-size:.9rem">Documentos</strong>
            ${currentUser.rol!=='consulta'?`<button class="btn btn-secondary btn-sm" onclick="openDocProyModal(${p.id})">+ Adjuntar</button>`:''}
          </div>
          <div id="docListProy">${docRows}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalProyDetail')?.remove()">Cerrar</button>
          ${currentUser.rol!=='consulta'?`<button class="btn btn-primary" onclick="document.getElementById('modalProyDetail')?.remove();openProyForm(${p.id})">Editar</button>`:''}
        </div>
      </div>
    </div>`);
}

async function delDocProy(docId, proyId) {
  const modalId = 'modalConfirmDelDocProy';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();
  
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="${modalId}" onclick="if(event.target.id==='${modalId}')document.getElementById('${modalId}')?.remove()">
      <div class="modal" style="max-width:360px;text-align:center">
        <div style="font-size:2.5rem;margin-bottom:12px">🗑️</div>
        <h3 style="margin-bottom:8px">¿Eliminar documento?</h3>
        <p class="subtitle" style="margin-bottom:20px">¿Estás seguro de eliminar este documento adjunto?</p>
        <div class="modal-footer" style="justify-content:center;gap:12px">
          <button class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancelar</button>
          <button class="btn btn-danger" id="${modalId}Btn">Sí, eliminar</button>
        </div>
      </div>
    </div>
  `);
  
  document.getElementById(`${modalId}Btn`).onclick = async () => {
    document.getElementById(modalId)?.remove();
    const r = await fetch(API+'/proyectos.php?action=doc&id='+docId, {method:'DELETE'}).then(r=>r.json());
    if (r.ok) { document.getElementById('modalProyDetail')?.remove(); openProyDetail(proyId); }
    else {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay open" id="${modalId}Error">
          <div class="modal" style="max-width:360px;text-align:center">
            <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
            <h3 style="margin-bottom:8px">Error</h3>
            <p class="subtitle">${r.error || 'Error al eliminar'}</p>
            <div class="modal-footer" style="justify-content:center">
              <button class="btn btn-secondary" onclick="document.getElementById('${modalId}Error')?.remove()">Aceptar</button>
            </div>
          </div>
        </div>
      `);
    }
  };
}

function openDocProyModal(proyId) {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="modalDocProy">
      <div class="modal" style="max-width:min(420px,92vw)">
        <button class="modal-close" onclick="document.getElementById('modalDocProy')?.remove()">✕</button>
        <h3>Adjuntar documento</h3>
        <p class="subtitle">PDF, Word o Excel · Máx. ${10} MB</p>
        <div id="docProyErr" class="alert alert--error"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg><span></span></div>
        <div class="form-group"><label>Tipo de documento</label>
          <select id="dpTipo">
            <option>Postulación</option><option>Resolución</option><option>Contrato</option>
            <option>Informe</option><option>Rendición</option><option>Otro</option>
          </select>
        </div>
        <div class="form-group"><label>Archivo *</label><input type="file" id="dpFile" accept=".pdf,.doc,.docx,.xls,.xlsx"/></div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalDocProy')?.remove()">Cancelar</button>
          <button class="btn btn-primary" id="btnDocProy" onclick="uploadDocProy(${proyId})">
            <span id="btnDocProyTxt">Subir</span><div class="spinner" id="spinDocProy" style="display:none"></div>
          </button>
        </div>
      </div>
    </div>`);
}

async function uploadDocProy(proyId) {
  console.log('=== uploadDocProy DEBUG ===', proyId);
  const file = document.getElementById('dpFile')?.files[0];
  if (!file) { showAlert('docProyErr','Selecciona un archivo.'); return; }

  const btn = document.getElementById('btnDocProy');
  btn.disabled = true;
  document.getElementById('btnDocProyTxt').style.display = 'none';
  document.getElementById('spinDocProy').style.display   = 'block';

  const fd = new FormData();
  fd.append('archivo', file);
  fd.append('proyecto_id', proyId);
  fd.append('tipo', document.getElementById('dpTipo').value);
  fd.append('action', 'upload');

  console.log('Enviando a:', API+'/proyectos.php?action=upload');
  console.log('File:', file.name, 'Size:', file.size);

  try {
    const response = await fetch(API+'/proyectos.php?action=upload', {method:'POST', body:fd});
    console.log('Response status:', response.status);
    
    const text = await response.text();
    console.log('Response text:', text);
    
    let r;
    try {
      r = JSON.parse(text);
    } catch (e) {
      console.error('JSON parse error:', e);
      showAlert('docProyErr', 'Error del servidor: respuesta inválida');
      btn.disabled = false;
      document.getElementById('btnDocProyTxt').style.display = '';
      document.getElementById('spinDocProy').style.display   = 'none';
      return;
    }

    if (r.ok) {
      document.getElementById('modalDocProy')?.remove();
      document.getElementById('modalProyDetail')?.remove();
      openProyDetail(proyId);
    } else {
      showAlert('docProyErr', r.error || 'Error al subir.');
      btn.disabled = false;
      document.getElementById('btnDocProyTxt').style.display = '';
      document.getElementById('spinDocProy').style.display   = 'none';
    }
  } catch (err) {
    console.error('Fetch error:', err);
    showAlert('docProyErr', 'Error de conexión: ' + err.message);
    btn.disabled = false;
    document.getElementById('btnDocProyTxt').style.display = '';
    document.getElementById('spinDocProy').style.display   = 'none';
  }
}

async function delProy(id, nombre) {
  const modalId = 'modalConfirmDelProy';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();
  
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="${modalId}" onclick="if(event.target.id==='${modalId}')document.getElementById('${modalId}')?.remove()">
      <div class="modal" style="max-width:400px;text-align:center">
        <div style="font-size:2.5rem;margin-bottom:12px">🗑️</div>
        <h3 style="margin-bottom:8px">¿Eliminar subvención?</h3>
        <p class="subtitle" style="margin-bottom:20px">¿Estás seguro de eliminar <strong>${escHtml(nombre)}</strong>?<br>Se eliminarán también sus documentos adjuntos.</p>
        <div class="modal-footer" style="justify-content:center;gap:12px">
          <button class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancelar</button>
          <button class="btn btn-danger" id="${modalId}Btn">Sí, eliminar</button>
        </div>
      </div>
    </div>
  `);
  
  document.getElementById(`${modalId}Btn`).onclick = async () => {
    const btn = document.getElementById(`${modalId}Btn`);
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px"></span>Eliminando...';
    
    try {
      const r = await fetch(API+'/proyectos.php?id='+id, {method:'DELETE',headers:{'Cache-Control':'no-cache'}}).then(r=>r.json());
      document.getElementById(modalId)?.remove();
      if (r.ok) {
        // Forzar actualización inmediata con timestamp
        setTimeout(() => loadProyectos(), 100);
      }
      else {
        document.body.insertAdjacentHTML('beforeend', `
          <div class="modal-overlay open" id="${modalId}Error">
            <div class="modal" style="max-width:360px;text-align:center">
              <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
              <h3 style="margin-bottom:8px">Error</h3>
              <p class="subtitle">${r.error || 'Error al eliminar'}</p>
              <div class="modal-footer" style="justify-content:center">
                <button class="btn btn-secondary" onclick="document.getElementById('${modalId}Error')?.remove()">Aceptar</button>
              </div>
            </div>
          </div>
        `);
      }
    } catch (e) {
      document.getElementById(modalId)?.remove();
      document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay open" id="${modalId}Error">
          <div class="modal" style="max-width:360px;text-align:center">
            <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
            <h3 style="margin-bottom:8px">Error</h3>
            <p class="subtitle">Error de conexión</p>
            <div class="modal-footer" style="justify-content:center">
              <button class="btn btn-secondary" onclick="document.getElementById('${modalId}Error')?.remove()">Aceptar</button>
            </div>
          </div>
        </div>
      `);
    }
  };
}

const TABLAS_LABEL = {
  organizaciones: 'Organizaciones', directivas: 'Directivas',
  cargos_directiva: 'Cargos', documentos: 'Documentos',
  proyectos: 'Subvenciones', documentos_proyecto: 'Docs. Subvención',
  usuarios: 'Usuarios', historial: 'Historial',
};
const ACCION_STYLE = {
  crear:    { label:'Crear',    color:'#22c55e' },
  editar:   { label:'Editar',   color:'#3b82f6' },
  eliminar: { label:'Eliminar', color:'#ef4444' },
};

let _histPage = 1;
let _histFilters = {};

async function renderHistorial(main) {
  main.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">Historial de acciones</h2>
      <p class="subtitle">Registro de todas las operaciones realizadas en el sistema</p></div>
    </div>
    <div class="table-toolbar" style="flex-wrap:wrap;gap:8px">
      <select id="hFiltTabla"   class="filter-select" onchange="applyHistFiltros()">
        <option value="">Todos los módulos</option>
        ${Object.entries(TABLAS_LABEL).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
      </select>
      <select id="hFiltAccion" class="filter-select" onchange="applyHistFiltros()">
        <option value="">Todas las acciones</option>
        <option value="crear">Crear</option>
        <option value="editar">Editar</option>
        <option value="eliminar">Eliminar</option>
      </select>
      <select id="hFiltUsuario" class="filter-select" onchange="applyHistFiltros()">
        <option value="">Todos los usuarios</option>
      </select>
      <input type="date" id="hFiltDesde" class="filter-select" onchange="applyHistFiltros()" title="Desde"/>
      <input type="date" id="hFiltHasta" class="filter-select" onchange="applyHistFiltros()" title="Hasta"/>
      <button class="btn btn-ghost btn-sm" onclick="clearHistFiltros()">Limpiar filtros</button>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Fecha y hora</th><th>Usuario</th><th>Módulo</th>
          <th>Acción</th><th>Descripción</th>
        </tr></thead>
        <tbody id="histBody"><tr><td colspan="5" class="empty-cell">
          <div class="spinner" style="margin:0 auto"></div>
        </td></tr></tbody>
      </table>
    </div>
    <div id="histPager" style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;font-size:.85rem;color:var(--muted)"></div>`;

  // Agregar event listeners para limpiar valores no válidos
  const desdeEl = document.getElementById('hFiltDesde');
  const hastaEl = document.getElementById('hFiltHasta');
  
  if (desdeEl) {
    desdeEl.addEventListener('input', function() {
      if (!isValidDate(this.value)) {
        this.value = '';
      }
    });
  }
  
  if (hastaEl) {
    hastaEl.addEventListener('input', function() {
      if (!isValidDate(this.value)) {
        this.value = '';
      }
    });
  }

  _histPage = 1;
  _histFilters = {};
  await loadHistorial();
}

async function loadHistorial() {
  const params = new URLSearchParams({
    page: _histPage, per_page: 50,
    ..._histFilters,
  });
  const r = await fetch(API + '/historial.php?' + params).then(r=>r.json()).catch(()=>({ok:false}));
  if (!r.ok) { 
    const errorMsg = r.error && r.error.includes('rol administrador') ? r.error : 'Error al cargar.';
    document.getElementById('histBody').innerHTML = `<tr><td colspan="5" class="empty-cell">${errorMsg}</td></tr>`; 
    return; 
  }

  // Poblar select de usuarios la primera vez
  const selUsr = document.getElementById('hFiltUsuario');
  if (selUsr && selUsr.options.length === 1 && r.usuarios?.length) {
    r.usuarios.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.nombre_completo || u.username;
      selUsr.appendChild(opt);
    });
  }

  renderHistRows(r.data);
  renderHistPager(r.page, r.pages, r.total);
}

function renderHistRows(rows) {
  const tbody = document.getElementById('histBody');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">No hay registros con los filtros aplicados.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(h => {
    const ac = ACCION_STYLE[h.accion] || { label: h.accion, color: '#6b7280' };
    const tbl = TABLAS_LABEL[h.tabla] || h.tabla;
    const usr = h.usuario_nombre || h.usuario_username || '—';
    const fecha = h.created_at ? h.created_at.replace('T',' ').substring(0,16) : '—';
    return `<tr>
      <td class="muted" style="white-space:nowrap;font-size:.82rem">${escHtml(fecha)}</td>
      <td>${escHtml(usr)}</td>
      <td class="muted">${escHtml(tbl)}</td>
      <td><span class="status-badge" style="background:${ac.color}22;color:${ac.color};border:1px solid ${ac.color}44">${ac.label}</span></td>
      <td class="muted" style="font-size:.85rem">${escHtml(h.descripcion||'—')}</td>
    </tr>`;
  }).join('');
}

function renderHistPager(page, pages, total) {
  const el = document.getElementById('histPager');
  if (!el) return;
  if (pages <= 1) { el.innerHTML = `<span>${total} registro${total!==1?'s':''}</span>`; return; }
  el.innerHTML = `
    <span>${total} registros</span>
    <div style="display:flex;gap:6px;align-items:center">
      <button class="btn btn-ghost btn-sm" onclick="goHistPage(${page-1})" ${page<=1?'disabled':''}>‹ Anterior</button>
      <span>Página ${page} de ${pages}</span>
      <button class="btn btn-ghost btn-sm" onclick="goHistPage(${page+1})" ${page>=pages?'disabled':''}>Siguiente ›</button>
    </div>`;
}

function applyHistFiltros() {
  _histFilters = {};
  const tabla   = document.getElementById('hFiltTabla')?.value;
  const accion  = document.getElementById('hFiltAccion')?.value;
  const usuario = document.getElementById('hFiltUsuario')?.value;
  const desde   = document.getElementById('hFiltDesde')?.value;
  const hasta   = document.getElementById('hFiltHasta')?.value;
  
  // Validar que los valores de fecha sean válidos
  const desdeVal = desde && isValidDate(desde) ? desde : '';
  const hastaVal = hasta && isValidDate(hasta) ? hasta : '';
  
  if (tabla)   _histFilters.tabla      = tabla;
  if (accion)  _histFilters.accion     = accion;
  if (usuario) _histFilters.usuario_id = usuario;
  if (desdeVal) _histFilters.desde      = desdeVal;
  if (hastaVal) _histFilters.hasta      = hastaVal;
  
  _histPage = 1;
  loadHistorial();
}

// Función para validar fecha
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
}

function clearHistFiltros() {
  ['hFiltTabla','hFiltAccion','hFiltUsuario','hFiltDesde','hFiltHasta']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  _histFilters = {};
  _histPage = 1;
  loadHistorial();
}

function goHistPage(page) {
  _histPage = page;
  loadHistorial();
}

async function renderAccesos(main) {
  main.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">Registro de accesos</h2>
      <p class="subtitle">Historial de ingresos al sistema y intentos fallidos</p></div>
    </div>
    <div class="table-toolbar">
      <button class="btn btn-primary btn-sm" id="btnModoAccesos" onclick="toggleModoAccesos(false)">Accesos exitosos</button>
      <button class="btn btn-ghost btn-sm"   id="btnModoFallidos" onclick="toggleModoAccesos(true)">Intentos fallidos</button>
      <button class="btn btn-secondary btn-sm" id="btnDesbloquear" onclick="desbloquearTodasIPs()" style="display:none;margin-left:auto">Desbloquear todas las IPs</button>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Fecha y hora</th><th>Usuario</th><th>IP</th>
          <th>Navegador</th><th>SO</th><th>Dispositivo</th><th>Duración</th>
        </tr></thead>
        <tbody id="accesosBody"><tr><td colspan="7" class="empty-cell">
          <div class="spinner" style="margin:0 auto"></div>
        </td></tr></tbody>
      </table>
    </div>
    <div id="accesosPager" style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;font-size:.85rem;color:var(--muted)"></div>`;

  window._accesosFallidos = false;
  window._accesosPage = 1;
  await loadAccesos();
}

async function toggleModoAccesos(fallidos) {
  window._accesosFallidos = fallidos;
  window._accesosPage = 1;
  document.getElementById('btnModoAccesos').className  = fallidos ? 'btn btn-ghost btn-sm'   : 'btn btn-primary btn-sm';
  document.getElementById('btnModoFallidos').className = fallidos ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm';
  document.getElementById('btnDesbloquear').style.display = fallidos ? 'inline-block' : 'none';
  await loadAccesos();
}

async function desbloquearTodasIPs() {
  const modalId = 'modalConfirmUnblockIP';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();
  
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="${modalId}" onclick="if(event.target.id==='${modalId}')document.getElementById('${modalId}')?.remove()">
      <div class="modal" style="max-width:360px;text-align:center">
        <div style="font-size:2.5rem;margin-bottom:12px">🔓</div>
        <h3 style="margin-bottom:8px">¿Desbloquear todas las IPs?</h3>
        <p class="subtitle" style="margin-bottom:20px">¿Estás seguro de desbloquear todas las direcciones IP bloqueadas?</p>
        <div class="modal-footer" style="justify-content:center;gap:12px">
          <button class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancelar</button>
          <button class="btn btn-primary" id="${modalId}Btn">Sí, desbloquear</button>
        </div>
      </div>
    </div>
  `);
  
  document.getElementById(`${modalId}Btn`).onclick = async () => {
    document.getElementById(modalId)?.remove();
    const r = await fetch(API+'/accesos.php?action=unblock', {method:'POST'}).then(r=>r.json()).catch(()=>({ok:false}));
    if (r.ok) {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay open" id="${modalId}Success">
          <div class="modal" style="max-width:360px;text-align:center">
            <div style="font-size:2rem;margin-bottom:12px">✅</div>
            <h3 style="margin-bottom:8px">Éxito</h3>
            <p class="subtitle">Todas las IPs han sido desbloqueadas</p>
            <div class="modal-footer" style="justify-content:center">
              <button class="btn btn-secondary" onclick="document.getElementById('${modalId}Success')?.remove()">Aceptar</button>
            </div>
          </div>
        </div>
      `);
      await loadAccesos();
    } else {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay open" id="${modalId}Error">
          <div class="modal" style="max-width:360px;text-align:center">
            <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
            <h3 style="margin-bottom:8px">Error</h3>
            <p class="subtitle">${r.error || 'Error al desbloquear'}</p>
            <div class="modal-footer" style="justify-content:center">
              <button class="btn btn-secondary" onclick="document.getElementById('${modalId}Error')?.remove()">Aceptar</button>
            </div>
          </div>
        </div>
      `);
    }
  };
}

async function loadAccesos() {
  const params = new URLSearchParams({ page: window._accesosPage, fallidos: window._accesosFallidos ? 1 : 0 });
  const r = await fetch(API+'/accesos.php?'+params).then(r=>r.json()).catch(()=>({ok:false}));
  if (!r.ok) {
    const tbody = document.getElementById('accesosBody');
    if (tbody) {
      const errorMsg = r.error && r.error.includes('rol administrador') ? r.error : 'Error al cargar accesos.';
      tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">${errorMsg}</td></tr>`;
    }
    return;
  }

  const tbody = document.getElementById('accesosBody');
  if (!tbody) return;

  if (!r.data.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-cell">Sin registros.</td></tr>`;
  } else {
    tbody.innerHTML = r.data.map(a => {
      const dur = a.duracion_seg ? fmtDuracion(a.duracion_seg) : '—';
      const exito = a.exito == 1;
      return `<tr>
        <td class="muted" style="font-size:.82rem;white-space:nowrap">${escHtml(a.login_at?.substring(0,16)||'—')}</td>
        <td>${escHtml(a.username)}</td>
        <td class="muted" style="font-size:.82rem">${escHtml(a.ip||'—')}</td>
        <td class="muted">${escHtml(a.navegador||'—')}</td>
        <td class="muted">${escHtml(a.so||'—')}</td>
        <td class="muted">${escHtml(a.dispositivo||'—')}</td>
        <td class="muted">${exito ? dur : '<span style="color:#ef4444;font-size:.8rem">Fallido</span>'}</td>
      </tr>`;
    }).join('');
  }

  // Paginador
  const el = document.getElementById('accesosPager');
  if (el) {
    const { page, pages, total } = r;
    el.innerHTML = pages <= 1
      ? `<span>${total} registro${total!==1?'s':''}</span>`
      : `<span>${total} registros</span>
         <div style="display:flex;gap:6px;align-items:center">
           <button class="btn btn-ghost btn-sm" onclick="goAccesosPage(${page-1})" ${page<=1?'disabled':''}>‹ Anterior</button>
           <span>Página ${page} de ${pages}</span>
           <button class="btn btn-ghost btn-sm" onclick="goAccesosPage(${page+1})" ${page>=pages?'disabled':''}>Siguiente ›</button>
         </div>`;
  }
}

function goAccesosPage(p) { window._accesosPage = p; loadAccesos(); }
function fmtDuracion(seg) {
  if (seg < 60)   return seg + 's';
  if (seg < 3600) return Math.floor(seg/60) + 'min ' + (seg%60) + 's';
  return Math.floor(seg/3600) + 'h ' + Math.floor((seg%3600)/60) + 'min';
}

function fmtBytes(b) {
  if (!b) return '0 B';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}

async function renderBackups(main) {
  main.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">Backups</h2>
      <p class="subtitle">Copia de seguridad de la base de datos y archivos subidos. Se conservan los últimos 10.</p></div>
      <button class="btn btn-primary" id="btnCrearBackup" onclick="crearBackup()">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
        Crear backup ahora
      </button>
    </div>
    <div id="backupMsg"></div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Archivo</th><th>Fecha</th><th>Tamaño</th><th></th></tr></thead>
        <tbody id="backupBody"><tr><td colspan="4" class="empty-cell">
          <div class="spinner" style="margin:0 auto"></div>
        </td></tr></tbody>
      </table>
    </div>
    <p class="muted" style="font-size:.78rem;margin-top:12px;padding:0 4px">
      Cada backup contiene la base de datos completa y todos los archivos subidos, comprimidos en un ZIP.<br>
      Para restaurar: detén Apache, reemplaza <code style="font-family:monospace">munidb.db</code> con el archivo del backup y reinicia.
    </p>`;
  await loadBackups();
}

async function loadBackups() {
  if (!document.getElementById('backupBody')) return;
  const r = await fetch(API+'/backups.php?action=list&_='+Date.now()).then(r=>r.json()).catch(()=>({ok:false}));
  const tbody = document.getElementById('backupBody');
  if (!tbody) return;
  if (!r.ok || !r.data.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-cell">No hay backups disponibles. Crea el primero.</td></tr>`;
    return;
  }
  tbody.innerHTML = r.data.map(b => `<tr>
    <td><strong style="font-size:.85rem;font-family:monospace">${escHtml(b.nombre)}</strong></td>
    <td class="muted">${escHtml(b.fecha)}</td>
    <td class="muted">${fmtBytes(b.tamanio)}</td>
    <td class="actions">
      <a class="btn btn-ghost btn-sm" href="${AUTH.apiBase}/backups.php?action=descargar&nombre=${encodeURIComponent(b.nombre)}" download>Descargar</a>
      <button class="btn btn-ghost btn-sm text-danger" onclick="eliminarBackup('${escHtml(b.nombre)}')">Eliminar</button>
    </td>
  </tr>`).join('');
}

async function crearBackup() {
  const btn = document.getElementById('btnCrearBackup');
  btn.disabled = true; btn.textContent = 'Creando…';
  const msg = document.getElementById('backupMsg');
  const r = await fetch(API+'/backups.php?action=crear',{method:'POST'}).then(r=>r.json()).catch(()=>({ok:false}));
  btn.disabled = false; btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg> Crear backup ahora`;
  if (r.ok) {
    msg.innerHTML = `<div class="alert alert--success show" style="margin-bottom:12px"><span>✅ Backup creado: ${escHtml(r.nombre)} (${fmtBytes(r.tamanio)})</span></div>`;
    await loadBackups();
    setTimeout(()=>{ if(msg) msg.innerHTML=''; }, 5000);
  } else {
    msg.innerHTML = `<div class="alert alert--error show" style="margin-bottom:12px"><span>${escHtml(r.error||'Error al crear backup.')}</span></div>`;
  }
}

async function eliminarBackup(nombre) {
  const modalId = 'modalConfirmDelBackup';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();
  
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="${modalId}" onclick="if(event.target.id==='${modalId}')document.getElementById('${modalId}')?.remove()">
      <div class="modal" style="max-width:360px;text-align:center">
        <div style="font-size:2.5rem;margin-bottom:12px">🗑️</div>
        <h3 style="margin-bottom:8px">¿Eliminar backup?</h3>
        <p class="subtitle" style="margin-bottom:20px">¿Estás seguro de eliminar el backup <strong>${escHtml(nombre)}</strong>?</p>
        <div class="modal-footer" style="justify-content:center;gap:12px">
          <button class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancelar</button>
          <button class="btn btn-danger" id="${modalId}Btn">Sí, eliminar</button>
        </div>
      </div>
    </div>
  `);
  
  document.getElementById(`${modalId}Btn`).onclick = async () => {
    document.getElementById(modalId)?.remove();
    const r = await fetch(API+'/backups.php?nombre='+encodeURIComponent(nombre),{method:'DELETE'}).then(r=>r.json()).catch(()=>({ok:false}));
    if (r.ok) await loadBackups();
    else {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay open" id="${modalId}Error">
          <div class="modal" style="max-width:360px;text-align:center">
            <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
            <h3 style="margin-bottom:8px">Error</h3>
            <p class="subtitle">${r.error || 'Error al eliminar'}</p>
            <div class="modal-footer" style="justify-content:center">
              <button class="btn btn-secondary" onclick="document.getElementById('${modalId}Error')?.remove()">Aceptar</button>
            </div>
          </div>
        </div>
      `);
    }
  };
}

function renderImportar(main) {
  main.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">Importar Documento</h2>
      <p class="subtitle">Carga masiva de organizaciones y directivos</p></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div class="stat-card" style="padding:20px">
        <div style="font-size:.95rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:14px">Organizaciones — Formato esperado</div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:.95rem">
            <thead><tr style="background:rgba(201,168,76,.1)">
              ${['Nº','NOMBRE ORGANIZACIÓN','REPRESENTANTE LEGAL','MAIL','DIRECCIÓN','Nº SOCIOS','U.V.','FONO','VIGENCIA','ESTADO DIRECTIVA','FECHA PJ','TIPO DE ORG.']
                .map(h=>`<th style="padding:6px 8px;text-align:left;color:var(--gold);white-space:nowrap;border-bottom:1px solid rgba(255,255,255,.08)">${escHtml(h)}</th>`).join('')}
            </tr></thead>
            <tbody><tr style="opacity:.6">
              ${['1','Nombre organización','Juan Pérez','correo@mail.cl','Calle 123','50','3','9-12345','15/07/2028','vigente','26/08/1992','DEPORTIVA']
                .map(v=>`<td style="padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.04);white-space:nowrap;font-size:.85rem">${escHtml(v)}</td>`).join('')}
            </tr></tbody>
          </table>
        </div>
        <p class="muted" style="font-size:.95rem;margin-top:10px;line-height:1.6">
          • Si la organización ya existe por nombre, se <strong style="color:var(--gold)">actualiza</strong>.<br>
          • Si no existe, se <strong style="color:#6fcf97">crea</strong> como nueva organización activa.<br>
          • La columna RUT no está en este formato — se puede agregar manualmente después.
        </p>
      </div>

      <div class="stat-card" style="padding:20px">
        <div style="font-size:.95rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:14px">Subir archivo</div>
        <div id="importDropZone" style="border:2px dashed rgba(201,168,76,.3);border-radius:10px;padding:32px;text-align:center;cursor:pointer;transition:border-color .2s"
          onclick="document.getElementById('importFile').click()"
          ondragover="event.preventDefault();this.style.borderColor='#c9a84c'"
          ondragleave="this.style.borderColor='rgba(201,168,76,.3)'"
          ondrop="handleImportDrop(event)">
          <div style="font-size:2.5rem;margin-bottom:8px">📊</div>
          <div style="color:var(--gold);font-weight:600;margin-bottom:4px;font-size:1.05rem">Haz clic o arrastra el archivo aquí</div>

          <div id="importFileName" style="margin-top:10px;font-size:.95rem;color:var(--gold)"></div>
        </div>
        <input type="file" id="importFile" accept=".xlsx,.xls,.csv,.xlsm,.xlsb,.xltx,.xltm" style="display:none" onchange="onImportFileChange(this)"/>
        <div id="importErr" class="alert alert--error" style="margin-top:12px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg><span></span></div>
        <div style="margin-top:14px">
          <button class="btn btn-primary" id="btnImportar" onclick="ejecutarImportacion()" disabled style="width:100%">
            <span id="btnImportarTxt">Importar organizaciones</span>
            <div class="spinner" id="spinImportar" style="display:none"></div>
          </button>
        </div>
      </div>
    </div>

    <div id="importResultado" style="display:none" class="stat-card" style="padding:20px"></div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
      <div class="stat-card" style="padding:20px">
        <div style="font-size:.95rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:14px">Directivos — Formato esperado</div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:.95rem">
            <thead><tr style="background:rgba(201,168,76,.1)">
              ${['Nº','NOMBRE PJ','CARGO','NOMBRE','CORREO','COMUNA','DIRECCIÓN','TELÉFONO','VIGENCIA','SEDE','URB/RUR','U.V.','SOCIOS','FECHA PJ','ESTADO','TIPO']
                .map(h=>'<th style="padding:6px 8px;text-align:left;color:var(--gold);white-space:nowrap;border-bottom:1px solid rgba(255,255,255,.08)">'+escHtml(h)+'</th>').join('')}
            </tr></thead>
            <tbody><tr style="opacity:.6">
              ${['1','JUNTA DE VECINOS EJEMPLO','PRESIDENTE','JUAN PÉREZ','correo@ejemplo.cl','PUCÓN','CALLE 123','912345678','15/10/2025','NO TIENE','UR','1','50','27/02/1990','VENCIDA','JUNTA DE VECINOS']
                .map(v=>'<td style="padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.04);white-space:nowrap;font-size:.85rem">'+escHtml(v)+'</td>').join('')}
            </tr></tbody>
          </table>
        </div>
        <p class="muted" style="font-size:.95rem;margin-top:10px;line-height:1.6">
          • Una fila con número en col A inicia una organización, seguida de filas de miembros sin número.<br>
          • El sistema asocia cada directivo a la organización por nombre.
        </p>
      </div>
      <div class="stat-card" style="padding:20px">
        <div style="font-size:.95rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:14px">Subir archivo</div>
        <div id="importDirDropZone" style="border:2px dashed rgba(201,168,76,.3);border-radius:10px;padding:32px;text-align:center;cursor:pointer;transition:border-color .2s"
          onclick="document.getElementById('importDirFile2').click()"
          ondragover="event.preventDefault();this.style.borderColor='#c9a84c'"
          ondragleave="this.style.borderColor='rgba(201,168,76,.3)'"
          ondrop="handleImportDirDrop(event)">
          <div style="font-size:2.5rem;margin-bottom:8px">👥</div>
          <div style="color:var(--gold);font-weight:600;margin-bottom:4px;font-size:1.05rem">Haz clic o arrastra el archivo aquí</div>
          <div id="importDirFileName" style="margin-top:10px;font-size:.95rem;color:var(--gold)"></div>
        </div>
        <input type="file" id="importDirFile2" accept=".xlsx,.xls,.csv,.xlsm,.xlsb,.xltx,.xltm" style="display:none" onchange="onImportDirFileChange(this)"/>
        <div id="importDirErr2" class="alert alert--error" style="margin-top:12px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg><span></span></div>
        <div style="margin-top:14px">
          <button class="btn btn-primary" id="btnImportDir2" onclick="ejecutarImportDirDesdeImportar()" disabled style="width:100%">
            <span id="btnImportDir2Txt">Importar directivos</span>
            <div class="spinner" id="spinImportDir2" style="display:none"></div>
          </button>
        </div>
      </div>
    </div>
    <div id="importDirRes2" style="display:none;margin-top:16px"></div>`;
}

async function cargarSheetJS() {
  if (window.XLSX) return;
  await new Promise((res,rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

async function leerExcelJS(file) {
  await cargarSheetJS();
  return new Promise((res,rej) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        // Intentar diferentes métodos de lectura para máxima compatibilidad
        let wb;
        const data = e.target.result;
        
        // Método 1: binary string (compatible con .xls y .xlsx)
        try {
          wb = XLSX.read(data, {type:'binary', cellDates:false, raw:true});
        } catch(e1) {
          // Método 2: array buffer (más robusto para .xlsx)
          try {
            const arrayBuffer = new ArrayBuffer(data.length);
            const view = new Uint8Array(arrayBuffer);
            for (let i = 0; i < data.length; i++) {
              view[i] = data.charCodeAt(i) & 0xFF;
            }
            wb = XLSX.read(arrayBuffer, {type:'array', cellDates:false, raw:true});
          } catch(e2) {
            // Método 3: base64 (fallback)
            try {
              const base64 = btoa(data);
              wb = XLSX.read(base64, {type:'base64', cellDates:false, raw:true});
            } catch(e3) {
              throw new Error('No se pudo leer el archivo Excel con ningún método');
            }
          }
        }
        
        // Obtener la primera hoja (o la hoja con más datos)
        let ws = null;
        let maxRows = 0;
        
        for (const sheetName of wb.SheetNames) {
          const sheet = wb.Sheets[sheetName];
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
          const rows = range.e.r - range.s.r + 1;
          
          if (rows > maxRows) {
            maxRows = rows;
            ws = sheet;
          }
        }
        
        if (!ws) {
          throw new Error('No se encontró ninguna hoja con datos');
        }
        
        // Convertir a array con opciones mejoradas
        const rows = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: null,
          raw: true,
          dateNF: 'yyyy-mm-dd' // Formato de fecha consistente
        });
        
        // Filtrar filas vacías y procesar valores
        const processedRows = rows
          .filter(row => row && row.some(v => v !== null && v !== '' && v !== undefined))
          .map(row => row.map(cell => {
            // Limpiar celdas
            if (cell === null || cell === undefined || cell === '') return null;
            
            // Convertir números
            if (typeof cell === 'number') {
              // Manejar fechas de Excel
              if (cell > 25569 && cell < 2958465) { // Rango de fechas Excel válidas
                return new Date((cell - 25569) * 86400 * 1000).toISOString().split('T')[0];
              }
              return cell.toString();
            }
            
            // Limpiar strings
            if (typeof cell === 'string') {
              return cell.trim();
            }
            
            return cell;
          }));
        
        res(processedRows);
      } catch(err) { rej(err); }
    };
    reader.onerror = rej;
    reader.readAsBinaryString(file);
  });
}

async function leerCSV(file) {
  return new Promise((res,rej) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        let text = e.target.result;
        
        // Detectar y normalizar saltos de línea
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Detectar delimitador automático
        const firstLine = text.split('\n')[0] || '';
        let delimiter = ';';
        
        if (firstLine.includes(',')) {
          delimiter = ',';
        } else if (firstLine.includes('\t')) {
          delimiter = '\t';
        } else if (firstLine.includes('|')) {
          delimiter = '|';
        }
        
        // Dividir en líneas y filtrar vacías
        const lines = text.split('\n').filter(line => line.trim());
        
        // Procesar cada línea con manejo de comillas
        const rows = lines.map((line, index) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          let i = 0;
          
          while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
              if (inQuotes && nextChar === '"') {
                // Comilla escapada
                current += '"';
                i += 2;
              } else {
                // Inicio/fin de comillas
                inQuotes = !inQuotes;
                i++;
              }
            } else if (char === delimiter && !inQuotes) {
              // Fin de campo
              result.push(current.trim());
              current = '';
              i++;
            } else {
              current += char;
              i++;
            }
          }
          
          // Agregar el último campo
          result.push(current.trim());
          
          // Limpiar campos: remover comillas y manejar valores vacíos
          return result.map(cell => {
            if (cell === '') return null;
            
            // Remover comillas externas si existen
            if (cell.startsWith('"') && cell.endsWith('"')) {
              cell = cell.slice(1, -1);
            }
            
            // Limpiar espacios extra
            cell = cell.trim();
            
            return cell === '' ? null : cell;
          });
        });
        
        // Quitar encabezado y filtrar filas vacías
        rows.shift();
        const filteredRows = rows.filter(row => 
          row && row.some(v => v !== null && v !== '' && v !== undefined)
        );
        
        res(filteredRows);
      } catch(err) { 
        rej(new Error('Error procesando CSV: ' + err.message)); 
      }
    };
    reader.onerror = () => rej(new Error('Error leyendo el archivo'));
    
    // Intentar leer con diferentes codificaciones
    try {
      reader.readAsText(file, 'UTF-8');
    } catch (e) {
      try {
        reader.readAsText(file, 'ISO-8859-1');
      } catch (e2) {
        reader.readAsText(file);
      }
    }
  });
}

function setImportFile(inputId, fileNameId, btnId, file) {
  if (!file) return;
  // Soporte extendido para más formatos
  const validFormats = /\.xlsx?$|\.csv$|\.xlsm$|\.xlsb$|\.xltx$|\.xltm$/i;
  if (!file.name.match(validFormats)) {
    showAlert(inputId==='importFile'?'importErr':'importDirErr2','Formato no compatible. Use Excel (.xlsx, .xls, .xlsm) o CSV (.csv).'); 
    return;
  }
  document.getElementById(fileNameId).textContent = '?? ' + file.name;
  document.getElementById(btnId).disabled = false;
}

function detectarTipoExcel(encabezados) {
  // Normalizar y limpiar
  const cols = encabezados.map(c => {
    if (!c) return '';
    const cleaned = c.toString().trim().toUpperCase();
    // Remover caracteres especiales y normalizar
    return cleaned.replace(/[^\w\sÁÉÍÓÚÑÜ]/g, ' ').replace(/\s+/g, ' ').trim();
  });
  
  // Columnas exclusivas de DIRECTIVOS (más flexible)
  const directivosKeywords = [
    'CARGO', 'PRESIDENTE', 'SECRETARIO', 'TESORERO', 'DIRECTOR', 'NOMBRE PJ', 
    'NOMBRE DE LA PJ', 'DIRECTIVO', 'MIEMBRO', 'INTEGRANTE'
  ];
  const tieneCargoDir = cols.some(c => directivosKeywords.some(keyword => c.includes(keyword)));
  
  // Columnas exclusivas de ORGANIZACIONES (más flexible)
  const organizacionesKeywords = [
    'NOMBRE ORGANIZACION', 'NOMBRE DE LA ORGANIZACION', 'ORGANIZACIÓN',
    'REPRESENTANTE LEGAL', 'RUT', 'ROL UNICO TRIBUTARIO', 'NUMERO SOCIOS',
    'DIRECCION', 'TELEFONO', 'CORREO', 'TIPO ORGANIZACION'
  ];
  const tieneNombreOrg = cols.some(c => organizacionesKeywords.some(keyword => c.includes(keyword)));
  
  // Heurística mejorada - dar prioridad a organizaciones con indicadores claros
  const pjCount = cols.filter(c => c.includes('PJ')).length;
  const orgCount = cols.filter(c => c.includes('ORG') || c.includes('SOCIO')).length;
  
  // Indicadores fuertes de organizaciones
  const hasOrgIndicators = cols.some(c => c.includes('REPRESENTANTE')) || 
                           cols.some(c => c.includes('SOCIOS')) ||
                           cols.some(c => c.includes('DIRECCION')) ||
                           cols.some(c => c.includes('RUT'));
  
  // Si tiene indicadores fuertes de organización, es organización
  if (hasOrgIndicators && tieneNombreOrg) return 'organizaciones';
  
  // Si tiene cargo de directivo y no tiene indicadores de organización, es directivo
  if (tieneCargoDir && !hasOrgIndicators) return 'directivos';
  
  // Heurística por conteo
  if (tieneNombreOrg || orgCount >= 2) return 'organizaciones';
  if (tieneCargoDir || pjCount >= 2) return 'directivos';
  
  // Último intento: buscar patrones específicos
  const hasDirectivoPattern = cols.some(c => 
    c.includes('PRESIDENTE') || c.includes('SECRETARIO') || c.includes('TESORERO')
  );
  const hasOrgPattern = cols.some(c => 
    c.includes('RUT') || c.includes('REPRESENTANTE')
  );
  
  if (hasDirectivoPattern) return 'directivos';
  if (hasOrgPattern) return 'organizaciones';
  
  return 'desconocido';
}

function validarTipoArchivo(encabezados, tipoEsperado, errId) {
  const detectado = detectarTipoExcel(encabezados);
  if (detectado === 'desconocido') {
    showAlert(errId, 'No se reconoce el formato del archivo. Verifica que sea el archivo correcto.');
    return false;
  }
  if (detectado !== tipoEsperado) {
    const labels = {organizaciones: 'organizaciones', directivos: 'directivos'};
    showAlert(errId, `Este archivo parece ser de ${labels[detectado]}, no de ${labels[tipoEsperado]}. Sube el archivo correcto.`);
    return false;
  }
  return true;
}

async function leerExcelJSConCab(file) {
  await cargarSheetJS();
  return new Promise((res,rej) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        // Usar la misma lógica de lectura múltiple que leerExcelJS
        let wb;
        const data = e.target.result;
        
        try {
          wb = XLSX.read(data, {type:'binary', cellDates:false, raw:true});
        } catch(e1) {
          try {
            const arrayBuffer = new ArrayBuffer(data.length);
            const view = new Uint8Array(arrayBuffer);
            for (let i = 0; i < data.length; i++) {
              view[i] = data.charCodeAt(i) & 0xFF;
            }
            wb = XLSX.read(arrayBuffer, {type:'array', cellDates:false, raw:true});
          } catch(e2) {
            try {
              const base64 = btoa(data);
              wb = XLSX.read(base64, {type:'base64', cellDates:false, raw:true});
            } catch(e3) {
              throw new Error('No se pudo leer el archivo Excel con ningún método');
            }
          }
        }
        
        // Obtener la primera hoja (o la hoja con más datos)
        let ws = null;
        let maxRows = 0;
        
        for (const sheetName of wb.SheetNames) {
          const sheet = wb.Sheets[sheetName];
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
          const rows = range.e.r - range.s.r + 1;
          
          if (rows > maxRows) {
            maxRows = rows;
            ws = sheet;
          }
        }
        
        if (!ws) {
          throw new Error('No se encontró ninguna hoja con datos');
        }
        
        // Convertir a array manteniendo encabezados
        const rows = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: null,
          raw: true,
          dateNF: 'yyyy-mm-dd'
        });
        
        res(rows);
      } catch(err) { rej(err); }
    };
    reader.onerror = rej;
    reader.readAsBinaryString(file);
  });
}

function mostrarResultado(r, labelCreados, labelActualizados, tipo) {
  return `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:${r.errores?.length?'12px':'0'}">
      <div style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.2);border-radius:8px;padding:12px 20px;text-align:center;flex:1">
        <div style="font-size:1.8rem;font-weight:700;color:#22c55e">${r.insertados}</div>
        <div class="muted" style="font-size:.95rem">${labelCreados}</div>
      </div>
      <div style="background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);border-radius:8px;padding:12px 20px;text-align:center;flex:1">
        <div style="font-size:1.8rem;font-weight:700;color:#3b82f6">${r.actualizados}</div>
        <div class="muted" style="font-size:.95rem">${labelActualizados}</div>
      </div>
      ${r.errores?.length ? `<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:12px 20px;text-align:center;flex:1">
        <div style="font-size:1.8rem;font-weight:700;color:#ef4444">${r.errores.length}</div>
        <div class="muted" style="font-size:.95rem">Errores</div>
      </div>` : ''}
    </div>
    ${tipo==='organizaciones' && r.insertados>0 ? `<div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);border-radius:8px;padding:10px 14px;font-size:.95rem;color:#c9a84c;margin-bottom:10px">
      ⚠️ RUTs pendientes: las organizaciones nuevas tienen RUT temporal. Actualízalos manualmente.
    </div>` : ''}
    ${r.errores?.length ? `<details style="margin-bottom:10px"><summary style="cursor:pointer;font-size:.95rem;color:var(--muted)">Ver ${r.errores.length} error${r.errores.length>1?'es':''}</summary>
      <div style="font-size:.95rem;color:var(--muted);margin-top:6px;max-height:160px;overflow-y:auto">${r.errores.map(e=>`<div style="padding:2px 0;border-bottom:1px solid rgba(255,255,255,.04)">${escHtml(e)}</div>`).join('')}</div>
    </details>` : ''}
    ${r.puede_deshacer ? `<button class="btn btn-ghost btn-sm" style="color:#ef4444" onclick="deshacerImportacion('${r.import_id}','${tipo}')">
      ↩ Deshacer esta importación (${r.insertados} ${tipo==='directivos'?'creados':'creadas'})
    </button>` : ''}
  `;
}

function onImportFileChange(input) {
  setImportFile('importFile','importFileName','btnImportar', input.files[0]);
  hideAlert('importErr');
}

function handleImportDrop(e) {
  if (e.target.id !== 'importDropZone' && !e.target.closest('#importDropZone')) return;
  e.preventDefault();
  document.getElementById('importDropZone').style.borderColor = 'rgba(201,168,76,.3)';
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const dt = new DataTransfer(); dt.items.add(file);
  document.getElementById('importFile').files = dt.files;
  onImportFileChange(document.getElementById('importFile'));
}

async function ejecutarImportacion() {
  const file = document.getElementById('importFile').files[0];
  if (!file) { showAlert('importErr','Selecciona un archivo primero.'); return; }

  const btn = document.getElementById('btnImportar');
  btn.disabled=true; document.getElementById('btnImportarTxt').style.display='none'; document.getElementById('spinImportar').style.display='block';
  hideAlert('importErr');

  let filas, r;
  try {
    // Detectar si es CSV o Excel
    if (file.name.match(/\.csv$/i)) {
      filas = await leerCSV(file);
    } else {
      filas = await leerExcelJS(file);
    }
  }
  catch(e) {
    showAlert('importErr','No se pudo leer el archivo: '+e.message);
    btn.disabled=false; document.getElementById('btnImportarTxt').style.display=''; document.getElementById('spinImportar').style.display='none';
    return;
  }

  const encabezados = filas[0] || [];
  let filasConCab;
  try {
    if (file.name.match(/\.csv$/i)) {
      // Para CSV, leer con encabezados
      const text = await new Promise(res => {
        const reader = new FileReader();
        reader.onload = e => res(e.target.result);
        reader.readAsText(file, 'UTF-8');
      });
      const lines = text.split('\n').filter(line => line.trim());
      filasConCab = lines.map(line => 
        line.split(';').map(cell => {
          cell = cell.trim();
          if (cell.startsWith('"') && cell.endsWith('"')) {
            cell = cell.slice(1, -1);
          }
          return cell === '' ? null : cell;
        })
      );
    } else {
      filasConCab = await leerExcelJSConCab(file);
    }
  } catch(e) {
    showAlert('importErr','No se pudo leer los encabezados: '+e.message);
    btn.disabled=false; document.getElementById('btnImportarTxt').style.display=''; document.getElementById('spinImportar').style.display='none';
    return;
  }
  if (!validarTipoArchivo(filasConCab[0] || [], 'organizaciones', 'importErr')) {
    btn.disabled=false; document.getElementById('btnImportarTxt').style.display=''; document.getElementById('spinImportar').style.display='none';
    return;
  }

  try {
    const resp = await fetch(API+'/importar_json.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo:'organizaciones',filas})});
    const text = await resp.text();
    try { r = JSON.parse(text); } catch(e) { r={ok:false,error:'Error del servidor: '+text.substring(0,200)}; }
  } catch(e) { r={ok:false,error:'Error de conexión: '+e.message}; }

  btn.disabled=false; document.getElementById('btnImportarTxt').style.display=''; document.getElementById('spinImportar').style.display='none';
  if (!r.ok) { showAlert('importErr', r.error||'Error al importar.'); return; }

  const res = document.getElementById('importResultado');
  res.style.display='block'; res.style.padding='20px';
  res.innerHTML = mostrarResultado(r, 'Organizaciones creadas', 'Organizaciones actualizadas', 'organizaciones');
  
  // Refrescar la lista de organizaciones si la página está activa
  const activeNav = document.querySelector('.nav-item.active');
  if (activeNav && activeNav.getAttribute('onclick')?.includes('organizaciones')) {
    // Limpiar caché y recargar
    window._orgsCache = null;
    const main = document.getElementById('mainContent');
    if (main && main.querySelector('#orgTbody')) {
      // Si estamos en la página de organizaciones, recargar la tabla
      const searchInput = document.getElementById('orgSearch');
      const estadoSelect = document.getElementById('orgFiltroEstado'); 
      const tipoSelect = document.getElementById('orgFiltroTipo');
      
      // Resetear filtros y recargar
      if (searchInput) searchInput.value = '';
      if (estadoSelect) estadoSelect.value = '';
      if (tipoSelect) tipoSelect.value = '';
      
      // Ejecutar la función de carga de organizaciones
      const loadOrgsEvent = new Event('change');
      if (estadoSelect) estadoSelect.dispatchEvent(loadOrgsEvent);
      
      // Mostrar notificación de actualización
      setTimeout(() => {
        const alerta = document.createElement('div');
        alerta.className = 'alert alert--success';
        alerta.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;min-width:250px;animation:slideIn 0.3s ease';
        alerta.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg><span>Lista de organizaciones actualizada</span>';
        document.body.appendChild(alerta);
        setTimeout(() => alerta.remove(), 3000);
      }, 500);
    }
  }
}

function syncOrgId(input, orgs) {
  if (!orgs || !orgs.length) orgs = window._orgsCache || [];
  const val = input.value.trim().toLowerCase();
  const match = orgs.find(o => o.nombre.trim().toLowerCase() === val);
  const hidden = document.getElementById('pfOrg');
  const lbl    = document.getElementById('pfOrgSel');
  if (match) {
    if (hidden) hidden.value = match.id;
    if (lbl)   lbl.innerHTML = '✔ ' + escHtml(match.nombre);
  } else {
    if (hidden) hidden.value = '';
    if (lbl)   lbl.innerHTML = val ? '<span style="color:#ef4444">No encontrada — verifica el nombre</span>' : '';
  }
}

let _dirAll = [], _dirPage = 1;
const DIR_PER = 50;

async function renderDirectivos(main) {
  main.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">Directivos</h2><p class="subtitle">Registro de directivos por organización</p></div>
      <div style="display:flex;gap:8px">
        ${currentUser.rol!=='consulta'?`

        <button class="btn btn-primary" onclick="abrirFormDirectivo()">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Nuevo directivo
        </button>`:''}
      </div>
    </div>
    <div class="table-toolbar" style="flex-wrap:wrap;gap:8px;align-items:center">
      <input class="search-input" id="dirSearch" placeholder="Buscar nombre o cargo…" oninput="filtrarDirectivos()" style="max-width:260px" autocomplete="search" name="dirsearch" readonly onfocus="this.removeAttribute('readonly')" onblur="this.setAttribute('readonly','readonly')"/>
      <div style="display:flex;gap:8px;align-items:center">
        <select id="dirFiltOrg" class="filter-select" onchange="filtrarDirectivos()" style="max-width:240px">
          <option value="">Todas las organizaciones</option>
        </select>
        <select id="dirFiltEstado" class="filter-select" onchange="filtrarDirectivos()">
          <option value="">Todos</option>
          <option value="vigente">Vigente</option>
          <option value="vencido">Vencido</option>
        </select>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr>
          <th>Nombre</th><th>Cargo</th><th>Organización</th>
          <th>Teléfono</th><th>Correo</th><th>Dirección</th>
          <th>Vencimiento</th><th>Estado</th><th></th>
        </tr></thead>
        <tbody id="dirBody"><tr><td colspan="9" class="empty-cell"><div class="spinner" style="margin:0 auto"></div></td></tr></tbody>
      </table>
    </div>
    <div id="dirPager" style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;font-size:.85rem;color:var(--muted)"></div>`;

  // Limpiar campo de búsqueda antes de cargar (evita autocompletado del navegador)
  const searchInput = document.getElementById('dirSearch');
  if (searchInput) searchInput.value = '';
  
  // Forzar limpieza después de que el navegador aplique autocompletado (Chrome)
  setTimeout(() => {
    const si = document.getElementById('dirSearch');
    if (si) si.value = '';
  }, 100);

  // Intentar cargar inmediatamente, si falla reintentar después
  try {
    await cargarDirectivos();
  } catch (e) {
    // Si falla, reintentar después de un pequeño retraso
    setTimeout(() => cargarDirectivos(), 100);
  }
}

async function cargarDirectivos() {
  // Verificar que los elementos existan antes de continuar
  const searchEl = document.getElementById('dirSearch');
  const orgEl = document.getElementById('dirFiltOrg');
  const estadoEl = document.getElementById('dirFiltEstado');
  
  if (!searchEl || !orgEl || !estadoEl) {
    setTimeout(() => cargarDirectivos(), 100);
    return;
  }
  
  const params = new URLSearchParams({action:'list'});
  const q     = searchEl.value||'';
  const org   = orgEl.value||'';
  const est   = estadoEl.value||'';
  if (q) params.append('search', q);
  if (org) params.append('org_id', org);
  if (est && est !== '') params.append('estado', est);
  
  const [dirs, orgs] = await Promise.all([
    fetch(API+'/directivos.php?'+params.toString()).then(r=>r.json()).catch(()=>({ok:false})),
    fetch(API+'/organizaciones.php?action=list').then(r=>r.json()).catch(()=>({ok:false})),
  ]);
  _dirAll = dirs.ok ? dirs.data.sort((a,b) => (a.nombre||'').localeCompare(b.nombre||'')) : [];

  // Poblar filtro de org
  const sel = document.getElementById('dirFiltOrg');
  if (sel && orgs.ok) {
    orgs.data.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.id; opt.textContent = o.nombre;
      sel.appendChild(opt);
    });
  }
  // No resetear _dirPage aquí para mantener la paginación actual
  renderDirTabla(_dirAll);
}

function filtrarDirectivos() {
  const q     = document.getElementById('dirSearch')?.value.toLowerCase()||'';
  const org   = document.getElementById('dirFiltOrg')?.value||'';
  const est   = document.getElementById('dirFiltEstado')?.value||'';
  
  // Si no hay filtros, cargar todos los datos
  if (!q && !org && !est) {
    cargarDirectivos();
    return;
  }
  
  // Filtrar datos locales si ya están cargados
  if (_dirAll.length > 0) {
    
    const lista = _dirAll.filter(d => {
      const matchSearch = !q || (d.nombre?.toLowerCase().includes(q) || d.cargo?.toLowerCase().includes(q));
      const matchOrg = !org || String(d.organizacion_id) === org;
      let matchEstado = true;
      
      if (est) {
        if (est === 'vigente') {
          // Incluir nuevos estados vigente y antiguos (Activo, Inactivo, etc.) según fecha
          const fechaValida = d.fecha_termino && !isNaN(new Date(d.fecha_termino).getTime());
          matchEstado = (d.estado === 'vigente') || 
                       (!['vencido'].includes(d.estado) && 
                        (!d.fecha_termino || !fechaValida || new Date(d.fecha_termino) >= new Date()));
        } else if (est === 'vencido') {
          // Incluir nuevos estados vencido y antiguos según fecha
          const fechaValida = d.fecha_termino && !isNaN(new Date(d.fecha_termino).getTime());
          matchEstado = (d.estado === 'vencido') || 
                       (fechaValida && new Date(d.fecha_termino) < new Date());
        }
      }
      
      const resultado = matchSearch && matchOrg && matchEstado;
      return resultado;
    });
    // No resetear _dirPage aquí para mantener la paginación
    renderDirTabla(lista);
  } else {
    // Si no hay datos cargados, hacer la llamada a la API
    cargarDirectivos();
  }
}

function renderDirTabla(lista) {
  const tbody = document.getElementById('dirBody');
  const pager = document.getElementById('dirPager');
  if (!tbody) return;
  const total = lista.length;
  const pages = Math.max(1, Math.ceil(total/DIR_PER));
  _dirPage = Math.min(_dirPage, pages);
  const slice = lista.slice((_dirPage-1)*DIR_PER, _dirPage*DIR_PER);

  if (!total) { tbody.innerHTML=`<tr><td colspan="9" class="empty-cell">Sin resultados.</td></tr>`; if(pager)pager.innerHTML=''; return; }

  tbody.innerHTML = slice.map(d => {
    const venc = d.fecha_termino ? (() => {
      const dias = Math.round((new Date(d.fecha_termino+'T12:00:00')-new Date())/86400000);
      if (dias < 0) return `<span style="color:#ef4444;font-size:.8rem">Vencido</span>`;
      if (dias <= 30) return `<span style="color:#f59e0b;font-size:.8rem">⚠ ${dias}d</span>`;
      return `<span class="muted" style="font-size:.8rem">${formatDate(d.fecha_termino)}</span>`;
    })() : '—';
    return `<tr>
      <td><strong>${escHtml(d.nombre)}</strong></td>
      <td class="muted">${escHtml(d.cargo)}</td>
      <td class="muted" style="font-size:.82rem">${escHtml(d.org_nombre||'—')}</td>
      <td class="muted">${escHtml(d.telefono||'—')}</td>
      <td class="muted" style="font-size:.8rem">${escHtml(d.correo||'—')}</td>
      <td class="muted" style="font-size:.8rem">${escHtml(d.direccion||'—')}</td>
      <td>${venc}</td>
      <td><span class="status-badge" style="background:${d.estado==='Activo'?'#22c55e22':'#6b728022'};color:${d.estado==='Activo'?'#22c55e':'#6b7280'};border:1px solid ${d.estado==='Activo'?'#22c55e44':'#6b728044'}">${d.estado}</span></td>
      <td class="actions">
        ${currentUser.rol!=='consulta'?`
        <button class="btn btn-ghost btn-sm" onclick="abrirFormDirectivo(${d.id})" title="Editar">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="15" height="15"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg>
        </button>
        <button class="btn btn-ghost btn-sm text-danger" onclick="eliminarDirectivo(${d.id},'${escHtml(d.nombre)}')" title="Eliminar">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="15" height="15"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
        </button>`:''}
      </td>
    </tr>`;
  }).join('');

  if (pager) {
    pager.innerHTML = pages<=1
      ? `<span>${total} directivo${total!==1?'s':''}</span>`
      : `<span>${(_dirPage-1)*DIR_PER+1}–${Math.min(_dirPage*DIR_PER,total)} de ${total}</span>
         <div style="display:flex;gap:6px;align-items:center">
           <button class="btn btn-ghost btn-sm" onclick="_dirPage--;filtrarDirectivos()" ${_dirPage<=1?'disabled':''}>‹ Anterior</button>
           <span>Página ${_dirPage} de ${pages}</span>
           <button class="btn btn-ghost btn-sm" onclick="_dirPage++;filtrarDirectivos()" ${_dirPage>=pages?'disabled':''}>Siguiente ›</button>
         </div>`;
  }
}

function abrirFormDirectivo(id=null) {
  // Abrir formulario inmediatamente sin cargar datos
  document.body.insertAdjacentHTML('beforeend',`
    <div class="modal-overlay open" id="modalDirMod">
      <div class="modal" style="max-width:min(580px,92vw)">
        <button class="modal-close" onclick="document.getElementById('modalDirMod')?.remove()">×</button>
        <h3>${id?'Editar directivo':'Nuevo directivo'}</h3>
        <div id="dirModErr" class="alert alert--error"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.95 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg><span></span></div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group span-2">
              <label>Organización *</label>
              <input type="text" id="dmOrgInput" list="dmOrgList" placeholder="Cargando organizaciones..." autocomplete="off" disabled/>
              <datalist id="dmOrgList"></datalist>
              <input type="hidden" id="dmOrg" value=""/>
              <div id="dmOrgSel" style="font-size:.78rem;color:var(--gold);margin-top:3px;min-height:16px"></div>
            </div>
            <div class="form-group"><label>Nombre *</label><input type="text" id="dmNombre" placeholder="Cargando..." disabled/></div>
            <div class="form-group"><label>Cargo *</label><input type="text" id="dmCargo" placeholder="Cargando..." disabled/></div>
            <div class="form-group"><label>RUT</label><input type="text" id="dmRut" disabled/></div>
            <div class="form-group"><label>Teléfono</label><input type="tel" id="dmTel" disabled/></div>
            <div class="form-group span-2"><label>Correo</label><input type="email" id="dmCorreo" disabled/></div>
            <div class="form-group span-2"><label>Dirección</label><input type="text" id="dmDir" disabled/></div>
            <div class="form-group"><label>Fecha inicio cargo</label><input type="date" id="dmFechaI" disabled/></div>
            <div class="form-group"><label>Fecha término cargo</label><input type="date" id="dmFechaT" disabled/></div>
            <div class="form-group"><label>Estado</label><select id="dmEstado" disabled><option>Activo</option><option>Inactivo</option></select></div>
            <div class="form-group"><label>Observaciones</label><textarea id="dmObs" rows="2" disabled></textarea></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalDirMod')?.remove()">Cancelar</button>
          <button class="btn btn-primary" id="btnGuardarDir" disabled>Cargar...</button>
        </div>
      </div>
    </div>`);
  
  // Cargar datos en background
  cargarDatosFormDirectivo(id);
}

async function cargarDatosFormDirectivo(id) {
  try {
    // Cargar solo el directivo, sin organizaciones por ahora
    if (id) {
      const r = await fetch(API+'/directivos.php?action=get&id='+id).then(r=>r.json());
      if (r.ok && r.data) {
        const d = r.data;
        
        // Actualizar solo los campos básicos primero
        document.getElementById('dmNombre').value = d.nombre || '';
        document.getElementById('dmCargo').value = d.cargo || '';
        document.getElementById('dmRut').value = d.rut || '';
        document.getElementById('dmTel').value = d.telefono || '';
        document.getElementById('dmCorreo').value = d.correo || '';
        document.getElementById('dmDir').value = d.direccion || '';
        document.getElementById('dmFechaI').value = d.fecha_inicio || '';
        document.getElementById('dmFechaT').value = d.fecha_termino || '';
        document.getElementById('dmEstado').value = d.estado || 'Activo';
        document.getElementById('dmObs').value = d.observaciones || '';
        
        // Habilitar campos básicos inmediatamente
        document.querySelectorAll('#modalDirMod input:not(#dmOrgInput), #modalDirMod select:not(#dmOrgInput), #modalDirMod textarea').forEach(el => {
          el.disabled = false;
        });
        
        // Cargar nombre de la organización
        document.getElementById('dmOrgInput').disabled = true;
        if (d.organizacion_id) {
          fetch(API+'/organizaciones.php?action=get&id='+d.organizacion_id)
            .then(r=>r.json())
            .then(orgData => {
              if (orgData.ok && orgData.data) {
                document.getElementById('dmOrgInput').value = orgData.data.nombre || 'Organización ID: ' + d.organizacion_id;
                document.getElementById('dmOrg').value = d.organizacion_id;
              } else {
                document.getElementById('dmOrgInput').value = 'Organización ID: ' + d.organizacion_id;
              }
            })
            .catch(() => {
              document.getElementById('dmOrgInput').value = 'Organización ID: ' + d.organizacion_id;
            });
        } else {
          document.getElementById('dmOrgInput').value = 'Sin organización';
        }
      }
    } else {
      // Para nuevo directivo, habilitar campos básicos inmediatamente
      document.querySelectorAll('#modalDirMod input:not(#dmOrgInput), #modalDirMod select:not(#dmOrgInput), #modalDirMod textarea').forEach(el => {
        el.disabled = false;
      });
      
      // Cargar organizaciones para nuevo directivo
      document.getElementById('dmOrgInput').disabled = false;
      document.getElementById('dmOrgInput').placeholder = 'Escribe para buscar organización...';
      
      // Agregar evento para capturar selección de organización
      document.getElementById('dmOrgInput').addEventListener('input', function(e) {
        console.log('DEBUG - Input event - valor:', e.target.value);
        const selectedOrg = window._orgsCache?.find(org => org.nombre === e.target.value);
        console.log('DEBUG - selectedOrg:', selectedOrg);
        if (selectedOrg) {
          document.getElementById('dmOrg').value = selectedOrg.id;
          document.getElementById('dmOrgSel').textContent = '';
          console.log('DEBUG - dmOrg.value actualizado a:', selectedOrg.id);
        } else {
          document.getElementById('dmOrg').value = '';
          if (e.target.value.trim()) {
            document.getElementById('dmOrgSel').textContent = 'Organización no encontrada';
          } else {
            document.getElementById('dmOrgSel').textContent = '';
          }
          console.log('DEBUG - dmOrg.value vaciado');
        }
      });
      
      // Cargar organizaciones si no están en caché
      if (!window._orgsCache) {
        fetch(API+'/organizaciones.php')
          .then(r=>r.json())
          .then(r=>{
            if (r.ok) {
              window._orgsCache = r.data;
              const orgOpts = r.data.map(o=>`<option data-id="${o.id}" value="${escHtml(o.nombre)}"></option>`).join('');
              document.getElementById('dmOrgList').innerHTML = orgOpts;
            }
          })
          .catch(()=>{});
      } else {
        // Usar caché existente
        const orgOpts = window._orgsCache.map(o=>`<option data-id="${o.id}" value="${escHtml(o.nombre)}"></option>`).join('');
        document.getElementById('dmOrgList').innerHTML = orgOpts;
      }
    }
    
    // Habilitar botón de guardar
    document.getElementById('btnGuardarDir').disabled = false;
    document.getElementById('btnGuardarDir').textContent = 'Guardar';
    document.getElementById('btnGuardarDir').onclick = () => guardarDirectivo(id);
    
  } catch (error) {
    document.getElementById('dirModErr').querySelector('span').textContent = 'Error al cargar los datos';
    document.getElementById('dirModErr').style.display = 'block';
  }
}

async function cargarOrganizacionesBackground(orgIdSeleccionada = null) {
  // Cargar organizaciones sin bloquear la UI
  if (!window._orgsCache) {
    try {
      const r = await fetch(API+'/organizaciones.php?action=list&per_page=30').then(r=>r.json());
      if (r.ok) {
        window._orgsCache = r.data;
        const orgOpts = r.data.map(o=>`<option data-id="${o.id}" value="${escHtml(o.nombre)}"></option>`).join('');
        document.getElementById('dmOrgList').innerHTML = orgOpts;
        
        if (orgIdSeleccionada) {
          const org = r.data.find(o=>o.id==orgIdSeleccionada);
          if (org) {
            document.getElementById('dmOrg').value = orgIdSeleccionada;
            document.getElementById('dmOrgInput').value = org.nombre;
            document.getElementById('dmOrgSel').innerHTML = '× '+escHtml(org.nombre);
          }
        }
        
        // Habilitar campo de organizaciones
        document.getElementById('dmOrgInput').disabled = false;
        document.getElementById('dmOrgInput').placeholder = 'Escribe para buscar organización...';
      }
    } catch (error) {
    }
  } else {
    // Usar caché existente
    const orgOpts = window._orgsCache.map(o=>`<option data-id="${o.id}" value="${escHtml(o.nombre)}"></option>`).join('');
    document.getElementById('dmOrgList').innerHTML = orgOpts;
    
    if (orgIdSeleccionada) {
      const org = window._orgsCache.find(o=>o.id==orgIdSeleccionada);
      if (org) {
        document.getElementById('dmOrg').value = orgIdSeleccionada;
        document.getElementById('dmOrgInput').value = org.nombre;
        document.getElementById('dmOrgSel').innerHTML = '× '+escHtml(org.nombre);
      }
    }
    
    document.getElementById('dmOrgInput').disabled = false;
    document.getElementById('dmOrgInput').placeholder = 'Escribe para buscar organización...';
  }
}

async function guardarDirectivo(did) {
  const btn = document.getElementById('btnGuardarDir');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
  
  // Obtener valores
  const nombre = document.getElementById('dmNombre')?.value || '';
  const cargo = document.getElementById('dmCargo')?.value || '';
  
  if (!nombre || !cargo) {
    const err = document.getElementById('dirModErr');
    if (err) { err.querySelector('span').textContent = 'Nombre y cargo son requeridos'; err.style.display = 'block'; }
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
    return;
  }
  
  // Depurar valores antes de enviar
  const orgId = document.getElementById('dmOrg')?.value;
  const orgInput = document.getElementById('dmOrgInput')?.value;
  console.log('DEBUG - dmOrg.value:', orgId);
  console.log('DEBUG - dmOrgInput.value:', orgInput);
  console.log('DEBUG - organizacion_id a enviar:', orgId || '1');
  
  // Payload con todos los campos
  const payload = {
    nombre: nombre.trim(),
    cargo: cargo.trim(),
    organizacion_id: orgId || '1',
    rut: document.getElementById('dmRut')?.value || '',
    telefono: document.getElementById('dmTel')?.value || '',
    correo: document.getElementById('dmCorreo')?.value || '',
    direccion: document.getElementById('dmDir')?.value || '',
    fecha_inicio: document.getElementById('dmFechaI')?.value || null,
    fecha_termino: document.getElementById('dmFechaT')?.value || null,
    estado: document.getElementById('dmEstado')?.value || 'Activo',
    observaciones: document.getElementById('dmObs')?.value || ''
  };
  
  if (did) payload.id = did;
  
  try {
    const url = did ? API+'/directivos.php?id='+did : API+'/directivos.php';
    const method = did ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error('HTTP ' + response.status);
    
    const result = await response.json();
    
    if (result.ok) {
      document.getElementById('modalDirMod')?.remove();
      await cargarDirectivos();
    } else {
      const err = document.getElementById('dirModErr');
      if (err) { err.querySelector('span').textContent = result.error || 'Error al guardar'; err.style.display = 'block'; }
      if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
    }
  } catch (error) {
    const err = document.getElementById('dirModErr');
    if (err) { err.querySelector('span').textContent = 'Error de conexión: ' + error.message; err.style.display = 'block'; }
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
  }
}

window.confirmDelDir = (id,nombre) => {
  const modalId = 'modalConfirmDelDir';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();
  
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="${modalId}" onclick="if(event.target.id==='${modalId}')document.getElementById('${modalId}')?.remove()">
      <div class="modal" style="max-width:450px;text-align:center">
        <div style="font-size:2.5rem;margin-bottom:12px"></div>
        <h3 style="margin-bottom:8px">¿Eliminar directiva?</h3>
        <p class="subtitle" style="margin-bottom:20px">¿Estás seguro de eliminar <strong>${escHtml(nombre)}</strong>?</p>
        <div class="modal-footer" style="justify-content:center;gap:12px;flex-wrap:wrap;">
          <button class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancelar</button>
          <button class="btn btn-danger" id="${modalId}Btn">Mover a papelera</button>
        </div>
      </div>
    </div>
  `);
  
  document.getElementById(`${modalId}Btn`).onclick = async () => {
    const btn = document.getElementById(`${modalId}Btn`);
    btn.disabled = true;
    btn.textContent = 'Eliminando...';
    
    try {
      const r = await fetch(`${API}/directivas.php?id=${id}`, {method:'DELETE',headers:{'Cache-Control':'no-cache'}}).then(r=>r.json());
      document.getElementById(modalId)?.remove();
      if(r.ok) {
        // Recargar directivas de la organización
        if (typeof openOrgDetail === 'function') {
          const orgId = document.querySelector('[onclick*="openOrgDetail"]')?.getAttribute('onclick').match(/\d+/)?.[0];
          if (orgId) openOrgDetail(orgId);
        }
      } else {
        document.body.insertAdjacentHTML('beforeend', `
          <div class="modal-overlay open" id="${modalId}Error">
            <div class="modal" style="max-width:360px;text-align:center">
              <div style="font-size:2rem;margin-bottom:12px"></div>
              <h3 style="margin-bottom:8px">Error</h3>
              <p class="subtitle">${r.error || 'Error al eliminar'}</p>
              <div class="modal-footer" style="justify-content:center">
                <button class="btn btn-secondary" onclick="document.getElementById('${modalId}Error')?.remove()">Aceptar</button>
              </div>
            </div>
          </div>
        `);
      }
    } catch (error) {
      document.getElementById(modalId)?.remove();
      document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay open" id="${modalId}Error">
          <div class="modal" style="max-width:360px;text-align:center">
            <div style="font-size:2rem;margin-bottom:12px"></div>
            <h3 style="margin-bottom:8px">Error</h3>
            <p class="subtitle">Error de conexión</p>
            <div class="modal-footer" style="justify-content:center">
              <button class="btn btn-secondary" onclick="document.getElementById('${modalId}Error')?.remove()">Aceptar</button>
            </div>
          </div>
        </div>
      `);
    }
  };
};

async function eliminarDirectivo(id, nombre) {
  const modalId = 'modalConfirmDelDir';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();
  
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="${modalId}" onclick="if(event.target.id==='${modalId}')document.getElementById('${modalId}')?.remove()">
      <div class="modal" style="max-width:400px;text-align:center">
        <div style="font-size:2.5rem;margin-bottom:12px">🗑️</div>
        <h3 style="margin-bottom:8px">¿Eliminar directivo?</h3>
        <p class="subtitle" style="margin-bottom:20px">¿Estás seguro de eliminar a <strong>${escHtml(nombre)}</strong>?</p>
        <div class="modal-footer" style="justify-content:center;gap:12px">
          <button class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancelar</button>
          <button class="btn btn-danger" id="${modalId}Btn">Sí, eliminar</button>
        </div>
      </div>
    </div>
  `);
  
  document.getElementById(`${modalId}Btn`).onclick = async () => {
    const btn = document.getElementById(`${modalId}Btn`);
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px"></span>Eliminando...';
    
    try {
      const r = await fetch(API+'/directivos.php?id='+id,{method:'DELETE'}).then(r=>r.json());
      document.getElementById(modalId)?.remove();
      if (r.ok) { 
        await cargarDirectivos(); 
        filtrarDirectivos(); 
      }
      else {
        document.body.insertAdjacentHTML('beforeend', `
          <div class="modal-overlay open" id="${modalId}Error">
            <div class="modal" style="max-width:360px;text-align:center">
              <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
              <h3 style="margin-bottom:8px">Error</h3>
              <p class="subtitle">${r.error || 'Error al eliminar'}</p>
              <div class="modal-footer" style="justify-content:center">
                <button class="btn btn-secondary" onclick="document.getElementById('${modalId}Error')?.remove()">Aceptar</button>
              </div>
            </div>
          </div>
        `);
      }
    } catch (e) {
      document.getElementById(modalId)?.remove();
      document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay open" id="${modalId}Error">
          <div class="modal" style="max-width:360px;text-align:center">
            <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
            <h3 style="margin-bottom:8px">Error</h3>
            <p class="subtitle">Error de conexión</p>
            <div class="modal-footer" style="justify-content:center">
              <button class="btn btn-secondary" onclick="document.getElementById('${modalId}Error')?.remove()">Aceptar</button>
            </div>
          </div>
        </div>
      `);
    }
  };
}

function abrirImportarDirectivos() {
  document.body.insertAdjacentHTML('beforeend',`
    <div class="modal-overlay open" id="modalImportDir">
      <div class="modal" style="max-width:min(480px,92vw)">
        <button class="modal-close" onclick="document.getElementById('modalImportDir')?.remove()">✕</button>
        <h3>Importar directivos desde Excel</h3>
        <p class="subtitle">Sube el archivo con los datos de directivos.</p>
        <div id="importDirErr" class="alert alert--error"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg><span></span></div>
        <div class="form-group" style="margin-top:16px">
          <label>Archivo</label>
          <input type="file" id="importDirFile" accept=".xlsx,.xls"/>
        </div>
        <div id="importDirRes" style="display:none;margin-top:12px"></div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalImportDir')?.remove()">Cancelar</button>
          <button class="btn btn-primary" id="btnImportDir" onclick="ejecutarImportDir()">
            <span id="btnImportDirTxt">Importar</span>
            <div class="spinner" id="spinImportDir" style="display:none"></div>
          </button>
        </div>
      </div>
    </div>`);
}

async function ejecutarImportDir() {
  const file = document.getElementById('importDirFile')?.files[0];
  if (!file) { showAlert('importDirErr','Selecciona un archivo.'); return; }
  const btn = document.getElementById('btnImportDir');
  btn.disabled=true; document.getElementById('btnImportDirTxt').style.display='none'; document.getElementById('spinImportDir').style.display='block';
  const fd = new FormData(); fd.append('archivo',file);
  let r;
  try {
    const resp = await fetch(API+'/directivos.php?action=importar',{method:'POST',body:fd});
    const txt = await resp.text();
    try { r = JSON.parse(txt); } catch(e) { r={ok:false,error:'Error del servidor: '+txt.substring(0,200)}; }
  } catch(e) { r={ok:false,error:'Error de conexión: '+e.message}; }
  btn.disabled=false; document.getElementById('btnImportDirTxt').style.display=''; document.getElementById('spinImportDir').style.display='none';
  if (!r.ok) { showAlert('importDirErr',r.error||'Error al importar'); return; }
  document.getElementById('importDirRes').style.display='block';
  document.getElementById('importDirRes').innerHTML=`
    <div style="display:flex;gap:12px">
      <div style="flex:1;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.2);border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:1.5rem;font-weight:700;color:#22c55e">${r.insertados}</div><div class="muted" style="font-size:.75rem">Creados</div>
      </div>
      <div style="flex:1;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:1.5rem;font-weight:700;color:#3b82f6">${r.actualizados}</div><div class="muted" style="font-size:.75rem">Actualizados</div>
      </div>
      ${r.errores?.length?`<div style="flex:1;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:1.5rem;font-weight:700;color:#ef4444">${r.errores.length}</div><div class="muted" style="font-size:.75rem">Errores</div>
      </div>`:''}
    </div>
    ${r.errores?.length?`<div style="margin-top:10px;font-size:.75rem;color:var(--muted)">${r.errores.slice(0,5).map(e=>`<div>${escHtml(e)}</div>`).join('')}${r.errores.length>5?`<div>…y ${r.errores.length-5} más</div>`:''}</div>`:''}
    <button class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="document.getElementById('modalImportDir')?.remove();cargarDirectivos();">Ver directivos →</button>`;
}

async function ejecutarImportDirDesdeImportar() {
  const file = document.getElementById('importDirFile2')?.files[0];
  if (!file) { showAlert('importDirErr2','Selecciona un archivo primero.'); return; }
  const btn = document.getElementById('btnImportDir2');
  btn.disabled=true; document.getElementById('btnImportDir2Txt').style.display='none'; document.getElementById('spinImportDir2').style.display='block';
  hideAlert('importDirErr2');

  let filas, r;
  try {
    // Detectar si es CSV o Excel
    if (file.name.match(/\.csv$/i)) {
      filas = await leerCSV(file);
    } else {
      filas = await leerExcelJS(file);
    }
  }
  catch(e) {
    showAlert('importDirErr2','No se pudo leer el archivo: '+e.message);
    btn.disabled=false; document.getElementById('btnImportDir2Txt').style.display=''; document.getElementById('spinImportDir2').style.display='none';
    return;
  }

  // Validar tipo de archivo por encabezados
  let filasConCab;
  try {
    // Leer primeros bytes para detectar si es CSV aunque tenga extensión .xlsx
    const headerBytes = await file.slice(0, 100).text();
    const looksLikeCSV = headerBytes.includes(';') && !headerBytes.startsWith('PK');
    
    if (file.name.match(/\.csv$/i) || looksLikeCSV) {
      // Para CSV, leer con encabezados
      const text = await new Promise(res => {
        const reader = new FileReader();
        reader.onload = e => res(e.target.result);
        reader.readAsText(file, 'UTF-8');
      });
      const lines = text.split('\n').filter(line => line.trim());
      filasConCab = lines.map(line => 
        line.split(';').map(cell => {
          cell = cell.trim();
          if (cell.startsWith('"') && cell.endsWith('"')) {
            cell = cell.slice(1, -1);
          }
          return cell === '' ? null : cell;
        })
      );
    } else {
      filasConCab = await leerExcelJSConCab(file);
    }
  } catch(e) {
    showAlert('importDirErr2','No se pudo leer los encabezados: '+e.message);
    btn.disabled=false; document.getElementById('btnImportDir2Txt').style.display=''; document.getElementById('spinImportDir2').style.display='none';
    return;
  }
  if (!validarTipoArchivo(filasConCab[0] || [], 'directivos', 'importDirErr2')) {
    btn.disabled=false; document.getElementById('btnImportDir2Txt').style.display=''; document.getElementById('spinImportDir2').style.display='none';
    return;
  }

  r = {ok:false, error:'Iniciando...'}; // Valor por defecto
  try {
    console.log('=== IMPORT DEBUG === Enviando', filas.length, 'filas');
    const resp = await fetch(API+'/importar_json.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo:'directivos',filas})});
    const txt = await resp.text();
    console.log('Respuesta servidor (raw):', txt);
    console.log('Respuesta status:', resp.status);
    if (!txt || txt.trim() === '') {
      r = {ok:false, error:'Respuesta vacía del servidor (status: ' + resp.status + ')' };
    } else {
      try { 
        r = JSON.parse(txt); 
        console.log('JSON parseado:', r);
      } catch(e) { 
        console.error('Error parseando JSON:', e, 'Texto:', txt);
        r={ok:false,error:'Error del servidor: '+txt.substring(0,200)}; 
      }
    }
  } catch(e) { 
    console.error('Error fetch:', e);
    r={ok:false,error:'Error de conexión: '+e.message}; 
  }

  btn.disabled=false; document.getElementById('btnImportDir2Txt').style.display=''; document.getElementById('spinImportDir2').style.display='none';
  console.log('DEBUG r final:', r);
  if (!r || !r.ok) { 
    const errMsg = (r && r.error) || (r && r.message) || 'Error desconocido al importar. Revise la consola (F12) para más detalles.';
    console.error('DEBUG errMsg:', errMsg, 'r was:', r);
    showAlert('importDirErr2', errMsg); 
    return; 
}

  const res = document.getElementById('importDirRes2');
  res.style.display='block';
  res.innerHTML = mostrarResultado(r, 'Creados', 'Actualizados', 'directivos');
  
  // Refrescar la lista de directivos si la página está activa
  const activeNav = document.querySelector('.nav-item.active');
  if (activeNav && activeNav.getAttribute('onclick')?.includes('directivos_mod')) {
    // Limpiar caché y recargar
    _dirAll = [];
    const main = document.getElementById('mainContent');
    if (main && main.querySelector('#dirBody')) {
      // Si estamos en la página de directivos, recargar la tabla
      const searchInput = document.getElementById('dirSearch');
      const orgSelect = document.getElementById('dirFiltOrg');
      const estadoSelect = document.getElementById('dirFiltEstado');
      
      // Resetear filtros y recargar
      if (searchInput) searchInput.value = '';
      if (orgSelect) orgSelect.value = '';
      if (estadoSelect) estadoSelect.value = '';
      
      // Recargar directivos
      await cargarDirectivos();
      
      // Mostrar notificación de actualización
      setTimeout(() => {
        const alerta = document.createElement('div');
        alerta.className = 'alert alert--success';
        alerta.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;min-width:250px;animation:slideIn 0.3s ease';
        alerta.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg><span>Lista de directivos actualizada</span>';
        document.body.appendChild(alerta);
        setTimeout(() => alerta.remove(), 3000);
      }, 500);
    }
  }
}

function onImportDirFileChange(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('importDirFileName').textContent = '📎 ' + file.name;
  document.getElementById('btnImportDir2').disabled = false;
  hideAlert('importDirErr2');
}

function handleImportDirDrop(e) {
  if (e.target.id !== 'importDirDropZone' && !e.target.closest('#importDirDropZone')) return;
  e.preventDefault();
  document.getElementById('importDirDropZone').style.borderColor = 'rgba(201,168,76,.3)';
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (!file.name.match(/\.xlsx?$/i)) { showAlert('importDirErr2','Formato no compatible.'); return; }
  const dt = new DataTransfer();
  dt.items.add(file);
  document.getElementById('importDirFile2').files = dt.files;
  onImportDirFileChange(document.getElementById('importDirFile2'));
}

async function deshacerImportacion(importId, tipo) {
  const label = tipo === 'directivos' ? 'directivos' : 'organizaciones';
  const modalId = 'modalConfirmUndoImport';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();
  
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="${modalId}" onclick="if(event.target.id==='${modalId}')document.getElementById('${modalId}')?.remove()">
      <div class="modal" style="max-width:400px;text-align:center">
        <div style="font-size:2.5rem;margin-bottom:12px">↩️</div>
        <h3 style="margin-bottom:8px">¿Deshacer importación?</h3>
        <p class="subtitle" style="margin-bottom:20px">¿Estás seguro de deshacer la importación #${importId}?<br>Esto eliminará todos los ${label} creados.</p>
        <div class="modal-footer" style="justify-content:center;gap:12px">
          <button class="btn btn-secondary" onclick="document.getElementById('${modalId}')?.remove()">Cancelar</button>
          <button class="btn btn-danger" id="${modalId}Btn">Sí, deshacer</button>
        </div>
      </div>
    </div>
  `);
  
  document.getElementById(`${modalId}Btn`).onclick = async () => {
    document.getElementById(modalId)?.remove();
    const r = await fetch(`${API}/deshacer_importacion.php?import_id=${encodeURIComponent(importId)}&tipo=${tipo}`,{method:'DELETE'})
      .then(r=>r.json()).catch(()=>({ok:false,error:'Error de conexión'}));
    if (r.ok) {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay open" id="${modalId}Success">
          <div class="modal" style="max-width:360px;text-align:center">
            <div style="font-size:2rem;margin-bottom:12px">✅</div>
            <h3 style="margin-bottom:8px">Éxito</h3>
            <p class="subtitle">Importación deshecha — ${r.eliminados} ${label} eliminados</p>
            <div class="modal-footer" style="justify-content:center">
              <button class="btn btn-secondary" onclick="document.getElementById('${modalId}Success')?.remove()">Aceptar</button>
            </div>
          </div>
        </div>
      `);
      // Refrescar la página de importar
      if (document.getElementById('importResultado')) document.getElementById('importResultado').style.display='none';
      if (document.getElementById('importDirRes2')) document.getElementById('importDirRes2').style.display='none';
      await cargarImportaciones();
    } else {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay open" id="${modalId}Error">
          <div class="modal" style="max-width:360px;text-align:center">
            <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
            <h3 style="margin-bottom:8px">Error</h3>
            <p class="subtitle">${r.error || 'No se pudo deshacer la importación'}</p>
            <div class="modal-footer" style="justify-content:center">
              <button class="btn btn-secondary" onclick="document.getElementById('${modalId}Error')?.remove()">Aceptar</button>
            </div>
          </div>
        </div>
      `);
    }
  };
}

async function renderCertificados(main) {
  main.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">Certificados</h2>
      <p class="subtitle">Emisión de certificados oficiales</p></div>
    </div>
    <div id="certLista" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px"></div>`;

  const r = await fetch(API+'/certificados.php?action=tipos').then(r=>r.json()).catch(()=>({ok:false}));
  if (!r.ok) { document.getElementById('certLista').innerHTML = '<p class="muted">Error al cargar certificados.</p>'; return; }

  document.getElementById('certLista').innerHTML = r.data.map(cert => `
    <div style="background:rgba(22,32,50,.6);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:24px">
      <div style="font-size:2rem;margin-bottom:12px">📜</div>
      <h3 style="font-family:var(--font-display);color:var(--cream);font-size:1.5rem;margin-bottom:8px">${escHtml(cert.nombre)}</h3>
      <p style="font-size:1.1rem;color:var(--muted);margin-bottom:20px;line-height:1.5">
        Completa los datos requeridos para generar el documento Word listo para firmar.
      </p>
      <button class="btn btn-primary" style="width:100%" onclick="abrirFormCertificado('${cert.id}')">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
        Emitir certificado
      </button>
    </div>`).join('');
}

async function abrirFormCertificado(tipoId) {
  const r = await fetch(API+'/certificados.php?action=tipos').then(r=>r.json()).catch(()=>({ok:false}));
  if (!r.ok) return;
  const cert = r.data.find(c=>c.id===tipoId);
  if (!cert) return;

  const camposVisibles = cert.campos.filter(f =>
    f.id !== 'numero_cert' && f.tipo !== 'auto_hora' && f.tipo !== 'fixed'
  );

  const camposHTML = camposVisibles.map(campo => {
    const req = campo.requerido ? ' *' : '';
    const ph  = campo.placeholder ? escHtml(campo.placeholder) : '';
    if (campo.tipo === 'textarea') {
      return `<div class="form-group span-2">
        <label>${escHtml(campo.label)}${req}</label>
        <textarea id="cert_${campo.id}" rows="3"></textarea>
      </div>`;
    }
    if (campo.tipo === 'date') {
      return `<div class="form-group">
        <label>${escHtml(campo.label)}${req}</label>
        <input type="date" id="cert_${campo.id}"/>
      </div>`;
    }
    return `<div class="form-group">
      <label>${escHtml(campo.label)}${req}</label>
      <input type="text" id="cert_${campo.id}" placeholder="${ph}"/>
    </div>`;
  }).join('');

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="modalCert">
      <div class="modal modal--lg">
        <button class="modal-close" onclick="document.getElementById('modalCert')?.remove()">✕</button>
        <h3>${escHtml(cert.nombre)}</h3>
        <p class="subtitle">Completa los campos. Los datos se insertan en el documento automáticamente.</p>
        <div id="certErr" class="alert alert--error">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
          <span></span>
        </div>
        <div class="modal-body">
          <div class="form-grid">${camposHTML}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalCert')?.remove()">Cancelar</button>
          <button class="btn btn-primary" id="btnGenCert" onclick="generarCertificado('${tipoId}')">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="15" height="15"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
            Vista previa
          </button>
        </div>
      </div>
    </div>`);

  const hoy = new Date().toISOString().split('T')[0];
  const fechaEmision = document.getElementById('cert_fecha_emision');
  if (fechaEmision && !fechaEmision.value) fechaEmision.value = hoy;

  window._certCampos = cert.campos; 
}

async function generarCertificado(tipoId) {
  hideAlert('certErr');
  const campos = window._certCampos || [];
  const datos  = {};
  let error    = null;

  for (const campo of campos) {
    let val = '';

    if (campo.tipo === 'auto_hora') {
      const now = new Date();
      val = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    } else if (campo.tipo === 'fixed') {
      val = campo.valor || '';
    } else {
      const el = document.getElementById('cert_' + campo.id);
      if (!el) continue;
      val = campo.tipo === 'date' ? el.value : (el.value || '').trim();
      if (campo.requerido && !val) {
        error = `El campo "${campo.label}" es obligatorio.`;
        el.focus();
        break;
      }
    }
    datos[campo.id] = val;
  }

  if (error) { showAlert('certErr', error); return; }

  const btn = document.getElementById('btnGenCert');
  btn.disabled = true;
  const txtOrig = btn.innerHTML;
  btn.innerHTML = '<div class="spinner" style="display:inline-block;width:16px;height:16px;border-width:2px"></div> Generando…';

  try {
    const resp = await fetch(API+'/certificados.php?action=preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: tipoId, datos })
    });

    const contentType = resp.headers.get('content-type') || '';
    if (!resp.ok || contentType.includes('application/json')) {
      const txt = await resp.text();
      let msg = 'Error al generar la vista previa.';
      try { msg = JSON.parse(txt).error || msg; } catch(e) {}
      showAlert('certErr', msg);
      btn.disabled = false; btn.innerHTML = txtOrig;
      return;
    }

    const html = await resp.text();
    const win  = window.open('', '_blank', 'width=920,height=760,scrollbars=yes,resizable=yes');
    if (!win) {
      showAlert('certErr', 'El navegador bloqueó la ventana emergente. Habilita los pop-ups para este sitio.');
      btn.disabled = false; btn.innerHTML = txtOrig;
      return;
    }
    win._certApiBase = API + '/certificados.php';
    win.document.open();
    win.document.write(html);
    win.document.close();

    btn.disabled = false; btn.innerHTML = txtOrig;
    document.getElementById('modalCert')?.remove();

  } catch(e) {
    showAlert('certErr', 'Error de conexión: ' + e.message);
    btn.disabled = false; btn.innerHTML = txtOrig;
  }
}

function formatFechaCert(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  const meses = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${parseInt(d)} de ${meses[parseInt(m)-1]} de ${y}`;
}

async function renderPapelera(main) {
  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2>Papelera</h2>
        <p>Organizaciones y directivos eliminados que pueden ser restaurados.</p>
        ${currentUser.rol === 'administrador' ? `
          <div class="papelera-actions" style="margin-top: 10px;">
            <button class="btn btn-danger" onclick="mostrarModalEliminarPermanente()">
              - Eliminar Permanentemente Seleccionados
            </button>
            <button class="btn btn-secondary" onclick="seleccionarTodos()">
              - Seleccionar Todos
            </button>
            <button class="btn btn-secondary" onclick="deseleccionarTodos()">
              - Deseleccionar Todos
            </button>
          </div>
        ` : ''}
      </div>
    </div>
    <div id="papeleraAlerta"></div>
    <div class="table-wrap">
      <table class="data-table" id="papeleraTable">
        <thead><tr>
          <th>Nombre</th>
          <th>Tipo</th>
          <th>RUT</th>
          <th>Eliminado por</th>
          <th>Fecha eliminación</th>
          <th>
            ${currentUser.rol === 'administrador' ? '<input type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll()" style="margin-right: 5px;">' : ''}
          </th>
        </tr></thead>
        <tbody id="papeleraBody"><tr><td colspan="6" class="empty-cell"><div class="spinner" style="margin:0 auto"></div></td></tr></tbody>
      </table>
    </div>`;
  
  await cargarPapelera();
}

async function cargarPapelera() {
  try {
    const r = await fetch('/sistema-municipal/api/papelera.php?action=list').then(r => r.json());
    const tbody = document.getElementById('papeleraBody');
    
    if (!r.ok || !r.data) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="table-empty"><div class="icon">📭</div>La papelera está vacía.</div></td></tr>';
      return;
    }
    
    // Combinar todos los tipos de datos
    const todosLosItems = [
      ...(r.data.organizaciones || []),
      ...(r.data.directivas || []),
      ...(r.data.directivos || []),
      ...(r.data.proyectos || [])
    ];
    
    if (todosLosItems.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="table-empty"><div class="icon">📭</div>La papelera está vacía.</div></td></tr>';
      return;
    }
    
    tbody.innerHTML = todosLosItems.map(o => {
      // Determinar qué función de restauración usar según el tipo
      let restoreFunction = '';
      let tipoDisplay = '';
      
      if (o.tipo_item === 'organizacion') {
        restoreFunction = `restaurarOrg(${o.id})`;
        tipoDisplay = o.tipo_nombre || '—';
      } else if (o.tipo_item === 'directiva') {
        restoreFunction = `restaurarDirectiva(${o.id})`;
        tipoDisplay = 'Directiva';
      } else if (o.tipo_item === 'directivo') {
        restoreFunction = `restaurarDirectivo(${o.id})`;
        tipoDisplay = 'Directivo';
      } else if (o.tipo_item === 'proyecto') {
        restoreFunction = `restaurarProyecto(${o.id})`;
        tipoDisplay = 'Proyecto';
      }
      
      return `
      <tr>
        <td>
          ${currentUser.rol === 'administrador' ? `<input type="checkbox" class="item-checkbox" data-id="${o.id}" data-tipo="${o.tipo_item}" style="margin-right: 8px;">` : ''}
          <strong>${escHtml(o.nombre)}</strong>
        </td>
        <td class="muted">${tipoDisplay}</td>
        <td class="muted">${escHtml(o.rut || '—')}</td>
        <td class="muted">${escHtml(o.eliminado_por_nombre || '—')}</td>
        <td class="muted">${formatDate(o.fecha_eliminacion)}</td>
        <td><div class="row-actions">
          <button class="btn btn-success" onclick="${restoreFunction}" style="opacity:1 !important; cursor:pointer !important; font-size: 12px; padding: 4px 8px;">
            restaurar
          </button>
                  </div></td>
      </tr>`;
    }).join('');
  } catch (e) {
    document.getElementById('papeleraBody').innerHTML = '<tr><td colspan="6"><div class="table-empty"><div class="icon">⚠️</div>Error al cargar la papelera.</div></td></tr>';
  }
}

// Funciones para manejar selección múltiple y eliminación permanente
window.toggleSelectAll = function() {
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const checkboxes = document.querySelectorAll('.item-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAllCheckbox.checked;
  });
};

window.seleccionarTodos = function() {
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const checkboxes = document.querySelectorAll('.item-checkbox');
  selectAllCheckbox.checked = true;
  checkboxes.forEach(checkbox => {
    checkbox.checked = true;
  });
};

window.deseleccionarTodos = function() {
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const checkboxes = document.querySelectorAll('.item-checkbox');
  selectAllCheckbox.checked = false;
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
};

window.mostrarModalEliminarPermanente = function() {
  const checkboxes = document.querySelectorAll('.item-checkbox:checked');
  if (checkboxes.length === 0) {
    toast.warning('Por favor selecciona al menos un elemento para eliminar permanentemente.');
    return;
  }
  
  const items = Array.from(checkboxes).map(checkbox => ({
    id: checkbox.dataset.id,
    tipo: checkbox.dataset.tipo
  }));
  
  const message = `¿Estás seguro de que quieres eliminar permanentemente ${items.length} elemento(s)? Esta acción no se puede deshacer.`;
  
  showConfirm(message, 'Eliminar Permanentemente', 'danger').then(confirmed => {
    if (confirmed) {
      eliminarPermanenteSeleccionados(items);
    }
  });
};

window.eliminarPermanenteSeleccionados = async function(items) {
  console.log('=== eliminarPermanenteSeleccionados DEBUG ===', items);
  try {
    const payload = {
      action: 'eliminar_permanente',
      items: items
    };
    
    console.log('Enviando:', payload);
    const response = await fetch(API + '/papelera.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    
    const text = await response.text();
    console.log('Response text:', text);
    
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error('JSON parse error:', e);
      toast.error('Error: respuesta inválida del servidor');
      return;
    }
    
    if (result.ok) {
      toast.success(result.message || 'Elementos eliminados permanentemente');
      await cargarPapelera();
    } else {
      toast.error(result.error || 'Error al eliminar permanentemente');
    }
  } catch (error) {
    console.error('Error:', error);
    toast.error('Error al eliminar: ' + error.message);
  }
};

window.eliminarPermanenteIndividual = function(id, tipo) {
  const message = `¿Estás seguro de que quieres eliminar permanentemente este elemento? Esta acción no se puede deshacer.`;
  
  showConfirm(message, 'Eliminar Permanentemente', 'danger').then(confirmed => {
    if (confirmed) {
      eliminarPermanenteSeleccionados([{id, tipo}]);
    }
  });
};

window.restaurarOrg = async function(id) {
  console.log('=== restaurarOrg DEBUG ===', id);
  const btn = document.querySelector(`button[onclick="restaurarOrg(${id})"]`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block"></span>';
  }
  
  try {
    const formData = new FormData();
    formData.append('action', 'restaurar');
    formData.append('tipo', 'organizacion');
    formData.append('id', id);
    
    console.log('Enviando a:', API + '/papelera.php');
    const response = await fetch(API + '/papelera.php', {
      method: 'POST',
      body: formData
    });
    const text = await response.text();
    console.log('Response text:', text);
    
    let r;
    try {
      r = JSON.parse(text);
    } catch (e) {
      console.error('JSON parse error:', e);
      toast.error('Error: respuesta inválida del servidor');
      if (btn) btn.disabled = false;
      return;
    }
    
    if (r.ok) {
      toast.success(r.message || 'Elemento restaurado correctamente');
      await cargarPapelera();
    } else {
      toast.error(r.error || 'Error al restaurar');
      if (btn) btn.disabled = false;
    }
  } catch (e) {
    toast.error('Error de conexión: ' + e.message);
    if (btn) btn.disabled = false;
  }
};

window.restaurarDirectiva = async function(id) {
  const btn = document.querySelector(`button[onclick="restaurarDirectiva(${id})"]`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block"></span>';
  }
  
  try {
    const formData = new FormData();
    formData.append('action', 'restaurar');
    formData.append('tipo', 'directiva');
    formData.append('id', id);
    
    const r = await fetch(API + '/papelera.php', {
      method: 'POST',
      body: formData
    }).then(r => r.json());
    
    if (r.ok) {
      toast.success(r.message || 'Directiva restaurada correctamente');
      await cargarPapelera();
    } else {
      toast.error(r.error || 'Error al restaurar directiva');
      if (btn) btn.disabled = false;
    }
  } catch (e) {
    toast.error('Error de conexión: ' + e.message);
    if (btn) btn.disabled = false;
  }
};

window.restaurarDirectivo = function(id) {
  showConfirm('¿Estás seguro de restaurar este directivo?', 'Restaurar Elemento', 'warning').then(confirmed => {
    if (confirmed) {
      window.location.href = '/sistema-municipal/php/restaurar_simple.php?id=' + id;
    }
  });
};

window.restaurarProyecto = async function(id) {
  const btn = document.querySelector(`button[onclick="restaurarProyecto(${id})"]`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block"></span>';
  }
  
  try {
    const formData = new FormData();
    formData.append('action', 'restaurar');
    formData.append('tipo', 'proyecto');
    formData.append('id', id);
    
    const r = await fetch(API + '/papelera.php', {
      method: 'POST',
      body: formData
    }).then(r => r.json());
    
    if (r.ok) {
      toast.success(r.message || 'Proyecto restaurado correctamente');
      await cargarPapelera();
    } else {
      toast.error(r.error || 'Error al restaurar proyecto');
      if (btn) btn.disabled = false;
    }
  } catch (e) {
    toast.error('Error de conexión: ' + e.message);
    if (btn) btn.disabled = false;
  }
};
