#!/bin/bash

# Mostrar información del entorno
echo "Iniciando WhatsApp Worker en entorno: $NODE_ENV"
echo "Directorio actual: $(pwd)"

# Verificar si existe la carpeta de sesión
if [ -d "./.wwebjs_auth/session/Default" ]; then
  echo "Carpeta de sesión encontrada, verificando integridad..."
  
  # Ejecutar script de verificación de sesión
  node ./scripts/checkSession.js
  
  # Verificar resultado
  if [ $? -eq 0 ]; then
    echo "Verificación de sesión exitosa, iniciando aplicación..."
    node index.js
  else
    echo "La verificación de sesión falló, se requiere generar una nueva sesión"
    echo "Escanea el código QR cuando aparezca para crear una nueva sesión"
    node ./scripts/generateSession.js
    
    # Verificar si la generación de sesión fue exitosa
    if [ $? -eq 0 ]; then
      echo "Sesión generada correctamente, iniciando aplicación..."
      node index.js
    else
      echo "Error al generar la sesión. Revisa los logs para más detalles."
      exit 1
    fi
  fi
else
  echo "No se encontró carpeta de sesión, generando nueva sesión..."
  echo "Escanea el código QR cuando aparezca para crear una nueva sesión"
  
  # Crear estructura de carpetas si no existe
  mkdir -p ./.wwebjs_auth
  chmod -R 777 ./.wwebjs_auth
  
  # Generar nueva sesión
  node ./scripts/generateSession.js
  
  # Verificar si la generación de sesión fue exitosa
  if [ $? -eq 0 ]; then
    echo "Sesión generada correctamente, iniciando aplicación..."
    node index.js
  else
    echo "Error al generar la sesión. Revisa los logs para más detalles."
    exit 1
  fi
fi
