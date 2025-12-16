/**
 * Investigate hero metadata issues - check for test data, cached values, or overrides
 * This script checks all possible sources of hero metadata in Supabase
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();
const rootEnvPath = path.resolve(process.cwd(), '../../.env');
dotenv.config({ path: rootEnvPath });

async function investigateHeroMetadata() {
  console.log('🔍 Investigating Hero Metadata Sources...\n');

  try {
    const { supabase } = await import('../lib/supabase');
    const HERO_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HERO_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
    const TOKEN_ID = '9'; // The hero we're debugging

    console.log(`🎯 Investigating Hero #${TOKEN_ID}...`);
    console.log(`📋 Contract: ${HERO_CONTRACT_ADDRESS}\n`);

    // 1. Check adventurers table (what the game uses)
    console.log('1️⃣  Checking adventurers table...');
    const { data: adventurer, error: advError } = await supabase
      .from('adventurers')
      .select('*')
      .eq('token_id', TOKEN_ID)
      .eq('contract_address', HERO_CONTRACT_ADDRESS)
      .single();

    if (advError || !adventurer) {
      console.log('   ❌ Not found in adventurers table');
      console.log(`   Error: ${advError?.message || 'No record'}\n`);
    } else {
      console.log('   ✅ Found in adventurers table:');
      console.log(`      Name: ${adventurer.name || 'N/A'}`);
      console.log(`      Class: ${adventurer.class || 'N/A'}`);
      console.log(`      Level: ${adventurer.level || 'N/A'}`);
      console.log(`      Created: ${adventurer.created_at || 'N/A'}`);
      console.log(`      Updated: ${adventurer.updated_at || 'N/A'}\n`);
    }

    // 2. Check heroes table (if it exists)
    console.log('2️⃣  Checking heroes table...');
    const { data: heroes, error: heroesError } = await supabase
      .from('heroes')
      .select('*')
      .eq('token_id', TOKEN_ID)
      .eq('contract_address', HERO_CONTRACT_ADDRESS);

    if (heroesError) {
      console.log(`   ⚠️  Error: ${heroesError.message}`);
      if (heroesError.code === '42P01') {
        console.log('   ℹ️  Table "heroes" does not exist\n');
      } else {
        console.log(`   Full error: ${JSON.stringify(heroesError, null, 2)}\n`);
      }
    } else if (!heroes || heroes.length === 0) {
      console.log('   ❌ Not found in heroes table\n');
    } else {
      console.log(`   ✅ Found ${heroes.length} record(s) in heroes table:`);
      heroes.forEach((hero: any, idx: number) => {
        console.log(`   Record ${idx + 1}:`);
        console.log(`      Name: ${hero.name || 'N/A'}`);
        console.log(`      Image URI: ${hero.image_uri || 'N/A'}`);
        console.log(`      Attributes: ${hero.attributes ? JSON.stringify(hero.attributes).substring(0, 200) : 'N/A'}`);
        console.log(`      Updated: ${hero.updated_at || 'N/A'}`);
      });
      console.log('');
    }

    // 3. Check hero_ownership table (if it exists)
    console.log('3️⃣  Checking hero_ownership table...');
    const { data: ownership, error: ownershipError } = await supabase
      .from('hero_ownership')
      .select('*')
      .eq('token_id', TOKEN_ID)
      .eq('contract_address', HERO_CONTRACT_ADDRESS);

    if (ownershipError) {
      console.log(`   ⚠️  Error: ${ownershipError.message}`);
      if (ownershipError.code === '42P01') {
        console.log('   ℹ️  Table "hero_ownership" does not exist\n');
      } else {
        console.log(`   Full error: ${JSON.stringify(ownershipError, null, 2)}\n`);
      }
    } else if (!ownership || ownership.length === 0) {
      console.log('   ❌ Not found in hero_ownership table\n');
    } else {
      console.log(`   ✅ Found ${ownership.length} record(s) in hero_ownership table:`);
      ownership.forEach((own: any, idx: number) => {
        console.log(`   Record ${idx + 1}:`);
        console.log(`      Owner: ${own.owner_address || 'N/A'}`);
        console.log(`      Metadata: ${own.metadata ? JSON.stringify(own.metadata).substring(0, 300) : 'N/A'}`);
        if (own.metadata) {
          const meta = own.metadata;
          console.log(`         - Name: ${meta.name || 'N/A'}`);
          console.log(`         - Hero Class: ${meta.hero?.class || 'N/A'}`);
          console.log(`         - Attributes: ${meta.attributes ? meta.attributes.map((a: any) => `${a.trait_type}:${a.value}`).join(', ') : 'N/A'}`);
        }
      });
      console.log('');
    }

    // 4. Check hero_metadata table (if it exists)
    console.log('4️⃣  Checking hero_metadata table...');
    const { data: heroMeta, error: heroMetaError } = await supabase
      .from('hero_metadata')
      .select('*')
      .eq('id', TOKEN_ID); // This might use a different key, adjust if needed

    if (heroMetaError) {
      console.log(`   ⚠️  Error: ${heroMetaError.message}`);
      if (heroMetaError.code === '42P01') {
        console.log('   ℹ️  Table "hero_metadata" does not exist\n');
      } else {
        console.log(`   Full error: ${JSON.stringify(heroMetaError, null, 2)}\n`);
      }
    } else if (!heroMeta || heroMeta.length === 0) {
      console.log('   ❌ Not found in hero_metadata table\n');
    } else {
      console.log(`   ✅ Found ${heroMeta.length} record(s) in hero_metadata table:`);
      heroMeta.forEach((meta: any, idx: number) => {
        console.log(`   Record ${idx + 1}:`);
        console.log(`      Metadata: ${meta.metadata ? JSON.stringify(meta.metadata).substring(0, 300) : 'N/A'}`);
        console.log(`      Created: ${meta.created_at || 'N/A'}`);
      });
      console.log('');
    }

    // 5. Note about checking functions/triggers
    console.log('5️⃣  Database Functions/Triggers:');
    console.log('   ℹ️  Check Supabase dashboard → Database → Functions');
    console.log('   Look for functions/triggers that might auto-update hero metadata\n');

    // 6. Check for test data patterns in adventurers
    console.log('6️⃣  Checking for test data patterns in adventurers...');

    // Check for warriors (suspicious if all heroes are warriors)
    const { data: allAdventurers, error: allAdvError } = await supabase
      .from('adventurers')
      .select('token_id, name, class, contract_address')
      .eq('contract_address', HERO_CONTRACT_ADDRESS)
      .limit(20);

    if (allAdvError) {
      console.log(`   Error: ${allAdvError.message}\n`);
    } else if (allAdventurers && allAdventurers.length > 0) {
      const warriorCount = allAdventurers.filter((a: any) => a.class?.toLowerCase() === 'warrior').length;
      const rogueCount = allAdventurers.filter((a: any) => a.class?.toLowerCase() === 'rogue').length;
      
      console.log(`   📊 Found ${allAdventurers.length} adventurer(s):`);
      console.log(`      Warriors: ${warriorCount}`);
      console.log(`      Rogues: ${rogueCount}`);
      
      if (warriorCount > rogueCount * 2 && warriorCount > 5) {
        console.log(`      ⚠️  WARNING: Most heroes are Warriors - might be default values!\n`);
      }
      
      // Show hero #9 specifically
      const hero9 = allAdventurers.find((a: any) => a.token_id === TOKEN_ID);
      if (hero9) {
        console.log(`\n   🎯 Hero #${TOKEN_ID} in database:`);
        console.log(`      Name: "${hero9.name}"`);
        console.log(`      Class: "${hero9.class}"`);
      }
      console.log('');
    } else {
      console.log('   ℹ️  No adventurers found\n');
    }

    // 7. Check migrations for default values
    console.log('7️⃣  Recommendation: Check Supabase Migrations:');
    console.log('   Look in supabase/migrations/ for:');
    console.log('   - DEFAULT values on name/class columns');
    console.log('   - Triggers that auto-set hero data');
    console.log('   - Functions that modify adventurer data');
    console.log('   - Seed data or test inserts\n');

    // 8. Summary
    console.log('📊 SUMMARY:');
    console.log('=' .repeat(50));
    if (adventurer) {
      console.log(`✅ Hero #${TOKEN_ID} exists in adventurers table`);
      console.log(`   Current stored: ${adventurer.name} (${adventurer.class})`);
    } else {
      console.log(`❌ Hero #${TOKEN_ID} NOT in adventurers table`);
    }
    console.log('\n💡 If metadata is wrong, check:');
    console.log('   1. Adventurers table - this is what the game uses');
    console.log('   2. Heroes/hero_ownership tables - might have cached old data');
    console.log('   3. Database triggers/functions that auto-update data');
    console.log('   4. Default values in schema');
    console.log('   5. Test data that might have been inserted\n');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Stack:', error.stack);
    }
  }

  process.exit(0);
}

investigateHeroMetadata();

