// Debug script to test WaniKani 64-byte limit per synonym

const MAX_SYNONYM_BYTES = 63; // WaniKani has 64 byte limit, using 63 for minimal safety margin

/**
 * Truncate synonym to fit WaniKani's 64-byte limit per synonym.
 * Uses 63-byte safety margin for minimal overhead.
 * Adds "~" indicator when truncated.
 */
const truncateSynonym = (str) => {
    let truncated = str.replace(/…/g, "~"); // Replace ellipsis (3 bytes) with tilde (1 byte)
    let wasTruncated = false;

    while (Buffer.byteLength(truncated, 'utf8') > MAX_SYNONYM_BYTES) {
        truncated = truncated.slice(0, -1);
        wasTruncated = true;
    }

    if (wasTruncated) {
        // Make sure we have space for the "~"
        while (Buffer.byteLength(truncated + "~", 'utf8') > MAX_SYNONYM_BYTES) {
            truncated = truncated.slice(0, -1);
        }
        truncated += "~";
    }

    return truncated;
};

// Test cases for synonym truncation
const testSynonyms = [
    // Normal cases
    "Wasser",
    "Flüssigkeit",
    "Grund",

    // Long German compounds
    "Kraftfahrzeughaftpflichtversicherung",
    "Bundesverfassungsgericht",
    "Geschwindigkeitsbegrenzung",

    // UTF-8 special characters (more bytes than characters)
    "Müßiggang",
    "Füße",
    "Größe",
    "Ähnlichkeit",

    // Very long technical terms
    "elektromagnetische Verträglichkeit",
    "Hochfrequenzverstärker für die Telekommunikation",
    "wasserstoffbetriebene Brennstoffzelle",

    // Exceeding limit cases
    "extrem lange deutsche Zusammensetzung die definitiv das Byte-Limit überschreitet",
    "Donaudampfschifffahrtsgesellschaftskapitän und weitere sehr lange Wörter",
    "超長い日本語の複合語で絶対にバイト制限を超える単語の例",

    // With ellipsis (should be replaced)
    "sehr lange Bezeichnung…",
    "超長い日本語の単語…",

    // Edge cases
    "",
    "a",
    "🌐🔥⚡", // Emojis (4 bytes each)
];

console.log('🧪 Testing WaniKani Synonym Byte Limit (63 bytes safety margin)\n');

testSynonyms.forEach((synonym, index) => {
    const originalBytes = Buffer.byteLength(synonym, 'utf8');
    const truncated = truncateSynonym(synonym);
    const truncatedBytes = Buffer.byteLength(truncated, 'utf8');

    const wasTruncated = synonym !== truncated;
    const status = truncatedBytes <= MAX_SYNONYM_BYTES ? '✅' : '❌';

    console.log(`${status} Test ${index + 1}:`);
    console.log(`  Original: "${synonym}" (${originalBytes} bytes)`);
    console.log(`  Result:   "${truncated}" (${truncatedBytes} bytes)`);
    console.log(`  Truncated: ${wasTruncated ? 'Yes' : 'No'}`);
    console.log('');
});

// Test edge case with all emojis
const emojiTest = "🌐🔥⚡💧🌟🎯🚀✨🎉🌈🔮🎪";
const emojiOriginalBytes = Buffer.byteLength(emojiTest, 'utf8');
const emojiTruncated = truncateSynonym(emojiTest);
const emojiTruncatedBytes = Buffer.byteLength(emojiTruncated, 'utf8');

console.log('🎯 Special Test - Emoji Heavy String:');
console.log(`  Original: "${emojiTest}" (${emojiOriginalBytes} bytes)`);
console.log(`  Result:   "${emojiTruncated}" (${emojiTruncatedBytes} bytes)`);
console.log(`  Characters: ${emojiTest.length} → ${emojiTruncated.length}`);

console.log('\n✅ Byte limit testing completed!');

// Summary
console.log(`\n📊 Summary:`);
console.log(`- Byte limit: ${MAX_SYNONYM_BYTES} bytes (63-byte safety margin)`);
console.log(`- WaniKani official limit: 64 bytes`);
console.log(`- Truncation indicator: "~" at end`);
console.log(`- Special handling: Ellipsis "…" → Tilde "~"`);
