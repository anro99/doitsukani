import { getRadicals } from "../../lib/wanikani.ts";
import dotenv from "dotenv";

dotenv.config();

(async () => {
  try {
    console.log("🔍 Analyzing WaniKani Radical Data Structure...");
    
    // Get a few specific radicals including "branch" if available
    const radicals = await getRadicals(process.env.WANIKANI_API_TOKEN, undefined, { 
      limit: 10, 
      levels: "1,2,3" 
    });
    
    console.log(`\n📊 Found ${radicals.length} radicals`);
    console.log("=".repeat(60));
    
    radicals.slice(0, 5).forEach((r, index) => {
      const meaning = r.data.meanings[0]?.meaning || "Unknown";
      console.log(`\n${index + 1}. Radical: "${meaning}"`);
      console.log(`   ID: ${r.id}`);
      console.log(`   Characters: ${r.data.characters || "(image-based)"}`);
      console.log(`   Level: ${r.data.level}`);
      console.log(`   Slug: ${r.data.slug}`);
      
      if (r.data.meaning_mnemonic) {
        console.log(`   Mnemonic: ${r.data.meaning_mnemonic.substring(0, 150)}${r.data.meaning_mnemonic.length > 150 ? '...' : ''}`);
      }
      
      if (r.data.auxiliary_meanings && r.data.auxiliary_meanings.length > 0) {
        console.log(`   Auxiliary: ${JSON.stringify(r.data.auxiliary_meanings)}`);
      }
      
      console.log(`   All meanings: ${r.data.meanings.map(m => `"${m.meaning}" (${m.primary ? 'primary' : 'secondary'})`).join(', ')}`);
    });
    
    // Look specifically for problematic radicals
    const problematicMeanings = ['branch', 'ground', 'stick', 'tree'];
    const found = radicals.filter(r => 
      r.data.meanings.some(m => 
        problematicMeanings.some(pm => 
          m.meaning.toLowerCase().includes(pm)
        )
      )
    );
    
    if (found.length > 0) {
      console.log(`\n🎯 Found problematic radicals:`);
      found.forEach(r => {
        const meaning = r.data.meanings[0]?.meaning;
        console.log(`\n"${meaning}" (${r.data.slug}):`);
        console.log(`   Mnemonic: ${r.data.meaning_mnemonic?.substring(0, 200)}...`);
      });
    }
    
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
})();
