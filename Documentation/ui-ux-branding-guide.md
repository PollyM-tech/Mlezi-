# Mlezi UI/UX and branding guide

Last audited: **3 November 2026**. This records the current local implementation, including recent homepage changes. It does not imply those changes are deployed. The source styles and components remain authoritative; this is an inventory of the implementation, not a newly standardized design-token system.

## 1. Brand identity

| Detail | Current use |
| --- | --- |
| Product name | Mlezi; Mlezi Care in partner/logo descriptions |
| Website | `mlezicare.com` |
| Operator | Lintech Telecom |
| Main tagline | “A little care. A brighter beginning.” |
| Homepage headline | “A little care. A brighter beginning.” |
| Opening statement | “ROOTED IN CARE. MADE FOR KENYA.” |
| Geographic positioning | Families hiring in Kenya, with East African joining guides for Uganda, Burundi and Rwanda |
| Tone | Warm, calm, practical and reassuring; direct instructions and clearly labelled choices |
| Visual character | Forest greens, warm gold, cream surfaces, generous spacing, rounded images and restrained decoration |
| Spelling | British English where already used: colour, labelled, favourites |
| Currency | KES; platform membership fees are separate from caregiver wages |

Avoid claims that Premium means verified, that uploading an image proves identity, or that Mlezi guarantees employment or caregiver suitability. Identity, reputation, paid visibility and availability are separate signals. The current marketplace connects people; families and caregivers make their care arrangements directly.

## 2. Colour palette

These colours are used in CSS; they are not sampled from the raster logo. The logo artwork retains its original colours.

### Primary brand colours and surfaces

| Name / purpose | Hex | Where used |
| --- | --- | --- |
| Primary deep green | `#235B45` | Homepage primary buttons and hover-link emphasis |
| Forest green | `#254B3D` | Homepage default text and headings |
| Workspace green | `#225B49` | Global `--green`, workspace primary buttons, approved badges |
| Caregiver-panel green | `#254E3C` | Dark caregiver invitation panel |
| Warm gold | `#AC7D41` | “Brighter” headline accent |
| Supporting gold | `#C79B58` | Homepage kicker dot |
| Light gold | `#D0B57C` | Eyebrow text on the dark caregiver panel |
| Soft cream | `#FBFAF5` | Homepage background and header |
| Warm white | `#FFFEFA` | Secondary buttons and selected light surfaces |
| Workspace background | `#F7F8F3` | Global page background |
| White | `#FFFFFF` | Form fields, primary-button text, authenticator QR background |
| Light cream text | `#FBF6E9` | Text on the dark caregiver panel |

### Text, interaction and border colours

| Purpose | Hex |
| --- | --- |
| Workspace main text | `#263F3B` |
| Workspace muted text (`--muted`) | `#6D7B73` |
| Supporting sage text | `#708072` |
| Current hero paragraph override | `#52694F` |
| Footer/navigation link text | `#4D6356` |
| Homepage text links | `#295840` |
| Regional guide links | `#23533C` |
| Homepage primary hover | `#164332` |
| Workspace primary hover | `#184635` |
| Regional-link hover | `#163B28` |
| Keyboard focus outline | `#D49E4F` |
| Workspace border (`--border`) | `#E0E5DB` |
| Homepage footer divider | `#E6E9DE` |
| Input border | `#D6DDD2` |
| Input placeholder | `#98A195` |
| Secondary-button border | `#D4DDCE` |
| Homepage select border | `#CBD5C5` |

### Status colours

| State | Foreground | Background / border |
| --- | --- | --- |
| Generic badge / gold emphasis | `#837141` | `#F2EEDF` |
| Approved identity badge | `#225B49` | `#E0EDDF` |
| General notice | Inherited text | `#EEF3E6` / `#CFDDC2` |
| Error notice | `#963D2B` | `#FFF0EB` / `#ECC6BA` |

Status must also be conveyed in words. Do not rely on green, gold or red alone. The softer text colours listed here are implementation values, not a claim that every combination has passed a contrast audit.

## 3. Typography

| Role | Font / treatment |
| --- | --- |
| Body, labels, controls | `DM Sans`, falling back to `sans-serif` |
| Workspace headings | `Manrope`, falling back to `sans-serif` |
| Homepage editorial headings | `Georgia`, with serif fallbacks |
| Hero headline | `Georgia`, `'Times New Roman'`, `serif`; normal weight |
| Current “brighter” override | `'Palatino Linotype'`, `'Book Antiqua'`, `Palatino`, `serif`; upright, normal weight, `-.035em` tracking |
| Technical setup keys | Browser monospace through `<code>`; long keys wrap |
| Official wordmark | Supplied image artwork, not a replacement typed font |

