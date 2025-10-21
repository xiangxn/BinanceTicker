import { Encryptor } from './encryptor';
import * as dotenv from 'dotenv';
import * as readlineSync from 'readline-sync';

// Load environment variables
dotenv.config();

// Get password from CLI input (hidden)
const password = readlineSync.question('Enter encryption password: ', {
    hideEchoBack: true
});

if (!password) {
    console.error('Password is required');
    process.exit(1);
}

const encryptor = new Encryptor(password);

// List of environment variables to encrypt
const envVars = [
    'TG_API_KEY',
    'MYSQL_PASS',
    'REDIS_PASS',
    'JWT_SECRET',
    'TWITTER_USERNAME',
    'TWITTER_PASSWORD',
    'TWITTER_EMAIL'
];

// Encrypt each variable and print the result
envVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        const encrypted = encryptor.encrypt(value);
        console.log(`${varName} = ${encrypted}`);
    }
});