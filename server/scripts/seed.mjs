/**
 * seed.mjs - Seeds the BURANGA database with:
 *   - demo users (demo@buranga.app / demo1234)
 *   - 166 hairstyle posts with unique titles, descriptions and real photos
 *     (downloaded from Wikimedia Commons by scripts/harvest-images.mjs)
 *
 * Categories are the four live ones: Men's Haircut, Women's Haircut,
 * Children's Haircut and Trending Haircut.
 *
 * NOTE: this script CLEARS existing users/posts/favourites. It is only meant
 * for a fresh install - never run it on a database you want to keep.
 *
 * Run:  npm run seed   (from the server/ folder)
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import User from '../src/models/User.js';
import Hairstyle, { CATEGORIES } from '../src/models/Hairstyle.js';
import Favorite from '../src/models/Favorite.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.resolve(__dirname, '..', 'uploads', 'seed');

// The four live categories.
const M = "Men's Haircut";
const W = "Women's Haircut";
const CH = "Children's Haircut";
const T = 'Trending Haircut';

// Legacy aliases from the old five-category layout. Braids, locs and the
// mixed wig/long-hair groups all fold into the women's collection.
const B = W;
const K = W;
const C = W;
const N = W;
const A = W;
const L = W;
const S = M;
const G = W;
const U = W;
const BR = W;

// Old per-title overrides, kept so the seed data still reads naturally.
const TITLE_OVERRIDES = {
  'Pixie Cut Lace Wig': W,
  'Burgundy Curly Bob Wig': W,
  'Afro Puff Ponytail Wig': W,
  'Curly Afro Puff Half-Wig': W,
  'Long Loose Beach Waves': W,
  'Braided Crown with Flowing Length': W,
  'Butterfly Soft Waves': W,
  'Long Ponytail with Wraps': W,
  'Mermaid Waves': W,
  'Long Bubble Ponytail': W,
  'Vintage Hollywood Waves': W,
  'Half Up with Braided Detail': W,
};

/** [title, description, category, tags, hairLength, occasion, hairType] */
const ENTRIES = [
  // ------------------------------- BRAIDS --------------------------------
  ['Classic Medium Box Braids', 'Mid-back box parts with a neat middle line and a natural-looking finish.', B, 'box braids, protective, medium length', 'Medium', 'Everyday', 'Coily'],
  ['Jumbo Knotless Feed-Ins', 'Thick feed-in braids that start flat at the scalp for a lightweight feel.', B, 'jumbo, feed-in, protective', 'Long', 'Everyday', 'Mixed'],
  ['Goddess Box Braids with Curls', 'Bohemian goddess braids with loose curly ends for movement and softness.', B, 'goddess, curly ends, boho', 'Long', 'Party', 'Curly'],
  ['Warm Brown Ombre Braids', 'Rich chocolate box braids fading into a warm caramel at the tips.', B, 'ombre, brown, colored', 'Long', 'Everyday', 'Any'],
  ['Blonde Knotless Bob Braids', 'Chin-length knotless braids in a honey blonde shade for a fresh bob look.', B, 'bob, blonde, knotless', 'Short', 'Everyday', 'Any'],
  ['Thin Micro Box Braids', 'Delicate small-part micro braids that take time but last for weeks.', B, 'micro, small parts, long lasting', 'Long', 'Everyday', 'Coily'],
  ['Two-Tone Black and Red Braids', 'Jet-black braids with striking crimson streaks woven through the length.', B, 'two tone, red, bold', 'Long', 'Party', 'Any'],
  ['Triangle Part Box Braids', 'Geometric triangle partings give classic box braids a modern edge.', B, 'triangle parts, geometric', 'Medium', 'Everyday', 'Mixed'],
  ['Braided High Ponytail', 'Box braids gathered into a bouncy high ponytail with wrapped base.', B, 'ponytail, updo, styled', 'Long', 'Party', 'Any'],
  ['Burgundy Bob Braids', 'Chin-grazing burgundy braids that frame the face with warm colour.', B, 'burgundy, bob, red', 'Short', 'Everyday', 'Any'],
  ['Shoulder-Length Knotless Braids', 'Featherweight knotless braids that fall just past the shoulders.', B, 'knotless, shoulder length', 'Medium', 'Everyday', 'Coily'],
  ['Boho Knotless with Human Hair Curls', 'Knotless braids blended with loose human-hair curls for a beachy vibe.', B, 'boho, curls, blend', 'Long', 'Festival', 'Curly'],

  // ------------------------------ KNOTLESS -------------------------------
  ['Small Knotless Braids in Natural Black', 'Slim knotless braids in a natural black shade that protect the edges.', K, 'knotless, small, protective', 'Long', 'Everyday', 'Coily'],
  ['Knotless Braids with Beads', 'Classic knotless braids finished with clear and wooden beads at the ends.', K, 'beads, accessories', 'Medium', 'Festival', 'Any'],
  ['Knotless Braids Half Up, Half Down', 'Front braids pinned into a top knot while the rest flows freely.', K, 'half up, updo, styled', 'Long', 'Party', 'Any'],
  ['Large Knotless Braids', 'Chunky knotless braids that install faster and keep tension low.', K, 'jumbo, large, low tension', 'Long', 'Everyday', 'Mixed'],
  ['Knotless Braids with Curly Leave-Out', 'Braided crown with soft curly leave-out around the hairline.', K, 'leave out, curly, blend', 'Long', 'Everyday', 'Curly'],
  ['Caramel Blonde Knotless Braids', 'Warm caramel knotless braids that glow against deeper skin tones.', K, 'caramel, blonde, warm', 'Long', 'Everyday', 'Any'],
  ['Knotless Lemonade Braids', 'Side-swept knotless braids inspired by the iconic lemonade style.', K, 'lemonade, side sweep', 'Long', 'Festival', 'Any'],
  ['Knotless Braids into a Low Bun', 'Sleek low bun formed from long knotless braids for a polished look.', K, 'bun, low bun, elegant', 'Long', 'Formal', 'Any'],
  ['Shoulder-Length Knotless Bob', 'A tidy knotless bob that skims the shoulders with blunt ends.', K, 'bob, shoulder', 'Medium', 'Everyday', 'Any'],
  ['Knotless Braids with Gold Cuffs', 'Simple black knotless braids dressed up with gold jewellery cuffs.', K, 'gold cuffs, accessories', 'Long', 'Party', 'Any'],
  ['Jumbo Knotless in Deep Burgundy', 'Only eight thick knotless braids in a deep wine-burgundy colour.', K, 'jumbo, burgundy, wine', 'Long', 'Everyday', 'Any'],
  ['Knotless Braids with Space Buns', 'Two playful space buns made from freshly installed knotless braids.', K, 'space buns, playful', 'Medium', 'Party', 'Any'],

  // ------------------------------ CORNROWS --------------------------------
  ['Straight-Back Cornrows', 'Five clean straight-back cornrows with a polished, minimal finish.', C, 'straight back, simple', 'Long', 'Everyday', 'Coily'],
  ['Lemonade Side-Sweep Cornrows', 'Curved cornrows swept dramatically to one shoulder.', C, 'lemonade, side sweep, curved', 'Long', 'Festival', 'Any'],
  ['Fulani Cornrows with Center Braid', 'A single center braid flanked by side cornrows and bead accents.', C, 'fulani, beads, tribal', 'Medium', 'Festival', 'Any'],
  ['Straight-Back Cornrows into a Bun', 'Neat straight-back cornrows gathered into a low braided bun.', C, 'bun, straight back', 'Long', 'Formal', 'Coily'],
  ['Design Cornrows with Zig-Zag Parts', 'Playful zig-zag partings turn classic cornrows into wearable art.', C, 'zig zag, design, creative', 'Medium', 'Party', 'Any'],
  ['Ghana Cornrows with Extensions', 'Feed-in Ghana braids that start tiny and swell into full cornrows.', C, 'ghana braids, feed in', 'Long', 'Everyday', 'Mixed'],
  ['Cornrow Braided Crown', 'Cornrows circling the head like a halo for a goddess-inspired look.', C, 'crown, halo, goddess', 'Medium', 'Wedding', 'Any'],
  ['Five Straight-Backs with Beads', 'Classic straight-back cornrows finished with bright beads.', C, 'straight back, beads, classic', 'Long', 'Everyday', 'Coily'],
  ['Freestyle Tribal Cornrows', 'A freehand tribal pattern mixing thick and thin cornrow sections.', C, 'tribal, freestyle, pattern', 'Long', 'Party', 'Any'],
  ['Cornrows into Two Space Buns', 'Front cornrows feeding into twin buns at the crown.', C, 'space buns, cornrows', 'Medium', 'Party', 'Any'],
  ['Side-Parted Lemonade Rows', 'Deep side part with rows curving softly toward the nape.', C, 'side part, lemonade', 'Long', 'Everyday', 'Any'],
  ['Cornrows with Heart Design', 'A small heart shape braid detail along the temple.', C, 'heart, design, detail', 'Medium', 'Party', 'Any'],

  // --------------------- NATURAL AFRICAN HAIRSTYLES -----------------------
  ['Bantu Knots', 'Sections of coily hair twisted and wrapped into neat little knots.', N, 'bantu knots, protective, traditional', 'Short', 'Party', 'Coily'],
  ['Twist-Out on Type 4 Hair', 'Two-strand twists unraveled to reveal a defined, springy pattern.', N, 'twist out, definition', 'Medium', 'Everyday', 'Coily'],
  ['Flat Twist Updo', 'Flat twists sweeping up into a sculpted updo at the crown.', N, 'flat twists, updo', 'Medium', 'Formal', 'Coily'],
  ['Braided Beaded Heritage Style', 'Cornrowed sections adorned with traditional beads and shells.', N, 'beads, heritage, traditional', 'Medium', 'Festival', 'Coily'],
  ['Wash-and-Go on Coily Hair', 'A hydrating wash-and-go that celebrates tight coil definition.', N, 'wash and go, hydrated', 'Short', 'Everyday', 'Coily'],
  ['Finger Coils', 'Individually coiled strands for a striking, defined texture.', N, 'finger coils, defined', 'Short', 'Everyday', 'Coily'],
  ['Headwrap with Natural Puff', 'A colorful African headwrap framing a full natural puff.', N, 'headwrap, puff, accessory', 'Medium', 'Festival', 'Coily'],
  ['Flat Twist-Out Curls', 'Flat twists taken down to reveal fluffy, stretched curls.', N, 'flat twist out, stretched', 'Medium', 'Everyday', 'Coily'],
  ['Natural Frohawk', 'Sleek sides with a bold strip of natural hair down the center.', N, 'frohawk, mohawk', 'Medium', 'Party', 'Coily'],
  ['Cornrowed Natural Bun', 'Natural hair cornrowed upward into a full bun at the crown.', N, 'bun, cornrowed', 'Medium', 'Formal', 'Coily'],
  ['Coiled Rope Twists', 'Rope-twisted sections springing with moisture and shine.', N, 'rope twists, moisture', 'Medium', 'Everyday', 'Coily'],
  ['African Threading Style', 'Traditional threading stretches coily hair into sculptural sections.', N, 'threading, traditional', 'Long', 'Everyday', 'Coily'],

  // ------------------------------ AFROS -----------------------------------
  ['Round Shaped Afro', 'A full, evenly picked afro shaped into a soft round silhouette.', A, 'afro, round, classic', 'Medium', 'Everyday', 'Coily'],
  ['Tapered TWA (Teeny Weeny Afro)', 'A short tapered cut that hugs the shape of the head.', A, 'twa, tapered, short', 'Short', 'Everyday', 'Coily'],
  ['Long Full Afro with Side Part', 'A long, healthy afro parted deeply to one side.', A, 'long afro, side part', 'Long', 'Everyday', 'Coily'],
  ['Highlighted Curly Afro', 'A soft curly afro lifted with subtle honey highlights.', A, 'highlighted, curly afro', 'Medium', 'Everyday', 'Curly'],
  ['Afro Puff with Braided Base', 'A high puff anchored by a braided perimeter.', A, 'puff, braided base', 'Medium', 'Everyday', 'Coily'],
  ['Blunt-Cut Afro Bob', 'An afro shaped into a sharp, chin-length bob line.', A, 'blunt cut, bob', 'Short', 'Formal', 'Coily'],
  ['Fluffy Teeny Weeny Afro', 'A soft TWA kept fluffy with regular moisturizing.', A, 'twa, fluffy', 'Short', 'Everyday', 'Coily'],
  ['Afro with Golden Accessories', 'A rounded afro decorated with golden pins and cuffs.', A, 'accessories, golden', 'Medium', 'Party', 'Coily'],
  ['Natural Afro with Defined Edges', 'A picked-out afro balanced with carefully laid edges.', A, 'edges, sleek', 'Medium', 'Everyday', 'Coily'],
  ['Voluminous Curly Fro', 'Big, bouncy curls forming a voluminous halo.', A, 'curly, voluminous', 'Medium', 'Party', 'Curly'],

  // ------------------------------ LOCS ------------------------------------
  ['Starter Locs (Comb Coils)', 'Freshly started comb-coil locs beginning their journey.', L, 'starter locs, beginner', 'Short', 'Everyday', 'Coily'],
  ['Golden Blonde Locs', 'Mature locs dyed a warm golden blonde all over.', L, 'blonde, colored, mature', 'Long', 'Everyday', 'Any'],
  ['Goddess Locs with Wavy Ends', 'Wrapped faux goddess locs finishing in loose waves.', L, 'goddess locs, wavy ends', 'Long', 'Festival', 'Wavy'],
  ['Faux Locs Bob', 'Lightweight faux locs cut into a chic shoulder-grazing bob.', L, 'faux locs, bob', 'Medium', 'Everyday', 'Any'],
  ['Loc Bun Updo', 'Long locs swept up into a regal stacked bun.', L, 'bun, updo, locs', 'Long', 'Formal', 'Any'],
  ['Butterfly Locs', 'Distressed, textured butterfly locs with a soft bohemian finish.', L, 'butterfly, distressed, boho', 'Long', 'Festival', 'Any'],
  ['Sisterlocks', 'Tiny, uniform micro locs that move like loose hair.', L, 'sisterlocks, micro', 'Long', 'Everyday', 'Coily'],
  ['Two-Strand Rope Locs', 'Locs paired into rope twists for a chunky, bold look.', L, 'rope, twists', 'Long', 'Everyday', 'Any'],
  ['Locs with Beads and Shells', 'Mature locs decorated with wooden beads and cowrie shells.', L, 'beads, shells, accessories', 'Long', 'Festival', 'Any'],
  ['Curly Loc Ponytail', 'A high ponytail of locs with soft curls spiraling down.', L, 'ponytail, curly', 'Long', 'Party', 'Curly'],
  ['Blonde-Tipped Freeform Locs', 'Freeform locs with naturally lightened tips.', L, 'freeform, tipped', 'Long', 'Everyday', 'Any'],
  ['Braided Loc Crown', 'Locs braided into a crown braid around the head.', L, 'crown, braided', 'Long', 'Wedding', 'Any'],

  // ---------------------------- WIGS & LACE -------------------------------
  ['Body Wave Lace Front Wig', 'A 26-inch body wave unit with a natural-looking hairline.', W, 'lace front, body wave, long', 'Long', 'Everyday', 'Wavy'],
  ['Pixie Cut Lace Wig', 'A short pixie unit with soft side-swept bangs.', W, 'pixie, short wig', 'Short', 'Everyday', 'Straight'],
  ['Curly Kinky Lace Front', 'A kinky-curly lace front that matches type 4 texture.', W, 'kinky curly, natural blend', 'Medium', 'Everyday', 'Coily'],
  ['Jet Black Straight Wig', 'A sleek, bone-straight black unit with a middle part.', W, 'straight, black, sleek', 'Long', 'Formal', 'Straight'],
  ['Blonde Highlight Lace Wig', 'Hand-tied lace front with caramel blonde highlights.', W, 'highlight, blonde, hand tied', 'Long', 'Party', 'Wavy'],
  ['Water Wave Closure Wig', 'A wet-and-wavy closure unit that looks freshly defined.', W, 'water wave, wet look', 'Long', 'Everyday', 'Curly'],
  ['Colored Burgundy Lace Front', 'A burgundy straight lace front with a deep side part.', W, 'burgundy, colored, side part', 'Long', 'Party', 'Straight'],
  ['Afro Puff Ponytail Wig', 'A glueless unit styled into a full afro puff.', W, 'puff, glueless', 'Medium', 'Everyday', 'Coily'],
  ['Burgundy Curly Bob Wig', 'A chin-length curly bob in a rich burgundy shade.', W, 'curly bob, burgundy', 'Short', 'Everyday', 'Curly'],
  ['HD Lace Deep Wave', 'Transparent HD lace with defined deep wave bundles.', W, 'hd lace, deep wave', 'Long', 'Party', 'Curly'],
  ['Braided Lace Front Wig', 'A pre-braided lace front with neat knotless plaits.', W, 'braided wig, convenience', 'Long', 'Everyday', 'Any'],
  ['Curly Afro Puff Half-Wig', 'A half-wig puff blending into natural edges.', W, 'half wig, puff', 'Medium', 'Everyday', 'Coily'],

  // --------------------------- SHORT HAIRSTYLES ---------------------------
  ['Tapered Taper Fade Cut', 'A precision taper fade fading cleanly at the nape.', S, 'taper fade, precision', 'Short', 'Everyday', 'Coily'],
  ['Curly Pixie Cut', 'A short pixie with soft natural curls on top.', S, 'pixie, curly', 'Short', 'Everyday', 'Curly'],
  ['Sleek Finger Waves', 'Classic finger waves sculpted flat against the head.', S, 'finger waves, vintage', 'Short', 'Formal', 'Straight'],
  ['Buzz Cut with Line Design', 'A clean buzz cut accented with a razor line design.', S, 'buzz, design, razor', 'Short', 'Everyday', 'Any'],
  ['Textured Crop Top', 'A short textured crop with a tousled finish on top.', S, 'crop, textured', 'Short', 'Everyday', 'Wavy'],
  ['Chin-Length Bob with Bangs', 'A sharp chin-length bob with blunt bangs.', S, 'bob, bangs', 'Short', 'Formal', 'Straight'],
  ['Side-Parted Slicked Cut', 'A short side-parted cut slicked neatly into place.', S, 'side part, slicked', 'Short', 'Formal', 'Straight'],
  ['Nape-Length Wedge Cut', 'A graduated wedge cut stacking at the nape.', S, 'wedge, graduated', 'Short', 'Everyday', 'Straight'],
  ['Curly Tapered Cut', 'Short tapered sides with a soft cluster of curls on top.', S, 'tapered, curly top', 'Short', 'Everyday', 'Curly'],
  ['Asymmetrical Bob', 'A daring bob cut shorter at the back and longer at the front.', S, 'asymmetrical, bob', 'Short', 'Party', 'Straight'],
  ['Pixie Cut with Side Sweep', 'A soft pixie with a longer, side-swept fringe.', S, 'pixie, side sweep', 'Short', 'Everyday', 'Wavy'],
  ['Buzzed Sides with Twist Top', 'Skin-faded sides with short twists styled on top.', S, 'fades, twists', 'Short', 'Everyday', 'Coily'],

  // --------------------------- LONG HAIRSTYLES ----------------------------
  ['Waist-Length Bone Straight', 'Silky bone-straight hair falling past the waist.', G, 'bone straight, waist length', 'Long', 'Formal', 'Straight'],
  ['Long Loose Beach Waves', 'Relaxed beach waves that start at the cheekbones.', G, 'beach waves, loose', 'Long', 'Everyday', 'Wavy'],
  ['Braided Crown with Flowing Length', 'A braided crown over very long flowing waves.', G, 'crown, flowing', 'Long', 'Wedding', 'Wavy'],
  ['Butterfly Soft Waves', 'Feathered, airy waves with a soft romantic feel.', G, 'butterfly, airy, romantic', 'Long', 'Party', 'Wavy'],
  ['Long Ponytail with Wraps', 'A sleek high ponytail wrapped at the base for extra polish.', G, 'ponytail, sleek', 'Long', 'Party', 'Straight'],
  ['Kinky Straight Bundle Install', 'Kinky-straight bundles blending with natural edges.', G, 'kinky straight, bundles', 'Long', 'Everyday', 'Mixed'],
  ['Long Layers with Curtain Bangs', 'Long layers framed by soft curtain bangs.', G, 'layers, curtain bangs', 'Long', 'Everyday', 'Wavy'],
  ['Mermaid Waves', 'Deep, uniform waves inspired by mermaid hair.', G, 'mermaid, deep waves', 'Long', 'Festival', 'Wavy'],
  ['Sleek Center-Parted Straight', 'A glossy center-parted straight style with no flyaways.', G, 'center part, sleek', 'Long', 'Formal', 'Straight'],
  ['Long Bubble Ponytail', 'A playful ponytail sectioned into soft bubbles.', G, 'bubble, playful', 'Long', 'Party', 'Straight'],
  ['Vintage Hollywood Waves', 'Glamorous brushed-out waves with a deep side part.', G, 'hollywood, vintage, glam', 'Long', 'Formal', 'Wavy'],
  ['Half Up with Braided Detail', 'A half-up style with a small braid wrapping the crown.', G, 'half up, braid detail', 'Long', 'Everyday', 'Wavy'],

  // --------------------------- CURLY HAIRSTYLES ---------------------------
  ['Defined Wash-and-Go Curls', 'Gel-defined ringlets from a careful wash-and-go.', U, 'wash and go, defined', 'Medium', 'Everyday', 'Curly'],
  ['Bantu Knot-Out Curls', 'Bantu knots unravelled into full, springy curls.', U, 'bantu knot out, springy', 'Medium', 'Party', 'Coily'],
  ['Long Spiral Curls', 'Long, uniform spiral curls with high shine.', U, 'spiral, long curls', 'Long', 'Formal', 'Curly'],
  ['Curly Bangs and Layers', 'Soft curly bangs blended into face-framing layers.', U, 'bangs, layered', 'Medium', 'Everyday', 'Curly'],
  ['Coily Fro with Shrinkage', 'A healthy coily afro showing off natural shrinkage.', U, 'coily, shrinkage', 'Medium', 'Everyday', 'Coily'],
  ['Side-Swept Curl Glam', 'One-shoulder glamour curls swept dramatically to the side.', U, 'side sweep, glam', 'Long', 'Formal', 'Curly'],
  ['Curly Pineapple Updo', 'A loose high pineapple that protects curls overnight.', U, 'pineapple, protective', 'Long', 'Everyday', 'Curly'],
  ['Tight Coil Straw Set', 'Straw-set coils creating small, springy ringlets.', U, 'straw set, coils', 'Medium', 'Party', 'Coily'],
  ['Curly Bob with Volume', 'A chin-length curly bob with natural body and bounce.', U, 'bob, volume', 'Short', 'Everyday', 'Curly'],
  ['Waterfall Curls Half Up', 'A half-up style with curls cascading like a waterfall.', U, 'waterfall, half up', 'Long', 'Wedding', 'Curly'],
  ['Blown-Out Curl Cloud', 'A light blow-out that keeps curl pattern and volume.', U, 'blow out, volume', 'Long', 'Everyday', 'Curly'],
  ['Loc Curly Ends Style', 'Locs transitioning into loose curly tips.', U, 'locs, curly ends', 'Long', 'Festival', 'Curly'],

  // --------------------------- WEDDING & BRIDAL ---------------------------
  ['Bridal Braided Updo', 'An intricate braided updo ready for a wedding day veil.', BR, 'bridal, braided updo', 'Any', 'Wedding', 'Any'],
  ['Soft Romantic Low Bun', 'A low chignon with soft face-framing pieces.', BR, 'low bun, romantic', 'Medium', 'Wedding', 'Wavy'],
  ['Braided Crown with Baby\'s Breath', 'A halo braid tucked with baby\'s breath flowers.', BR, 'crown, flowers', 'Medium', 'Wedding', 'Wavy'],
  ['Hollywood Glam Bridal Waves', 'Polished vintage waves for an elegant bridal look.', BR, 'hollywood waves, glam', 'Long', 'Wedding', 'Wavy'],
  ['Bridal Bantu Knot Updo', 'Sculptural Bantu knots styled into a bridal crown.', BR, 'bantu knots, bridal', 'Medium', 'Wedding', 'Coily'],
  ['Veil-Ready Low Ponytail', 'A sleek low ponytail designed to hold a cathedral veil.', BR, 'ponytail, veil', 'Long', 'Wedding', 'Straight'],
  ['Side-Swept Bridal Curls', 'Long curls swept over one shoulder with a jewelled clip.', BR, 'side sweep, curls', 'Long', 'Wedding', 'Curly'],
  ['Braided Chignon with Pearls', 'A low chignon dotted with tiny pearl pins.', BR, 'chignon, pearls', 'Medium', 'Wedding', 'Any'],
  ['Bridal High Bun with Tendrils', 'A clean high bun with soft curled tendrils at the temples.', BR, 'high bun, tendrils', 'Long', 'Wedding', 'Curly'],
  ['Cornrowed Bridal Updo', 'Straight-back cornrows gathered into an elegant bridal bun.', BR, 'cornrows, updo', 'Long', 'Wedding', 'Coily'],
  ['Messy Bridal Braid', 'A relaxed side braid softened for a rustic wedding.', BR, 'braid, rustic', 'Long', 'Wedding', 'Wavy'],
  ['Twisted Bridal Updo', 'Flat twists meeting in a sculpted low updo.', BR, 'twists, updo', 'Medium', 'Wedding', 'Coily'],

  // -------------------------- CHILDREN'S HAIRSTYLES -----------------------
  ['Kids Beaded Cornrows', 'Neat straight-back cornrows finished with colorful beads.', CH, 'beads, cornrows, kids', 'Medium', 'Everyday', 'Coily'],
  ['Pigtail Afro Puffs', 'Two soft afro puffs tied with bright ribbons.', CH, 'puffs, pigtails', 'Medium', 'Everyday', 'Coily'],
  ['Kids Box Braids with Balls', 'Small box braids sealed with plastic ball ends.', CH, 'box braids, kids', 'Medium', 'Everyday', 'Coily'],
  ['Heart Part Pigtails', 'Pigtail sections parted into little heart shapes.', CH, 'hearts, pigtails', 'Short', 'Everyday', 'Coily'],
  ['Kids Braided Crown', 'A simple halo braid circling the head.', CH, 'crown, braid', 'Medium', 'Formal', 'Any'],
  ['Curly Toddler Wash-and-Go', 'A gentle wash-and-go for soft toddler curls.', CH, 'toddler, wash and go', 'Short', 'Everyday', 'Curly'],
  ['Kids Knotless Braids with Beads', 'Lightweight knotless braids decorated with beads.', CH, 'knotless, beads', 'Medium', 'Everyday', 'Coily'],
  ['Braided Pigtail Buns', 'Two braided buns sitting high on the head.', CH, 'buns, pigtails', 'Medium', 'Party', 'Any'],
  ['Kids Cornrow Ponytail', 'Cornrows feeding into a single bouncy ponytail.', CH, 'cornrows, ponytail', 'Medium', 'Everyday', 'Coily'],
  ['Fulani Braids for Kids', 'Small Fulani-style braids with a center part and beads.', CH, 'fulani, beads', 'Medium', 'Festival', 'Any'],
  ['Kids Twist Style', 'Chunky two-strand twists secured with clips.', CH, 'twists, clips', 'Medium', 'Everyday', 'Coily'],
  ['Toddler Puff with Bow', 'A single soft puff topped with an oversized bow.', CH, 'puff, bow', 'Short', 'Everyday', 'Coily'],

  // ------------------------------ MEN'S -----------------------------------
  ['High Top Fade', 'A tall, flat-topped fade inspired by classic style.', M, 'high top, fade', 'Short', 'Everyday', 'Coily'],
  ['Textured Crop with Fringe', 'A short crop with a textured fringe brushed forward.', M, 'crop, fringe', 'Short', 'Everyday', 'Straight'],
  ['Afro with Line-Up', 'A full afro with a sharply lined-up hairline.', M, 'afro, line up', 'Medium', 'Everyday', 'Coily'],
  ['Low Taper Fade with Waves', 'A low taper fade revealing deep 360 waves.', M, 'taper, waves', 'Short', 'Everyday', 'Curly'],
  ['Twist Top with High Fade', 'Short twists on top over a high skin fade.', M, 'twists, high fade', 'Short', 'Everyday', 'Coily'],
  ['Box Braids for Men', 'Shoulder-length box braids parted in clean squares.', M, 'box braids, men', 'Medium', 'Everyday', 'Any'],
  ['Locs with Undercut', 'Mature locs above a clean undercut.', M, 'locs, undercut', 'Medium', 'Everyday', 'Any'],
  ['Crew Cut Classic', 'A timeless short crew cut, evenly tapered.', M, 'crew cut, classic', 'Short', 'Everyday', 'Straight'],
  ['Curly Top with Mid Fade', 'Natural curls on top with a mid fade on the sides.', M, 'curly, mid fade', 'Short', 'Everyday', 'Curly'],
  ['Cornrows for Men', 'Straight-back cornrows with a clean center part.', M, 'cornrows, straight back', 'Long', 'Everyday', 'Coily'],
  ['Slicked Back Undercut', 'Longer hair slicked back over a tight undercut.', M, 'slicked back, undercut', 'Medium', 'Formal', 'Straight'],
  ['Frosted Tips Fade', 'A short fade with subtly frosted curly tips.', M, 'frosted tips, fade', 'Short', 'Party', 'Curly'],

  // ------------------------- TRENDING & PROTECTIVE ------------------------
  ['Butterfly Locs Bob Trend', 'Shoulder-length butterfly locs trending this season.', T, 'butterfly locs, trending', 'Medium', 'Everyday', 'Any'],
  ['Bohemian Knotless Trend', 'Knotless braids with scattered human-hair curls.', T, 'bohemian, knotless', 'Long', 'Festival', 'Curly'],
  ['Sleek Low Bun Trend', 'A glass-hair low bun with mirror shine.', T, 'low bun, sleek', 'Long', 'Formal', 'Straight'],
  ['Braided Bob Trend', 'A chin-length braided bob with blunt ends.', T, 'braided bob, blunt', 'Short', 'Everyday', 'Any'],
  ['Fulani Braids with Beads Trend', 'Tribal Fulani braids accented with gold beads.', T, 'fulani, beads, tribal', 'Long', 'Festival', 'Any'],
  ['Copper Colour Protective Style', 'Copper-toned knotless braids for a seasonal refresh.', T, 'copper, colored, protective', 'Long', 'Everyday', 'Any'],
  ['Blunt Bob Wig Trend', 'A razor-straight blunt bob unit with a middle part.', T, 'blunt bob, wig', 'Short', 'Formal', 'Straight'],
  ['Pineapple Puff Trend', 'A high pineapple puff with laid edges.', T, 'pineapple, puff', 'Medium', 'Everyday', 'Coily'],
  ['Goddess Locs Trend', 'Long goddess locs with wavy loose ends.', T, 'goddess locs, long', 'Long', 'Festival', 'Wavy'],
  ['Space Buns with Braids Trend', 'Trendy space buns built from knotless braids.', T, 'space buns, braids', 'Medium', 'Party', 'Any'],
  ['Braided Ponytail Trend', 'A high braided ponytail with a wrapped base.', T, 'ponytail, braided', 'Long', 'Party', 'Any'],
  ['Faux Hawk Fade Trend', 'A bold faux hawk over a clean fade.', T, 'faux hawk, fade', 'Short', 'Party', 'Coily'],
];

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/buranga';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Verify seed photos exist before wiping the database.
  const creditsPath = path.join(SEED_DIR, 'credits.json');
  if (!fs.existsSync(creditsPath)) {
    console.error('Seed photos missing. Run: node scripts/harvest-images.mjs first.');
    process.exit(1);
  }
  const credits = JSON.parse(fs.readFileSync(creditsPath, 'utf8'));
  const filesOnDisk = new Set(fs.readdirSync(SEED_DIR).filter((f) => f.startsWith('seed-')));
  const usable = credits.filter((c) => filesOnDisk.has(c.file));
  console.log(`${usable.length} verified photos available on disk`);

  if (ENTRIES.length > usable.length) {
    console.error(`Not enough photos: ${ENTRIES.length} entries but ${usable.length} photos.`);
    process.exit(1);
  }

  await Promise.all([
    User.deleteMany({}),
    Hairstyle.deleteMany({}),
    Favorite.deleteMany({}),
  ]);
  console.log('Cleared existing collections');

  const demo = await User.create({
    name: 'Amina Uwase',
    email: 'demo@buranga.app',
    passwordHash: await User.hashPassword('demo1234'),
    bio: 'Hairstylist and hair lover. Sharing protective styles and natural hair inspiration weekly.',
    avatarUrl: '',
  });
  const guest = await User.create({
    name: 'Buranga Studio',
    email: 'studio@buranga.app',
    passwordHash: await User.hashPassword('studio1234'),
    bio: 'Curating the best hairstyle inspiration from around the world.',
    avatarUrl: '',
  });
  console.log('Created demo users (demo@buranga.app / demo1234)');

  const byFile = Object.fromEntries(usable.map((c) => [c.file, c]));
  const docs = [];
  ENTRIES.forEach((entry, i) => {
    const [title, description, category, tags, hairLength, occasion, hairType] = entry;
    const credit = usable[i];
    const ratio = credit.width && credit.height ? Number((credit.width / credit.height).toFixed(4)) : 0.75;
    docs.push({
      title,
      description,
      category: TITLE_OVERRIDES[title] || category,
      imageUrl: `/uploads/seed/${credit.file}`,
      tags: tags.split(',').map((t) => t.trim().toLowerCase()),
      keywords: [title.toLowerCase(), category.toLowerCase(), ...tags.split(',').map((t) => t.trim().toLowerCase())],
      hairLength,
      occasion,
      hairType,
      aspectRatio: ratio,
      savesCount: Math.floor(Math.random() * 40) + (i % 7 === 0 ? 30 : 0),
      author: i % 3 === 0 ? demo._id : guest._id,
      createdAt: new Date(Date.now() - (ENTRIES.length - i) * 60 * 60 * 1000),
    });
    void byFile;
  });

  const created = await Hairstyle.insertMany(docs);
  console.log(`Inserted ${created.length} hairstyle posts`);

  // Give the demo user a few favourites so the feature is immediately visible.
  const picks = created.filter((_, i) => i % 11 === 0).slice(0, 8);
  await Favorite.insertMany(picks.map((p) => ({ user: demo._id, hairstyle: p._id })));
  await Hairstyle.updateMany({ _id: { $in: picks.map((p) => p._id) } }, { $inc: { savesCount: 1 } });

  const counts = await Hairstyle.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }]);
  console.log('Categories:');
  for (const name of CATEGORIES) {
    const found = counts.find((c) => c._id === name);
    console.log(`  ${name}: ${found ? found.n : 0}`);
  }
  console.log('Seed complete.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
