/* ============================================================
   responsive.js — Sistema de detección de pantalla en tiempo real
   ============================================================ */

// ── Detector de tamaño de pantalla ───────────────────────────────
class ResponsiveDetector {
  constructor() {
    this.breakpoints = {
      mobile: { max: 767, name: 'Móvil' },
      tablet: { min: 768, max: 1023, name: 'Tablet' },
      desktop: { min: 1024, max: 1439, name: 'Desktop' },
      large: { min: 1440, max: 1919, name: 'Desktop Grande' },
      xlarge: { min: 1920, name: 'Desktop Extra Grande' }
    };
    
    this.current = this.getCurrentBreakpoint();
    this.listeners = [];
    this.init();
  }
  
  init() {
    // Detectar tamaño inicial
    this.update();
    
    // Escuchar cambios de tamaño
    window.addEventListener('resize', this.debounce(() => {
      this.update();
    }, 100));
    
    // Escuchar cambios de orientación (móviles)
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.update(), 100);
    });
  }
  
  getCurrentBreakpoint() {
    const width = window.innerWidth;
    
    for (const [key, bp] of Object.entries(this.breakpoints)) {
      const matchesMin = !bp.min || width >= bp.min;
      const matchesMax = !bp.max || width <= bp.max;
      
      if (matchesMin && matchesMax) {
        return { key, ...bp, width, height: window.innerHeight };
      }
    }
    
    return { key: 'unknown', name: 'Desconocido', width, height: window.innerHeight };
  }
  
  update() {
    const previous = this.current;
    this.current = this.getCurrentBreakpoint();
    
    // Actualizar clases en body
    this.updateBodyClasses();
    
    // Notificar a los listeners si cambió
    if (previous.key !== this.current.key) {
      this.notifyListeners(previous, this.current);
    }
    
    // Guardar en localStorage para análisis
    this.saveScreenInfo();
  }
  
  updateBodyClasses() {
    const body = document.body;
    
    // Remover clases anteriores
    Object.keys(this.breakpoints).forEach(key => {
      body.classList.remove(`screen-${key}`);
    });
    
    // Agregar clase actual
    body.classList.add(`screen-${this.current.key}`);
    
    // Agregar información como data attributes
    body.setAttribute('data-screen-type', this.current.key);
    body.setAttribute('data-screen-width', this.current.width);
    body.setAttribute('data-screen-height', this.current.height);
  }
  
  onChange(callback) {
    this.listeners.push(callback);
  }
  
  notifyListeners(previous, current) {
    this.listeners.forEach(callback => {
      callback(previous, current);
    });
  }
  
  saveScreenInfo() {
    const info = {
      type: this.current.key,
      name: this.current.name,
      width: this.current.width,
      height: this.current.height,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('screenInfo', JSON.stringify(info));
  }
  
  getScreenInfo() {
    return this.current;
  }
  
  isMobile() {
    return this.current.key === 'mobile';
  }
  
  isTablet() {
    return this.current.key === 'tablet';
  }
  
  isDesktop() {
    return ['desktop', 'large', 'xlarge'].includes(this.current.key);
  }
  
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// ── Adaptador de UI ─────────────────────────────────────────────
class UIAdapter {
  constructor(responsiveDetector) {
    this.detector = responsiveDetector;
    this.init();
  }
  
  init() {
    // Escuchar cambios de pantalla
    this.detector.onChange((prev, curr) => {
      this.adaptUI(prev, curr);
    });
    
    // Adaptación inicial
    this.adaptUI(null, this.detector.current);
  }
  
  adaptUI(previous, current) {
    // Adaptar navegación
    this.adaptNavigation(current);
    
    // Adaptar modales
    this.adaptModals(current);
    
    // Adaptar tablas
    this.adaptTables(current);
    
    // Adaptar formularios
    this.adaptForms(current);
    
    // Adaptar grid
    this.adaptGrid(current);
    
    // Notificar al usuario del cambio
    this.notifyScreenChange(current);
  }
  
  adaptNavigation(screen) {
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main');
    
    if (sidebar && main) {
      if (screen.isMobile()) {
        // En móviles: sidebar oculto por defecto
        sidebar.classList.add('mobile-collapsed');
        main.classList.add('mobile-expanded');
      } else {
        // En desktop: sidebar visible
        sidebar.classList.remove('mobile-collapsed');
        main.classList.remove('mobile-expanded');
      }
    }
  }
  
  adaptModals(screen) {
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
      // Remover clases de tamaño anteriores
      modal.classList.remove('modal-mobile', 'modal-tablet', 'modal-desktop');
      
      // Agregar clase según pantalla
      if (screen.isMobile()) {
        modal.classList.add('modal-mobile');
      } else if (screen.isTablet()) {
        modal.classList.add('modal-tablet');
      } else {
        modal.classList.add('modal-desktop');
      }
    });
  }
  
  adaptTables(screen) {
    const tables = document.querySelectorAll('.data-table');
    
    tables.forEach(table => {
      const wrapper = table.closest('.table-wrap');
      if (!wrapper) return;
      
      // Remover clases anteriores
      wrapper.classList.remove('table-mobile', 'table-scrollable');
      
      if (screen.isMobile()) {
        // En móviles: tabla scrollable horizontal
        wrapper.classList.add('table-mobile', 'table-scrollable');
        
        // Agregar indicador de scroll
        if (!wrapper.querySelector('.scroll-indicator')) {
          const indicator = document.createElement('div');
          indicator.className = 'scroll-indicator';
          indicator.innerHTML = '↔️ Desliza para ver más';
          wrapper.appendChild(indicator);
        }
      } else {
        // En desktop: tabla normal
        const indicator = wrapper.querySelector('.scroll-indicator');
        if (indicator) indicator.remove();
      }
    });
  }
  
  adaptForms(screen) {
    const forms = document.querySelectorAll('.form-group');
    
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input, select, textarea');
      
      if (screen.isMobile()) {
        // En móviles: inputs más grandes para mejor tactil
        inputs.forEach(input => {
          input.style.fontSize = '16px'; // Previene zoom en iOS
          input.style.padding = '12px';
        });
      } else {
        // En desktop: tamaño normal
        inputs.forEach(input => {
          input.style.fontSize = '';
          input.style.padding = '';
        });
      }
    });
  }
  
  adaptGrid(screen) {
    const grids = document.querySelectorAll('.stats-grid, .grid');
    
    grids.forEach(grid => {
      // Remover clases anteriores
      grid.classList.remove('grid-mobile', 'grid-tablet', 'grid-desktop');
      
      // Agregar clase según pantalla
      if (screen.isMobile()) {
        grid.classList.add('grid-mobile');
      } else if (screen.isTablet()) {
        grid.classList.add('grid-tablet');
      } else {
        grid.classList.add('grid-desktop');
      }
    });
  }
  
  notifyScreenChange(screen) {
    // Mostrar notificación no intrusiva del cambio de pantalla
    const notification = document.createElement('div');
    notification.className = 'screen-change-notification';
    notification.innerHTML = `
      <div class="screen-info">
        <span class="screen-icon">${this.getScreenIcon(screen.key)}</span>
        <span class="screen-text">${screen.name} (${screen.width}×${screen.height})</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 2 segundos
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }
  
  getScreenIcon(screenType) {
    const icons = {
      mobile: '📱',
      tablet: '📋',
      desktop: '💻',
      large: '🖥️',
      xlarge: '🖥️'
    };
    return icons[screenType] || '📱';
  }
}

// ──── Inicialización ───────────────────────────────────────────────
let responsiveDetector;
let uiAdapter;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  responsiveDetector = new ResponsiveDetector();
  uiAdapter = new UIAdapter(responsiveDetector);
  
  // Hacer disponibles globalmente
  window.responsiveDetector = responsiveDetector;
  window.uiAdapter = uiAdapter;
});

// Funciones globales de utilidad
window.isMobile = () => responsiveDetector?.isMobile() || false;
window.isTablet = () => responsiveDetector?.isTablet() || false;
window.isDesktop = () => responsiveDetector?.isDesktop() || false;
window.getScreenInfo = () => responsiveDetector?.getScreenInfo() || null;
