import { getKanji } from './src/lib/wanikani.ts';

// Quick test to see if we can load kanji
console.log('Testing Kanji API...');

try {
    // This will fail without API token, but we can see if the structure is correct
    console.log('getKanji function exists:', typeof getKanji);
    console.log('Test completed');
} catch (error) {
    console.error('Error:', error.message);
}
