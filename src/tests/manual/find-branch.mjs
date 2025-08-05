import { getRadicals } from "../../lib/wanikani.ts";
import dotenv from "dotenv";

dotenv.config();

(async () => {
    try {
        console.log("🔍 Searching for Branch Radical...");

        // Search through more radicals to find "branch"
        const radicals = await getRadicals(process.env.WANIKANI_API_TOKEN, undefined, {
            limit: 500
        });

        console.log(`📊 Searching through ${radicals.length} radicals...`);

        // Search for branch-related radicals
        const branchRadicals = radicals.filter(r =>
            r.data.meanings.some(m =>
                m.meaning.toLowerCase().includes('branch') ||
                m.meaning.toLowerCase().includes('tree') ||
                m.meaning.toLowerCase().includes('stick') ||
                m.meaning.toLowerCase().includes('wood')
            )
        );

        console.log(`\n🌳 Found ${branchRadicals.length} tree/branch-related radicals:`);

        branchRadicals.forEach(r => {
            const meaning = r.data.meanings[0]?.meaning;
            console.log(`\n"${meaning}" (${r.data.slug}):`);
            console.log(`   Characters: ${r.data.characters || "(image-based)"}`);
            console.log(`   Level: ${r.data.level}`);
            console.log(`   Mnemonic: ${r.data.meaning_mnemonic?.substring(0, 200)}...`);
        });

        // Also check for common problematic words
        const problematicWords = ['ground', 'water', 'fire', 'big', 'small'];
        console.log(`\n🎯 Problematic radical translations:`);

        problematicWords.forEach(word => {
            const found = radicals.find(r =>
                r.data.meanings.some(m => m.meaning.toLowerCase() === word)
            );
            if (found) {
                console.log(`\n"${word}" -> context from mnemonic:`);
                console.log(`   "${found.data.meaning_mnemonic?.substring(0, 150)}..."`);
            }
        });

    } catch (error) {
        console.log("❌ Error:", error.message);
    }
})();
