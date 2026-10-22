# Image credits

All site photography was replaced on 2026-10-22 with **AI-generated images (Route B)**. No stock photos remain.

- Tool: Emergent image generation tool, model `gemini-3.1-flash-image-preview` (Gemini 3.1 Flash Image)
- Source resolution: 1264 × 848 px (landscape) / 848 × 1264 px (portrait). The tool cannot output 2400 px, and images were not upscaled.
- Post-processing (`scripts/grade_images.py`, same for every image): saturation 0.86, contrast 1.06, red ×0.94 / blue ×1.04, 8% navy blend (#060E2C), film grain. Exported as AVIF, WebP and JPEG in `-lg` (full) and `-sm` (half) sizes. Large AVIF files over 115 KB were re-encoded at quality 48 to stay within the size budget.
- These are atmospheric concept visuals. They do not show real matches, events, clubs, players or clients.

**Shared style prompt** (added to every generation): "Cinematic night football stadium photography, premium sports editorial, deep black and navy shadows, cool electric-blue light accents, (volumetric floodlight beams,) shallow depth of field, fine film grain, realistic, ultra-detailed. No text, no letters, no numbers, no logos, no crests, no watermarks, no recognizable faces, no real players or clubs, no distorted hands, no warped goalposts, no impossible stadium geometry."

| File (base name) | Page / slot | Route | Slot-specific prompt |
|---|---|---|---|
| hero-stadium | Home hero, OG image | AI | Wide view from a high corner of an empty modern stadium at night, roof floodlights casting beams through mist onto a striped pitch, left half and top in calm navy-black shadow for a headline, no hanging scoreboard, blank dark advertising boards |
| hero-phone | Home hero phone mockup | AI | Vertical close shot from behind: only a hand and dark sleeve holding a smartphone showing a floodlit pitch, blurred stadium bokeh, no head or face |
| approach-seats | Home "My Approach"; Twelfth Voice gallery | AI | Vertical: rows of empty navy stadium seats receding diagonally, floodlight raking from the side, hint of glowing pitch |
| cover-touchline-rig | Final Whistle Live cover | AI | Low-angle pitch-side detail: compact camera on a gimbal and tripod on the touchline, blurred floodlit empty stadium |
| cover-dressing-room | Behind the Badge cover | AI | Dressing room before a night match: black boots on a wooden bench, folded plain navy training top, blue light from a doorway |
| cover-stadium-bluehour | Season in Sync cover | AI | Aerial drone view of a modern stadium at blue hour, glowing pitch inside the dark oval roof, city lights |
| cover-ball-backlit | Ninety in Nine cover | AI | Ground-level close-up of a plain white football on dewy grass, floodlight backlight rim, dark blurred stadium |
| cover-scarf | The Twelfth Voice cover | AI | Tight back-view silhouette of raised arms holding a plain dark knitted scarf against one floodlight and haze, minimal composition |
| cover-boots-floodlight | Under the Lights cover | AI | Still life of plain black boots on pitch grass under a single floodlight beam, mist behind |
| about-creator | About Me hero | AI | Vertical: back view of a lone creator at the pitch edge holding a camera on a gimbal, haze and light beams, face not visible |
| band-grass-lines | About Me quote band; Ninety in Nine gallery | AI | Wide low-angle across the pitch: white line geometry and centre-circle curve, backlit grass, dark calm upper half |
| contact-net | Contact image; Under the Lights gallery | AI | Close-up of a white goal net with blue floodlight bokeh, goalpost sharp on one side |
| gallery-floodlight-tower | Final Whistle Live, Season in Sync, Under the Lights galleries | AI | Low angle up at one floodlight tower against a navy sky, volumetric beams, roof edge in silhouette |
| gallery-corner-flag | Behind the Badge, Ninety in Nine galleries | AI | Ground-level plain navy corner flag, chalk corner arc, dark empty stands in shadow, no seat patterns |
| gallery-tunnel | Final Whistle Live, Behind the Badge galleries | AI | Inside a dark players' tunnel looking out to a bright floodlit pitch, cool rim light on concrete, symmetrical |
| gallery-stadium-exterior | Season in Sync, Twelfth Voice galleries | AI | Stadium exterior at blue hour from street level, glowing facade panels, wet plaza reflections |

Rejected in the quality check and regenerated: the first hero-stadium (odd hanging black block), hero-phone (partial face visible), the scarf image (cluttered crowd), the corner flag (a logo-like pattern in the seats), the first cover-touchline-rig (brand mark on the gimbal; regenerated with "plain matte-black unbranded camera") and the first about-creator (logo-like star icons on advertising boards; regenerated with "no advertising boards visible, stands completely dark").

## Logo
`frontend/public/brand/logo.png` was supplied by the owner and is used unchanged. `logo-40/80/120.png|webp` are resized copies. The favicons and app icons (`favicon.ico`, `icon-16/32/180/192/512.png`, `apple-touch-icon.png`) place the unaltered logo on a #05070D square so the white mark stays visible in light browser tabs.
