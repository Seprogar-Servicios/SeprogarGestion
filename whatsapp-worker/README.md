# Futurgas WhatsApp Worker

Servicio de background worker para procesar mensajes de WhatsApp y crear tareas automáticamente.

## Descripción

Este servicio se conecta a WhatsApp Web mediante la librería `whatsapp-web.js` y escucha mensajes en grupos específicos. Cuando detecta un mensaje con formato de pedido o tarea, extrae la información relevante y la envía a la API de Futurgas para crear una nueva tarea.

## Requisitos

- Node.js 16 o superior
- Docker (para despliegue en contenedor)
- Cuenta de WhatsApp activa

## Configuración local

1. Clonar el repositorio
2. Instalar dependencias:
   ```
   npm install
   ```
3. Crear archivo `.env` basado en `.env.example`:
   ```
   cp .env.example .env
   ```
4. Editar el archivo `.env` con los valores correctos

### Generación de sesión local

1. Ejecutar el script para generar el código QR:
   ```
   node bot.js
   ```
2. Escanear el código QR con tu teléfono
3. Una vez autenticado, se creará la carpeta `.wwebjs_auth` con los archivos de sesión
4. Esta carpeta de sesión puede ser usada para desplegar en Render sin necesidad de escanear el QR allí

### Iniciar el servicio

```
npm start
```

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `API_URL` | URL base de la API | `https://api.futurgas.com/api` |
| `API_KEY` | Clave de API para autenticación con el backend | `your_secure_api_key` |
| `GRUPOS_PERMITIDOS` | Lista de grupos de WhatsApp permitidos (separados por comas) | `Grupo de Prueba,Soporte Técnico` |
| `DEFAULT_USER_ID` | ID del usuario predeterminado para crear tareas | `64a1b2c3d4e5f6g7h8i9j0k1` |
| `CHECK_DUPLICATE_URL` | URL para verificar tareas duplicadas | `https://api.futurgas.com/api/tareas/check-duplicate` |
| `CREATE_TASK_URL` | URL para crear tareas | `https://api.futurgas.com/api/tareas` |
| `LOG_LEVEL` | Nivel de logs (DEBUG, INFO, WARN, ERROR) | `INFO` |

## Despliegue en Render

### Opción 1: Usando sesión generada localmente (recomendado)

1. Primero, genera la sesión localmente siguiendo los pasos de "Generación de sesión local"
2. Asegúrate de que se haya creado la carpeta `.wwebjs_auth` con los archivos de sesión
3. Comprime la carpeta `.wwebjs_auth` completa y súbela al despliegue de Render (no se recomienda subir estos archivos al repositorio)

### Paso 1: Crear un nuevo servicio

1. Inicia sesión en tu cuenta de [Render](https://render.com)
2. Haz clic en "New" y selecciona "Background Worker"

### Paso 2: Configurar el servicio

1. Conecta tu repositorio de GitHub o sube el código directamente
2. Configura los siguientes campos:
   - **Name**: `futurgas-whatsapp-worker`
   - **Environment**: `Docker`
   - **Branch**: `main` (o la rama que uses)
   - **Build Command**: Dejar en blanco (se usa Dockerfile)
   - **Start Command**: Dejar en blanco (se usa Dockerfile)

### Paso 3: Configurar variables de entorno

En la sección "Environment Variables", agrega todas las variables mencionadas anteriormente:

- `API_URL`: URL base de la API de Futurgas
- `API_KEY`: **IMPORTANTE** - Debe ser exactamente la misma clave configurada en el backend. Esta clave se utiliza para autenticar las solicitudes del worker mediante el encabezado `Authorization: Bearer API_KEY`. Genera una clave segura y aleatoria (por ejemplo, usando `openssl rand -hex 32`)
- `GRUPOS_PERMITIDOS`: Lista de grupos de WhatsApp que el worker monitoreará
- `DEFAULT_USER_ID`: ID del usuario predeterminado para crear tareas
- `CHECK_DUPLICATE_URL`: URL para verificar tareas duplicadas (usar la ruta del worker)
- `CREATE_TASK_URL`: URL para crear tareas (usar la ruta del worker)
- `LOG_LEVEL`: Nivel de detalle de los logs

### Paso 4: Configurar almacenamiento persistente

Para mantener la sesión de WhatsApp activa, necesitas configurar un disco persistente:

1. En la sección "Disks", haz clic en "Add Disk"
2. Configura:
   - **Mount Path**: `/usr/src/app/.wwebjs_auth`
   - **Size**: `1 GB` (o más si es necesario)

### Paso 5: Desplegar

1. Haz clic en "Create Background Worker"
2. Espera a que se complete el despliegue
3. El servicio debería iniciarse usando la sesión que generaste localmente

### Opción 2: Generar sesión en Render (alternativa)

Si no puedes generar la sesión localmente:

1. Despliega el servicio sin la sesión
2. Observa los logs para ver el código QR
3. Escanea el código QR con tu WhatsApp para iniciar sesión
4. La sesión se guardará en el disco persistente

### Paso 6: Monitoreo

1. Puedes ver los logs en tiempo real en la sección "Logs" de Render
2. Configura alertas en Render para recibir notificaciones si el servicio se detiene

## Configuración de API_KEY en el backend

Para que el worker pueda comunicarse con el backend, es necesario configurar la misma API_KEY en ambos sistemas:

1. **Generar una API_KEY segura**:
   ```bash
   # Usando OpenSSL (recomendado)
   openssl rand -hex 32
   
   # O usando un generador de contraseñas seguras online
   ```

2. **Configurar en el backend**:
   - Añade la variable `API_KEY` en el archivo `.env` del backend con el valor generado
   - El backend ya tiene implementado un middleware que valida esta clave en las rutas `/api/worker/tareas/*`
   - Las solicitudes deben incluir el encabezado `Authorization: Bearer TU_API_KEY`

3. **Configurar en el worker**:
   - Añade la misma API_KEY en el archivo `.env` del worker o en las variables de entorno de Render
   - El worker ya está configurado para enviar este token en todas las solicitudes al backend

## Notas importantes

- La primera vez que se ejecuta el servicio, se debe escanear un código QR para autenticar WhatsApp
- La sesión se guarda en el directorio `.wwebjs_auth` usando LocalAuth, por lo que no es necesario volver a escanear el código QR en cada reinicio
- Si cambias de dispositivo o cierras sesión en WhatsApp, deberás volver a escanear el código QR
- El servicio solo procesará mensajes de los grupos especificados en `GRUPOS_PERMITIDOS`
- Los mensajes deben seguir exactamente los formatos especificados para ser procesados correctamente
- **IMPORTANTE**: Mantén la API_KEY segura y no la compartas, ya que permite crear tareas en el sistema sin autenticación de usuario
