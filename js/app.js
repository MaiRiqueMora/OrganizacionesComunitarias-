let currentUser = null;
const API = AUTH.apiBase;

// Init
document.addEventListener('DOMContentLoaded', async () => {
  const session = await getSession();
  if (!session.ok) { window.location.href = AUTH.loginPage; return; }

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

  loadPage('home', document.querySelector('.nav-item.active'));
  checkAlertas();
});

// Navegación
function loadPage(page, navEl) {
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  const main = document.getElementById('mainContent');

  switch(page) {
    case 'home':          renderHome(main); break;
    case 'organizaciones':renderOrganizaciones(main); break;
    case 'proyectos':     renderProyectos(main); break;
    case 'reportes':      renderReportes(main); break;
    case 'usuarios':      renderUsuarios(main); break;
    case 'historial':     renderHistorial(main); break;
    default: main.innerHTML = '<p>Página no encontrada.</p>';
  }
}

// Home - Estadísticas y alertas
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
    const [orgs, dirs, pjs] = await Promise.all([
      fetch(API+'/organizaciones.php?action=list').then(r=>r.json()),
      fetch(API+'/organizaciones.php?action=alertas').then(r=>r.json()),
      fetch(API+'/organizaciones.php?action=alertas_pj').then(r=>r.json()),
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
    if (banners) document.getElementById('alertaBanner').innerHTML = banners;
  } catch(e) { console.error(e); }
}

// Organizaciones - Listado, filtros, acciones
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

// Formulario de organización para creación y edición
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
            <div class="form-group"><label>N° Registro Municipal</label><input type="text" id="fRegMun" value="${escHtml(org?.numero_registro_mun||'')}"/></div>
            <div class="form-group"><label>Fecha de constitución</label><input type="date" id="fFechaConst" value="${org?.fecha_constitucion||''}"/></div>
            <div class="form-group"><label>Personalidad Jurídica</label><select id="fPJ"><option value="0" ${!org?.personalidad_juridica?'selected':''}>No</option><option value="1" ${org?.personalidad_juridica?'selected':''}>Sí</option></select></div>
            <div class="form-group"><label>Vencimiento PJ</label><input type="date" id="fVencPJ" value="${org?.fecha_vencimiento_pj||''}"/></div>
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
      nombre:org?.nombre, rut:org?.rut,
      nombre: document.getElementById('fNombre').value.trim(),
      rut: document.getElementById('fRut').value.trim(),
      tipo_id: document.getElementById('fTipo').value||null,
      numero_registro_mun: document.getElementById('fRegMun').value||null,
      fecha_constitucion: document.getElementById('fFechaConst').value||null,
      personalidad_juridica: document.getElementById('fPJ').value,
      numero_decreto: document.getElementById('fDecreto').value||null,
      numero_pj_nacional: document.getElementById('fPJnac').value||null,
      fecha_vencimiento_pj: document.getElementById('fVencPJ').value||null,
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

// Detalle de organización con pestañas para información, directiva y documentos
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

  const dirActual = dirs.find(d=>d.es_actual==1);

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
            <div class="detail-item"><div class="lbl">Registro Municipal</div><div class="val">${escHtml(o.numero_registro_mun||'—')}</div></div>
            <div class="detail-item"><div class="lbl">Fecha Constitución</div><div class="val">${formatDate(o.fecha_constitucion)}</div></div>
            <div class="detail-item"><div class="lbl">Personalidad Jurídica</div><div class="val">${o.personalidad_juridica?'Sí':'No'}</div></div>
            ${o.personalidad_juridica && o.fecha_vencimiento_pj ? `<div class="detail-item"><div class="lbl">Vencimiento PJ</div><div class="val" style="color:${new Date(o.fecha_vencimiento_pj+'T12:00:00')<new Date()?'#ef4444':'inherit'}">${formatDate(o.fecha_vencimiento_pj)}</div></div>` : ''}
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

