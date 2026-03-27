import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    // 1) 작품 식별 + 취향 분석 + 무드 기반 방 프롬프트 생성
    const analysis = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
You are analyzing a user's topster.

Important:
- The user may create any custom section, not only movie, music, game, or anime.
- Section names are important clues and must be used in interpretation.
- A section may contain media, pets, fashion, objects, places, food, memories, lifestyle references, or personal images.
- Many items may be Korean albums, K-pop, Korean films, or Asian media.
- Try your best to identify Korean works too.
- If uncertain, still provide a best guess and mark it as low confidence.

Step 1:
For each image, identify what it most likely represents.
Use both the image itself and the section title as clues.
Infer when possible:
- what the image is
- category or type
- title / artist / franchise if it is media
- subject or theme if it is not media
- confidence (high / medium / low)

Step 2:
Analyze the user's taste based on the identified works, not just the visual design of the covers.
Focus on:
- emotional tone
- lifestyle cues
- genre and themes
- atmosphere
- personality
- aesthetic preferences
- cultural vibe
- recurring themes

Additional rule:
- If the user shows strong K-pop / idol / modern pop music taste:
  → prefer bright, clean, trendy aesthetics
  → color palette: pink, sky blue, white, pastel, neon accents
  → lighting: soft bright lighting, not warm yellow
  → mood: playful, stylish, polished, youthful

- Avoid making K-pop taste look nostalgic, vintage, or warm brown unless explicitly needed.

Step 3:
Write the result in a stylish, editorial, human-friendly tone.
The output should feel aesthetic and expressive, not technical.

Step 4:
Create a room prompt that matches the user's emotional mood.
The room should be based on the user's actual taste, so the mood can be melancholic, cozy, dreamy, bright, dark, nostalgic, minimal, eclectic, etc.
Do NOT default to warm cozy interiors.
The room must adapt to the user's mood.

Examples:
- If the user includes pets, reflect a pet-friendly room with matching mood.
- If the user includes playful K-pop taste, use brighter trendy styling.
- If the user includes melancholic films, use darker cinematic mood.
- If the user includes cute objects or pastel references, reflect that in decor and color.

Image generation goals:
- realistic photo-like room
- Pinterest-style aesthetic
- lived-in and personal
- visually rich and detailed
- not flat graphic art
- not generic hotel room
- not empty minimal space unless the user's mood truly calls for it

Return your answer in exactly this format:

IDENTIFIED WORKS:
- ...

TASTE KEYWORDS:
- keyword 1
- keyword 2
- keyword 3
- keyword 4
- keyword 5

TASTE DESCRIPTION:
- Write 2 short sentences in English.
- Make it feel aesthetic, personal, and expressive.

ROOM MOOD:
- one short phrase only

ROOM PROMPT:
- Write 1 detailed sentence for generating a realistic room photo.
- It must reflect the user's emotional tone.
- Mention lighting, color palette, density of objects, decor style, and atmosphere.
- Make it feel like a Pinterest-worthy personal room photo.
Color direction rules:
- K-pop / modern pop:
  → bright, clean, pastel tones
  → pink, sky blue, white, chrome, neon
  → trendy and stylish room (not vintage)
- melancholic / indie:
  → dark blue, gray, muted tones
- nostalgic:
  → warm, faded, vintage tones
Always match both mood AND genre.
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

    const resultText = analysis.choices[0].message.content || "";

    const moodMatch = resultText.match(/ROOM MOOD:\s*([\s\S]*?)(?:ROOM PROMPT:|$)/);
    const roomMood = moodMatch?.[1]?.replace(/^- /gm, "").trim() || "personal atmospheric room";

    const promptMatch = resultText.match(/ROOM PROMPT:\s*([\s\S]*)/);
    const roomPrompt =
      promptMatch?.[1]?.replace(/^- /gm, "").trim() ||
      "A realistic, lived-in personal room with expressive mood, layered decor, and a strong emotional atmosphere.";

    // 2) 무드 적응형 방 이미지 생성
    const imageGen = await client.images.generate({
      model: "gpt-image-1",
      prompt: `
${roomPrompt}

Create a highly realistic, imperfect, lived-in room.

Very important:
- The room must NOT look staged or perfectly designed.
- Avoid symmetry and perfect balance.
- Make the composition slightly messy and natural.
- The room should reflect not only media taste, but also lifestyle signals such as pets, fashion, objects, hobbies, memories, and personal references when present.

Add realism:
- slightly wrinkled bed sheets
- objects not aligned perfectly
- books stacked unevenly
- small clutter (cups, cables, papers, random items)
- subtle wear and imperfections
- natural shadows and imperfect lighting

Mood:
- match the user's emotional tone strongly
- if melancholic: darker, quieter, more empty and lonely
- if nostalgic: slightly aged, soft and faded
- if dreamy: soft but not clean, slightly surreal but grounded

Camera realism:
- look like a real photo taken with a phone like iphone se model
- slight noise / grain
- imperfect framing (not centered perfectly)
- depth and shadow variation

Avoid:
- showroom interiors
- pinterest-perfect symmetry
- overly clean minimal spaces
- obvious AI aesthetic
- using frame of person's photo

Style control (VERY IMPORTANT):

If K-pop / idol / trendy pop:
- bright lighting (NOT warm yellow)
- clean pastel palette (pink, sky blue, white)
- modern, stylish, youthful interior
- slightly glossy / clean aesthetic
- cute or trendy decor (posters, acrylic, lights)
- avoid vintage / brown / nostalgic tones / frame of person's photo

If melancholic / cinematic:
- darker tones, blue/gray palette
- quiet, minimal, emotional

General realism:
- imperfect, lived-in
- slightly messy
- not symmetrical
- real photo 느낌

Avoid:
- yellowish vintage tone for K-pop
- overly warm lighting unless explicitly needed
- generic aesthetic rooms

Make it feel like a real person's room that reflects their taste.
`,
      size: "1024x1024",
    });

    const base64 = imageGen.data[0].b64_json;
    const imageUrl = `data:image/png;base64,${base64}`;

    return Response.json({
      analysis: resultText,
      roomImage: imageUrl,
    });
  } catch (error) {
    console.error("DECORATE API ERROR:", error);

    return Response.json(
      { error: "decorate failed" },
      { status: 500 }
    );
  }
}