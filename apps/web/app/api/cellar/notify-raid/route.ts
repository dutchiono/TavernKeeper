import { NextRequest, NextResponse } from 'next/server';
import { FEATURE_FLAGS } from '../../../../lib/feature-flags';

// DISABLED: Token economy - user decided to focus on core game
// Cellar is part of the KEEP/MON token liquidity system
export async function POST(request: NextRequest) {
  // Feature flag check - cellar disabled
  if (!FEATURE_FLAGS.cellar) {
    return NextResponse.json(
      { 
        error: 'Cellar feature is currently disabled',
        message: 'Token economy features (including The Cellar treasury) have been disabled to focus on core dungeon gameplay',
        success: false
      },
      { status: 200 }
    );
  }

  // Original implementation preserved below for future re-enablement
  // Uncomment when cellar is re-enabled in feature-flags.ts
  /*
  import { getUserByAddress, postToFeed, sendNotification } from '../../../../lib/services/neynarService';
  import { supabase } from '../../../../lib/supabase';

  try {
      const body = await request.json();
      const { raiderAddress, monProfit, keepProfit } = body;

      console.log('📨 Raid notification request received:', {
          raiderAddress,
          monProfit,
          keepProfit
      });

      if (!raiderAddress || monProfit === undefined || keepProfit === undefined) {
          console.error('❌ Missing required fields');
          return NextResponse.json(
              { error: 'Missing required fields: raiderAddress, monProfit, keepProfit' },
              { status: 400 }
          );
      }

      const normalizedRaiderAddress = raiderAddress.toLowerCase();

      // Get raider's username for @mention
      let raiderUsername: string = 'Someone';
      try {
          const { data: raiderData } = await supabase
              .from('office_managers')
              .select('username, display_name')
              .eq('wallet_address', normalizedRaiderAddress)
              .single();

          if (raiderData?.username) {
              raiderUsername = raiderData.username;
          } else {
              try {
                  const userData = await getUserByAddress(normalizedRaiderAddress);
                  if (userData?.username) {
                      raiderUsername = userData.username;
                  }
              } catch (neynarError) {
                  console.warn('⚠️ Could not fetch username from Neynar (non-critical):', neynarError);
              }
          }
      } catch (dbError) {
          console.warn('⚠️ Could not fetch username from database (non-critical):', dbError);
      }

      const monFormatted = parseFloat(monProfit).toFixed(4);
      const keepFormatted = parseFloat(keepProfit).toFixed(4);

      let feedPostSuccess = false;
      let feedPostBody: string;

      if (parseFloat(monProfit) > 0 && parseFloat(keepProfit) > 0) {
          feedPostBody = `@${raiderUsername} just raided The Cellar! 🔥 They claimed ${monFormatted} MON + ${keepFormatted} KEEP. Raid it yourself!`;
      } else if (parseFloat(monProfit) > 0) {
          feedPostBody = `@${raiderUsername} just raided The Cellar! 🔥 They claimed ${monFormatted} MON. Raid it yourself!`;
      } else if (parseFloat(keepProfit) > 0) {
          feedPostBody = `@${raiderUsername} just raided The Cellar! 🔥 They claimed ${keepFormatted} KEEP. Raid it yourself!`;
      } else {
          feedPostBody = `@${raiderUsername} raided The Cellar but found nothing! 💰 Build it back up!`;
      }

      try {
          await postToFeed(feedPostBody);
          feedPostSuccess = true;
          console.log('✅ Posted to feed successfully');
      } catch (feedError) {
          console.error('❌ Error posting to feed:', feedError);
      }

      return NextResponse.json({
          success: true,
          feedPostSuccess,
          raiderUsername,
      });
  } catch (error) {
      console.error('❌ Error in cellar notify-raid API:', error);
      return NextResponse.json(
          { error: 'Failed to process raid notification' },
          { status: 500 }
      );
  }
  */
}