Google Fonts loads DM Sans weights 400/500/600/700 and Manrope weights 400/500/600/700/800 only after the applicable optional-cookie preference permits external fonts. When declined or unavailable, system fallbacks remain usable. Georgia/Palatino availability depends on the device.

Representative sizes in the implemented styles (responsive and later selectors can override them):

- Global body line height: `1.6`.
- Workspace H1: `clamp(1.9rem, 3vw, 2.8rem)`; H2 `1.35rem`; H3 `1rem`.
- Homepage hero: `clamp(2.8rem, 4.8vw, 4.2rem)`, line height `1.07`, normal weight, `-2px` tracking.
- Homepage section headings: `clamp(1.7rem, 2.6vw, 2.2rem)`, normal weight and line height `1.2`.
- Homepage body/intro copy: typically `.84–1rem`, with relaxed line height near `1.9`.
- Buttons: typically `.85rem`, weight 600. Heading weights are generally restrained on the homepage.
- Eyebrows: uppercase, gold/sage, about `.58–.62rem`, tracking around `2px`.
- Mobile form controls are raised to at least `16px` by responsive rules.

## 4. Logo and browser identity assets

| Asset | Role |
| --- | --- |
| `frontend/src/assets/logo.png` | Official Mlezi logo, homepage header/footer and Mlezi Care partner acknowledgement |
| `frontend/public/favicon.png` | Browser favicon referenced by `frontend/index.html` as `image/png` |
| `frontend/public/favicon.svg` | Additional legacy-named asset; not the current favicon link. Its current content is PNG data despite the extension |
| `frontend/src/assets/lintech-logo.png` | Lintech Telecom sponsor/partner logo |
| `frontend/src/assets/mylescorp-logo.avif` | Mylescorp Technologies sponsor/partner logo |

Preserve the supplied image aspect ratio, wording and colours. Do not stretch or recreate the wordmark with a text font. The official logo file includes substantial padding; `.official-brand` crops its display box with CSS while keeping the source unchanged. The typical desktop homepage display box is `180 × 64px`, using the larger image positioned within it; responsive rules adjust its display.

Sponsors/partners appear as logos directly on the cream background: no white cards, outlines or shadows. Their list wraps on narrow screens. The logo rule uses a maximum width of `240px`, a `100px` image height and `object-fit: contain`. Backgrounds embedded in supplied artwork remain part of that artwork.

## 5. Imagery and placement

| Source image in `frontend/src/assets/` | Current placement |
| --- | --- |
| `bg-image.png` | Hero slideshow and “For the people who care” invitation, replacing the decorative flower |
| `Warm Family Reading Nook.png` | Hero slideshow |
| `Caring Playtime with Colorful Blocks.png` | Hero slideshow |
| `Joyful Block-Building with Mlezi Caregiver.png` | Hero slideshow plus “Room to play. Space to discover.” section |
| `Warm Mlezi Healthcare Bond.png` | Hero slideshow |
| `travelnanny.png` | “Travel with a little help” story |
| `Warm Living Room Caregiver Cleaning.png` | “Everyday help at home” story |
| `Joyful Family Day at the Playground.png` | “On-call when you need care” story |

These are supplied illustrative images; do not present them as actual registered caregivers, real customer reviews or proof of services delivered. Household tasks shown in an image do not mean every nanny offers cleaning: agree duties explicitly. Maintain descriptive alt text for content images; decorative slideshow backgrounds have empty alt text.

Image treatment:

- Service-story images: `16:9`, `object-fit: cover`, `12px` corners.
- Play feature: image and text side by side on desktop; one column below `760px`; image retains its aspect ratio with `18px` corners.
- Caregiver invitation: green panel, two columns, `32px` padding and `40px` gap; portrait-style image with `4:5` ratio, maximum height `420px`, crop positioned at `80% center`. Below `760px`, it stacks with `24px` padding, a `26px` gap and a `16:10` image ratio.
- `bg-image.png` is no longer a wide banner beneath “At home, at work, or away together.”
- Below-fold content images use lazy loading and asynchronous decoding where implemented.
- Hero backgrounds use a cream-to-transparent horizontal gradient to protect headline readability. Mobile uses a stronger cream overlay.

