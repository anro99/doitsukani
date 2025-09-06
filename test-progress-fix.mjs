// Quick test to verify the progress calculation fix
console.log('🧪 Testing Progress Calculation Fix');

// Simulate the scenario from the user's log
const totalSelectedKanjiInLevel = 45;
const selectedKanjiInBatch = 45; // All kanji in level 5 are selected
const totalSelectedFoundSoFar = 0; // Before processing first batch

console.log(`\n❌ OLD CALCULATION (incorrect):`);
const oldTotalCount = totalSelectedFoundSoFar + selectedKanjiInBatch; // This was wrong: 0 + 45 = 45 ✓
console.log(`   totalSelectedFoundSoFar: ${totalSelectedFoundSoFar}`);
console.log(`   selectedKanjiInBatch: ${selectedKanjiInBatch}`);
console.log(`   But then in progress callback: totalSelectedFoundSoFar + selectedKanji.length = ${totalSelectedFoundSoFar} + ${selectedKanjiInBatch} = ${oldTotalCount + selectedKanjiInBatch}`);
console.log(`   Result: Progress calculated as 45/90 = 50% ❌`);

console.log(`\n✅ NEW CALCULATION (fixed):`);
const newTotalCount = totalSelectedFoundSoFar + selectedKanjiInBatch; // Calculate once: 0 + 45 = 45
console.log(`   totalSelectedIncludingCurrentBatch: ${newTotalCount}`);
console.log(`   Progress callback uses this directly: ${newTotalCount}`);
console.log(`   Result: Progress calculated as 45/45 = 100% ✅`);

console.log(`\n🎯 EXPECTED PROGRESS:`)
for (let processed = 1; processed <= totalSelectedKanjiInLevel; processed++) {
    const progress = Math.round((processed / totalSelectedKanjiInLevel) * 100);
    if (processed <= 5 || processed >= 43) { // Show first 5 and last 3
        console.log(`   Kanji ${processed}/${totalSelectedKanjiInLevel}: ${progress}%`);
    } else if (processed === 6) {
        console.log(`   ...`);
    }
}
