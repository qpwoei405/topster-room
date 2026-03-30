import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    const analysis = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
You are analyzing a user's topster-style collage.

The user may create any custom section, not only movie, music, game, or anime.
A section may contain:
- creative works (albums, films, games, anime, series, books)
- lifestyle references (pets, fashion, food, objects, interiors, places, memories, scenery)

Important interpretation rules:

1. CREATIVE WORKS
If the image most likely represents a creative work, prioritize identifying:
- title
- artist / director / franchise
- category
- confidence
Then infer the work's actual traits:
- genre
- emotional tone
- themes
- cultural vibe
- worldbuilding / storytelling mood

2. LIFESTYLE / NON-MEDIA IMAGES
If the image is not a creative work, do NOT force title identification.
Instead infer:
- what it is
- lifestyle category
- overall aesthetic mood
- style cues
Examples:
adorable, retro, chic, urban, dreamy, cozy, playful, minimal, sporty, sentimental

3. COMBINED INTERPRETATION
Analyze all uploaded images together.
Combine:
- identified media traits
- lifestyle cues
- emotional tone
- recurring themes
- the overall color feeling of the uploaded images

Color matters, but should not overpower the actual identity of the images.
Use color as a supporting layer, not the only layer.

4. CULTURAL CONTEXT
Many uploaded works may be Korean, K-pop, Korean film, Asian animation, or other Asian media.
Try your best to identify Korean and Asian works correctly.
If uncertain, still provide a best guess and mark confidence.

5. K-POP RULE
If the taste strongly suggests K-pop / idol / trendy pop:
- avoid nostalgic yellow-brown vintage default
- prefer energetic, bright, playful, stylish interpretation
- color palette can include pink, sky blue, white, pastel, chrome, neon accents
- mood should feel polished, youthful, lively, and modern

6. ROOM GENERATION GOALS
The room should feel:
- realistic and photo-like
- Pinterest-worthy
- like it was taken on an iPhone SE
- personal and lived-in
- slightly messy / imperfect
- not overly staged
- not perfectly symmetrical
- subtly retro in spirit ("retrotic"), regardless of mood

Important:
- Add a subtle retro touch to ALL outputs, but do not force everything into sepia, brown, or nostalgia.
- The retro feeling can come from texture, objects, styling, mood layering, or analog imperfection.
- Avoid using framed real-person portrait photos or celebrity posters as room decor.
- Avoid showroom-like perfection.
- Avoid over-clean minimal hotel-like rooms unless the taste truly calls for it.

Return your answer in exactly this format:

IDENTIFIED ITEMS:
- item 1: [what it is] | [category] | [confidence]
- item 2: ...

TASTE KEYWORDS:
- keyword 1
- keyword 2
- keyword 3
- keyword 4
- keyword 5

TASTE DESCRIPTION:
- Write 2 short sentences in English.
- Make it feel aesthetic, personal, stylish, and emotionally expressive.

ROOM MOOD:
- one short phrase only

ROOM PROMPT:
- Write 1 detailed sentence for generating a realistic personal room photo.
- It must reflect:
  - emotional tone
  - lifestyle signals
  - media taste
  - uploaded image color feeling
- Mention:
  - lighting
  - palette
  - density of objects
  - decor style
  - atmosphere
- It should feel Pinterest-worthy, realistic, slightly imperfect, slightly messy, and subtly retro.
- It must not default to warm nostalgia unless the taste truly suggests that.
              `,
            },
            {
              type: "image_url",
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],
    });

    const resultText = analysis.choices?.[0]?.message?.content || "";

    const moodMatch = resultText.match(
      /ROOM MOOD:\s*([\s\S]*?)(?:ROOM PROMPT:|$)/
    );
    const roomMood =
      moodMatch?.[1]?.replace(/^- /gm, "").trim() ||
      "personal atmospheric room";

    const promptMatch = resultText.match(/ROOM PROMPT:\s*([\s\S]*)/);
    const roomPrompt =
      promptMatch?.[1]?.replace(/^- /gm, "").trim() ||
      "A realistic, lived-in personal room with layered decor, expressive mood, slight messiness, subtle retro texture, and a Pinterest-worthy atmosphere.";

    const imageGen = await client.images.generate({
      model: "gpt-image-1",
      prompt: `
${roomPrompt}

Create a highly realistic personal room photo.

Core visual direction:
- Pinterest-style interior photo
- shot on an iPhone SE
- realistic, believable, lived-in
- slightly imperfect framing
- subtle grain / analog softness
- layered detail
- NOT flat CGI
- NOT showroom perfect

Global style rule:
- Every image should include a subtle retrotic feeling.
- This retro feeling should be gentle and stylish, not heavy sepia by default.
- It can appear through texture, analog mood, objects, lighting character, or styling details.

Messiness / realism:
- slightly wrinkled sheets
- small clutter
- uneven object placement
- books / objects not perfectly aligned
- casual lived-in disorder
- believable wear and imperfection

Strong adaptation rule:
- Match the user's actual mood and content, not a generic cozy room.
- Use the uploaded image color feeling as a supporting design layer.
- If the taste is dark / introspective / cinematic, reflect that.
- If the taste is playful / cute / energetic / K-pop-oriented, reflect that.
- If the taste is food / pet / fashion / lifestyle-oriented, reflect that naturally in objects and decor.

K-pop special handling:
- avoid yellowish nostalgic brown tones
- prefer bright, energetic, stylish, polished, youthful interiors
- use pink / sky blue / white / pastel / chrome / trendy accents when suitable
- do not make K-pop outputs feel old, dusty, or sepia

Avoid:
- framed real-person portrait photos
- celebrity photo frames
- generic hotel-like spaces
- overly symmetrical composition
- overly clean minimal rooms
- obvious AI perfection
- defaulting every output to warm nostalgic lighting

The final image should feel like someone's real taste-filled room.
Emotionally accurate first, aesthetically compelling second.
Room mood reference: ${roomMood}
      `,
      size: "1024x1024",
    });

    const base64 = imageGen.data?.[0]?.b64_json;
    if (!base64) throw new Error("Image generation failed");

    const imageUrl = `data:image/png;base64,${base64}`;

    return Response.json({
      analysis: resultText,
      roomImage: imageUrl,
    });
  } catch (error) {
    console.error("DECORATE API ERROR:", error);

    return Response.json({ error: "decorate failed" }, { status: 500 });
  }
}