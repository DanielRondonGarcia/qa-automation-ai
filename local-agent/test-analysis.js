// Cargar variables de entorno del archivo .env
require('dotenv').config();

const { analyzeCode } = require('./openaiService');

// Código C# de prueba simple
const testCode = `
using System;

namespace TestNamespace
{
    public class TestClass
    {
        public void TestMethod()
        {
            string name = null;
            Console.WriteLine(name.Length); // Potential null reference
            
            // Unused variable
            int unusedVariable = 42;
        }
    }
}
`;

// Reglas de prueba
const testRules = [
    {
        name: "Null Reference Check",
        description: "Check for potential null reference exceptions",
        enabled: true
    },
    {
        name: "Unused Variables",
        description: "Identify unused variables",
        enabled: true
    }
];

async function testAnalysis() {
    console.log('🧪 Probando análisis de código con las correcciones aplicadas...\n');
    
    try {
        console.log('📝 Código a analizar:');
        console.log(testCode);
        console.log('\n📋 Reglas aplicadas:');
        testRules.forEach((rule, index) => {
            console.log(`${index + 1}. ${rule.name}: ${rule.description}`);
        });
        
        console.log('\n🔍 Iniciando análisis...');
        const startTime = Date.now();
        
        const results = await analyzeCode(testCode, testRules);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`\n✅ Análisis completado en ${duration}ms`);
        console.log('\n📊 Resultados:');
        
        if (results && results.length > 0) {
            results.forEach((finding, index) => {
                console.log(`\n${index + 1}. Problema encontrado:`);
                console.log(`   📍 Línea: ${finding.lineNumber}`);
                console.log(`   🔍 Código: ${finding.codeSnippet}`);
                console.log(`   ⚠️  Problema: ${finding.issue}`);
                console.log(`   💡 Sugerencia: ${finding.suggestion}`);
                console.log(`   📝 Razón: ${finding.reason}`);
            });
        } else {
            console.log('   ℹ️  No se encontraron problemas en el código.');
        }
        
        console.log('\n🎉 ¡Prueba de análisis exitosa!');
        
    } catch (error) {
        console.error('\n❌ Error durante el análisis:');
        console.error('   Mensaje:', error.message);
        console.error('   Stack:', error.stack);
        
        // Información adicional para debugging
        console.log('\n🔧 Información de debugging:');
        console.log('   Modelo AI configurado:', process.env.AI_MODEL || 'gpt-4o (default)');
        console.log('   API Key configurada:', process.env.API_KEY ? 'Sí' : 'No');
    }
}

// Ejecutar la prueba
testAnalysis();