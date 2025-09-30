# AI-Powered QA Review Pipeline

Una plataforma completa de revisión de código automatizada que utiliza inteligencia artificial para analizar repositorios de código y generar reportes detallados de calidad.

## 🚀 Características

- **Análisis de Código Inteligente**: Utiliza modelos de OpenAI (GPT-4o, GPT-4o-mini) para análisis profundo de código
- **Soporte Multi-Repositorio**: Compatible con Git y SVN
- **Pipeline Automatizado**: Proceso completo desde clonación hasta generación de reportes
- **Interfaz Web Moderna**: Dashboard intuitivo construido con React y TypeScript
- **Agente Local**: Componente Node.js para operaciones locales seguras
- **Base de Datos Persistente**: Almacenamiento de historiales y configuraciones con PostgreSQL
- **Gestión de Secretos**: Manejo seguro de credenciales y tokens de acceso

## 🏗️ Arquitectura

El proyecto está dividido en dos componentes principales:

### Frontend (React + TypeScript)
- Dashboard principal para gestión de proyectos
- Visualización de reportes y análisis
- Configuración de credenciales y repositorios
- Seguimiento de pipelines en tiempo real

### Local Agent (Node.js)
- Clonación y acceso a repositorios
- Análisis de código con IA
- Gestión de base de datos
- API REST para comunicación con el frontend

## 📋 Prerrequisitos

- **Node.js** (v18 o superior)
- **PostgreSQL** (v12 o superior)
- **Git** instalado y disponible en PATH
- **SVN** (opcional, para repositorios Subversion)
- **Clave API de OpenAI**

## 🛠️ Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd ai-powered-qa-review-pipeline
```

### 2. Configurar el Frontend
```bash
# Instalar dependencias del frontend
npm install

# Configurar variables de entorno
cp .env .env.local
# Editar .env.local con tu configuración
```

### 3. Configurar el Local Agent
```bash
# Navegar al directorio del agente
cd local-agent

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu configuración
```

### 4. Configurar Base de Datos
```bash
# En el directorio local-agent
npx prisma generate
npx prisma db push
```

## ⚙️ Variables de Entorno

### Frontend (.env.local)
```env
# Solo necesita la URL del API - NO requiere secretos ni claves
VITE_API_URL=http://localhost:3001
```

### Local Agent (.env)
```env
# Requeridas
OPENAI_API_KEY=tu_clave_openai_aqui
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/qa_pipeline?schema=public
ENCRYPTION_KEY=tu-clave-de-encriptacion-segura

# Opcionales
AI_MODEL=gpt-4o-mini
PORT=3001
```

**Nota importante**: El frontend React solo necesita saber dónde está el API del agente local (`VITE_API_URL`). Todas las claves y secretos (OpenAI, base de datos, etc.) se manejan exclusivamente en el backend por seguridad.

## 🚀 Ejecución

### Desarrollo
```bash
# Terminal 1: Iniciar el Local Agent
cd local-agent
npm start

# Terminal 2: Iniciar el Frontend
npm run dev
```

### Producción con Docker
```bash
# Construir y ejecutar con Docker Compose
docker-compose up -d
```

## 📖 Uso

1. **Configurar Credenciales**: Accede al dashboard y configura tus credenciales de Git/SVN
2. **Agregar Proyecto**: Registra un nuevo repositorio para análisis
3. **Ejecutar Pipeline**: Inicia el proceso de revisión automatizada
4. **Revisar Resultados**: Analiza los reportes generados y las recomendaciones

## 🔧 Modelos de IA Disponibles

| Modelo | Descripción | Uso Recomendado |
|--------|-------------|-----------------|
| `gpt-4o` | Más avanzado y preciso | Producción |
| `gpt-4o-mini` | Balance costo-calidad | Desarrollo |
| `gpt-4-turbo` | Optimizado para velocidad | Análisis rápidos |
| `gpt-3.5-turbo` | Más económico | Pruebas |

## 📁 Estructura del Proyecto

```
ai-powered-qa-review-pipeline/
├── components/          # Componentes React
├── services/           # Servicios del frontend
├── local-agent/        # Agente local Node.js
│   ├── services/       # Servicios del backend
│   ├── prisma/         # Esquema de base de datos
│   └── workspaces/     # Espacios de trabajo temporales
├── database/           # Configuración de base de datos
└── docker/             # Archivos Docker
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte y preguntas:
- Abre un issue en GitHub
- Consulta la documentación en `/local-agent/CONFIGURATION.md`
- Revisa los logs del agente local para debugging
