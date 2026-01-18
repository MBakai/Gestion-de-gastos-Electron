# Sistema Contable - Gestión de Gastos

Aplicación de escritorio construida con **Electron**, **TypeScript** y **SQLite** para el registro y gestión de gastos de empleados.

## Características
- Gestión de empleados (Altas, Bajas, Edición).
- Registro de gastos individuales y por lote.
- Generación de reportes PDF detallados con agrupación por fecha y subtotales.
- Sistema de autenticación seguro con recuperación de contraseña.
- Mantenimiento programado: limpieza de registros antiguos con respaldo automático.

## Requisitos
- [Node.js](https://nodejs.org/) (Versión recomendada LTS).
- npm (incluido con Node.js).

## Instalación y Desarrollo
1. Clonar el repositorio.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Ejecutar en modo desarrollo:
   ```bash
   npm run dev
   ```

## Generar Instalador (.exe)
Para generar el instalador ejecutable para Windows:
```bash
npm run dist
```
*(Requiere configuración previa de electron-builder)*

## Licencia
ISC
