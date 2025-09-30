const http = require('http');

// Función para hacer peticiones HTTP
function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonBody = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, data: jsonBody });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Función principal de pruebas
async function runTests() {
    console.log('🧪 Iniciando pruebas de la API...\n');

    try {
        // Test 1: Ping
        console.log('1. Probando /ping...');
        const pingResult = await makeRequest('/ping');
        console.log(`   Status: ${pingResult.status}`);
        console.log(`   Response: ${JSON.stringify(pingResult.data)}\n`);

        // Test 2: Obtener proyectos
        console.log('2. Probando /api/projects...');
        const projectsResult = await makeRequest('/api/projects');
        console.log(`   Status: ${projectsResult.status}`);
        console.log(`   Response: ${JSON.stringify(projectsResult.data)}\n`);

        // Test 3: Obtener reviews
        console.log('3. Probando /api/reviews...');
        const reviewsResult = await makeRequest('/api/reviews');
        console.log(`   Status: ${reviewsResult.status}`);
        console.log(`   Response: ${JSON.stringify(reviewsResult.data)}\n`);

        // Test 4: Obtener secretos
        console.log('4. Probando /api/secrets...');
        const secretsResult = await makeRequest('/api/secrets');
        console.log(`   Status: ${secretsResult.status}`);
        console.log(`   Response: ${JSON.stringify(secretsResult.data)}\n`);

        // Test 5: Crear un secreto de prueba
        console.log('5. Probando POST /api/secrets...');
        const newSecret = {
            name: 'TEST_SECRET',
            value: 'test-value-123',
            type: 'API_KEY',
            description: 'Secreto de prueba para verificar la base de datos'
        };
        const createSecretResult = await makeRequest('/api/secrets', 'POST', newSecret);
        console.log(`   Status: ${createSecretResult.status}`);
        console.log(`   Response: ${JSON.stringify(createSecretResult.data)}\n`);

        // Test 6: Verificar que el secreto se creó
        console.log('6. Verificando que el secreto se creó...');
        const secretsAfterCreate = await makeRequest('/api/secrets');
        console.log(`   Status: ${secretsAfterCreate.status}`);
        console.log(`   Response: ${JSON.stringify(secretsAfterCreate.data)}\n`);

        console.log('✅ Todas las pruebas completadas!');

    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
    }
}

// Ejecutar las pruebas
runTests();