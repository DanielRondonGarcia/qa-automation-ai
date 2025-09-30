# Configuración del Agente Local

Este documento describe las variables de entorno disponibles para configurar el agente local de QA.

## Variables de Entorno

### Requeridas

#### `API_KEY`
- **Descripción**: Clave de API de OpenAI para acceder a los servicios de IA
- **Tipo**: String
- **Ejemplo**: `API_KEY="sk-proj-..."`
- **Nota**: Obtén tu clave API en [OpenAI Platform](https://platform.openai.com/api-keys)

#### `DATABASE_URL`
- **Descripción**: URL de conexión a la base de datos PostgreSQL
- **Tipo**: String
- **Ejemplo**: `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qa_pipeline?schema=public"`

#### `ENCRYPTION_KEY`
- **Descripción**: Clave de encriptación para secretos almacenados
- **Tipo**: String
- **Ejemplo**: `ENCRYPTION_KEY="your-secret-encryption-key-change-this-in-production"`
- **Nota**: Cambia esta clave en producción por una más segura

### Opcionales

#### `AI_MODEL`
- **Descripción**: Modelo de IA a utilizar para el análisis de código
- **Tipo**: String
- **Valor por defecto**: `gpt-4o`
- **Opciones disponibles**:
  - `gpt-4o` - Modelo más avanzado y preciso (recomendado)
  - `gpt-4o-mini` - Versión más rápida y económica de GPT-4o
  - `gpt-4-turbo` - Modelo GPT-4 optimizado para velocidad
  - `gpt-3.5-turbo` - Modelo más económico pero menos preciso
- **Ejemplo**: `AI_MODEL="gpt-4o-mini"`

## Configuración de Modelos

### Recomendaciones por Caso de Uso

| Caso de Uso | Modelo Recomendado | Razón |
|-------------|-------------------|-------|
| Producción | `gpt-4o` | Máxima precisión y calidad |
| Desarrollo | `gpt-4o-mini` | Balance entre costo y calidad |
| Pruebas | `gpt-3.5-turbo` | Más económico para pruebas |
| Análisis profundo | `gpt-4o` | Mejor comprensión de código complejo |

### Consideraciones de Costo

- **gpt-4o**: Más costoso pero más preciso
- **gpt-4o-mini**: 60% más económico que gpt-4o
- **gpt-4-turbo**: Costo medio, buena velocidad
- **gpt-3.5-turbo**: Más económico, menor precisión

## Ejemplo de Archivo .env

```env
# Base de datos
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qa_pipeline?schema=public"

# Seguridad
ENCRYPTION_KEY="your-secret-encryption-key-change-this-in-production"

# OpenAI
API_KEY="sk-proj-your-actual-api-key-here"
AI_MODEL="gpt-4o"
```

## Cambio de Modelo en Tiempo de Ejecución

Para cambiar el modelo de IA:

1. Modifica la variable `AI_MODEL` en el archivo `.env`
2. Reinicia el agente local
3. El nuevo modelo se aplicará a todos los análisis posteriores

```bash
# Detener el agente
Ctrl+C

# Modificar .env
AI_MODEL="gpt-4o-mini"

# Reiniciar el agente
npm start
```