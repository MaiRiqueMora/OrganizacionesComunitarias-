let currentUser = null;
const API = AUTH.apiBase;

// ── Manejo de historial del navegador
window.addEventListener('popstate', (event) => {
  if (event.state && event.state.page) {
    // Restaurar la página desde el historial
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      if (item.onclick && item.onclick.toString().includes(event.state.page)) {
        loadPage(event.state.page, item);
        return;
      }
    });
    
    // Si no se encuentra el nav item, cargar directamente
    loadPage(event.state.page, null);
  }
  // Prevenir comportamiento por defecto del navegador
  event.preventDefault();
  return false;
});

// ── Init 
document.addEventListener('DOMContentLoaded', async () => {
  const session = await getSession();
  if (!session.ok) { 
    // Solo redirigir si no viene del botón atrás
    if (!performance.getEntriesByType('navigation')[0]?.type.includes('back_forward')) {
      window.location.href = '/sistema-municipal/index.php'; 
    }
    return; 
  }

  currentUser = session;
  document.getElementById('userDisplay').textContent  = session.nombre || session.username;
  const rolMap = { administrador:'Administrador', funcionario:'Funcionario', consulta:'Solo Lectura' };
  const badge  = document.getElementById('rolBadge');
  badge.textContent = rolMap[session.rol] || session.rol;
  badge.classList.add('rol-'+session.rol);

  // Mostrar sección admin solo a administradores
  if (session.rol === 'administrador') {
    document.getElementById('navAdmin').style.display = '';
  }

  // Cargar página desde hash si existe
  const hashPage = window.location.hash.replace('#', '');
  const PAGES = ['home','organizaciones','accesos','backups','reportes','presentations','carga-masiva','certificados','usuarios'];
  if (PAGES.includes(hashPage)) {
    const targetNav = document.querySelector(`.nav-item[onclick*="${hashPage}"]`);
    loadPage(hashPage, targetNav);
  } else {
    loadPage('home', document.querySelector('.nav-item.active'));
  }
  
  // Verificar vencimientos al cargar la página
  verificarVencimientos();
  
  checkAlertas();
});

// ── Navegación entre páginas 
function loadPage(page, navEl) {
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  const main = document.getElementById('mainContent');

  // Agregar al historial del navegador sin recargar la página
  if (!window.location.hash.includes(page)) {
    const newUrl = `${window.location.pathname}#${page}`;
    history.pushState({page: page}, '', newUrl);
  }

  switch(page) {
    case 'home':          renderHome(main); break;
    case 'organizaciones':renderOrganizaciones(main); break;
    case 'accesos':       renderAccesos(main); break;
    case 'backups':       renderBackups(main); break;
    case 'reportes':      renderReportes(main); break;
    case 'presentations': window.location.href = 'pages/presentations.html'; break;
    case 'carga-masiva': renderCargaMasiva(main); break;
    case 'certificados': renderCertificados(main); break;
    case 'usuarios':      renderUsuarios(main); break;
    default: main.innerHTML = '<p>Página no encontrada.</p>';
  }
}

// ── HOME 
async function renderHome(main) {
  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h2>Panel de Inicio</h2><p>Resumen del sistema de organizaciones comunitarias.</p></div>
    </div>
    <div class="stats-grid" id="statsGrid">
      ${[1,2,3,4].map(()=>`<div class="stat-card"><div class="stat-val">—</div><div class="stat-lbl">Cargando…</div></div>`).join('')}
    </div>
    <div id="alertaBanner"></div>`;

  try {
    const [orgs, dirs] = await Promise.all([
      fetch(API+'/organizaciones.php?action=list').then(r=>r.json()),
      fetch(API+'/organizaciones.php?action=alertas').then(r=>r.json()),
      fetch(API+'/organizaciones.php', {
        credentials: "same-origin"
      }).then(r=>r.json()) 
    ]);
    if (orgs.ok) {
      const data = orgs.data;
      const activas   = data.filter(o=>o.estado==='Activa').length;
      const inactivas = data.filter(o=>o.estado==='Inactiva').length;
      const suspendidas = data.filter(o=>o.estado==='Suspendida').length;
      const vencidas  = data.filter(o=>o.estado_directiva==='Vencida'||o.dias_vence<0).length;
      document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card"><div class="stat-val">${data.length}</div><div class="stat-lbl">Total organizaciones</div></div>
        <div class="stat-card"><div class="stat-val" style="color:#6fcf97">${activas}</div><div class="stat-lbl">Activas</div></div>
        <div class="stat-card"><div class="stat-val" style="color:#e57373">${vencidas}</div><div class="stat-lbl">Dir. Vencidas</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--muted)">${inactivas+suspendidas}</div><div class="stat-lbl">Inactivas / Suspendidas</div></div>`;
    }
    if (dirs.ok && dirs.data.length) {
      document.getElementById('alertaBanner').innerHTML = `
        <div class="alert-banner" onclick="loadPage('organizaciones',document.querySelectorAll('.nav-item')[1])">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
          <div><strong class="count">${dirs.data.length}</strong> directiva${dirs.data.length>1?'s':''} por vencer en los próximos 30 días — <u>Ver organizaciones</u></div>
        </div>`;
    }
  } catch(e) { console.error(e); }
}

// ── ORGANIZACIONES 
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
        <input type="text" id="orgSearch" placeholder="Buscar por nombre, RUT, dirección, representante..."/>
      </div>
      <select id="orgFiltroEstado"><option value="">Todos los estados</option><option>Activa</option><option>Inactiva</option><option>Suspendida</option></select>
      <select id="orgFiltroTipo"><option value="">Todos los tipos</option></select>
      <select id="orgFiltroFondos"><option value="">Todas</option><option value="1">Habilitada para fondos</option><option value="0">No habilitada</option></select>
      <select id="orgFiltroDirectiva"><option value="">Todas las directivas</option><option>Vigente</option><option>Por Vencer</option><option>Vencida</option></select>
      <select id="orgFiltroSocios"><option value="">Todos los tamaños</option><option value="1-10">1-10 socios</option><option value="11-50">11-50 socios</option><option value="51-100">51-100 socios</option><option value="101+">101+ socios</option></select>
      <button class="btn btn-ghost btn-sm" onclick="limpiarFiltrosOrganizaciones()">🔄 Limpiar</button>
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
    const s=document.getElementById('orgSearch').value.trim();
    const e=document.getElementById('orgFiltroEstado').value;
    const t=document.getElementById('orgFiltroTipo').value;
    const f=document.getElementById('orgFiltroFondos').value;
    const d=document.getElementById('orgFiltroDirectiva').value;
    const so=document.getElementById('orgFiltroSocios').value;
    const p=new URLSearchParams({action:'list'});
    if(s)p.set('search',s); 
    if(e)p.set('estado',e); 
    if(t)p.set('tipo',t);
    if(f)p.set('fondos',f);
    if(d)p.set('directiva',d);
    if(so)p.set('socios',so);
    try {
      const r=await fetch(API+'/organizaciones.php?'+p); const d=await r.json();
      if(d.ok){orgData=d.data;orgPage=1;renderOrgTable();}
    } catch(e){document.getElementById('orgTbody').innerHTML=`<tr><td colspan="8"><div class="table-empty"><div class="icon">⚠️</div>Error al cargar.</div></td></tr>`;}
  }

  function renderOrgTable(){
    const tbody=document.getElementById('orgTbody');
    const total=orgData.length, pages=Math.max(1,Math.ceil(total/PER));
    orgPage=Math.min(orgPage,pages);
    const slice=orgData.slice((orgPage-1)*PER, orgPage*PER);
    if(!total){tbody.innerHTML=`<tr><td colspan="8"><div class="table-empty"><div class="icon">📭</div>Sin resultados.</div></td></tr>`;document.getElementById('orgPageInfo').textContent='';document.getElementById('orgPageBtns').innerHTML='';return;}
    tbody.innerHTML=slice.map(o=>{
      const est={Activa:'badge--green',Inactiva:'badge--gray',Suspendida:'badge--red'}[o.estado]||'badge--gray';
      const dir=o.estado_directiva==='Vigente'?'badge--green':o.estado_directiva==='Vencida'?'badge--red':'badge--gray';
      const alerta=o.dias_vence!=null&&o.dias_vence>=0&&o.dias_vence<=30?`<span class="badge badge--orange" title="${o.dias_vence} días">⚠ ${o.dias_vence}d</span>`:'';
      return `<tr>
        <td><strong>${escHtml(o.nombre)}</strong></td>
        <td class="muted">${escHtml(o.rut)}</td>
        <td class="muted">${escHtml(o.tipo_nombre||'—')}</td>
        <td><span class="badge ${est}">${o.estado}</span></td>
        <td>${o.estado_directiva?`<span class="badge ${dir}">${o.estado_directiva}</span>`:'<span class="muted">—</span>'} ${alerta}</td>
        <td class="muted">${o.numero_socios??0}</td>
        <td>${o.habilitada_fondos?'<span class="badge badge--green">Habilitada</span>':'<span class="badge badge--gray">No</span>'}</td>
        <td><div class="row-actions">
          <button class="btn-icon btn-icon--view" title="Ver detalle" onclick="verOrg(${o.id})"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></button>
          ${canEdit?`<button class="btn-icon btn-icon--edit" title="Editar" onclick="editOrg(${o.id})"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg></button>`:''}
          ${currentUser.rol==='administrador'?`<button class="btn-icon btn-icon--del" title="Eliminar" onclick="confirmDelOrg(${o.id},'${escHtml(o.nombre).replace(/'/g,"\\'")}')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg></button>`:''}
        </div></td></tr>`;
    }).join('');
    document.getElementById('orgPageInfo').textContent=`${(orgPage-1)*PER+1}–${Math.min(orgPage*PER,total)} de ${total}`;
    const btns=document.getElementById('orgPageBtns'); btns.innerHTML='';
    for(let i=1;i<=pages;i++){const b=document.createElement('button');b.className='btn-page'+(i===orgPage?' active':'');b.textContent=i;b.onclick=()=>{orgPage=i;renderOrgTable();};btns.appendChild(b);}
  }

  let searchTimer;
  document.getElementById('orgSearch').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(loadOrgs,350);});
  document.getElementById('orgFiltroEstado').addEventListener('change',loadOrgs);
  document.getElementById('orgFiltroTipo').addEventListener('change',loadOrgs);
  document.getElementById('orgFiltroFondos').addEventListener('change',loadOrgs);
  document.getElementById('orgFiltroDirectiva').addEventListener('change',loadOrgs);
  document.getElementById('orgFiltroSocios').addEventListener('change',loadOrgs);
  
  // Función para limpiar filtros
  window.limpiarFiltrosOrganizaciones = function() {
    document.getElementById('orgSearch').value = '';
    document.getElementById('orgFiltroEstado').value = '';
    document.getElementById('orgFiltroTipo').value = '';
    document.getElementById('orgFiltroFondos').value = '';
    document.getElementById('orgFiltroDirectiva').value = '';
    document.getElementById('orgFiltroSocios').value = '';
    loadOrgs();
  };
  
  loadOrgs();

  window.verOrg    = orgId => openOrgDetail(orgId);
  window.editOrg   = orgId => openOrgModal(orgId);
  window.openOrgModal = id => orgFormModal(id, tipos.data, loadOrgs);
  window.confirmDelOrg = (id,nombre) => {
    if(confirm(`¿Eliminar la organización "${nombre}"? Esta acción no se puede deshacer.`)) {
      fetch(API+'/organizaciones.php?id='+id,{method:'DELETE'}).then(r=>r.json()).then(d=>{
        if(d.ok)loadOrgs(); else alert(d.error||'Error al eliminar.');
      });
    }
  };
}

