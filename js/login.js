document.addEventListener('DOMContentLoaded', async () => {
  if (await sessionExists()) { 
    // Si ya hay sesión, redirigir al index.php para que maneje la redirección
    window.location.href = '/sistema-municipal/index.php'; 
    return; 
  }

  const uInp=document.getElementById('username'), pInp=document.getElementById('password');
  const eyeBtn=document.getElementById('eyeBtn'), eyeIcon=document.getElementById('eyeIcon');
  const btn=document.getElementById('btnSubmit'), btnTxt=document.getElementById('btnText'), spin=document.getElementById('spinner');
  
  // Obtener token CSRF al cargar la página
  let csrfToken = '';
  try {
    const r = await fetch(AUTH.apiBase+'/csrf_token.php');
    const d = await r.json();
    if (d.ok) csrfToken = d.csrf_token;
  } catch(e) {
    console.error('Error obteniendo token CSRF:', e);
  }

  eyeBtn?.addEventListener('click',()=>{
    const show=pInp.type==='password'; pInp.type=show?'text':'password';
    eyeIcon.innerHTML=show?EYE_OFF:EYE_ON;
  });

  document.addEventListener('keydown',e=>{ if(e.key==='Enter')doLogin(); });

  window.doLogin = async function(){
    const u=uInp.value.trim(), p=pInp.value;
    if(!u||!p){ showAlert('loginError','Por favor completa todos los campos.'); return; }
    
    btn.disabled=true; btnTxt.style.display='none'; spin.style.display='block';
    
    const r=await login(u,p,csrfToken);
    if(r.ok){ 
      // Redirigir a index.php para que maneje la redirección según sesión
      window.location.href = '/sistema-municipal/index.php'; 
    }
    else{ 
      let errorMessage = r.error || 'Error al iniciar sesión.';
      
      // Agregar información de intentos si está disponible
      if (r.remaining_attempts !== undefined) {
        errorMessage += ` ${r.remaining_attempts > 0 ? `(${r.remaining_attempts} intentos restantes)` : '(Cuenta bloqueada temporalmente)'}`;
      }
      
      showAlert('loginError', errorMessage); 
      
      // Si está bloqueado, deshabilitar el formulario
      if (r.blocked) {
        uInp.disabled = true;
        pInp.disabled = true;
        btn.disabled = true;
        btnTxt.textContent = 'Cuenta Bloqueada';
        spin.style.display = 'none';
      } else {
        btn.disabled=false; 
        btnTxt.style.display=''; 
        spin.style.display='none'; 
        pInp.value=''; 
        pInp.focus(); 
        
        // Obtener nuevo token CSRF para el próximo intento
        try {
          const tokenR = await fetch(AUTH.apiBase+'/csrf_token.php');
          const tokenD = await tokenR.json();
          if (tokenD.ok) csrfToken = tokenD.csrf_token;
        } catch(e) {
          console.error('Error obteniendo nuevo token CSRF:', e);
        }
      }
    }
  };
});

const EYE_ON=`<path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>`;
const EYE_OFF=`<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>`;
