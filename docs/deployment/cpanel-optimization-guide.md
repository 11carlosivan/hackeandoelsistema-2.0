# Guía de Optimización de Recursos y Procesos en cPanel (BanaHosting)

Esta guía explica detalladamente cómo configurar tus aplicaciones de Node.js en cPanel para no exceder el límite de 100 procesos concurrentes y evitar los errores **503 Service Unavailable**.

---

## Paso 1: Configurar las Variables de Entorno en cPanel

Para cada una de tus aplicaciones en cPanel (**Frontend** y **Backend**):

1. Ve a cPanel y abre **Setup Node.js App**.
2. Haz clic en el ícono de lápiz para **Editar** la aplicación.
3. Desplázate hacia abajo hasta la sección **Environment variables** (Variables de entorno).
4. Agrega las siguientes variables:

### Para el Frontend (Next.js):
*   **Variable Name**: `UV_THREADPOOL_SIZE`
    *   **Value**: `1`
*   **Variable Name**: `NEXT_TELEMETRY_DISABLED`
    *   **Value**: `1`

### Para el Backend (Fastify):
*   **Variable Name**: `UV_THREADPOOL_SIZE`
    *   **Value**: `1`

5. Haz clic en **Save** (Guardar) para confirmar.

*Nota: Establecer `UV_THREADPOOL_SIZE=1` reduce el número de hilos de entrada/salida de Node por instancia de 4 a 1, ahorrando hasta un 40% de hilos/procesos activos bajo CloudLinux.*

---

## Paso 2: Configurar los archivos `.htaccess` en cPanel

Cuando creas una aplicación en cPanel, se genera un archivo `.htaccess` en la raíz pública del dominio o subdominio. Debes editar estos archivos (a través del **Administrador de Archivos** de cPanel o vía SSH/FTP) y asegurarte de incluir las directivas de control de Phusion Passenger:

### 1. Archivo `.htaccess` del Frontend (Dominio principal / test)
Ubicación típica: `public_html/.htaccess` o `public_html/test/.htaccess`.
Asegúrate de agregar estas líneas al inicio del archivo:

```apache
# Forzar límites estrictos de instancias para no superar los 100 procesos de BanaHosting
PassengerMinInstances 1
PassengerMaxInstancesPerApp 2
PassengerPoolIdleTime 10
```

### 2. Archivo `.htaccess` del Backend (Subdominio de la API)
Ubicación típica: `public_html/api/.htaccess` o la carpeta del subdominio `api.test.hackeandoelsistema.net`.
Asegúrate de agregar las mismas líneas al inicio:

```apache
# Forzar límites estrictos de instancias para no superar los 100 procesos de BanaHosting
PassengerMinInstances 1
PassengerMaxInstancesPerApp 2
PassengerPoolIdleTime 10
```

---

## Paso 3: Reiniciar las Aplicaciones

Una vez aplicados los pasos anteriores:

1. Ve a **Setup Node.js App** en cPanel.
2. Haz clic en el botón **Restart** (Reiniciar) de ambas aplicaciones.
3. Si los procesos persisten acumulados en segundo plano, haz clic en **Stop App** y luego en **Start App** para forzar un reinicio limpio.

---

## Paso 4: Monitorear el Uso de Recursos

En el panel lateral derecho de tu cPanel o abriendo la herramienta **Resource Usage** (Uso de Recursos), vigila la métrica **Entry Processes** y **Number of Processes**.
Con esta optimización, el consumo en reposo debería bajar de ~90-110 procesos a **menos de 15 procesos**, lo que te dejará un amplio margen para recibir tráfico sin provocar el error 503.

---

## Solución de Problemas Frecuentes al Iniciar (Logs de Error 503)

Si tras reiniciar obtienes un error **503 Service Unavailable** del lado de la aplicación y ves los siguientes mensajes en los logs:

### 1. Error del Backend: `ERR_REQUIRE_ASYNC_MODULE`
*   **Problema**: cPanel/Litespeed intenta importar el servidor usando `require()` síncrono, lo cual falla en módulos ES con `await` en el nivel superior (top-level await).
*   **Solución**: Ya hemos modificado el archivo `backend/api/server.js` localmente para envolver el inicio en una función asíncrona `start()`. Sube este archivo actualizado a tu backend de cPanel.

### 2. Error del Frontend: `Cannot find module 'next/dist/server/next.js'`
*   **Problema**: El comando `npm install` en el servidor cPanel falló o se interrumpió a la mitad debido a los límites de memoria de la cuenta, dejando el paquete `next` incompleto en `node_modules`.
*   **Solución**:
    1.  Elimina la carpeta `node_modules` actual de la app de Frontend en cPanel.
    2.  Comprime localmente la carpeta `frontend/.next/standalone/node_modules` en un archivo `.zip`.
    3.  Sube ese archivo `.zip` al directorio de tu frontend en cPanel.
    4.  Descomprímelo directamente desde el Administrador de Archivos de cPanel. Esto instalará los archivos binarios compilados y limpios de Next.js y React en segundos sin consumir recursos del hosting.

