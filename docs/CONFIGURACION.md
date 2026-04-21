# Configuración del Sistema - Guía de Referencia

## Estructura de Directorios
```
htdocs/
|-- api/                    # API endpoints (copiada al root)
|-- config/                 # Configuración (copiada al root)
|-- sistema-municipal/      # Aplicación principal
    |-- index.html          # Login
    |-- pages/
    |   |-- dashboard.html  # Dashboard principal
    |   |-- organizaciones.html
    |   |-- directivos.html
    |   |-- importar.html
    |   |-- forgot_password.html
    |   `-- reset_password.html
    |-- js/
    |   |-- auth.js         # Configuración de rutas
    |   |-- app.js          # Lógica principal
    |   `-- login.js        # Lógica de login
    |-- css/
    |   |-- base.css
    |   |-- dashboard.css
    |   |-- login.css
    |   `-- responsive.css
    |-- php/                # Scripts PHP auxiliares
    |   |-- check_excel.php
    |   |-- check_schema.php
    |   |-- convert_to_csv.php
    |   |-- debug.php
    |   `-- reset_admin_password.php
    |-- uploads/
    |-- documents/          # Documentos y archivos
    |   |-- Certificado.docx
    |   |-- NOMINA GENERAL ORG.csv
    |   |-- directivos_limpio(Sheet).csv
    |   |-- image1.png
    |   `-- org_faltantes.xlsx
    `-- vendor/             # Dependencias (PHPMailer)
        |-- phpmailer/
```

## Configuración de Rutas (auth.js)
```javascript
const AUTH = {
  apiBase:      '/api',                              // API en root de Apache
  loginPage:    '/sistema-municipal/index.html',     // Login
  dashboardPage:'/sistema-municipal/pages/dashboard.html', // Dashboard
};
```

## URLs Importantes
- API: `http://localhost/api/check_session.php`
- Login: `http://localhost/sistema-municipal/index.html`
- Dashboard: `http://localhost/sistema-municipal/pages/dashboard.html`

## Prevención de Errores 404
1. **Usar siempre URLs absolutas** en la configuración
2. **Mantener API en root** dehtdocs/
3. **Usar cache busting** en scripts (?v=X.X)
4. **Verificar estructura** antes de cambios
5. **Probar URLs directamente** en navegador

## Si hay problemas 404:
1. Verificar que Apache esté corriendo
2. Probar `http://localhost/api/check_session.php`
3. Limpiar cache del navegador (Ctrl+Shift+R)
4. Verificar archivos existan en ubicaciones correctas
5. Revisar configuración de rutas en auth.js