## 6. Layout, spacing and shapes

| Element | Current treatment |
| --- | --- |
| Homepage content container | Maximum `1256px`, including `40px` side padding on desktop |
| Workspace shell | Maximum `1600px` |
| Homepage section spacing | Approximately `62px` top / `64px` bottom; mobile rules reduce spacing |
| Service/category grid | Three columns on larger screens; category cards become two columns on phones |
| Story/how-it-works rows | Three columns on larger screens; one column on phones |
| Forms and workspace grids | Responsive columns with `minmax(0, …)` / `min-width: 0` to prevent overflow |
| Standard button corners | `7px` |
| Inputs/selects | `7px` corners, `1px` border, typically `12px 14px` padding |
| Common cards and images | Mostly `11–18px` corners depending on component |
| Badges | Pill shape, `20px` radius, `5px 10px` padding |
| Dividers | Thin, pale green/cream borders |
| Shadows | Subtle low-opacity green/grey on selected cards/search surfaces, rather than heavy elevation |

Spacing is currently expressed as component-specific pixel values, not a unified spacing-token scale. Existing values frequently include 8, 12, 16, 20, 24, 28, 32, 40 and 48 pixels. Do not describe these as a strict enforced 8px grid.

## 7. Buttons, controls and states

- Primary actions: solid green with white text; darker hover state.
- Secondary actions: warm-white surface, green text and pale border.
- Dark-panel invitation: light button for “Create my caregiver profile”.
- Homepage primary buttons generally have at least `48px` height and `14px 22px` padding. Header variants use a more compact size.
- Dropdowns use native indicators and explicit placeholders: “Select care type” and “Select work arrangement”.
- Forms use visible labels, required fields and ordinary input types; consent/authorization uses checkboxes.
- Disabled controls reduce opacity and use the waiting cursor. Loading and outcome messages use text, not colour alone.
- Long job actions and membership controls wrap on narrow screens.
- User actions use specific verbs: Find your caregiver, Create my caregiver profile, Submit proposal, Accept offer, Hide/Show my profile and Check STK payment status.

## 8. Icons and trust signals

The homepage uses small inline SVG line icons where useful (for example navigation arrows, checkmarks for benefits and functional actions). The shared `Icon` helper contains heart, moon, sun, bag, book, sprout, check and arrow paths; not every defined path is currently rendered. Typical SVG treatment is a `24 × 24` view box, no fill, current text colour, `1.6` stroke width and rounded line caps/joins.

Current restraint rules:

- “Every family is different” category cards use text, without decorative icons/arrows.
- “Get to know the person behind the profile” is text-only: no star, diamond, checkmark or decorative link arrow.
- The caregiver invitation uses the supplied nanny-and-child image instead of the flower decoration.
- Stars used for actual review/rating controls elsewhere are functional reputation signals, not decoration in the trust section.
- Identity labels show approved/unapproved status clearly. Pending review does not imply verified adulthood. Premium is separately labelled paid visibility and does not buy identity approval or ratings.

## 9. Header, footer and supporting UI

- Header: official logo, navigation for How it works / Find your care / For caregivers / FAQs, sign-in or workspace access; collapsible menu on small screens.
- Footer: brand block and three named groups: **Explore Mlezi**, **Help & community**, **Legal**. A separate bottom row holds the marketplace statement and copyright.
- Footer groups are three columns on desktop; brand stacks above links below `900px`; link groups become two columns below `480px`. No randomly interleaved link grid.
- Regional guide links are deep green with an underline and visible hover treatment.
- FAQ assistant: “Mlezi Help”; written FAQ answers, not a claim of live human chat.
- Cookie controls: accept or decline optional usage, with a way to revisit preferences. Essential account use does not depend on accepting optional fonts/storage.
- Admin authenticator QR: black-on-white locally rendered SVG, `240px` maximum display width, white quiet margin and manual-key fallback. It is a security tool, not a decorative brand QR; no external QR-generation service receives the secret.

## 10. Motion, responsive behaviour and accessibility