// ── MODAL FORMULARIO ORGANIZACIÓN 
async function orgFormModal(orgId=null, tipos=[], onSave=()=>{}) {
  // Cargar datos si es edición
  let org = null;
  if (orgId) {
    const r = await fetch(API+'/organizaciones.php?action=get&id='+orgId).then(r=>r.json());
    if (r.ok) org = r.data;
  }

  const tipoOpts = tipos.map(t=>`<option value="${t.id}" ${org?.tipo_id==t.id?'selected':''}>${escHtml(t.nombre)}</option>`).join('');
  const isEdit   = !!org;

  let overlay = document.getElementById('modalOrgForm');
  if (overlay) overlay.remove();

  document.body.insertAdjacentHTML('beforeend',`
  <div class="modal-overlay open" id="modalOrgForm" onclick="if(event.target.id==='modalOrgForm')closeModal('modalOrgForm')">
    <div class="modal modal--lg">
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
            <div class="form-group"><label>N° Inscripción Registro Civil</label><input type="text" id="fRegMun" value="${escHtml(org?.numero_registro_mun||'')}"/></div>
            <div class="form-group"><label>Fecha de constitución</label><input type="date" id="fFechaConst" value="${org?.fecha_constitucion||''}"/></div>
            <div class="form-group"><label>Personalidad Jurídica</label><select id="fPJ"><option value="0" ${!org?.personalidad_juridica?'selected':''}>Inactiva</option><option value="1" ${org?.personalidad_juridica?'selected':''}>Activa</option></select></div>
            <div class="form-group"><label>N° Decreto / Resolución</label><input type="text" id="fDecreto" value="${escHtml(org?.numero_decreto||'')}"/></div>
            <div class="form-group"><label>Estado *</label><select id="fEstado"><option ${org?.estado==='Activa'||!org?'selected':''}>Activa</option><option ${org?.estado==='Inactiva'?'selected':''}>Inactiva</option><option ${org?.estado==='Suspendida'?'selected':''}>Suspendida</option></select></div>
            <div class="form-group"><label>Habilitada para fondos</label><select id="fFondos"><option value="0" ${!org?.habilitada_fondos?'selected':''}>No habilitada</option><option value="1" ${org?.habilitada_fondos?'selected':''}>Habilitada</option></select></div>
          </div>
        </div>
        <div class="form-section">
          <div class="form-section-title">Ubicación</div>
          <div class="form-grid">
            <div class="form-group"><label>Dirección *</label><input type="text" id="fDir" value="${escHtml(org?.direccion||'')}" placeholder="Av. Ejemplo 123"/></div>
            <div class="form-group"><label>Dirección Sede</label><input type="text" id="fDirSede" value="${escHtml(org?.direccion_sede||'')}" placeholder="Dirección de la sede social"/></div>
            <div class="form-group"><label>Sector / Barrio</label><input type="text" id="fSector" value="${escHtml(org?.sector_barrio||'')}"/></div>
            <div class="form-group"><label>Comuna</label><input type="text" id="fComuna" value="${escHtml(org?.comuna||'Pucón')}" readonly style="background: rgba(201, 168, 76, 0.1); border: 1px solid rgba(201, 168, 76, 0.3); color: var(--cream);"/></div>
            <div class="form-group"><label>Región</label><input type="text" id="fRegion" value="${escHtml(org?.region||'La Araucanía')}" readonly style="background: rgba(201, 168, 76, 0.1); border: 1px solid rgba(201, 168, 76, 0.3); color: var(--cream);"/></div>
            <div class="form-group"><label>Código Postal</label><input type="text" id="fCodPostal" value="${escHtml(org?.codigo_postal||'')}"/></div>
          </div>
        </div>
        <div class="form-section">
          <div class="form-section-title">Contacto</div>
          <div class="form-grid">
            <div class="form-group"><label>Teléfono principal</label><input type="tel" id="fTel1" value="${escHtml(org?.telefono_principal||'')}"/></div>
            <div class="form-group"><label>Teléfono secundario</label><input type="tel" id="fTel2" value="${escHtml(org?.telefono_secundario||'')}"/></div>
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
            <div class="form-group"><label>Nombre banco</label><input type="text" id="fBanco" value="${escHtml(org?.nombre_banco||'')}"/></div>
            <div class="form-group"><label>Tipo de cuenta</label><input type="text" id="fCuenta" value="${escHtml(org?.tipo_cuenta||'')}" placeholder="Cuenta corriente…"/></div>
            <div class="form-group span-2"><label>Observaciones internas</label><textarea id="fObs" rows="3">${escHtml(org?.observaciones||'')}</textarea></div>
          </div>
        </div>
        ${isEdit ? `
        <div class="form-section">
          <div class="form-section-title">� Directiva - Cargos</div>
          <div id="directivaContainer">
            <div class="loading" style="text-align: center; padding: 20px;">
              <div class="spinner" style="margin: 0 auto 10px;"></div>
              <span>Cargando directiva...</span>
            </div>
          </div>
          <div style="margin-top: 15px;">
            <button class="btn btn-primary btn-sm" onclick="agregarCargoDirectiva(${orgId})">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
              Agregar Cargo
            </button>
          </div>
        </div>
        ` : ''}
        ${isEdit ? `
        <div class="form-section">
          <div class="form-section-title">� Historial de Subvenciones</div>
          <div id="subvencionesContainer">
            <div class="loading" style="text-align: center; padding: 20px;">
              <div class="spinner" style="margin: 0 auto 10px;"></div>
              <span>Cargando historial de subvenciones...</span>
            </div>
          </div>
          <div style="margin-top: 15px;">
            <button class="btn btn-primary btn-sm" onclick="openSubvencionForm(${orgId})">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
              Agregar Subvención
            </button>
          </div>
        </div>
        ` : ''}
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

  // Cargar subvenciones si es edición
  if (isEdit && orgId) {
    loadSubvenciones(orgId);
    loadDirectiva(orgId);
  }

  window.saveOrg = async function(id) {
    const payload = {
      nombre: document.getElementById('fNombre').value.trim(),
      rut: document.getElementById('fRut').value.trim(),
      tipo_id: document.getElementById('fTipo').value||null,
      numero_registro_mun: document.getElementById('fRegMun').value||null,
      fecha_constitucion: document.getElementById('fFechaConst').value||null,
      personalidad_juridica: document.getElementById('fPJ').value,
      numero_decreto: document.getElementById('fDecreto').value||null,
      estado: document.getElementById('fEstado').value,
      habilitada_fondos: document.getElementById('fFondos').value,
      direccion: document.getElementById('fDir').value.trim(),
      direccion_sede: document.getElementById('fDirSede').value||null,
      sector_barrio: document.getElementById('fSector').value||null,
      comuna: 'Pucón', // Siempre Pucón
      region: 'La Araucanía', // Siempre La Araucanía
      codigo_postal: document.getElementById('fCodPostal').value||null,
      telefono_principal: document.getElementById('fTel1').value||null,
      telefono_secundario: document.getElementById('fTel2').value||null,
      correo: document.getElementById('fCorreo').value||null,
      redes_sociales: document.getElementById('fRRSS').value||null,
      numero_socios: parseInt(document.getElementById('fSocios').value)||0,
      area_accion: document.getElementById('fArea').value||null,
      representante_legal: document.getElementById('fRepLegal').value||null,
      nombre_banco: document.getElementById('fBanco').value||null,
      tipo_cuenta: document.getElementById('fCuenta').value||null,
      observaciones: document.getElementById('fObs').value||null,
    };
    if (id) payload.id = id;
    const btn=document.getElementById('btnSaveOrg');
    btn.disabled=true; document.getElementById('btnSaveOrgTxt').style.display='none'; document.getElementById('spinSaveOrg').style.display='block';
    const r=await fetch(API+'/organizaciones.php',{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json());
    btn.disabled=false; document.getElementById('btnSaveOrgTxt').style.display=''; document.getElementById('spinSaveOrg').style.display='none';
    if(r.ok){closeModal('modalOrgForm');onSave();}
    else showAlert('orgFormErr',r.error||'Error al guardar.');
  };
}

// ── DETALLE ORGANIZACIÓN
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

  // Directiva actual
  const dirActual = dirs.find(d=>d.es_actual==1);

  document.body.insertAdjacentHTML('beforeend',`
  <div class="modal-overlay open" id="modalOrgDetail" onclick="if(event.target.id==='modalOrgDetail')closeModal('modalOrgDetail')">
    <div class="modal modal--lg">
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
            <div class="detail-item"><div class="lbl">Registro Municipal</div><div class="val">${escHtml(o.numero_registro_mun||'—')}</div></div>
            <div class="detail-item"><div class="lbl">Fecha Constitución</div><div class="val">${formatDate(o.fecha_constitucion)}</div></div>
            <div class="detail-item"><div class="lbl">Personalidad Jurídica</div><div class="val">${o.personalidad_juridica?'Sí':'No'}</div></div>
            <div class="detail-item"><div class="lbl">N° Decreto</div><div class="val">${escHtml(o.numero_decreto||'—')}</div></div>
            <div class="detail-item"><div class="lbl">Dirección</div><div class="val">${escHtml(o.direccion)}</div></div>
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
            <div style="background:rgba(255,255,255,.03);border:1px solid ${d.es_actual?'rgba(201,168,76,.2)':'rgba(255,255,255,.06)'};border-radius:10px;padding:16px;margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
                <div>
                  <span class="badge ${d.estado==='Vigente'?'badge--green':'badge--red'}">${d.estado}</span>
                  ${d.es_actual?'<span class="badge badge--gold" style="margin-left:6px">Actual</span>':''}
                </div>
                <div style="font-size:.78rem;color:var(--muted)">${formatDate(d.fecha_inicio)} — ${formatDate(d.fecha_termino)} &nbsp;·&nbsp; ${d.total_cargos} cargos</div>
                ${canEdit&&d.es_actual?`<button class="btn btn-ghost btn-sm" onclick="openCargosModal(${d.id},'${escHtml(o.nombre).replace(/'/g,"\\'")}')">Ver cargos</button>`:''}
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
    if(!confirm('¿Eliminar este documento?')) return;
    btn.disabled=true;
    const r=await fetch(API+'/documentos.php?id='+docId,{method:'DELETE'}).then(r=>r.json());
    if(r.ok){closeModal('modalOrgDetail');openOrgDetail(orgId);}
    else{alert(r.error||'Error.'); btn.disabled=false;}
  };
}

