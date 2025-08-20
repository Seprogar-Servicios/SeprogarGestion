# FuturgasGestión - Frontend PWA

Sistema de gestión de tareas para técnicos y administradores de Futurgas. Aplicación web progresiva (PWA) construida con React, TypeScript, Vite y TailwindCSS.

## 🚀 Características

### Funcionalidades Principales
- **Autenticación completa**: Login/registro con JWT y refresh tokens
- **Roles de usuario**: Admin y Usuario/Técnico con permisos diferenciados
- **Gestión de tareas**: CRUD completo con asignación de técnicos y materiales
- **Vista calendario**: Visualización de tareas por fechas
- **Dashboard interactivo**: Estadísticas y resumen de actividades
- **Gestión de usuarios**: Aprobación/rechazo de nuevos registros (solo admin)
- **Gestión de materiales**: CRUD de inventario (solo admin)
- **Gestión de especialidades**: CRUD de especialidades técnicas (solo admin)

### Características Técnicas
- **PWA**: Funciona offline con service worker
- **Responsive**: Diseño adaptable a todos los dispositivos
- **Modo oscuro**: Soporte para tema claro/oscuro
- **Estado global**: Redux Toolkit para manejo de estado
- **API integrada**: Conexión con backend Node.js/Express
- **TypeScript**: Tipado estático completo
- **TailwindCSS**: Diseño moderno y consistente

## 🛠️ Tecnologías

- **React 19** - Framework de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **TailwindCSS v4** - Framework CSS
- **Redux Toolkit** - Manejo de estado
- **React Router Dom** - Enrutamiento
- **Axios** - Cliente HTTP
- **Lucide React** - Iconos
- **Date-fns** - Manipulación de fechas
- **React Calendar** - Componente de calendario

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── auth/           # Componentes de autenticación
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   ├── common/         # Componentes reutilizables
│   │   └── ProtectedRoute.tsx
│   ├── layout/         # Layout principal
│   │   └── Layout.tsx
│   ├── dashboard/      # Dashboard principal
│   │   └── Dashboard.tsx
│   ├── tasks/          # Gestión de tareas
│   │   ├── TaskList.tsx
│   │   └── TaskCalendar.tsx
│   └── admin/          # Componentes de administración
│       ├── UserManagement.tsx
│       ├── MaterialManagement.tsx
│       └── SpecialtyManagement.tsx
├── store/              # Redux store
│   ├── slices/         # Redux slices
│   │   ├── authSlice.ts
│   │   ├── tasksSlice.ts
│   │   ├── usersSlice.ts
│   │   ├── materialsSlice.ts
│   │   └── especialidadesSlice.ts
│   └── index.ts
├── config/             # Configuración
│   └── api.ts          # Cliente API con interceptores
├── types/              # Definiciones de tipos
│   └── index.ts
└── App.tsx             # Componente principal
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