- Hero slideshow: automatic change every **30 seconds**, five existing slides, wraparound. There is currently no user-facing pause button or image counter.
- Hero reveal: approximately `900ms ease-out`. Slideshow timers pause while the document is hidden.
- Links/buttons: lightweight approximately `.18s` colour/background/transform transitions where defined.
- Reduced-motion preferences disable animations; section scrolling uses an immediate jump instead of smooth scrolling when requested.
- Keyboard focus: visible `3px` gold outline, offset `4px`.
- Real links remain links; actions remain buttons. Navigation and image alternatives have accessible labels.
- Preserve responsive image ratios and wrapping controls. Review at phone, tablet and desktop widths; screenshot checks do not replace real-device, screen-reader, contrast and motion-accessibility review.
- Existing CSS has breakpoints around 480, 580, 600, 650, 760, 800, 900, 1050/1051, 1100 and 1450px; these are component-specific, not one global breakpoint system.

## 11. Source of truth and maintenance

| Source | Owns |
| --- | --- |
| `frontend/src/index.css` | Global/workspace colours, fonts, forms, buttons, badges and responsiveness |
| `frontend/src/landing.css` | Homepage typography, colours, layout, footer, imagery and responsive overrides |
| `frontend/src/components/Landing.jsx` | Homepage copy, service imagery, trust section, invitation and footer |
| `frontend/src/components/HeroSlideshow.jsx` | Slide assets, timing, visibility handling |
| `frontend/src/components/Partners.jsx` | Partner identities, source assets and alt text |
| `frontend/src/components/CookieConsent.jsx` | Consent-controlled font loading |
| `frontend/src/components/AdminSecurity.jsx` | Authenticator enrollment presentation |
| `frontend/index.html` | Current favicon link |

Check later selectors and media queries before copying a value: the current stylesheet contains earlier overridden rules and historical decorative selectors. New design work should reuse the main green/gold/cream palette and current component patterns. Consolidating variants into tokens would be a separate implementation task; no visual code or production configuration was changed for this documentation update.

## Appendix: complete stylesheet colour-literal inventory

This appendix includes all declared hex colours in the two main stylesheets, including historical/overridden selectors and alpha-bearing shadows. It is not a list of additional primary brand colours. Eight-digit hex uses the final two digits for opacity. Repeated shorthand colours are expanded and deduplicated.