// ── MODAL DIRECTIVA
function dirFormModal(orgId, onSave=()=>{}) {
  let m = document.getElementById('modalDirForm'); if(m)m.remove();
  document.body.insertAdjacentHTML('beforeend',`
  <div class="modal-overlay open" id="modalDirForm" onclick="if(event.target.id==='modalDirForm')closeModal('modalDirForm')">
    <div class="modal">
      <button class="modal-close" onclick="closeModal('modalDirForm')">✕</button>
      <h3>Nueva Directiva</h3>
      <p class="subtitle">Registra una nueva directiva. La actual pasará al historial.</p>
      <div id="dirFormErr" class="alert alert--error"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg><span></span></div>
      <div class="form-group"><label>Fecha de inicio *</label><input type="date" id="dfInicio"/></div>
      <div class="form-group"><label>Fecha de término *</label><input type="date" id="dfTermino"/></div>
      <div class="form-group"><label>Estado</label><select id="dfEstado"><option>Vigente</option><option>Vencida</option></select></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('modalDirForm')">Cancelar</button>
        <button class="btn btn-primary" onclick="saveDirForm(${orgId})">Guardar directiva</button>
      </div>
    </div>
  </div>`);
  window.saveDirForm = async function(orgId){
    const i=document.getElementById('dfInicio').value, t=document.getElementById('dfTermino').value;
    if(!i||!t){showAlert('dirFormErr','Ambas fechas son requeridas.');return;}
    const r=await fetch(API+'/directivas.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({organizacion_id:orgId,fecha_inicio:i,fecha_termino:t,estado:document.getElementById('dfEstado').value})}).then(r=>r.json());
    if(r.ok){closeModal('modalDirForm');onSave();}
    else showAlert('dirFormErr',r.error||'Error al guardar.');
  };
}

// ── MODAL CARGOS
async function cargosModal(dirId, orgNombre='') {
  const r = await fetch(API+'/directivas.php?id='+dirId).then(r=>r.json());
  if(!r.ok){alert('Error al cargar cargos.');return;}
  const dir = r.data;
  const cargos = dir.cargos||[];
  const CARGOS_LIST=['Presidente','Presidenta','Vicepresidente','Vicepresidenta','Secretario','Secretaria','Tesorero','Tesorera','1° Director','2° Director','3° Director','Suplente'];
  const OBL=['Presidente','Presidenta','Secretario','Secretaria','Tesorero','Tesorera'];

  let m=document.getElementById('modalCargos');if(m)m.remove();
  document.body.insertAdjacentHTML('beforeend',`
  <div class="modal-overlay open" id="modalCargos" onclick="if(event.target.id==='modalCargos')closeModal('modalCargos')">
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
            <div class="form-group"><label>Teléfono</label><input type="tel" id="cfTel"/></div>
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

// ── MODAL SUBIR DOCUMENTO
function docUploadModal(orgId, onSave=()=>{}) {
  let m=document.getElementById('modalDocUp');if(m)m.remove();
  document.body.insertAdjacentHTML('beforeend',`
  <div class="modal-overlay open" id="modalDocUp" onclick="if(event.target.id==='modalDocUp')closeModal('modalDocUp')">
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
// ── REPORTES
function renderReportes(main) {
  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2>Reportes Municipales</h2>
        <p>Genera reportes detallados de organizaciones, sedes y personas.</p>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;opacity:0;animation:fadeUp .5s .1s forwards">
      ${[
        {tipo:'sedes', titulo:'📍 Listado de Sedes', desc:'Direcciones de sedes de todas las organizaciones comunitarias.', icon:'🏢'},
        {tipo:'personas_directiva', titulo:'👥 Estadísticas de Directiva', desc:'Cantidad de personas por cargo y estado de las directivas.', icon:'📊'},
        {tipo:'organizaciones_activas', titulo:'🏢 Organizaciones Activas', desc:'Listado completo de organizaciones con estado Activa.', icon:'✅'},
        {tipo:'organizaciones_sector', titulo:'🗺️ Organizaciones por Sector', desc:'Resumen de organizaciones agrupadas por sector o barrio.', icon:'📍'},
        {tipo:'organizaciones_fondos', titulo:'💰 Organizaciones con Fondos', desc:'Organizaciones habilitadas para postular a fondos municipales.', icon:'🎯'},
        {tipo:'directivas_vigentes', titulo:'👥 Directivas Vigentes', desc:'Todas las directivas en estado vigente con sus fechas.', icon:'📅'},
        {tipo:'personas_totales', titulo:'👥 Personas en Directivas', desc:'Total de personas asignadas a cargos en todas las organizaciones.', icon:'👥'}
      ].map(r=>`
        <div style="background:rgba(22,32,50,.6);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:24px">
          <div style="font-size:2rem;margin-bottom:12px">${r.icon}</div>
          <h3 style="font-family:var(--font-display);color:var(--cream);font-size:1rem;margin-bottom:6px">${r.titulo}</h3>
          <p style="font-size:.8rem;color:var(--muted);margin-bottom:20px;line-height:1.5">${r.desc}</p>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-secondary btn-sm" onclick="generarReporte('${r.tipo}', 'excel')" download>📊 Excel</button>
            <button class="btn btn-ghost btn-sm" onclick="generarReporte('${r.tipo}', 'pdf')" target="_blank">📄 PDF</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ── USUARIOS 
async function renderUsuarios(main) {
  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h2>Usuarios</h2><p>Gestión de accesos al sistema.</p></div>
      <div class="page-header-right"><button class="btn btn-primary" onclick="openUserModal()">+ Nuevo usuario</button></div>
    </div>
    <div class="toolbar">
      <div class="search-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z"/></svg>
        <input type="text" id="userSearch" placeholder="Buscar por nombre, usuario, email..."/>
      </div>
      <select id="userFiltroRol"><option value="">Todos los roles</option><option value="administrador">Administrador</option><option value="funcionario">Funcionario</option><option value="consulta">Solo Lectura</option></select>
      <select id="userFiltroEstado"><option value="">Todos los estados</option><option value="1">Activos</option><option value="0">Inactivos</option></select>
      <select id="userFiltroOrden"><option value="nombre">Ordenar por nombre</option><option value="username">Ordenar por usuario</option><option value="rol">Ordenar por rol</option><option value="creado">Ordenar por creación</option></select>
      <button class="btn btn-ghost btn-sm" onclick="limpiarFiltrosUsuarios()">🔄 Limpiar</button>
    </div>
    <div class="table-wrap" style="opacity:0;animation:fadeUp .5s .1s forwards">
      <table class="data-table">
        <thead><tr><th>Nombre</th><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody id="userTbody"><tr><td colspan="6"><div class="table-empty"><div class="icon">⏳</div>Cargando…</div></td></tr></tbody>
      </table>
    </div>`;

  async function loadUsers(){
    const s=document.getElementById('userSearch').value.trim();
    const r=document.getElementById('userFiltroRol').value;
    const e=document.getElementById('userFiltroEstado').value;
    const o=document.getElementById('userFiltroOrden').value;
    const p=new URLSearchParams();
    if(s)p.set('search',s);
    if(r)p.set('rol',r);
    if(e)p.set('estado',e);
    if(o)p.set('orden',o);
    
    const response=await fetch(API+'/usuarios.php?'+p).then(r=>r.json());
    if(!response.ok){document.getElementById('userTbody').innerHTML=`<tr><td colspan="6"><div class="table-empty">Error al cargar.</div></td></tr>`;return;}
    const rolColors={administrador:'badge--gold',funcionario:'badge--blue',consulta:'badge--gray'};
    document.getElementById('userTbody').innerHTML=response.data.map(u=>`
      <tr>
        <td><strong>${escHtml(u.nombre_completo||'—')}</strong></td>
        <td class="muted">${escHtml(u.username)}</td>
        <td class="muted">${escHtml(u.email)}</td>
        <td><span class="badge ${rolColors[u.rol]||'badge--gray'}">${u.rol}</span></td>
        <td>${u.activo?'<span class="badge badge--green">Activo</span>':'<span class="badge badge--red">Inactivo</span>'}</td>
        <td><div class="row-actions">
          <button class="btn-icon btn-icon--edit" onclick="openUserModal(${u.id})"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg></button>
          ${u.id!==currentUser.id?`<button class="btn-icon btn-icon--del" onclick="delUser(${u.id},'${escHtml(u.username).replace(/'/g,"\\'")}')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg></button>`:''}
        </div></td>
      </tr>`).join('');
  }
  
  // Event listeners para filtros de usuarios
  let userSearchTimer;
  document.getElementById('userSearch').addEventListener('input',()=>{
    clearTimeout(userSearchTimer);
    userSearchTimer=setTimeout(loadUsers,350);
  });
  document.getElementById('userFiltroRol').addEventListener('change',loadUsers);
  document.getElementById('userFiltroEstado').addEventListener('change',loadUsers);
  document.getElementById('userFiltroOrden').addEventListener('change',loadUsers);
  
  // Función para limpiar filtros de usuarios
  window.limpiarFiltrosUsuarios = function() {
    document.getElementById('userSearch').value = '';
    document.getElementById('userFiltroRol').value = '';
    document.getElementById('userFiltroEstado').value = '';
    document.getElementById('userFiltroOrden').value = 'nombre';
    loadUsers();
  };
  
  loadUsers();

  window.openUserModal = async function(id=null){
    let u=null;
    if(id){const r=await fetch(API+'/usuarios.php').then(r=>r.json());if(r.ok)u=r.data.find(x=>x.id===id);}
    let m=document.getElementById('modalUser');if(m)m.remove();
    document.body.insertAdjacentHTML('beforeend',`
    <div class="modal-overlay open" id="modalUser" onclick="if(event.target.id==='modalUser')closeModal('modalUser')">
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
    if(!confirm(`¿Eliminar usuario "${name}"?`))return;
    const r=await fetch(API+'/usuarios.php?id='+id,{method:'DELETE'}).then(r=>r.json());
    if(r.ok)loadUsers(); else alert(r.error||'Error.');
  };
}

// ── Cambiar contraseña
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

// ── Alertas de vencimiento
async function checkAlertas(){
  try {
    const r = await fetch(AUTH.apiBase+'/organizaciones.php?action=alertas').then(r=>r.json());
    if (!r.ok || !Array.isArray(r.data) || !r.data.length) return;

    const total = r.data.length;
    const primeras = r.data.slice(0, 3);
    const resumen = primeras
      .map(a => `${escHtml(a.nombre)} (${a.dias_restantes} días)`)
      .join(' · ');

    const main = document.getElementById('mainContent');
    if (!main) return;

    // Si estamos en home, ya hay un banner específico arriba del listado
    const alertaHome = document.getElementById('alertaBanner');
    if (alertaHome) {
      alertaHome.innerHTML = `
        <div class="alert-banner" onclick="loadPage('organizaciones',document.querySelectorAll('.nav-item')[1])">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
          </svg>
          <div>
            <strong class="count">${total}</strong> directiva${total>1?'s':''} por vencer en los próximos 30 días — <u>Ver organizaciones</u>
            <div style="font-size:.75rem;color:var(--muted);margin-top:2px">${resumen}</div>
          </div>
        </div>`;
      return;
    }

    // En otras páginas, inserta un banner arriba del main si no existe
    if (!document.getElementById('globalAlertas')) {
      const wrapper = document.createElement('div');
      wrapper.id = 'globalAlertas';
      wrapper.innerHTML = `
        <div class="alert-banner" onclick="loadPage('organizaciones',document.querySelectorAll('.nav-item')[1])">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
          </svg>
          <div>
            <strong class="count">${total}</strong> directiva${total>1?'s':''} por vencer en los próximos 30 días — <u>Ver organizaciones</u>
            <div style="font-size:.75rem;color:var(--muted);margin-top:2px">${resumen}</div>
          </div>
        </div>`;
      main.prepend(wrapper);
    }
  } catch (e) {
    console.error(e);
  }
}

function validateChangePassword() {
  const currentPassword = document.getElementById('cpCurrent').value;
  const newPassword = document.getElementById('cpNew').value;
  const confirmPassword = document.getElementById('cpConfirm').value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    alert('Por favor, completa todos los campos.');
    return false;
  }

  if (newPassword !== confirmPassword) {
    alert('Las contraseñas no coinciden.');
    return false;
  }

  if (newPassword.length < 8) {
    alert('La nueva contraseña debe tener al menos 8 caracteres.');
    return false;
  }

  return true;
}

// ── BACKUPS 
async function renderBackups(main) {
  const isAdmin = currentUser && currentUser.rol === 'administrador';
  
  if (!isAdmin) {
    main.innerHTML = `
      <div class="page-error">
        <div class="error-icon">🔒</div>
        <h2>Acceso Restringido</h2>
        <p>Esta sección está disponible solo para administradores del sistema.</p>
      </div>
    `;
    return;
  }
  
  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h2>Gestión de Backups</h2><p>Backups automáticos y restauración del sistema.</p></div>
      <div class="page-header-right">
        <button class="btn btn-primary btn-sm" onclick="createBackup('database')">💾 BD</button>
        <button class="btn btn-secondary btn-sm" onclick="createBackup('files')">📁 Archivos</button>
        <button class="btn btn-ghost btn-sm" onclick="loadBackupConfig()">⚙️ Config</button>
      </div>
    </div>
    
    <!-- Estadísticas de backups -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-val" id="dbBackupCount">—</div>
        <div class="stat-lbl">Backups de BD</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" id="filesBackupCount">—</div>
        <div class="stat-lbl">Backups de Archivos</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" id="lastBackupDate">—</div>
        <div class="stat-lbl">Último Backup</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" id="totalBackupSize">—</div>
        <div class="stat-lbl">Espacio Usado</div>
      </div>
    </div>
    
    <!-- Filtros -->
    <div class="toolbar">
      <select id="backupType">
        <option value="all">Todos los backups</option>
        <option value="database">Solo base de datos</option>
        <option value="files">Solo archivos</option>
      </select>
      <button class="btn btn-ghost btn-sm" onclick="runAutoBackup()">🔄 Ejecutar Auto</button>
    </div>
    
    <!-- Lista de backups -->
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Fecha</th>
            <th>Tamaño</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="backupTbody">
          <tr><td colspan="5"><div class="table-empty"><div class="icon">⏳</div>Cargando...</div></td></tr>
        </tbody>
      </table>
    </div>
  `;

  let backupData = [];
  
  // Cargar lista de backups
  async function loadBackups(type = 'all') {
    try {
      const r = await fetch(API+'/backup.php?action=list&type='+type);
      const d = await r.json();
      if (d.ok) {
        backupData = d.data;
        renderBackupTable();
        updateStats();
      }
    } catch(e) {
      document.getElementById('backupTbody').innerHTML = 
        `<tr><td colspan="5"><div class="table-empty"><div class="icon">⚠️</div>Error al cargar backups.</div></td></tr>`;
    }
  }

  function renderBackupTable() {
    const tbody = document.getElementById('backupTbody');
    
    if (!backupData.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="table-empty"><div class="icon">📭</div>No hay backups disponibles.</div></td></tr>`;
      return;
    }
    
    tbody.innerHTML = backupData.map(backup => {
      const typeIcon = backup.type === 'database' ? '🗄️' : '📁';
      const typeLabel = backup.type === 'database' ? 'Base de Datos' : 'Archivos';
      const sizeFormatted = formatBytes(backup.size);
      
      return `<tr>
        <td>
          <strong>${escHtml(backup.name)}</strong>
        </td>
        <td>
          <span class="badge badge--${backup.type === 'database' ? 'blue' : 'green'}">
            ${typeIcon} ${typeLabel}
          </span>
        </td>
        <td>${formatDateTime(backup.date)}</td>
        <td class="muted">${sizeFormatted}</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-ghost btn-sm" onclick="downloadBackup('${backup.name}')" title="Descargar">
              ⬇️
            </button>
            <button class="btn btn-ghost btn-sm" onclick="restoreBackup('${backup.name}')" title="Restaurar" ${backup.type !== 'database' ? 'disabled' : ''}>
              ↩️
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteBackup('${backup.name}')" title="Eliminar">
              🗑️
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function updateStats() {
    const dbBackups = backupData.filter(b => b.type === 'database');
    const filesBackups = backupData.filter(b => b.type === 'files');
    const totalSize = backupData.reduce((sum, b) => sum + b.size, 0);
    const lastBackup = backupData.length > 0 ? backupData[0] : null;
    
    document.getElementById('dbBackupCount').textContent = dbBackups.length;
    document.getElementById('filesBackupCount').textContent = filesBackups.length;
    document.getElementById('lastBackupDate').textContent = lastBackup ? formatDate(lastBackup.date) : '—';
    document.getElementById('totalBackupSize').textContent = formatBytes(totalSize);
  }

  function formatDateTime(fecha) {
    if (!fecha) return '—';
    const d = new Date(fecha + 'T12:00:00');
    return d.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDate(fecha) {
    if (!fecha) return '—';
    const d = new Date(fecha + 'T12:00:00');
    return d.toLocaleDateString('es-CL');
  }

  // Funciones globales
  window.createBackup = async function(type) {
    try {
      const r = await fetch(API+'/backup.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=create_' + type
      });
      const d = await r.json();
      
      if (d.ok) {
        showAlert('success', `Backup de ${type === 'database' ? 'base de datos' : 'archivos'} creado exitosamente.`);
        loadBackups(); // Recargar lista
      } else {
        showAlert('error', d.error || 'Error al crear backup.');
      }
    } catch(e) {
      showAlert('error', 'Error de conexión al crear backup.');
    }
  };

  window.downloadBackup = function(filename) {
    window.open(API+'/backup.php?action=download&file='+encodeURIComponent(filename), '_blank');
  };

  window.restoreBackup = async function(filename) {
    if (!confirm('⚠️ ADVERTENCIA: Esta acción sobreescribirá completamente la base de datos actual. ¿Estás absolutamente seguro?')) {
      return;
    }
    
    try {
      const r = await fetch(API+'/backup.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=restore&file='+encodeURIComponent(filename)+'&confirmed=true'
      });
      const d = await r.json();
      
      if (d.ok) {
        showAlert('success', 'Base de datos restaurada exitosamente.');
        setTimeout(() => location.reload(), 2000);
      } else {
        showAlert('error', d.error || 'Error al restaurar backup.');
      }
    } catch(e) {
      showAlert('error', 'Error de conexión al restaurar backup.');
    }
  };

  window.deleteBackup = async function(filename) {
    if (!confirm(`¿Estás seguro de eliminar el backup "${filename}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    
    try {
      const r = await fetch(API+'/backup.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=delete&file='+encodeURIComponent(filename)
      });
      const d = await r.json();
      
      if (d.ok) {
        showAlert('success', 'Backup eliminado exitosamente.');
        loadBackups(); // Recargar lista
      } else {
        showAlert('error', d.error || 'Error al eliminar backup.');
      }
    } catch(e) {
      showAlert('error', 'Error de conexión al eliminar backup.');
    }
  };

  window.runAutoBackup = async function() {
    try {
      const r = await fetch(API+'/backup.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=run_auto'
      });
      const d = await r.json();
      
      if (d.ok) {
        showAlert('success', d.message);
        loadBackups(); // Recargar lista
      } else {
        showAlert('error', d.error || 'Error al ejecutar backup automático.');
      }
    } catch(e) {
      showAlert('error', 'Error de conexión.');
    }
  };

  window.loadBackupConfig = async function() {
    try {
      const r = await fetch(API+'/backup.php?action=config');
      const d = await r.json();
      
      if (d.ok) {
        showBackupConfigModal(d.data);
      } else {
        showAlert('error', 'Error al cargar configuración.');
      }
    } catch(e) {
      showAlert('error', 'Error de conexión.');
    }
  };

  function showBackupConfigModal(config) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal modal--lg">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        <h3>⚙️ Configuración de Backups Automáticos</h3>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>
                <input type="checkbox" id="autoBackupEnabled" ${config.auto_backup ? 'checked' : ''}>
                Activar backups automáticos
              </label>
            </div>
            <div class="form-group">
              <label>Frecuencia Base de Datos</label>
              <select id="dbFrequency">
                <option value="daily" ${config.database_frequency === 'daily' ? 'selected' : ''}>Diario</option>
                <option value="weekly" ${config.database_frequency === 'weekly' ? 'selected' : ''}>Semanal</option>
                <option value="monthly" ${config.database_frequency === 'monthly' ? 'selected' : ''}>Mensual</option>
              </select>
            </div>
            <div class="form-group">
              <label>Frecuencia Archivos</label>
              <select id="filesFrequency">
                <option value="daily" ${config.files_frequency === 'daily' ? 'selected' : ''}>Diario</option>
                <option value="weekly" ${config.files_frequency === 'weekly' ? 'selected' : ''}>Semanal</option>
                <option value="monthly" ${config.files_frequency === 'monthly' ? 'selected' : ''}>Mensual</option>
              </select>
            </div>
            <div class="form-group">
              <label>Máximos Backups BD</label>
              <input type="number" id="maxDbBackups" value="${config.max_backups?.database || 10}" min="1" max="50">
            </div>
            <div class="form-group">
              <label>Máximos Backups Archivos</label>
              <input type="number" id="maxFilesBackups" value="${config.max_backups?.files || 5}" min="1" max="20">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-primary" onclick="saveBackupConfig()">Guardar Configuración</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  window.saveBackupConfig = async function() {
    const config = {
      auto_backup: document.getElementById('autoBackupEnabled').checked,
      database_frequency: document.getElementById('dbFrequency').value,
      files_frequency: document.getElementById('filesFrequency').value,
      max_backups: {
        database: parseInt(document.getElementById('maxDbBackups').value),
        files: parseInt(document.getElementById('maxFilesBackups').value)
      }
    };
    
    try {
      const r = await fetch(API+'/backup.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_config', config })
      });
      const d = await r.json();
      
      if (d.ok) {
        showAlert('success', d.message);
        document.querySelector('.modal-overlay').remove();
      } else {
        showAlert('error', d.error || 'Error al guardar configuración.');
      }
    } catch(e) {
      showAlert('error', 'Error de conexión.');
    }
  };

  // Event listeners
  document.getElementById('backupType').addEventListener('change', (e) => {
    loadBackups(e.target.value);
  });

  // Carga inicial
  loadBackups();
}

// ── Funciones de menú móvil ─────────────────────────────────────
window.toggleMobileMenu = function() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('mobileOverlay');
  
  if (sidebar && overlay) {
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
  }
};

// ── ACCESOS 
async function renderAccesos(main) {
  const isAdmin = currentUser && currentUser.rol === 'administrador';
  
  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left"><h2>Registro de Accesos</h2><p>Historial de ingresos y auditoría del sistema.</p></div>
      <div class="page-header-right">
        <button class="btn btn-primary btn-sm" onclick="loadAccesosStats()">📊 Estadísticas</button>
      </div>
    </div>
    
    <!-- Filtros -->
    <div class="toolbar">
      <div class="search-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z"/></svg>
        <input type="text" id="accesoSearch" placeholder="Buscar por usuario, nombre o IP..."/>
      </div>
      ${isAdmin ? `
      <select id="accesoUsuario">
        <option value="">Todos los usuarios</option>
      </select>` : ''}
      <select id="accesoLimit">
        <option value="25">25 registros</option>
        <option value="50" selected>50 registros</option>
        <option value="100">100 registros</option>
        <option value="200">200 registros</option>
      </select>
    </div>
    
    <!-- Tabla de accesos -->
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Nombre Completo</th>
            <th>IP</th>
            <th>Dispositivo</th>
            <th>Navegador</th>
            <th>Fecha Acceso</th>
            <th>Duración</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody id="accesoTbody">
          <tr><td colspan="8"><div class="table-empty"><div class="icon">⏳</div>Cargando...</div></td></tr>
        </tbody>
      </table>
      <div class="pagination">
        <span id="accesoPageInfo"></span>
        <div class="pagination-btns" id="accesoPageBtns"></div>
      </div>
    </div>
  `;

  // Cargar usuarios si es admin
  if (isAdmin) {
    try {
      const r = await fetch(API+'/usuarios.php');
      const d = await r.json();
      if (d.ok) {
        const sel = document.getElementById('accesoUsuario');
        d.data.forEach(u => {
          const o = document.createElement('option');
          o.value = u.id;
          o.textContent = `${u.nombre_completo} (${u.username})`;
          sel.appendChild(o);
        });
      }
    } catch(e) { console.error('Error cargando usuarios:', e); }
  }

  let accesoData = [], accesoPage = 1;
  const PER = 50;

  async function loadAccesos() {
    const search = document.getElementById('accesoSearch').value.trim();
    const usuarioId = document.getElementById('accesoUsuario')?.value || '';
    const limit = parseInt(document.getElementById('accesoLimit').value) || PER;
    
    const params = new URLSearchParams({
      action: 'list',
      limit: limit,
      offset: (accesoPage - 1) * limit,
      ...(usuarioId && { usuario_id: usuarioId }),
      ...(search && { search })
    });

    try {
      const r = await fetch(API+'/accesos.php?'+params);
      const d = await r.json();
      if (d.ok) {
        accesoData = d.data;
        renderAccesoTable();
      }
    } catch(e) {
      document.getElementById('accesoTbody').innerHTML = 
        `<tr><td colspan="8"><div class="table-empty"><div class="icon">⚠️</div>Error al cargar accesos.</div></td></tr>`;
    }
  }

  function renderAccesoTable() {
    const tbody = document.getElementById('accesoTbody');
    const total = accesoData.length;
    const pages = Math.max(1, Math.ceil(total / PER));
    accesoPage = Math.min(accesoPage, pages);
    const slice = accesoData.slice((accesoPage - 1) * PER, accesoPage * PER);
    
    if (!total) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="table-empty"><div class="icon">📭</div>Sin accesos registrados.</div></td></tr>`;
      document.getElementById('accesoPageInfo').textContent = '';
      document.getElementById('accesoPageBtns').innerHTML = '';
      return;
    }

    tbody.innerHTML = slice.map(a => {
      const dispositivoIcon = a.dispositivo === 'Móvil' ? '📱' : a.dispositivo === 'Tablet' ? '📋' : '💻';
      const browserIcon = getBrowserIcon(a.navegador);
      const estadoBadge = a.fecha_logout ? 
        '<span class="badge badge--gray">Cerrada</span>' : 
        '<span class="badge badge--green">Activa</span>';
      
      return `<tr>
        <td><strong>${escHtml(a.username)}</strong></td>
        <td>${escHtml(a.nombre_completo || '—')}</td>
        <td class="muted">${escHtml(a.ip_address)}</td>
        <td>${dispositivoIcon} ${escHtml(a.dispositivo)}</td>
        <td>${browserIcon} ${escHtml(a.navegador)}</td>
        <td>${formatDateTime(a.fecha_acceso)}</td>
        <td class="muted">${a.duracion_formateada || '—'}</td>
        <td>${estadoBadge}</td>
      </tr>`;
    }).join('');

    // Paginación
    document.getElementById('accesoPageInfo').textContent = 
      `${(accesoPage - 1) * PER + 1}–${Math.min(accesoPage * PER, total)} de ${total}`;
    
    const btns = document.getElementById('accesoPageBtns');
    btns.innerHTML = '';
    for (let i = 1; i <= pages; i++) {
      const b = document.createElement('button');
      b.className = 'btn-page' + (i === accesoPage ? ' active' : '');
      b.textContent = i;
      b.onclick = () => { accesoPage = i; renderAccesoTable(); };
      btns.appendChild(b);
    }
  }

  function getBrowserIcon(browser) {
    const icons = {
      'Chrome': '🌐',
      'Firefox': '🦊',
      'Safari': '🧭',
      'Edge': '📘',
      'Opera': '🎭',
      'Internet Explorer': '🔷'
    };
    return icons[browser] || '🌐';
  }

  function formatDateTime(fecha) {
    if (!fecha) return '—';
    const d = new Date(fecha + 'T12:00:00');
    return d.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  window.loadAccesosStats = async function() {
    try {
      const r = await fetch(API+'/accesos.php?action=stats&dias=30');
      const d = await r.json();
      if (d.ok) {
        showStatsModal(d.data);
      }
    } catch(e) {
      alert('Error al cargar estadísticas');
    }
  };

  function showStatsModal(stats) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal modal--lg">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        <h3>📊 Estadísticas de Accesos (Últimos 30 días)</h3>
        <div class="modal-body">
          <div class="stats-grid">
            ${stats.map(s => `
              <div class="stat-card">
                <div class="stat-val">${s.total_accesos}</div>
                <div class="stat-lbl">Total accesos</div>
              </div>
              <div class="stat-card">
                <div class="stat-val">${s.usuarios_unicos}</div>
                <div class="stat-lbl">Usuarios únicos</div>
              </div>
              <div class="stat-card">
                <div class="stat-val">${s.ips_unicas}</div>
                <div class="stat-lbl">IPs únicas</div>
              </div>
              <div class="stat-card">
                <div class="stat-val">${s.accesos_movil}</div>
                <div class="stat-lbl">Accesos móviles</div>
              </div>
              <div class="stat-card">
                <div class="stat-val">${s.accesos_desktop}</div>
                <div class="stat-lbl">Accesos desktop</div>
              </div>
              <div class="stat-card">
                <div class="stat-val">${s.accesos_tablet}</div>
                <div class="stat-lbl">Accesos tablet</div>
              </div>
              <div class="stat-card">
                <div class="stat-val">${Math.round(s.duracion_promedio || 0)}s</div>
                <div class="stat-lbl">Duración promedio</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Event listeners
  let searchTimer;
  document.getElementById('accesoSearch').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { accesoPage = 1; loadAccesos(); }, 350);
  });
  
  document.getElementById('accesoUsuario')?.addEventListener('change', () => {
    accesoPage = 1; loadAccesos();
  });
  
  document.getElementById('accesoLimit').addEventListener('change', () => {
    accesoPage = 1; loadAccesos();
  });

  // Carga inicial
  loadAccesos();
}

// ── FUNCIONES DE SUBVENCIONES ─────────────────────────────────────

// Cargar historial de subvenciones de una organización
async function loadSubvenciones(orgId) {
  try {
    const response = await fetch(`${API}/subvenciones.php?action=list&org_id=${orgId}`);
    const result = await response.json();
    
    const container = document.getElementById('subvencionesContainer');
    
    if (!result.ok) {
      container.innerHTML = `
        <div class="alert alert--error">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
          <span>Error al cargar subvenciones: ${result.error}</span>
        </div>
      `;
      return;
    }
    
    // También cargar estadísticas
    const statsResponse = await fetch(`${API}/subvenciones.php?action=stats&org_id=${orgId}`);
    const statsResult = await statsResponse.json();
    
    renderSubvenciones(result.data, statsResult.ok ? statsResult.data : null);
    
  } catch (error) {
    const container = document.getElementById('subvencionesContainer');
    container.innerHTML = `
      <div class="alert alert--error">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
        <span>Error de conexión: ${error.message}</span>
      </div>
    `;
  }
}

// Renderizar subvenciones y estadísticas
function renderSubvenciones(subvenciones, stats) {
  const container = document.getElementById('subvencionesContainer');
  
  // Renderizar estadísticas
  let statsHtml = '';
  if (stats) {
    const { estadisticas, historial_anual } = stats;
    statsHtml = `
      <div class="subvenciones-stats" style="background: rgba(201, 168, 76, 0.1); border: 1px solid rgba(201, 168, 76, 0.3); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
        <h4 style="color: var(--gold); margin-bottom: 10px;">📊 Estadísticas de Subvenciones</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
          <div>
            <div style="font-size: 1.5rem; font-weight: bold; color: var(--cream);">${estadisticas.total_postulaciones}</div>
            <div style="font-size: 0.9rem; color: var(--muted);">Total Postulaciones</div>
          </div>
          <div>
            <div style="font-size: 1.5rem; font-weight: bold; color: var(--success);">${estadisticas.total_aprobadas}</div>
            <div style="font-size: 0.9rem; color: var(--muted);">Aprobadas</div>
          </div>
          <div>
            <div style="font-size: 1.5rem; font-weight: bold; color: var(--cream);">$${Number(estadisticas.monto_total_aprobado || 0).toLocaleString()}</div>
            <div style="font-size: 0.9rem; color: var(--muted);">Monto Total</div>
          </div>
          <div>
            <div style="font-size: 1.5rem; font-weight: bold; color: var(--warning);">${estadisticas.total_pendientes}</div>
            <div style="font-size: 0.9rem; color: var(--muted);">Pendientes</div>
          </div>
        </div>
        ${historial_anual.length > 0 ? `
          <div style="margin-top: 15px;">
            <h5 style="color: var(--cream); margin-bottom: 8px;">Historial por Año:</h5>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              ${historial_anual.map(item => `
                <div style="background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">
                  <div style="font-weight: bold; color: var(--gold);">${item.ano_postulacion}</div>
                  <div style="font-size: 0.8rem; color: var(--muted);">${item.cantidad} postulaciones, ${item.aprobadas} aprobadas</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // Renderizar lista de subvenciones
  if (subvenciones.length === 0) {
    container.innerHTML = statsHtml + `
      <div style="text-align: center; padding: 30px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
        <div style="font-size: 2rem; margin-bottom: 10px;">📋</div>
        <div style="color: var(--muted);">No hay subvenciones registradas</div>
        <div style="font-size: 0.9rem; color: var(--muted); margin-top: 5px;">Haz clic en "Agregar Subvención" para registrar la primera</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = statsHtml + `
    <div class="subvenciones-list">
      ${subvenciones.map(sub => `
        <div class="subvencion-item" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 15px; margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
            <div>
              <h5 style="color: var(--cream); margin-bottom: 5px;">${escHtml(sub.nombre_subvencion)}</h5>
              <div style="display: flex; gap: 15px; font-size: 0.9rem; color: var(--muted);">
                <span>📅 Año: ${sub.ano_postulacion}</span>
                <span>📊 Estado: <span class="badge ${getEstadoClass(sub.estado)}">${sub.estado}</span></span>
                ${sub.monto_aprobado ? `<span>💰 $${Number(sub.monto_aprobado).toLocaleString()}</span>` : ''}
              </div>
            </div>
            <div style="display: flex; gap: 5px;">
              <button class="btn btn-ghost btn-sm" onclick="editSubvencion(${sub.id})" title="Editar">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>
              </button>
              <button class="btn btn-ghost btn-sm" onclick="deleteSubvencion(${sub.id}, '${escHtml(sub.nombre_subvencion)}')" title="Eliminar">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
              </button>
            </div>
          </div>
          ${sub.fecha_resolucion ? `<div style="font-size: 0.9rem; color: var(--muted); margin-bottom: 5px;">📄 Fecha de resolución: ${formatDate(sub.fecha_resolucion)}</div>` : ''}
          ${sub.observaciones ? `<div style="font-size: 0.9rem; color: var(--muted); margin-bottom: 5px;">📝 ${escHtml(sub.observaciones)}</div>` : ''}
          <div style="font-size: 0.8rem; color: var(--muted);">Registrado: ${formatDateTime(sub.creado_en)} ${sub.creado_por_nombre ? `por ${sub.creado_por_nombre}` : ''}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// Obtener clase CSS para estado de subvención
function getEstadoClass(estado) {
  const classes = {
    'Postulada': 'badge--secondary',
    'Aprobada': 'badge--success',
    'Rechazada': 'badge--danger',
    'En Evaluación': 'badge--warning'
  };
  return classes[estado] || 'badge--secondary';
}

// Abrir formulario de subvención
window.openSubvencionForm = function(orgId, subvencionId = null) {
  // Implementar formulario de subvención
  console.log('Abrir formulario de subvención para org:', orgId, 'subvención:', subvencionId);
  // TODO: Implementar modal de formulario de subvención
};

// Editar subvención
window.editSubvencion = function(id) {
  console.log('Editar subvención:', id);
  // TODO: Implementar edición
};

// Eliminar subvención
window.deleteSubvencion = function(id, nombre) {
  if (confirm(`¿Eliminar la subvención "${nombre}"? Esta acción no se puede deshacer.`)) {
    console.log('Eliminar subvención:', id);
    // TODO: Implementar eliminación
  }
};

// ── FUNCIONES DE DIRECTIVA ─────────────────────────────────────

// Cargar directiva de una organización
async function loadDirectiva(orgId) {
  try {
    const response = await fetch(`${API}/directivas.php?org_id=${orgId}`);
    const result = await response.json();
    
    const container = document.getElementById('directivaContainer');
    
    if (!result.ok) {
      container.innerHTML = `
        <div class="alert alert--error">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
          <span>Error al cargar directiva: ${result.error}</span>
        </div>
      `;
      return;
    }
    
    renderDirectiva(result.data);
    
  } catch (error) {
    const container = document.getElementById('directivaContainer');
    container.innerHTML = `
      <div class="alert alert--error">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
        <span>Error de conexión: ${error.message}</span>
      </div>
    `;
  }
}

// Renderizar directiva con cargos específicos
function renderDirectiva(directiva) {
  const container = document.getElementById('directivaContainer');
  
  if (!directiva || directiva.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
        <div style="font-size: 2rem; margin-bottom: 10px;">👥</div>
        <div style="color: var(--muted);">No hay cargos registrados en la directiva</div>
        <div style="font-size: 0.9rem; color: var(--muted); margin-top: 5px;">Haz clic en "Agregar Cargo" para registrar el primer cargo</div>
      </div>
    `;
    return;
  }
  
  // Agrupar por cargo
  const cargosValidos = ['Presidente', 'Secretario', 'Tesorero', 'Vicepresidente', '1° Director', '2° Director', '3° Director', 'Suplente'];
  
  container.innerHTML = `
    <div class="directiva-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
      ${cargosValidos.map(cargo => {
        const miembro = directiva.find(d => d.cargo === cargo);
        return `
          <div class="cargo-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <h5 style="color: var(--gold); margin: 0;">${cargo}</h5>
              <div style="display: flex; gap: 5px;">
                ${miembro ? `
                  <button class="btn btn-ghost btn-sm" onclick="editarCargoDirectiva(${miembro.id})" title="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>
                  </button>
                  <button class="btn btn-ghost btn-sm" onclick="eliminarCargoDirectiva(${miembro.id}, '${cargo}')" title="Eliminar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                  </button>
                ` : `
                  <button class="btn btn-primary btn-sm" onclick="agregarCargoDirectivaConTipo(${orgId}, '${cargo}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3V4A.5.5 0 0 1 8 4z"/>
                    Asignar
                  </button>
                `}
              </div>
            </div>
            ${miembro ? `
              <div style="font-size: 0.9rem; color: var(--muted);">
                <div><strong>👤 ${escHtml(miembro.nombre)}</strong></div>
                <div>📧 ${escHtml(miembro.email) || 'Sin email'}</div>
                <div>📱 ${escHtml(miembro.telefono) || 'Sin teléfono'}</div>
                <div>🏢 ${escHtml(miembro.direccion) || 'Sin dirección'}</div>
                <div>🆔 ${escHtml(miembro.rut)}</div>
                ${miembro.inicio_periodo ? `<div>📅 Período: ${formatDate(miembro.inicio_periodo)} - ${formatDate(miembro.fin_periodo || '')}</div>` : ''}
              </div>
            ` : `
              <div style="font-size: 0.9rem; color: var(--muted); text-align: center; padding: 20px 0;">
                <div style="font-size: 1.2rem; margin-bottom: 5px;">👤</div>
                <div>Sin persona asignada</div>
              </div>
            `}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Abrir formulario para agregar cargo específico
window.agregarCargoDirectivaConTipo = function(orgId, tipoCargo) {
  openCargoDirectivaModal(orgId, null, tipoCargo);
};

// Abrir formulario de cargo de directiva
window.agregarCargoDirectiva = function(orgId) {
  openCargoDirectivaModal(orgId);
};

// Editar cargo de directiva
window.editarCargoDirectiva = function(cargoId) {
  // TODO: Implementar edición
  console.log('Editar cargo:', cargoId);
};

// Eliminar cargo de directiva
window.eliminarCargoDirectiva = function(cargoId, cargo) {
  if (confirm(`¿Eliminar el cargo "${cargo}"? Esta acción no se puede deshacer.`)) {
    console.log('Eliminar cargo:', cargoId);
    // TODO: Implementar eliminación
  }
};

// Modal para agregar/editar cargo de directiva
function openCargoDirectivaModal(orgId, cargoId = null, tipoCargo = null) {
  const isEdit = !!cargoId;
  const cargo = tipoCargo || '';
  
  let overlay = document.getElementById('modalCargoDirectiva');
  if (overlay) overlay.remove();

  document.body.insertAdjacentHTML('beforeend',`
  <div class="modal-overlay open" id="modalCargoDirectiva" onclick="if(event.target.id==='modalCargoDirectiva')closeModal('modalCargoDirectiva')">
    <div class="modal">
      <button class="modal-close" onclick="closeModal('modalCargoDirectiva')">✕</button>
      <h3>${isEdit ? 'Editar' : 'Asignar'} Cargo de Directiva</h3>
      <p class="subtitle">${isEdit ? 'Modifica los datos del cargo.' : 'Asigna una persona a un cargo específico de la directiva.'}</p>
      <div id="cargoFormErr" class="alert alert--error"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg><span></span></div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group">
            <label>Cargo *</label>
            <select id="cargoTipo" ${cargo ? 'disabled style="opacity: 0.6;"' : ''}>
              <option value="">— Seleccionar Cargo —</option>
              <option value="Presidente" ${cargo === 'Presidente' ? 'selected' : ''}>Presidente</option>
              <option value="Secretario" ${cargo === 'Secretario' ? 'selected' : ''}>Secretario</option>
              <option value="Tesorero" ${cargo === 'Tesorero' ? 'selected' : ''}>Tesorero</option>
              <option value="Vicepresidente" ${cargo === 'Vicepresidente' ? 'selected' : ''}>Vicepresidente</option>
              <option value="1° Director" ${cargo === '1° Director' ? 'selected' : ''}>1° Director</option>
              <option value="2° Director" ${cargo === '2° Director' ? 'selected' : ''}>2° Director</option>
              <option value="3° Director" ${cargo === '3° Director' ? 'selected' : ''}>3° Director</option>
              <option value="Suplente" ${cargo === 'Suplente' ? 'selected' : ''}>Suplente</option>
            </select>
          </div>
          <div class="form-group"><label>Nombre completo *</label><input type="text" id="cargoNombre" placeholder="Nombre completo de la persona"/></div>
          <div class="form-group"><label>RUT *</label><input type="text" id="cargoRut" placeholder="12.345.678-9"/></div>
          <div class="form-group"><label>Email</label><input type="email" id="cargoEmail" placeholder="correo@ejemplo.com"/></div>
          <div class="form-group"><label>Teléfono</label><input type="tel" id="cargoTelefono" placeholder="+56 9 1234 5678"/></div>
          <div class="form-group"><label>Dirección Directiva</label><input type="text" id="cargoDireccion" placeholder="Dirección donde ejerce el cargo"/></div>
          <div class="form-group"><label>Inicio del período</label><input type="date" id="cargoInicio"/></div>
          <div class="form-group"><label>Fin del período</label><input type="date" id="cargoFin"/></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('modalCargoDirectiva')">Cancelar</button>
        <button class="btn btn-primary" id="btnSaveCargo" onclick="guardarCargoDirectiva(${orgId}, ${cargoId || 'null'})">
          <span id="btnSaveCargoTxt">${isEdit ? 'Actualizar' : 'Guardar'}</span>
          <div class="spinner" id="spinSaveCargo" style="display:none"></div>
        </button>
      </div>
    </div>
  </div>`);
}

// Guardar cargo de directiva
window.guardarCargoDirectiva = async function(orgId, cargoId) {
  const cargo = document.getElementById('cargoTipo').value;
  const nombre = document.getElementById('cargoNombre').value.trim();
  const rut = document.getElementById('cargoRut').value.trim();
  const email = document.getElementById('cargoEmail').value.trim();
  const telefono = document.getElementById('cargoTelefono').value.trim();
  const direccion = document.getElementById('cargoDireccion').value.trim();
  const inicio = document.getElementById('cargoInicio').value;
  const fin = document.getElementById('cargoFin').value;
  
  // Validaciones básicas
  if (!cargo) {
    showAlert('cargoFormErr', 'Debes seleccionar un cargo');
    return;
  }
  if (!nombre) {
    showAlert('cargoFormErr', 'El nombre es requerido');
    return;
  }
  if (!rut) {
    showAlert('cargoFormErr', 'El RUT es requerido');
    return;
  }
  
  const payload = {
    organizacion_id: orgId,
    cargo: cargo,
    nombre: nombre,
    rut: rut,
    email: email || null,
    telefono: telefono || null,
    direccion: direccion || null,
    inicio_periodo: inicio || null,
    fin_periodo: fin || null,
    activo: 1
  };
  
  if (cargoId) {
    payload.id = cargoId;
  }
  
  const btn = document.getElementById('btnSaveCargo');
  btn.disabled = true;
  document.getElementById('btnSaveCargoTxt').style.display = 'none';
  document.getElementById('spinSaveCargo').style.display = 'block';
  
  try {
    const response = await fetch(API + '/directivas.php', {
      method: cargoId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (result.ok) {
      closeModal('modalCargoDirectiva');
      loadDirectiva(orgId);
    } else {
      showAlert('cargoFormErr', result.error || 'Error al guardar el cargo');
    }
  } catch (error) {
    showAlert('cargoFormErr', 'Error de conexión: ' + error.message);
  } finally {
    btn.disabled = false;
    document.getElementById('btnSaveCargoTxt').style.display = '';
    document.getElementById('spinSaveCargo').style.display = 'none';
  }
};

// ── FUNCIONES DE REPORTES ─────────────────────────────────────

// Generar reportes específicos
window.generarReporte = function(tipo, formato) {
  console.log(`Generando reporte: ${tipo} - ${formato}`);
  
  // Construir URL con parámetros
  const url = `${AUTH.apiBase}/reportes.php?tipo=${tipo}&formato=${formato}`;
  
  // Abrir en nueva ventana para PDF o descargar para Excel
  if (formato === 'pdf') {
    window.open(url, '_blank');
  } else {
    // Para Excel, crear un enlace de descarga
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
  }
};

// ── CARGA MASIVA ─────────────────────────────────────

function renderCargaMasiva(main) {
  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2>Carga Masiva de Datos</h2>
        <p>Importa organizaciones y directivas desde archivos Excel o CSV.</p>
      </div>
    </div>
    
    <div class="carga-masiva-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; opacity:0;animation:fadeUp .5s .1s forwards">
      
      <!-- Carga de Organizaciones -->
      <div class="upload-section" style="background: rgba(22,32,50,.6); border: 1px solid rgba(255,255,255,.07); border-radius: 14px; padding: 30px;">
        <div style="font-size: 2.5rem; margin-bottom: 20px; text-align: center;">🏢</div>
        <h3 style="color: var(--cream); margin-bottom: 10px; text-align: center;">Cargar Organizaciones</h3>
        <p style="color: var(--muted); text-align: center; margin-bottom: 25px;">Importa múltiples organizaciones desde un archivo Excel o CSV.</p>
        
        <div class="upload-area" id="orgUploadArea" style="border: 2px dashed rgba(201, 168, 76, 0.3); border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; transition: all 0.3s ease; margin-bottom: 20px;">
          <div style="font-size: 3rem; margin-bottom: 15px;">📁</div>
          <p style="color: var(--cream); margin-bottom: 10px;">Arrastra tu archivo aquí o haz clic para seleccionar</p>
          <p style="color: var(--muted); font-size: 0.9rem;">Formatos aceptados: .xlsx, .xls, .csv</p>
          <input type="file" id="orgFileInput" accept=".xlsx,.xls,.csv" style="display: none;">
        </div>
        
        <div id="orgFileInfo" style="display: none; background: rgba(201, 168, 76, 0.1); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="color: var(--gold); font-weight: bold;" id="orgFileName"></div>
              <div style="color: var(--muted); font-size: 0.9rem;" id="orgFileSize"></div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="limpiarArchivoOrganizaciones()">✕</button>
          </div>
        </div>
        
        <button class="btn btn-primary" id="btnProcesarOrgs" onclick="procesarArchivoOrganizaciones()" disabled style="width: 100%;">
          <span id="btnProcesarOrgsTxt">Procesar Organizaciones</span>
          <div class="spinner" id="spinProcesarOrgs" style="display: none;"></div>
        </button>
        
        <div id="orgResult" style="margin-top: 20px;"></div>
      </div>
      
      <!-- Carga de Directivas -->
      <div class="upload-section" style="background: rgba(22,32,50,.6); border: 1px solid rgba(255,255,255,.07); border-radius: 14px; padding: 30px;">
        <div style="font-size: 2.5rem; margin-bottom: 20px; text-align: center;">👥</div>
        <h3 style="color: var(--cream); margin-bottom: 10px; text-align: center;">Cargar Directivas</h3>
        <p style="color: var(--muted); text-align: center; margin-bottom: 25px;">Importa directivas y asigna personas a cargos específicos.</p>
        
        <div class="upload-area" id="directivaUploadArea" style="border: 2px dashed rgba(201, 168, 76, 0.3); border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; transition: all 0.3s ease; margin-bottom: 20px;">
          <div style="font-size: 3rem; margin-bottom: 15px;">📁</div>
          <p style="color: var(--cream); margin-bottom: 10px;">Arrastra tu archivo aquí o haz clic para seleccionar</p>
          <p style="color: var(--muted); font-size: 0.9rem;">Formatos aceptados: .xlsx, .xls, .csv</p>
          <input type="file" id="directivaFileInput" accept=".xlsx,.xls,.csv" style="display: none;">
        </div>
        
        <div id="directivaFileInfo" style="display: none; background: rgba(201, 168, 76, 0.1); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="color: var(--gold); font-weight: bold;" id="directivaFileName"></div>
              <div style="color: var(--muted); font-size: 0.9rem;" id="directivaFileSize"></div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="limpiarArchivoDirectivas()">✕</button>
          </div>
        </div>
        
        <button class="btn btn-primary" id="btnProcesarDirectivas" onclick="procesarArchivoDirectivas()" disabled style="width: 100%;">
          <span id="btnProcesarDirectivasTxt">Procesar Directivas</span>
          <div class="spinner" id="spinProcesarDirectivas" style="display: none;"></div>
        </button>
        
        <div id="directivaResult" style="margin-top: 20px;"></div>
      </div>
      
    </div>
    
    <!-- Sección de Plantillas -->
    <div style="margin-top: 40px; padding: 25px; background: rgba(201, 168, 76, 0.1); border: 1px solid rgba(201, 168, 76, 0.3); border-radius: 14px;">
      <h4 style="color: var(--gold); margin-bottom: 15px;">📋 Plantillas y Formatos</h4>
      <p style="color: var(--muted); margin-bottom: 20px;">Descarga las plantillas para asegurar que tus archivos tengan el formato correcto.</p>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
        <button class="btn btn-secondary" onclick="descargarPlantilla('organizaciones')">
          📊 Plantilla Organizaciones
        </button>
        <button class="btn btn-secondary" onclick="descargarPlantilla('directivas')">
          👥 Plantilla Directivas
        </button>
        <button class="btn btn-ghost" onclick="mostrarFormato('organizaciones')">
          📄 Ver Formato Organizaciones
        </button>
        <button class="btn btn-ghost" onclick="mostrarFormato('directivas')">
          📄 Ver Formato Directivas
        </button>
      </div>
    </div>
  `;
  
  // Configurar event listeners para carga de archivos
  setupFileUpload('org', 'organizaciones');
  setupFileUpload('directiva', 'directivas');
}

// Configurar carga de archivos
function setupFileUpload(type, entity) {
  const uploadArea = document.getElementById(`${type}UploadArea`);
  const fileInput = document.getElementById(`${type}FileInput`);
  
  // Click en área para seleccionar archivo
  uploadArea.addEventListener('click', () => fileInput.click());
  
  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'rgba(201, 168, 76, 0.8)';
    uploadArea.style.background = 'rgba(201, 168, 76, 0.05)';
  });
  
  uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'rgba(201, 168, 76, 0.3)';
    uploadArea.style.background = 'transparent';
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = 'rgba(201, 168, 76, 0.3)';
    uploadArea.style.background = 'transparent';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(type, files[0]);
    }
  });
  
  // Cambio de archivo
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(type, e.target.files[0]);
    }
  });
}

// Manejar selección de archivo
function handleFileSelect(type, file) {
  const validTypes = ['.xlsx', '.xls', '.csv'];
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  
  if (!validTypes.includes(fileExtension)) {
    alert('Formato de archivo no válido. Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV (.csv).');
    return;
  }
  
  // Mostrar información del archivo
  const fileInfo = document.getElementById(`${type}FileInfo`);
  const fileName = document.getElementById(`${type}FileName`);
  const fileSize = document.getElementById(`${type}FileSize`);
  const uploadArea = document.getElementById(`${type}UploadArea`);
  const processBtn = document.getElementById(`btnProcesar${type === 'org' ? 'Orgs' : 'Directivas'}`);
  
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  fileInfo.style.display = 'block';
  uploadArea.style.display = 'none';
  processBtn.disabled = false;
  
  // Guardar referencia al archivo
  window[`${type}File`] = file;
}

// Formatear tamaño de archivo
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Limpiar archivo de organizaciones
window.limpiarArchivoOrganizaciones = function() {
  document.getElementById('orgFileInfo').style.display = 'none';
  document.getElementById('orgUploadArea').style.display = 'block';
  document.getElementById('btnProcesarOrgs').disabled = true;
  document.getElementById('orgFileInput').value = '';
  document.getElementById('orgResult').innerHTML = '';
  window.orgFile = null;
};

// Limpiar archivo de directivas
window.limpiarArchivoDirectivas = function() {
  document.getElementById('directivaFileInfo').style.display = 'none';
  document.getElementById('directivaUploadArea').style.display = 'block';
  document.getElementById('btnProcesarDirectivas').disabled = true;
  document.getElementById('directivaFileInput').value = '';
  document.getElementById('directivaResult').innerHTML = '';
  window.directivaFile = null;
};

// Procesar archivo de organizaciones
window.procesarArchivoOrganizaciones = async function() {
  if (!window.orgFile) {
    alert('Por favor selecciona un archivo primero.');
    return;
  }
  
  const btn = document.getElementById('btnProcesarOrgs');
  const btnText = document.getElementById('btnProcesarOrgsTxt');
  const spinner = document.getElementById('spinProcesarOrgs');
  const resultDiv = document.getElementById('orgResult');
  
  btn.disabled = true;
  btnText.style.display = 'none';
  spinner.style.display = 'block';
  
  try {
    const formData = new FormData();
    formData.append('archivo', window.orgFile);
    formData.append('tipo', 'organizaciones');
    
    const response = await fetch(API + '/carga_masiva.php', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.ok) {
      resultDiv.innerHTML = `
        <div class="alert alert--success">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>
          <span>✅ ${result.message}</span>
        </div>
        <div style="margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 8px;">
          <div style="color: var(--gold); font-weight: bold; margin-bottom: 10px;">Resumen de la carga:</div>
          <div style="color: var(--muted);">
            ${result.resumen ? `
              <div>📊 Total procesadas: ${result.resumen.total}</div>
              <div>✅ Cargadas correctamente: ${result.resumen.cargadas}</div>
              <div>⚠️ Con errores: ${result.resumen.errores}</div>
              ${result.resumen.actualizadas ? `<div>🔄 Actualizadas: ${result.resumen.actualizadas}</div>` : ''}
            ` : ''}
          </div>
        </div>
      `;
      
      // Limpiar archivo después de procesar exitosamente
      setTimeout(() => {
        limpiarArchivoOrganizaciones();
      }, 3000);
    } else {
      resultDiv.innerHTML = `
        <div class="alert alert--error">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
          <span>❌ ${result.error}</span>
        </div>
      `;
    }
  } catch (error) {
    resultDiv.innerHTML = `
      <div class="alert alert--error">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
        <span>Error de conexión: ${error.message}</span>
      </div>
    `;
  } finally {
    btn.disabled = false;
    btnText.style.display = '';
    spinner.style.display = 'none';
  }
};

// Procesar archivo de directivas
window.procesarArchivoDirectivas = async function() {
  if (!window.directivaFile) {
    alert('Por favor selecciona un archivo primero.');
    return;
  }
  
  const btn = document.getElementById('btnProcesarDirectivas');
  const btnText = document.getElementById('btnProcesarDirectivasTxt');
  const spinner = document.getElementById('spinProcesarDirectivas');
  const resultDiv = document.getElementById('directivaResult');
  
  btn.disabled = true;
  btnText.style.display = 'none';
  spinner.style.display = 'block';
  
  try {
    const formData = new FormData();
    formData.append('archivo', window.directivaFile);
    formData.append('tipo', 'directivas');
    
    const response = await fetch(API + '/carga_masiva.php', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.ok) {
      resultDiv.innerHTML = `
        <div class="alert alert--success">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>
          <span>✅ ${result.message}</span>
        </div>
        <div style="margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 8px;">
          <div style="color: var(--gold); font-weight: bold; margin-bottom: 10px;">Resumen de la carga:</div>
          <div style="color: var(--muted);">
            ${result.resumen ? `
              <div>📊 Total procesadas: ${result.resumen.total}</div>
              <div>✅ Cargadas correctamente: ${result.resumen.cargadas}</div>
              <div>⚠️ Con errores: ${result.resumen.errores}</div>
              ${result.resumen.actualizadas ? `<div>🔄 Actualizadas: ${result.resumen.actualizadas}</div>` : ''}
            ` : ''}
          </div>
        </div>
      `;
      
      // Limpiar archivo después de procesar exitosamente
      setTimeout(() => {
        limpiarArchivoDirectivas();
      }, 3000);
    } else {
      resultDiv.innerHTML = `
        <div class="alert alert--error">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
          <span>❌ ${result.error}</span>
        </div>
      `;
    }
  } catch (error) {
    resultDiv.innerHTML = `
      <div class="alert alert--error">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
        <span>Error de conexión: ${error.message}</span>
      </div>
    `;
  } finally {
    btn.disabled = false;
    btnText.style.display = '';
    spinner.style.display = 'none';
  }
};

// Descargar plantilla
window.descargarPlantilla = function(tipo) {
  const url = API + `/plantillas.php?tipo=${tipo}`;
  window.open(url, '_blank');
};

// Mostrar formato
window.mostrarFormato = function(tipo) {
  let contenido = '';
  
  if (tipo === 'organizaciones') {
    contenido = `
      <h4>Formato para Organizaciones</h4>
      <p>El archivo debe contener las siguientes columnas en este orden:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr><th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Columna</th><th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Descripción</th><th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Requerido</th></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">nombre</td><td style="border: 1px solid #ddd; padding: 8px;">Nombre de la organización</td><td style="border: 1px solid #ddd; padding: 8px;">Sí</td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">rut</td><td style="border: 1px solid #ddd; padding: 8px;">RUT de la organización</td><td style="border: 1px solid #ddd; padding: 8px;">Sí</td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">direccion</td><td style="border: 1px solid #ddd; padding: 8px;">Dirección principal</td><td style="border: 1px solid #ddd; padding: 8px;">Sí</td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">direccion_sede</td><td style="border: 1px solid #ddd; padding: 8px;">Dirección de la sede</td><td style="border: 1px solid #ddd; padding: 8px;">No</td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">sector_barrio</td><td style="border: 1px solid #ddd; padding: 8px;">Sector o barrio</td><td style="border: 1px solid #ddd; padding: 8px;">No</td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">telefono_principal</td><td style="border: 1px solid #ddd; padding: 8px;">Teléfono principal</td><td style="border: 1px solid #ddd; padding: 8px;">No</td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">correo</td><td style="border: 1px solid #ddd; padding: 8px;">Correo electrónico</td><td style="border: 1px solid #ddd; padding: 8px;">No</td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">numero_socios</td><td style="border: 1px solid #ddd; padding: 8px;">Número de socios</td><td style="border: 1px solid #ddd; padding: 8px;">No</td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">representante_legal</td><td style="border: 1px solid #ddd; padding: 8px;">Representante legal</td><td style="border: 1px solid #ddd; padding: 8px;">No</td></tr>
      </table>
    `;
  } else if (tipo === 'directivas') {
    contenido = `
      <h4>Formato para Directivas</h4>
      <p>El archivo debe contener las siguientes columnas en este orden:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr><th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Columna</th><th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Descripción</th><th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">Requerido</th></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">organizacion_rut</td><td style="border: 1px solid #ddd; padding: 8px;">RUT de la organización existente</td><td style="border: 1px solid #ddd; padding: 8px;">Sí</td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">cargo</td><td style="border: 1px solid #ddd; padding: 8px;">Cargo (Presidente, Secretario, Tesorero, etc.)</td><td style="border: 1px solid #ddd; padding: 8px;">Sí</td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">nombre</td><td style="border: 1px solid #ddd; padding: 8px;">Nombre completo de la persona</td><td style="border: 1px solid #ddd; padding: 8px;">Sí</td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">rut</td><td style="border: 1px solid #ddd; padding: 8px;">RUT de la persona</td><td style="border: 1px solid #ddd; padding: 8px;">Sí</td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">email</td><td style="border: 1px solid #ddd; padding: 8px;">Correo electrónico</td><td style="border: 1px solid #ddd; padding: 8px;">No</td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">telefono</td><td style="border: 1px solid #ddd; padding: 8px;">Teléfono</td><td style="border: 1px solid #ddd; padding: 8px;">No</td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">direccion</td><td style="border: 1px solid #ddd; padding: 8px;">Dirección donde ejerce el cargo</td><td style="border: 1px solid #ddd; padding: 8px;">No</td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">inicio_periodo</td><td style="border: 1px solid #ddd; padding: 8px;">Fecha de inicio del período (YYYY-MM-DD)</td><td style="border: 1px solid #ddd; padding: 8px;">No</td></tr>
        <tr><td style="border: 1px solid #ddd; padding: 8px;">fin_periodo</td><td style="border: 1px solid #ddd; padding: 8px;">Fecha de fin del período (YYYY-MM-DD)</td><td style="border: 1px solid #ddd; padding: 8px;">No</td></tr>
      </table>
    `;
  }
  
  // Mostrar modal con el formato
  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.innerHTML = `
    <div class="modal" style="max-width: 800px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h3>Formato de Archivo</h3>
      <div style="max-height: 500px; overflow-y: auto;">
        ${contenido}
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Entendido</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

// ── SISTEMA DE ALERTAS DE VENCIMIENTOS ─────────────────────────────────────

// Verificar vencimientos al cargar la página
async function verificarVencimientos() {
  try {
    const response = await fetch(API + '/vencimientos.php');
    const result = await response.json();
    
    if (result.ok && result.vencimientos) {
      mostrarAlertasVencimientos(result.vencimientos);
    }
  } catch (error) {
    console.error('Error al verificar vencimientos:', error);
  }
}

// Mostrar alertas de vencimientos
function mostrarAlertasVencimientos(vencimientos) {
  const alertasContainer = document.getElementById('alertasContainer');
  if (!alertasContainer) return;
  
  let alertasHTML = '';
  let totalAlertas = 0;
  
  // Alertas de Personalidad Jurídica
  if (vencimientos.personalidad_juridica && vencimientos.personalidad_juridica.length > 0) {
    totalAlertas += vencimientos.personalidad_juridica.length;
    alertasHTML += `
      <div class="alert alert--warning" style="margin-bottom: 15px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>
        <div style="flex: 1;">
          <strong>⚠️ Vencimiento de Personalidad Jurídica</strong>
          <div style="margin-top: 5px; font-size: 0.9rem;">
            ${vencimientos.personalidad_juridica.map(org => 
              `• <strong>${org.nombre}</strong> - Vence: ${formatDate(org.fecha_vencimiento)} (${org.dias_restantes} días)`
            ).join('<br>')}
          </div>
        </div>
      </div>
    `;
  }
  
  // Alertas de Directivas
  if (vencimientos.directivas && vencimientos.directivas.length > 0) {
    totalAlertas += vencimientos.directivas.length;
    alertasHTML += `
      <div class="alert alert--warning" style="margin-bottom: 15px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>
        <div style="flex: 1;">
          <strong>⚠️ Vencimiento de Directivas</strong>
          <div style="margin-top: 5px; font-size: 0.9rem;">
            ${vencimientos.directivas.map(dir => 
              `• <strong>${dir.organizacion}</strong> - Cargo: ${dir.cargo} - Vence: ${formatDate(dir.fecha_vencimiento)} (${dir.dias_restantes} días)`
            ).join('<br>')}
          </div>
        </div>
      </div>
    `;
  }
  
  // Alertas de Organizaciones (estado suspendido o inactivo)
  if (vencimientos.organizaciones && vencimientos.organizaciones.length > 0) {
    totalAlertas += vencimientos.organizaciones.length;
    alertasHTML += `
      <div class="alert alert--error" style="margin-bottom: 15px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
        <div style="flex: 1;">
          <strong>❌ Organizaciones con Problemas</strong>
          <div style="margin-top: 5px; font-size: 0.9rem;">
            ${vencimientos.organizaciones.map(org => 
              `• <strong>${org.nombre}</strong> - Estado: ${org.estado} - ${org.observacion || 'Requiere atención'}`
            ).join('<br>')}
          </div>
        </div>
      </div>
    `;
  }
  
  // Alertas de Subvenciones
  if (vencimientos.subvenciones && vencimientos.subvenciones.length > 0) {
    totalAlertas += vencimientos.subvenciones.length;
    alertasHTML += `
      <div class="alert alert--info" style="margin-bottom: 15px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
        <div style="flex: 1;">
          <strong>ℹ️ Subvenciones por Vencer</strong>
          <div style="margin-top: 5px; font-size: 0.9rem;">
            ${vencimientos.subvenciones.map(sub => 
              `• <strong>${sub.organizacion}</strong> - ${sub.nombre_subvencion} - Vence: ${formatDate(sub.fecha_vencimiento)} (${sub.dias_restantes} días)`
            ).join('<br>')}
          </div>
        </div>
      </div>
    `;
  }
  
  if (alertasHTML) {
    alertasContainer.innerHTML = `
      <div style="background: rgba(201, 168, 76, 0.1); border: 1px solid rgba(201, 168, 76, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h4 style="color: var(--gold); margin: 0; display: flex; align-items: center; gap: 10px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.34-1.705-4.004-4.005-4.901z"/></svg>
            Alertas del Sistema (${totalAlertas})
          </h4>
          <button class="btn btn-ghost btn-sm" onclick="cerrarAlertasVencimientos()">✕</button>
        </div>
        ${alertasHTML}
        <div style="margin-top: 15px; text-align: right;">
          <button class="btn btn-secondary btn-sm" onclick="verReporteVencimientos()">📊 Ver Reporte Completo</button>
        </div>
      </div>
    `;
  }
}

// Cerrar alertas de vencimientos
window.cerrarAlertasVencimientos = function() {
  const alertasContainer = document.getElementById('alertasContainer');
  if (alertasContainer) {
    alertasContainer.innerHTML = '';
  }
};

// Ver reporte de vencimientos
window.verReporteVencimientos = function() {
  window.open(API + '/vencimientos.php?formato=pdf', '_blank');
};

// Función para formatear fecha
function formatDate(dateString) {
  if (!dateString) return 'No definida';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CL', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

// ── CERTIFICADOS ─────────────────────────────────────

function renderCertificados(main) {
  main.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2>Certificados Municipales</h2>
        <p>Genera certificados oficiales para organizaciones y directivas.</p>
      </div>
    </div>
    
    <div class="certificados-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; opacity:0;animation:fadeUp .5s .1s forwards">
      
      <!-- Certificados de Organizaciones -->
      <div class="cert-section" style="background: rgba(22,32,50,.6); border: 1px solid rgba(255,255,255,.07); border-radius: 14px; padding: 30px;">
        <div style="font-size: 2.5rem; margin-bottom: 20px; text-align: center;">🏢</div>
        <h3 style="color: var(--cream); margin-bottom: 10px; text-align: center;">Certificados de Organizaciones</h3>
        <p style="color: var(--muted); text-align: center; margin-bottom: 25px;">Certificados oficiales para organizaciones comunitarias.</p>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; color: var(--cream); font-weight: 500;">Seleccionar Organización</label>
          <select id="orgCertSelect" style="width: 100%; padding: 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.05); color: var(--cream);">
            <option value="">Buscando organizaciones...</option>
          </select>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
          <button class="btn btn-secondary btn-sm" onclick="generarCertificado('personalidad_juridica')">
            📄 Personalidad Jurídica
          </button>
          <button class="btn btn-secondary btn-sm" onclick="generarCertificado('vigencia')">
            📄 Certificado de Vigencia
          </button>
          <button class="btn btn-secondary btn-sm" onclick="generarCertificado('representacion')">
            📄 Representación Legal
          </button>
          <button class="btn btn-secondary btn-sm" onclick="generarCertificado('socios')">
            📄 Número de Socios
          </button>
        </div>
        
        <div id="orgCertResult" style="margin-top: 20px;"></div>
      </div>
      
      <!-- Certificados de Directivas -->
      <div class="cert-section" style="background: rgba(22,32,50,.6); border: 1px solid rgba(255,255,255,.07); border-radius: 14px; padding: 30px;">
        <div style="font-size: 2.5rem; margin-bottom: 20px; text-align: center;">👑</div>
        <h3 style="color: var(--cream); margin-bottom: 10px; text-align: center;">Certificados de Directivas</h3>
        <p style="color: var(--muted); text-align: center; margin-bottom: 25px;">Certificados para miembros de directivas.</p>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; color: var(--cream); font-weight: 500;">Seleccionar Directiva</label>
          <select id="directivaCertSelect" style="width: 100%; padding: 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.05); color: var(--cream);">
            <option value="">Buscando directivas...</option>
          </select>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
          <button class="btn btn-secondary btn-sm" onclick="generarCertificadoDirectiva('cargo')">
            📄 Certificado de Cargo
          </button>
          <button class="btn btn-secondary btn-sm" onclick="generarCertificadoDirectiva('directiva_completa')">
            📄 Directiva Completa
          </button>
          <button class="btn btn-secondary btn-sm" onclick="generarCertificadoDirectiva('periodo')">
            📄 Período de Mandato
          </button>
          <button class="btn btn-secondary btn-sm" onclick="generarCertificadoDirectiva('quorum')">
            📄 Quórum Directivo
          </button>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; color: var(--cream); font-weight: 500;">Certificados Especiales</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <button class="btn btn-warning btn-sm" onclick="generarCertificado('provisorio_art6')">
              📄 Certificado Provisorio Art. 6
            </button>
            <button class="btn btn-danger btn-sm" onclick="generarCertificado('extincion_pj')">
              📄 Extinción Personalidad Jurídica
            </button>
            <button class="btn btn-info btn-sm" onclick="generarCertificado('modificacion_estatutos')">
              📄 Modificación de Estatutos
            </button>
          </div>
        </div>
        
        <div id="directivaCertResult" style="margin-top: 20px;"></div>
      </div>
      
    </div>
    
    <!-- Sección de Verificación -->
    <div style="margin-top: 40px; padding: 25px; background: rgba(201, 168, 76, 0.1); border: 1px solid rgba(201, 168, 76, 0.3); border-radius: 14px;">
      <h4 style="color: var(--gold); margin-bottom: 15px;">🔍 Verificación de Certificados</h4>
      <p style="color: var(--muted); margin-bottom: 20px;">Verifica la autenticidad de cualquier certificado emitido.</p>
      
      <div style="display: grid; grid-template-columns: 1fr auto auto; gap: 15px; align-items: end;">
        <div>
          <label style="display: block; margin-bottom: 8px; color: var(--cream); font-weight: 500;">Código de Verificación</label>
          <input type="text" id="codigoVerificacion" placeholder="Ingrese el código del certificado" style="width: 100%; padding: 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; background: rgba(255,255,255,0.05); color: var(--cream);">
        </div>
        <button class="btn btn-primary" onclick="verificarCertificado()">
          🔍 Verificar
        </button>
        <button class="btn btn-ghost" onclick="verHistorialCertificados()">
          📊 Historial
        </button>
      </div>
      
      <div id="verificacionResult" style="margin-top: 20px;"></div>
    </div>
  `;
  
  // Cargar datos iniciales
  cargarDatosCertificados();
}

// Cargar datos para certificados
async function cargarDatosCertificados() {
  try {
    // Cargar organizaciones
    const orgResponse = await fetch(API + '/organizaciones.php');
    const orgResult = await orgResponse.json();
    
    if (orgResult.ok) {
      const orgSelect = document.getElementById('orgCertSelect');
      orgSelect.innerHTML = '<option value="">Seleccione una organización...</option>';
      
      orgResult.data.forEach(org => {
        if (org.estado === 'Activa') {
          orgSelect.innerHTML += `<option value="${org.id}">${org.nombre} - ${org.rut}</option>`;
        }
      });
    }
    
    // Cargar directivas
    const dirResponse = await fetch(API + '/directivas.php');
    const dirResult = await dirResponse.json();
    
    if (dirResult.ok) {
      const dirSelect = document.getElementById('directivaCertSelect');
      dirSelect.innerHTML = '<option value="">Seleccione una directiva...</option>';
      
      dirResult.data.forEach(dir => {
        if (dir.activo) {
          dirSelect.innerHTML += `<option value="${dir.id}">${dir.nombre} - ${dir.cargo} (${dir.organizacion})</option>`;
        }
      });
    }
    
  } catch (error) {
    console.error('Error al cargar datos de certificados:', error);
  }
}

// Generar certificado de organización
window.generarCertificado = async function(tipo) {
  const orgId = document.getElementById('orgCertSelect').value;
  const resultDiv = document.getElementById('orgCertResult');
  
  if (!orgId) {
    resultDiv.innerHTML = `
      <div class="alert alert--error">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
        <span>Por favor seleccione una organización.</span>
      </div>
    `;
    return;
  }
  
  resultDiv.innerHTML = `
    <div class="alert alert--info">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
      <span>Generando certificado...</span>
    </div>
  `;
  
  try {
    const response = await fetch(API + '/certificados.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accion: 'generar',
        tipo: tipo,
        organizacion_id: orgId
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      resultDiv.innerHTML = `
        <div class="alert alert--success">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>
          <span>✅ Certificado generado exitosamente</span>
        </div>
        <div style="margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 8px;">
          <div style="color: var(--gold); font-weight: bold; margin-bottom: 10px;">Información del Certificado:</div>
          <div style="color: var(--muted);">
            <div>📄 Tipo: ${result.data.tipo_certificado}</div>
            <div>🏢 Organización: ${result.data.organizacion}</div>
            <div>🔢 Número: ${result.data.numero}</div>
            <div>📅 Emitido: ${formatDate(result.data.fecha_emision)}</div>
            <div>🔑 Código: ${result.data.codigo_verificacion}</div>
          </div>
          <div style="margin-top: 15px; display: flex; gap: 10px;">
            <button class="btn btn-primary btn-sm" onclick="window.open('${result.data.pdf_url}', '_blank')">
              📄 Ver PDF
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.open('${result.data.pdf_url}', '_blank').focus()">
              💾 Descargar
            </button>
          </div>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="alert alert--error">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
          <span>❌ ${result.error}</span>
        </div>
      `;
    }
  } catch (error) {
    resultDiv.innerHTML = `
      <div class="alert alert--error">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
        <span>Error de conexión: ${error.message}</span>
      </div>
    `;
  }
};

// Generar certificado de directiva
window.generarCertificadoDirectiva = async function(tipo) {
  const directivaId = document.getElementById('directivaCertSelect').value;
  const resultDiv = document.getElementById('directivaCertResult');
  
  if (!directivaId) {
    resultDiv.innerHTML = `
      <div class="alert alert--error">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
        <span>Por favor seleccione una directiva.</span>
      </div>
    `;
    return;
  }
  
  resultDiv.innerHTML = `
    <div class="alert alert--info">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
      <span>Generando certificado...</span>
    </div>
  `;
  
  try {
    const response = await fetch(API + '/certificados.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accion: 'generar_directiva',
        tipo: tipo,
        directiva_id: directivaId
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      resultDiv.innerHTML = `
        <div class="alert alert--success">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>
          <span>✅ Certificado generado exitosamente</span>
        </div>
        <div style="margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 8px;">
          <div style="color: var(--gold); font-weight: bold; margin-bottom: 10px;">Información del Certificado:</div>
          <div style="color: var(--muted);">
            <div>📄 Tipo: ${result.data.tipo_certificado}</div>
            <div>👑 Persona: ${result.data.persona}</div>
            <div>🏢 Organización: ${result.data.organizacion}</div>
            <div>🔢 Número: ${result.data.numero}</div>
            <div>📅 Emitido: ${formatDate(result.data.fecha_emision)}</div>
            <div>🔑 Código: ${result.data.codigo_verificacion}</div>
          </div>
          <div style="margin-top: 15px; display: flex; gap: 10px;">
            <button class="btn btn-primary btn-sm" onclick="window.open('${result.data.pdf_url}', '_blank')">
              📄 Ver PDF
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.open('${result.data.pdf_url}', '_blank').focus()">
              💾 Descargar
            </button>
          </div>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="alert alert--error">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
          <span>❌ ${result.error}</span>
        </div>
      `;
    }
  } catch (error) {
    resultDiv.innerHTML = `
      <div class="alert alert--error">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
        <span>Error de conexión: ${error.message}</span>
      </div>
    `;
  }
};

// Verificar certificado
window.verificarCertificado = async function() {
  const codigo = document.getElementById('codigoVerificacion').value.trim();
  const resultDiv = document.getElementById('verificacionResult');
  
  if (!codigo) {
    resultDiv.innerHTML = `
      <div class="alert alert--error">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
        <span>Por favor ingrese un código de verificación.</span>
      </div>
    `;
    return;
  }
  
  resultDiv.innerHTML = `
    <div class="alert alert--info">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
      <span>Verificando certificado...</span>
    </div>
  `;
  
  try {
    const response = await fetch(API + '/certificados.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accion: 'verificar',
        codigo: codigo
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      const cert = result.data;
      const estadoClass = cert.estado === 'vigente' ? 'alert--success' : cert.estado === 'expirado' ? 'alert--warning' : 'alert--error';
      
      resultDiv.innerHTML = `
        <div class="alert ${estadoClass}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            ${cert.estado === 'vigente' ? '<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>' : 
             cert.estado === 'expirado' ? '<path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>' :
             '<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>'}
          </svg>
          <span>✅ Certificado ${cert.estado}</span>
        </div>
        <div style="margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 8px;">
          <div style="color: var(--gold); font-weight: bold; margin-bottom: 10px;">Información del Certificado:</div>
          <div style="color: var(--muted);">
            <div>📄 Tipo: ${cert.tipo_certificado}</div>
            <div>🔢 Número: ${cert.numero}</div>
            <div>🏢 ${cert.organizacion || cert.persona}</div>
            <div>📅 Emitido: ${formatDate(cert.fecha_emision)}</div>
            <div>📅 Válido hasta: ${formatDate(cert.fecha_vencimiento)}</div>
          </div>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div class="alert alert--error">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
          <span>❌ ${result.error}</span>
        </div>
      `;
    }
  } catch (error) {
    resultDiv.innerHTML = `
      <div class="alert alert--error">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>
        <span>Error de conexión: ${error.message}</span>
      </div>
    `;
  }
};

// Ver historial de certificados
window.verHistorialCertificados = function() {
  window.open(API + '/certificados.php?accion=historial&formato=pdf', '_blank');
};
