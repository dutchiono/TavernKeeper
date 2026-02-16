import { NextRequest, NextResponse } from 'next/server';
import { createImagePrompt, generateRandomTraits, parseHeroTraits, type HeroTraits } from '@/lib/hero-traits';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/heroes/generate-image
 * Generate a hero NFT image using AI image generation
 * 
 * Body:
 * - tokenId: string (required)
 * - traits?: HeroTraits (optional - will generate if not provided)
 * - regenerate?: boolean (optional - force regeneration even if cached)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tokenId, traits, regenerate } = body;

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    // Check if image already exists in cache
    if (!regenerate) {
      const { data: existingHero } = await supabase
        .from('heroes')
        .select('image_url, traits')
        .eq('token_id', tokenId)
        .single();

      if (existingHero?.image_url) {
        return NextResponse.json({
          success: true,
          imageUrl: existingHero.image_url,
          traits: existingHero.traits,
          cached: true,
        });
      }
    }

    // Get hero data to determine class
    const { data: hero, error: heroError } = await supabase
      .from('heroes')
      .select('*')
      .eq('token_id', tokenId)
      .single();

    if (heroError || !hero) {
      return NextResponse.json(
        { error: 'Hero not found' },
        { status: 404 }
      );
    }

    // Generate or use provided traits
    const heroTraits: HeroTraits = traits || parseHeroTraits(hero);

    // Create AI image generation prompt
    const prompt = createImagePrompt(heroTraits);

    // NOTE: This uses a placeholder for AI image generation
    // In production, integrate with:
    // - OpenAI DALL-E API
    // - Stability AI
    // - Midjourney API
    // - Or your preferred image generation service

    // For now, we'll use a placeholder approach
    // TODO: Replace with actual AI image generation
    const imageUrl = await generateHeroImage(prompt, tokenId);

    // Update hero record with image URL and traits
    const { error: updateError } = await supabase
      .from('heroes')
      .update({
        image_url: imageUrl,
        traits: heroTraits,
        updated_at: new Date().toISOString(),
      })
      .eq('token_id', tokenId);

    if (updateError) {
      console.error('Error updating hero with image:', updateError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      traits: heroTraits,
      cached: false,
    });
  } catch (error: any) {
    console.error('Error generating hero image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate hero image' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/heroes/generate-image?tokenId=123
 * Retrieve cached hero image or trigger generation
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tokenId = searchParams.get('tokenId');

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const { data: hero, error } = await supabase
      .from('heroes')
      .select('image_url, traits')
      .eq('token_id', tokenId)
      .single();

    if (error || !hero) {
      return NextResponse.json(
        { error: 'Hero not found' },
        { status: 404 }
      );
    }

    if (hero.image_url) {
      return NextResponse.json({
        success: true,
        imageUrl: hero.image_url,
        traits: hero.traits,
        cached: true,
      });
    }

    // No cached image, trigger generation
    return NextResponse.json({
      success: false,
      message: 'Image not cached. Use POST to generate.',
    });
  } catch (error: any) {
    console.error('Error retrieving hero image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve hero image' },
      { status: 500 }
    );
  }
}

/**
 * Generate hero image using AI service
 * TODO: Implement actual AI image generation
 */
async function generateHeroImage(prompt: string, tokenId: string): Promise<string> {
  // IMPLEMENTATION OPTIONS:
  
  // Option 1: OpenAI DALL-E
  // const response = await fetch('https://api.openai.com/v1/images/generations', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     model: 'dall-e-3',
  //     prompt,
  //     n: 1,
  //     size: '1024x1024',
  //   }),
  // });
  // const data = await response.json();
  // return data.data[0].url;

  // Option 2: Stability AI
  // const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     text_prompts: [{ text: prompt }],
  //     cfg_scale: 7,
  //     height: 1024,
  //     width: 1024,
  //     steps: 30,
  //   }),
  // });
  // const data = await response.json();
  // return data.artifacts[0].base64; // Would need to upload to storage

  // Option 3: Use Nebula's generate_image if available via API
  // This would require setting up an endpoint that can call Nebula's image generation

  // PLACEHOLDER: Return a deterministic placeholder URL based on tokenId
  // In production, this should be replaced with actual AI generation
  console.warn('Using placeholder image generation. Implement actual AI generation in production.');
  
  // Generate a placeholder using a service like DiceBear or similar
  const seed = `hero-${tokenId}`;
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
}