| Hex | Declared in |
| --- | --- |
| `#071B45` | `landing.css` |
| `#163B28` | `landing.css` |
| `#164332` | `landing.css` |
| `#184635` | `index.css` |
| `#193C2C12` | `landing.css` |
| `#225B49` | `index.css` |
| `#23533C` | `landing.css` |
| `#235B45` | `landing.css` |
| `#243D3003` | `index.css` |
| `#254B3D` | `landing.css` |
| `#254B3D09` | `landing.css` |
| `#254E3C` | `landing.css` |
| `#263E2B0A` | `landing.css` |
| `#263F3B` | `index.css` |
| `#263F3B15` | `index.css` |
| `#264B3C` | `landing.css` |
| `#28463105` | `landing.css` |
| `#28513D` | `landing.css` |
| `#29483508` | `landing.css` |
| `#295840` | `landing.css` |
| `#2C5842` | `landing.css` |
| `#355743` | `index.css` |
| `#4D6356` | `landing.css` |
| `#4E6B48` | `landing.css` |
| `#52694F` | `landing.css` |
| `#597552` | `index.css` |
| `#5B7054` | `index.css` |
| `#5C7952` | `landing.css` |
| `#618065` | `index.css` |
| `#62745D` | `landing.css` |
| `#62847E` | `landing.css` |
| `#6D7B73` | `index.css` |
| `#708072` | `landing.css` |
| `#73531A` | `index.css` |
| `#74826D` | `landing.css` |
| `#77816F` | `landing.css` |
| `#7A836F` | `landing.css` |
| `#7B8774` | `landing.css` |
| `#7C8875` | `landing.css` |
| `#7D8975` | `landing.css` |
| `#7F8877` | `landing.css` |
| `#7F8978` | `landing.css` |
| `#7F897A` | `landing.css` |
| `#7F8E6C` | `landing.css` |
| `#826A3B` | `landing.css` |
| `#837141` | `index.css` |
| `#839375` | `landing.css` |
| `#859071` | `landing.css` |
| `#89917E` | `landing.css` |
| `#8A927F` | `landing.css` |
| `#8A947F` | `landing.css` |
| `#8B927D` | `landing.css` |
| `#8C957F` | `landing.css` |
| `#8C967D` | `landing.css` |
| `#8CA67C` | `index.css` |
| `#8F845B` | `landing.css` |
| `#963D2B` | `index.css` |
| `#98A195` | `index.css` |
| `#9DB48D` | `index.css` |
| `#A68149` | `landing.css` |
| `#A7B49A` | `landing.css` |
| `#AA8751` | `landing.css` |
| `#AC7D41` | `landing.css` |
| `#AC8650` | `landing.css` |
| `#AC8A54` | `landing.css` |
| `#ADBD99` | `index.css` |
| `#B07939` | `landing.css` |
| `#B08950` | `landing.css` |
| `#B1854C` | `landing.css` |
| `#B38D52` | `landing.css` |
| `#B47C64` | `landing.css` |
| `#B9CDBD` | `index.css` |
| `#BAC9AE` | `index.css` |
| `#BAC9B8` | `landing.css` |
| `#BD8250` | `index.css` |
| `#BD9154` | `landing.css` |
| `#C79B58` | `landing.css` |
| `#CBD5C5` | `landing.css` |
| `#CCB47A` | `landing.css` |
| `#CCD6BD` | `landing.css` |
| `#CFDDC2` | `index.css` |
| `#D0B57C` | `landing.css` |
| `#D49E4F` | `index.css` |
| `#D4DDC8` | `landing.css` |
| `#D4DDCE` | `index.css` |
| `#D6C49C` | `landing.css` |
| `#D6DDD2` | `index.css` |
| `#D9BF84` | `index.css` |
| `#DCE2D3` | `landing.css` |
| `#DCE2D9` | `index.css` |
| `#DCE3D4` | `index.css` |
| `#DFE4D5` | `landing.css` |
| `#DFE4D6` | `landing.css` |
| `#DFE5D2` | `landing.css` |
| `#DFE5D5` | `landing.css` |
| `#DFE8D4` | `index.css` |
| `#E0E5D8` | `landing.css` |
| `#E0E5DB` | `index.css` |
| `#E0EDDF` | `index.css` |
| `#E2E8D8` | `landing.css` |
| `#E2E8DA` | `index.css` |
| `#E3E7DB` | `index.css`, `landing.css` |
| `#E3E9DA` | `index.css` |
| `#E4E8DC` | `landing.css` |
| `#E5E7DD` | `landing.css` |
| `#E5ECEB` | `landing.css` |
| `#E6E9DE` | `landing.css` |
| `#E7D7B8` | `landing.css` |
| `#E7E5D6` | `landing.css` |
| `#E8DFC9` | `landing.css` |
| `#E8E8DC` | `landing.css` |
| `#E8EDDD` | `index.css` |
| `#E8EDDF` | `index.css` |
| `#E9EDDC` | `landing.css` |
| `#E9EFDF` | `index.css` |
| `#EAF0DF` | `landing.css` |
| `#ECC6BA` | `index.css` |
| `#EDF0E5` | `landing.css` |
| `#EDF0E7` | `index.css` |
| `#EDF1E3` | `index.css` |
| `#EDF5EF` | `index.css` |
| `#EEF3E6` | `index.css` |
| `#F0F2E9` | `index.css` |
| `#F0F3E9` | `index.css` |
| `#F1E9DC` | `landing.css` |
| `#F1F2EC` | `index.css` |
| `#F2EEDF` | `index.css` |
| `#F3E5DE` | `landing.css` |
| `#F4EAD5` | `landing.css` |
| `#F5EAD6` | `landing.css` |
| `#F5EDD9` | `landing.css` |
| `#F6F7F2` | `index.css` |
| `#F7F8F3` | `index.css` |
| `#F8EAC9` | `index.css` |
| `#F8F9F3` | `index.css` |
| `#FBF6E9` | `landing.css` |
| `#FBFAF5` | `landing.css` |
| `#FFF0EB` | `index.css` |
| `#FFF8E9` | `index.css` |
| `#FFFCF1` | `landing.css` |
| `#FFFDF5` | `landing.css` |
| `#FFFDF7` | `landing.css` |
| `#FFFEF9` | `landing.css` |
| `#FFFEFA` | `index.css`, `landing.css` |
| `#FFFFFF` | `index.css` |

Other colour syntax includes `transparent`, named `white`, `currentColor`, and `rgba(...)` cream overlays on the hero. These serve transparency, inheritance and readability; they are not extra logo colours.
