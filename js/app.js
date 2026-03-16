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
  if (hashPage && ['home', 'organizaciones', 'accesos', 'backups', 'reportes', 'usuarios'].includes(hashPage)) {
    const targetNav = document.querySelector(`.nav-item[onclick*="${hashPage}"]`);
    loadPage(hashPage, targetNav);
  } else {
    loadPage('home', document.querySelector('.nav-item.active'));
  }
  
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
        <input type="text" id="orgSearch" placeholder="Buscar por nombre o RUT…"/>
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
    const s=document.getElementById('orgSearch').value.trim();
    const e=document.getElementById('orgFiltroEstado').value;
    const t=document.getElementById('orgFiltroTipo').value;
    const p=new URLSearchParams({action:'list'});
    if(s)p.set('search',s); if(e)p.set('estado',e); if(t)p.set('tipo',t);
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
            <div class="form-group"><label>N° Registro Municipal</label><input type="text" id="fRegMun" value="${escHtml(org?.numero_registro_mun||'')}"/></div>
            <div class="form-group"><label>Fecha de constitución</label><input type="date" id="fFechaConst" value="${org?.fecha_constitucion||''}"/></div>
            <div class="form-group"><label>Personalidad Jurídica</label><select id="fPJ"><option value="0" ${!org?.personalidad_juridica?'selected':''}>No</option><option value="1" ${org?.personalidad_juridica?'selected':''}>Sí</option></select></div>
            <div class="form-group"><label>N° Decreto / Resolución</label><input type="text" id="fDecreto" value="${escHtml(org?.numero_decreto||'')}"/></div>
            <div class="form-group"><label>N° PJ Nacional</label><input type="text" id="fPJnac" value="${escHtml(org?.numero_pj_nacional||'')}"/></div>
            <div class="form-group"><label>Estado *</label><select id="fEstado"><option ${org?.estado==='Activa'||!org?'selected':''}>Activa</option><option ${org?.estado==='Inactiva'?'selected':''}>Inactiva</option><option ${org?.estado==='Suspendida'?'selected':''}>Suspendida</option></select></div>
            <div class="form-group"><label>Habilitada para fondos</label><select id="fFondos"><option value="0" ${!org?.habilitada_fondos?'selected':''}>No habilitada</option><option value="1" ${org?.habilitada_fondos?'selected':''}>Habilitada</option></select></div>
          </div>
        </div>
        <div class="form-section">
          <div class="form-section-title">Ubicación</div>
          <div class="form-grid">
            <div class="form-group span-2"><label>Dirección *</label><input type="text" id="fDir" value="${escHtml(org?.direccion||'')}" placeholder="Av. Ejemplo 123"/></div>
            <div class="form-group"><label>Sector / Barrio</label><input type="text" id="fSector" value="${escHtml(org?.sector_barrio||'')}"/></div>
            <div class="form-group"><label>Comuna</label><input type="text" id="fComuna" value="${escHtml(org?.comuna||'Pucón')}"/></div>
            <div class="form-group"><label>Región</label><input type="text" id="fRegion" value="${escHtml(org?.region||'La Araucanía')}"/></div>
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
      personalidad_juridica: document.getElementById('fPJ').value,
      numero_decreto: document.getElementById('fDecreto').value||null,
      numero_pj_nacional: document.getElementById('fPJnac').value||null,
      estado: document.getElementById('fEstado').value,
      habilitada_fondos: document.getElementById('fFondos').value,
      direccion: document.getElementById('fDir').value.trim(),
      sector_barrio: document.getElementById('fSector').value||null,
      comuna: document.getElementById('fComuna').value||'Pucón',
      region: document.getElementById('fRegion').value||'La Araucanía',
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
}

// ── REPORTES
function renderReportes(main) {
  main.innerHTML = `
    <div class="page-header"><div class="page-header-left"><h2>Reportes</h2><p>Exporta listados a Excel o PDF.</p></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;opacity:0;animation:fadeUp .5s .1s forwards">
      ${[
        {tipo:'organizaciones_activas',  titulo:'Organizaciones Activas',              desc:'Listado completo de organizaciones con estado Activa.', icon:'🏢'},
        {tipo:'organizaciones_sector',   titulo:'Organizaciones por sector/barrio',    desc:'Resumen de organizaciones agrupadas por sector o barrio.', icon:'🗺️'},
        {tipo:'organizaciones_fondos',   titulo:'Organizaciones habilitadas a fondos', desc:'Organizaciones marcadas como habilitadas para postular a fondos.', icon:'💰'},
        {tipo:'directivas_vigentes',     titulo:'Directivas Vigentes',                 desc:'Todas las directivas en estado vigente con sus fechas.', icon:'👥'},
        {tipo:'directivas_vencidas',     titulo:'Directivas Vencidas',                 desc:'Organizaciones cuya directiva está vencida.', icon:'⚠️'},
      ].map(r=>`
        <div style="background:rgba(22,32,50,.6);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:24px">
          <div style="font-size:2rem;margin-bottom:12px">${r.icon}</div>
          <h3 style="font-family:var(--font-display);color:var(--cream);font-size:1rem;margin-bottom:6px">${r.titulo}</h3>
          <p style="font-size:.8rem;color:var(--muted);margin-bottom:20px;line-height:1.5">${r.desc}</p>
          <div style="display:flex;gap:8px">
            <a href="${AUTH.apiBase}/reportes.php?tipo=${r.tipo}&formato=excel" class="btn btn-secondary btn-sm" download>📊 Excel</a>
            <a href="${AUTH.apiBase}/reportes.php?tipo=${r.tipo}&formato=pdf" class="btn btn-ghost btn-sm" target="_blank">📄 PDF</a>
          </div>
        </div>`).join('')}
    </div>`;
}

// ── USUARIOS 
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
    const r=await fetch(API+'/usuarios.php').then(r=>r.json());
    if(!r.ok){document.getElementById('userTbody').innerHTML=`<tr><td colspan="6"><div class="table-empty">Error al cargar.</div></td></tr>`;return;}
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
          ${u.id!==currentUser.id?`<button class="btn-icon btn-icon--del" onclick="delUser(${u.id},'${escHtml(u.username).replace(/'/g,"\\'")}')"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg></button>`:''}
        </div></td>
      </tr>`).join('');
  }
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
