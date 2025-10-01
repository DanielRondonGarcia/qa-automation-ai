# Testing Documentation - QA Pipeline Local Agent

## Descripción General

Este proyecto incluye un conjunto completo de pruebas unitarias para garantizar la calidad y confiabilidad del código. Las pruebas están implementadas usando Jest y cubren todos los componentes principales del sistema.

## Estructura de Pruebas

```
__tests__/
├── index.test.js              # Pruebas del servidor Express principal
├── openaiService.test.js      # Pruebas del servicio de OpenAI
├── databaseService.test.js    # Pruebas del servicio de base de datos
├── reviewService.test.js      # Pruebas del servicio de revisiones
└── secretsService.test.js     # Pruebas del servicio de secretos
```

## Configuración de Testing

### Archivos de Configuración

- `jest.config.js` - Configuración principal de Jest
- `jest.setup.js` - Configuración inicial para cada test
- `.env.test` - Variables de entorno específicas para testing

### Dependencias de Testing

- **Jest**: Framework de testing principal
- **Supertest**: Testing de APIs HTTP
- **@jest/globals**: Utilidades globales de Jest

## Scripts de Testing

### Comandos Disponibles

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas en modo watch (desarrollo)
npm run test:watch

# Ejecutar pruebas con reporte de cobertura
npm run test:coverage

# Ejecutar pruebas para CI/CD
npm run test:ci
```

### Ejemplos de Uso

```bash
# Desarrollo - ejecutar pruebas específicas
npm test -- openaiService.test.js

# Desarrollo - modo watch con filtro
npm run test:watch -- --testNamePattern="encrypt"

# Verificar cobertura antes de commit
npm run test:coverage
```

## Cobertura de Código

Las pruebas están configuradas para generar reportes de cobertura que incluyen:

- **Statements**: Líneas de código ejecutadas
- **Branches**: Ramas de código cubiertas
- **Functions**: Funciones probadas
- **Lines**: Líneas de código cubiertas

### Objetivos de Cobertura

- Mínimo 80% de cobertura general
- Mínimo 90% para servicios críticos (openaiService, databaseService)
- 100% para funciones de seguridad (encriptación/desencriptación)

## Componentes Probados

### 1. OpenAI Service (`openaiService.test.js`)

**Funcionalidades probadas:**
- Análisis de código con diferentes formatos de respuesta
- Manejo de errores de la API de OpenAI
- Validación de parámetros de entrada
- Parsing de respuestas JSON
- Manejo de respuestas legacy

**Mocks utilizados:**
- OpenAI API client
- Respuestas de chat completions

### 2. Database Service (`databaseService.test.js`)

**Funcionalidades probadas:**
- Patrón Singleton
- Conexión y desconexión de base de datos
- Manejo de errores de conexión
- Inicialización del cliente Prisma

**Mocks utilizados:**
- PrismaClient
- Métodos de conexión de Prisma

### 3. Review Service (`reviewService.test.js`)

**Funcionalidades probadas:**
- CRUD de proyectos
- CRUD de revisiones
- CRUD de archivos
- CRUD de findings
- Manejo de relaciones entre entidades
- Manejo de errores de base de datos

**Mocks utilizados:**
- DatabaseService
- Métodos de Prisma (create, findUnique, findMany, etc.)

### 4. Secrets Service (`secretsService.test.js`)

**Funcionalidades probadas:**
- Encriptación y desencriptación de datos
- Almacenamiento seguro de secretos
- Recuperación y actualización de secretos
- Manejo de claves de encriptación
- Limpieza de secretos expirados

**Mocks utilizados:**
- CryptoJS
- DatabaseService
- Variables de entorno

### 5. Express App (`index.test.js`)

**Funcionalidades probadas:**
- Endpoints de API (GET, POST, PUT)
- Middleware de CORS
- Manejo de errores HTTP
- Validación de datos de entrada
- Integración con servicios

**Mocks utilizados:**
- Todos los servicios (openaiService, DatabaseService, ReviewService)
- Supertest para requests HTTP

## Estrategias de Testing

### 1. Unit Testing
- Cada componente se prueba de forma aislada
- Uso extensivo de mocks para dependencias
- Enfoque en lógica de negocio específica

### 2. Integration Testing
- Testing de endpoints completos
- Verificación de flujos de datos entre servicios
- Validación de respuestas HTTP

### 3. Error Handling Testing
- Pruebas de escenarios de error
- Validación de mensajes de error
- Verificación de códigos de estado HTTP

## Mejores Prácticas

### 1. Estructura de Tests

```javascript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup común
  });

  describe('methodName', () => {
    it('should handle normal case', () => {
      // Test del caso normal
    });

    it('should handle error case', () => {
      // Test del caso de error
    });
  });
});
```

### 2. Naming Conventions

- Archivos de test: `*.test.js`
- Describe blocks: Nombre del componente/método
- Test cases: Descripción clara del comportamiento esperado

### 3. Mock Management

- Limpiar mocks en `beforeEach`
- Usar mocks específicos para cada test
- Verificar llamadas a mocks cuando sea relevante

## Debugging Tests

### Comandos Útiles

```bash
# Ejecutar un test específico con output detallado
npm test -- --verbose openaiService.test.js

# Ejecutar tests con debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Ver solo tests fallidos
npm test -- --onlyFailures
```

### Logs y Debugging

- Los tests usan variables de entorno de `.env.test`
- Console logs están mockeados por defecto
- Usar `console.log` en tests para debugging temporal

## Mantenimiento

### Actualización de Tests

1. **Nuevas funcionalidades**: Agregar tests correspondientes
2. **Cambios en APIs**: Actualizar mocks y assertions
3. **Refactoring**: Mantener tests actualizados con cambios de estructura

### Revisión de Cobertura

1. Ejecutar `npm run test:coverage` regularmente
2. Revisar reportes HTML en `coverage/lcov-report/index.html`
3. Identificar áreas sin cobertura y agregar tests

### CI/CD Integration

- Los tests se ejecutan automáticamente en CI/CD
- Usar `npm run test:ci` para simular entorno de CI
- Fallos en tests bloquean deployments

## Troubleshooting

### Problemas Comunes

1. **Tests timeout**: Aumentar timeout en `jest.config.js`
2. **Mocks no funcionan**: Verificar orden de imports y mocks
3. **Variables de entorno**: Asegurar que `.env.test` esté configurado
4. **Dependencias**: Verificar que todas las dev dependencies estén instaladas

### Recursos Adicionales

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)