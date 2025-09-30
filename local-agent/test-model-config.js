/**
 * Test script to verify AI model configuration
 * This script tests that the AI_MODEL environment variable is properly loaded
 */

require('dotenv').config();

console.log('🔧 Testing AI Model Configuration...\n');

// Check if API_KEY is set
if (!process.env.API_KEY) {
    console.error('❌ ERROR: API_KEY environment variable is not set');
    process.exit(1);
}

// Get AI model from environment variable or use default
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o';

console.log('📋 Configuration Status:');
console.log(`   API_KEY: ${process.env.API_KEY ? '✅ Set' : '❌ Not set'}`);
console.log(`   AI_MODEL: ${AI_MODEL}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
console.log(`   ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY ? '✅ Set' : '❌ Not set'}`);

console.log('\n🤖 AI Model Information:');
console.log(`   Current Model: ${AI_MODEL}`);

// Validate model
const validModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
if (validModels.includes(AI_MODEL)) {
    console.log(`   Status: ✅ Valid model`);
} else {
    console.log(`   Status: ⚠️  Unknown model (may still work)`);
    console.log(`   Valid options: ${validModels.join(', ')}`);
}

// Model characteristics
const modelInfo = {
    'gpt-4o': { cost: 'High', speed: 'Medium', accuracy: 'Highest' },
    'gpt-4o-mini': { cost: 'Medium', speed: 'Fast', accuracy: 'High' },
    'gpt-4-turbo': { cost: 'High', speed: 'Fast', accuracy: 'High' },
    'gpt-3.5-turbo': { cost: 'Low', speed: 'Fastest', accuracy: 'Medium' }
};

if (modelInfo[AI_MODEL]) {
    const info = modelInfo[AI_MODEL];
    console.log(`   Cost: ${info.cost}`);
    console.log(`   Speed: ${info.speed}`);
    console.log(`   Accuracy: ${info.accuracy}`);
}

console.log('\n✅ Configuration test completed successfully!');
console.log('\n💡 To change the model:');
console.log('   1. Edit the .env file');
console.log('   2. Change AI_MODEL="your-preferred-model"');
console.log('   3. Restart the agent');