// Formulario para agregar o editar directiva de una organización
function dirFormModal(orgId, onSave=()=>{}) {
  let m = document.getElementById('modalDirForm'); if(m)m.remove();
  document.body.insertAdjacentHTML('beforeend',`
  <div class="modal-overlay open" id="modalDirForm">
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

// Formulario para ver y agregar cargos a una directiva
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

// Formulario para subir un documento relacionado a una organización
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

// Reportes predefinidos con opción de exportar a Excel o PDF
function renderReportes(main) {
  main.innerHTML = `
    <div class="page-header"><div class="page-header-left"><h2>Reportes</h2><p>Exporta listados a Excel o PDF.</p></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;opacity:0;animation:fadeUp .5s .1s forwards">
      ${[
        {tipo:'organizaciones_activas', titulo:'Organizaciones Activas', desc:'Listado completo de organizaciones con estado Activa.', icon:'🏢'},
        {tipo:'directivas_vigentes',    titulo:'Directivas Vigentes',    desc:'Todas las directivas en estado vigente con sus fechas.', icon:'👥'},
        {tipo:'directivas_vencidas',    titulo:'Directivas Vencidas',    desc:'Organizaciones cuya directiva está vencida.', icon:'⚠️'},
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

// Usuario y gestión de accesos al sistema
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
    if(!confirm(`¿Eliminar usuario "${name}"?`))return;
    const r=await fetch(API+'/usuarios.php?id='+id,{method:'DELETE'}).then(r=>r.json());
    if(r.ok)loadUsers(); else alert(r.error||'Error.');
  };
}

// Cambio de contraseña para el usuario actual
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

// Alerta de vencimiento
async function checkAlertas(){
  const r=await fetch(AUTH.apiBase+'/organizaciones.php?action=alertas').then(r=>r.json()).catch(()=>({ok:false}));
  if(r.ok&&r.data.length){
  }
}

// Proyectos y subvenciones
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
      <div><h2 class="page-title">Proyectos y Subvenciones</h2><p class="subtitle">Seguimiento de postulaciones y fondos por organización</p></div>
      ${currentUser.rol!=='consulta'?`<button class="btn btn-primary" onclick="openProyForm()">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
        Nuevo proyecto
      </button>`:''}
    </div>
    <div class="table-toolbar">
      <input class="search-input" id="proySearch" placeholder="Buscar proyecto u organización…" oninput="filterProyectos()" style="max-width:320px"/>
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

  await loadProyectos();
}

let _proyAll = [];
async function loadProyectos() {
  if (!document.getElementById('proyBody')) return;
  const r = await fetch(API+'/proyectos.php?action=list_all').then(r=>r.json()).catch(()=>({ok:false}));
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
      <div class="modal" style="max-width:640px">
        <button class="modal-close" onclick="document.getElementById('modalProyForm')?.remove()">✕</button>
        <h3>${p?'Editar proyecto':'Nuevo proyecto'}</h3>
        <p class="subtitle">${p?'Modifica los datos del proyecto.':'Registra un nuevo proyecto o subvención.'}</p>
        <div id="proyFormErr" class="alert alert--error"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg><span></span></div>
        <div class="form-grid">
          <div class="form-group span-2"><label>Organización *</label><select id="pfOrg">${orgOpts}</select></div>
          <div class="form-group span-2"><label>Nombre del proyecto *</label><input type="text" id="pfNombre" value="${escHtml(p?.nombre||'')}" placeholder="Nombre del proyecto o subvención"/></div>
          <div class="form-group span-2"><label>Descripción</label><textarea id="pfDesc" rows="2">${escHtml(p?.descripcion||'')}</textarea></div>
          <div class="form-group"><label>Fondo / Programa</label><input type="text" id="pfFondo" value="${escHtml(p?.fondo_programa||'')}" placeholder="FNDR, PMU, FOSIS…"/></div>
          <div class="form-group"><label>Estado</label><select id="pfEstado">${estadoOpts}</select></div>
          <div class="form-group"><label>Monto solicitado ($)</label><input type="number" id="pfMontSol" value="${p?.monto_solicitado??''}" min="0" step="1000"/></div>
          <div class="form-group"><label>Monto aprobado ($)</label><input type="number" id="pfMontApr" value="${p?.monto_aprobado??''}" min="0" step="1000"/></div>
          <div class="form-group"><label>Fecha postulación</label><input type="date" id="pfFechaPost" value="${p?.fecha_postulacion||''}"/></div>
          <div class="form-group"><label>Fecha resolución</label><input type="date" id="pfFechaRes" value="${p?.fecha_resolucion||''}"/></div>
          <div class="form-group span-2"><label>Observaciones</label><textarea id="pfObs" rows="2">${escHtml(p?.observaciones||'')}</textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalProyForm')?.remove()">Cancelar</button>
          <button class="btn btn-primary" onclick="saveProy(${p?.id||'null'})">Guardar</button>
        </div>
      </div>
    </div>`);

  window.saveProy = async function(pid) {
    const payload = {
      organizacion_id: document.getElementById('pfOrg').value,
      nombre:          document.getElementById('pfNombre').value.trim(),
      descripcion:     document.getElementById('pfDesc').value.trim(),
      fondo_programa:  document.getElementById('pfFondo').value.trim(),
      estado:          document.getElementById('pfEstado').value,
      monto_solicitado:document.getElementById('pfMontSol').value,
      monto_aprobado:  document.getElementById('pfMontApr').value,
      fecha_postulacion:document.getElementById('pfFechaPost').value,
      fecha_resolucion: document.getElementById('pfFechaRes').value,
      observaciones:   document.getElementById('pfObs').value.trim(),
    };
    if (!payload.nombre) { showAlert('proyFormErr','El nombre es obligatorio.'); return; }

    const url    = pid ? API+'/proyectos.php?id='+pid : API+'/proyectos.php';
    const method = pid ? 'PUT' : 'POST';
    const r = await fetch(url, {method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)}).then(r=>r.json());
    if (r.ok) { document.getElementById('modalProyForm')?.remove(); loadProyectos(); }
    else showAlert('proyFormErr', r.error||'Error al guardar.');
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
      <div class="modal" style="max-width:640px">
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
  if (!confirm('¿Eliminar documento?')) return;
  const r = await fetch(API+'/proyectos.php?action=doc&id='+docId, {method:'DELETE'}).then(r=>r.json());
  if (r.ok) { document.getElementById('modalProyDetail')?.remove(); openProyDetail(proyId); }
  else alert(r.error||'Error al eliminar.');
}

function openDocProyModal(proyId) {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="modalDocProy">
      <div class="modal" style="max-width:420px">
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

  const r = await fetch(API+'/proyectos.php?action=upload', {method:'POST', body:fd}).then(r=>r.json()).catch(()=>({ok:false}));

  if (r.ok) {
    document.getElementById('modalDocProy')?.remove();
    document.getElementById('modalProyDetail')?.remove();
    openProyDetail(proyId);
  } else {
    showAlert('docProyErr', r.error||'Error al subir.');
    btn.disabled = false;
    document.getElementById('btnDocProyTxt').style.display = '';
    document.getElementById('spinDocProy').style.display   = 'none';
  }
}

async function delProy(id, nombre) {
  if (!confirm(`¿Eliminar el proyecto "${nombre}"?\nSe eliminarán también sus documentos.`)) return;
  const r = await fetch(API+'/proyectos.php?id='+id, {method:'DELETE'}).then(r=>r.json());
  if (r.ok) loadProyectos();
  else alert(r.error||'Error al eliminar.');
}

// Historial de acciones
const TABLAS_LABEL = {
  organizaciones: 'Organizaciones', directivas: 'Directivas',
  cargos_directiva: 'Cargos', documentos: 'Documentos',
  proyectos: 'Proyectos', documentos_proyecto: 'Docs. Proyecto',
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
  if (!r.ok) { document.getElementById('histBody').innerHTML = `<tr><td colspan="5" class="empty-cell">Error al cargar.</td></tr>`; return; }

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
  if (tabla)   _histFilters.tabla      = tabla;
  if (accion)  _histFilters.accion     = accion;
  if (usuario) _histFilters.usuario_id = usuario;
  if (desde)   _histFilters.desde      = desde;
  if (hasta)   _histFilters.hasta      = hasta;
  _histPage = 1;
  loadHistorial();
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
