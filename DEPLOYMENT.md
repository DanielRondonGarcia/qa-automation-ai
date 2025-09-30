# Guía de Despliegue - AI-Powered QA Review Pipeline

Esta guía te ayudará a desplegar la aplicación en producción usando Docker y Docker Compose.

## 📋 Prerrequisitos

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- Al menos 2GB de RAM disponible
- 10GB de espacio en disco

## 🚀 Despliegue Rápido

### 1. Clonar el Repositorio

```bash
git clone <tu-repositorio-url>
cd ai-powered-qa-review-pipeline
```

### 2. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar las variables necesarias
nano .env  # o tu editor preferido
```

**Variables obligatorias a configurar:**
- `OPENAI_API_KEY`: Tu clave de API de OpenAI
- `ENCRYPTION_KEY`: Clave de cifrado segura (mínimo 32 caracteres)

### 3. Generar Clave de Cifrado Segura

```bash
# Opción 1: Usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Opción 2: Usando OpenSSL
openssl rand -hex 32

# Opción 3: Usando PowerShell (Windows)
[System.Web.Security.Membership]::GeneratePassword(64, 0)
```

### 4. Desplegar la Aplicación

```bash
# Construir y ejecutar todos los servicios
docker-compose up -d

# Ver los logs
docker-compose logs -f app
```

### 5. Verificar el Despliegue

- **Aplicación principal**: http://localhost:3001
- **Health check**: http://localhost:3001/health
- **pgAdmin** (opcional): http://localhost:5050

## 🔧 Configuraciones Avanzadas

### Despliegue con Nginx (Recomendado para Producción)

```bash
# Ejecutar con proxy reverso
docker-compose --profile nginx up -d
```

Esto incluye:
- Nginx como proxy reverso en el puerto 80
- Rate limiting para APIs
- Compresión gzip
- Headers de seguridad

### Despliegue con pgAdmin

```bash
# Ejecutar con interfaz de administración de base de datos
docker-compose --profile pgadmin up -d
```

### Despliegue Completo

```bash
# Ejecutar todos los servicios opcionales
docker-compose --profile nginx --profile pgadmin up -d
```

## 🛠️ Comandos Útiles

### Gestión de Contenedores

```bash
# Ver estado de los servicios
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Reiniciar un servicio específico
docker-compose restart app

# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v
```

### Gestión de Base de Datos

```bash
# Backup de la base de datos
docker-compose exec db pg_dump -U postgres qa_pipeline > backup.sql

# Restaurar backup
docker-compose exec -T db psql -U postgres qa_pipeline < backup.sql

# Acceder a la consola de PostgreSQL
docker-compose exec db psql -U postgres qa_pipeline
```

### Actualización de la Aplicación

```bash
# Detener la aplicación
docker-compose down

# Actualizar el código
git pull

# Reconstruir y ejecutar
docker-compose up -d --build
```

## 🔒 Configuración de Seguridad para Producción

### 1. Variables de Entorno Seguras

```bash
# Generar contraseñas seguras
POSTGRES_PASSWORD=$(openssl rand -base64 32)
PGADMIN_PASSWORD=$(openssl rand -base64 16)
ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### 2. Configurar HTTPS (Recomendado)

1. Obtener certificados SSL (Let's Encrypt, Cloudflare, etc.)
2. Descomentar la configuración HTTPS en `nginx/nginx.conf`
3. Montar los certificados en el contenedor de Nginx

### 3. Firewall y Red

```bash
# Permitir solo puertos necesarios
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 3001/tcp  # Bloquear acceso directo a la app
ufw deny 5432/tcp  # Bloquear acceso directo a PostgreSQL
```

## 📊 Monitoreo y Logs

### Health Checks

La aplicación incluye health checks automáticos:

```bash
# Verificar salud de la aplicación
curl http://localhost:3001/health

# Verificar salud de la base de datos
docker-compose exec app node -e "
const db = require('./local-agent/services/databaseService');
db.healthCheck().then(console.log).catch(console.error);
"
```

### Logs Centralizados

```bash
# Ver logs de todos los servicios
docker-compose logs

# Filtrar logs por servicio
docker-compose logs app
docker-compose logs db
docker-compose logs nginx

# Seguir logs en tiempo real
docker-compose logs -f --tail=100
```

## 🚨 Solución de Problemas

### Problemas Comunes

1. **Error de conexión a la base de datos**
   ```bash
   # Verificar que PostgreSQL esté ejecutándose
   docker-compose ps db
   
   # Revisar logs de la base de datos
   docker-compose logs db
   ```

2. **Error de permisos en volúmenes**
   ```bash
   # Cambiar propietario de directorios
   sudo chown -R $USER:$USER ./workspaces
   ```

3. **Puerto ya en uso**
   ```bash
   # Encontrar proceso usando el puerto
   netstat -tulpn | grep :3001
   
   # Cambiar puerto en docker-compose.yml
   ports:
     - "3002:3001"  # Usar puerto 3002 en lugar de 3001
   ```

### Logs de Depuración

```bash
# Habilitar logs detallados
export DEBUG=*
docker-compose up

# Ver logs de construcción
docker-compose build --no-cache --progress=plain
```

## 📈 Escalabilidad

### Múltiples Instancias

```bash
# Escalar la aplicación a 3 instancias
docker-compose up -d --scale app=3
```

### Configuración de Load Balancer

Editar `nginx/nginx.conf` para incluir múltiples backends:

```nginx
upstream qa_pipeline_backend {
    server app_1:3001;
    server app_2:3001;
    server app_3:3001;
}
```

## 🔄 Backup y Recuperación

### Backup Automático

Crear un script de backup:

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T db pg_dump -U postgres qa_pipeline > "backup_${DATE}.sql"
```

### Recuperación de Desastres

```bash
# Restaurar desde backup
docker-compose down
docker volume rm qa_pipeline_postgres_data
docker-compose up -d db
sleep 10
docker-compose exec -T db psql -U postgres qa_pipeline < backup_20241230_120000.sql
docker-compose up -d
```

## 📞 Soporte

Si encuentras problemas durante el despliegue:

1. Revisa los logs: `docker-compose logs`
2. Verifica la configuración: `docker-compose config`
3. Consulta la documentación: `README.md`
4. Abre un issue en el repositorio del proyecto

---

**¡Tu aplicación AI-Powered QA Review Pipeline está lista para producción!** 🎉