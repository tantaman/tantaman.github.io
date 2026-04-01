#!/usr/bin/env node

import satori from 'satori';
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const FONT_CACHE_DIR = join(ROOT, '.font-cache');
const FONT_PATH = join(FONT_CACHE_DIR, 'inter-bold.ttf');
const FONT_PATH_REGULAR = join(FONT_CACHE_DIR, 'inter-regular.ttf');
const OUTPUT_DIR = join(ROOT, 'ig-output', '2026-04-01-progressive-tier-list');

const WIDTH = 1080;
const HEIGHT = 1350;

const FONT_BOLD_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@700';
const FONT_REGULAR_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400';

// --- Helpers ---

function h(type, props, ...children) {
  const flat = children.flat().filter((c) => c != null);
  return {
    type,
    props: {
      ...(props || {}),
      children: flat.length === 1 ? flat[0] : flat.length === 0 ? undefined : flat,
    },
  };
}

async function fetchFont(cssUrl, cachePath) {
  if (existsSync(cachePath)) return readFile(cachePath);
  console.log(`Fetching font from ${cssUrl}...`);
  const css = await fetch(cssUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
    },
  }).then((r) => r.text());
  const urlMatch = css.match(/src:\s*url\(([^)]+)\)/);
  if (!urlMatch) throw new Error('Could not parse font URL');
  const fontData = await fetch(urlMatch[1]).then((r) => r.arrayBuffer());
  await mkdir(FONT_CACHE_DIR, { recursive: true });
  await writeFile(cachePath, Buffer.from(fontData));
  return Buffer.from(fontData);
}

// --- Tier Data ---

const TIERS = [
  {
    letter: 'S',
    desc: 'Untouchable',
    color: '#c0392b',
    labelColor: '#fff',
    cards: [
      {
        name: 'Black trans woman',
        tag: 'racist + transphobe',
        tagType: 'r',
        ability: 'Maximum intersectional stack. Both charges fire simultaneously.',
        tooltip: 'Criticizing a Black trans woman simultaneously triggers racism and transphobia charges. Two separate immunity channels, both active. Debate ends on contact.',
      },
      {
        name: 'Nonbinary indigenous person',
        tag: 'settler + transphobe',
        tagType: 'r',
        ability: 'Double colonial trauma multiplier. Landback passive always active.',
        tooltip: 'Colonial dispossession and gender identity fire as separate charges. Cannot be engaged on either axis without triggering both.',
      },
      {
        name: 'Trans Muslim woman of color',
        tag: 'Islamophobe + TERF + racist',
        tagType: 'r',
        ability: 'Three simultaneous immunity channels. Recharges instantly.',
        tooltip: 'Any criticism activates Islamophobia, transphobia, and racism charges concurrently. This is the unhittable configuration. Win condition for any debate.',
      },
      {
        name: 'Undocumented trans activist',
        tag: 'xenophobe + transphobe',
        tagType: 'r',
        ability: 'All critique routes blocked simultaneously.',
        tooltip: 'Immigration status and gender identity fire together. No approach to criticism avoids both charges. Costs nothing to activate.',
      },
    ],
  },
  {
    letter: 'A',
    desc: 'Very high',
    color: '#e06c1a',
    labelColor: '#fff',
    cards: [
      {
        name: 'Trans woman',
        tag: 'TERF / transphobe',
        tagType: 'r',
        ability: 'Feminist critique negated. Religious critique negated.',
        tooltip: 'Critics from the feminist left receive: TERF. Critics from the religious right receive: transphobe. Two separate channels cover all approach vectors.',
      },
      {
        name: 'Indigenous activist',
        tag: 'settler colonialist',
        tagType: 'r',
        ability: 'Colonialism trump card: unlimited uses, no expiry.',
        tooltip: 'Any critique of positions, tactics, or statements can be deflected via the colonial dispossession frame. Cannot be argued around. No counterplay available.',
      },
      {
        name: 'Muslim progressive',
        tag: 'Islamophobe',
        tagType: 'r',
        ability: 'Colonial guilt exemption. Sharia: not your place. All routes blocked.',
        tooltip: 'Feminist critique of Islamic practice = colonial gaze. Legal critique = Islamophobia. Human rights critique = Western imperialism. Every approach charges the critic, not the practice.',
      },
      {
        name: 'Palestinian activist',
        tag: 'genocide apologist',
        tagType: 'r',
        ability: 'Settler colonialism passive always active. Strong reliable A-tier.',
        tooltip: 'Any criticism of positions or tactics = defending ethnic cleansing. The charge is maximally severe, making engagement politically prohibitive for most critics.',
      },
    ],
  },
  {
    letter: 'B',
    desc: 'Protected',
    color: '#b5960a',
    labelColor: '#111',
    cards: [
      {
        name: 'Black progressive',
        tag: 'racist',
        tagType: 'r',
        ability: 'Can criticize everything. Cannot be criticized re: politics.',
        tooltip: 'Criticizing political positions triggers racism charge. Note: critics who are also Black receive the Uncle Tom charge instead — the framework routes around the race of the critic.',
      },
      {
        name: 'Gay progressive',
        tag: 'homophobe',
        tagType: 'r',
        ability: 'High immunity. Warning: trans solidarity required.',
        tooltip: 'Solid B-tier but contains a self-debuff trap: if the gay progressive criticizes trans ideology, the transphobe charge fires on them instead. Requires active coalition maintenance.',
      },
      {
        name: 'Queer woman of color',
        tag: 'racist + homophobe',
        tagType: 'r',
        ability: 'Triple-stacked immunity: race, gender, sexuality.',
        tooltip: 'Race, sexual orientation, and gender identity stack as separate charges. All activate on criticism. Highly consistent pick with no known exploits.',
      },
      {
        name: 'Disabled progressive',
        tag: 'ableist',
        tagType: 'r',
        ability: 'Ableism charge available on demand. Underrated pick.',
        tooltip: 'Often overlooked in meta-analysis but consistently performs at B-tier. Ableism charge is readily available and difficult for critics to counter without appearing dismissive.',
      },
    ],
  },
  {
    letter: 'C',
    desc: 'Conditional',
    color: '#1a7a44',
    labelColor: '#fff',
    cards: [
      {
        name: 'White progressive woman',
        tag: 'misogynist (situational)',
        tagType: 'y',
        ability: 'Protected from right. Vulnerable to white feminism charge from left.',
        tooltip: 'Right-wing critics get misogynist. Left-wing critics get: white feminism, centering yourself, not listening to Black and trans women. Both flanks partially covered but left flank is a known vulnerability.',
      },
      {
        name: 'Gay white man',
        tag: 'homophobe (conditional)',
        tagType: 'y',
        ability: 'Moderate immunity. Trans solidarity non-negotiable.',
        tooltip: 'Homophobia charge fires on right-wing critics. However: homonationalism charge available against the gay white man himself if he criticizes Muslim anti-gay positions. Self-debuff risk is real.',
      },
      {
        name: 'Asian progressive',
        tag: 'racist (situational)',
        tagType: 'y',
        ability: 'Achievements suspicious. Model minority debuff lurking.',
        tooltip: 'Racism charge available but complicated. Academic or professional success triggers model minority myth debuff, which can be used against the Asian progressive themselves. High-maintenance pick.',
      },
      {
        name: 'Jewish progressive',
        tag: 'antisemite (geopolitics-dependent)',
        tagType: 'y',
        ability: 'Protected domestically. Geopolitics can void instantly.',
        tooltip: 'Antisemitism charge is available and reliable in most domestic contexts. However: geopolitical events — specifically Middle East news cycles — can suspend immunity without warning. Volatile pick.',
      },
    ],
  },
  {
    letter: 'D',
    desc: 'Suspicious',
    color: '#1a5c96',
    labelColor: '#fff',
    cards: [
      {
        name: 'Asian conservative',
        tag: 'nothing reliable',
        tagType: 'y',
        ability: 'Debuff: being used against other minorities.',
        tooltip: 'Achievement is actively weaponized against the Asian conservative as evidence of model minority myth complicity. Charges available to this identity are unreliable and frequently misfire.',
      },
      {
        name: 'Working class progressive',
        tag: 'class reductionist',
        tagType: 'y',
        ability: 'B-tier stats in D-tier standing. Class analysis unpopular.',
        tooltip: 'Technically has protection but class-based analysis makes theory people deeply uncomfortable. Often accused of ignoring identity in favor of economics. The charge fires on them almost as often as on critics.',
      },
      {
        name: 'Religious minority (wrong politics)',
        tag: 'maybe racist',
        tagType: 'y',
        ability: 'Faith tolerated only while politics remain correct.',
        tooltip: 'Religious identity provides partial cover but is immediately suspended on political nonconformity. Internalized oppression charge standing by. Identity card pending review.',
      },
    ],
  },
  {
    letter: 'F',
    desc: 'Pick your label',
    color: '#444',
    labelColor: '#ccc',
    cards: [
      {
        name: 'Black conservative',
        tag: 'no charge — they are the charge',
        tagType: 'n',
        ability: 'Internalized oppression. Not authentically Black. Uncle Tom.',
        tooltip: 'F-tier identities cannot fire charges because they have no immunity. They are the charges. Criticizing a Black conservative is not just permitted — it is required.',
      },
      {
        name: 'Gay Republican',
        tag: 'no charge — self-hating confirmed',
        tagType: 'n',
        ability: 'Stockholm syndrome. Voting against your interests.',
        tooltip: "The gay Republican's political alignment voids their identity protection entirely. Their gayness is cited as evidence of their damage, not as a source of immunity.",
      },
      {
        name: 'Hispanic Trump voter',
        tag: 'no charge — false consciousness',
        tagType: 'n',
        ability: 'Manipulated by whiteness. Not really Latino.',
        tooltip: 'Latino identity is suspended pending correct political alignment. False consciousness charge explains the vote without engaging with it.',
      },
      {
        name: 'Working class white',
        tag: 'no charge — economic anxiety',
        tagType: 'n',
        ability: 'Economic anxiety = racism. No further analysis required.',
        tooltip: 'Economic grievance is automatically translated into racism, which closes the interpretive loop. No engagement with actual material conditions necessary.',
      },
      {
        name: 'Christian conservative',
        tag: 'no charge — already a theocrat',
        tagType: 'n',
        ability: 'Danger to democracy by definition. No engagement required.',
        tooltip: "Critique of their critique = both-sidesing fascism. The Christian conservative's position is categorized as existential threat, removing the obligation to engage with its contents.",
      },
      {
        name: 'White man',
        tag: 'no charge — already the problem',
        tagType: 'n',
        ability: 'All debuffs simultaneously active. Final boss unit.',
        tooltip: 'The white man who fully agrees with the framework remains F-tier. Complete assent confirms the framework\'s analysis rather than destabilizing it.',
      },
    ],
  },
];

const TAG_STYLES = {
  r: { bg: '#4a1b0c', color: '#f5c4b3' },
  y: { bg: '#412402', color: '#fac775' },
  n: { bg: '#222', color: '#777' },
};

// --- Slide Builder ---

function buildCard(card) {
  const tagStyle = TAG_STYLES[card.tagType];
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        background: '#2a2a2a',
        borderRadius: 8,
        padding: '14px 16px',
        flex: 1,
        border: '1px solid rgba(255,255,255,0.07)',
      },
    },
    h(
      'div',
      {
        style: {
          fontSize: 22,
          fontWeight: 700,
          color: '#e8e8e8',
          marginBottom: 8,
        },
      },
      card.name,
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          marginBottom: 8,
        },
      },
      h(
        'div',
        {
          style: {
            fontSize: 14,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 4,
            backgroundColor: tagStyle.bg,
            color: tagStyle.color,
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
          },
        },
        card.tag,
      ),
    ),
    h(
      'div',
      {
        style: {
          fontSize: 17,
          color: '#bbb',
          lineHeight: 1.4,
          marginBottom: 6,
        },
      },
      card.ability,
    ),
    h(
      'div',
      {
        style: {
          fontSize: 14,
          color: '#777',
          lineHeight: 1.4,
          fontStyle: 'italic',
        },
      },
      card.tooltip,
    ),
  );
}

function buildTierSlide(tier) {
  const numCards = tier.cards.length;
  // 2-column grid for 4+ cards, single column for 3 or fewer
  const cols = numCards >= 4 ? 2 : 1;
  const rows = Math.ceil(numCards / cols);

  // Build card rows
  const cardRows = [];
  for (let r = 0; r < rows; r++) {
    const rowCards = tier.cards.slice(r * cols, r * cols + cols);
    cardRows.push(
      h(
        'div',
        {
          style: {
            display: 'flex',
            flex: 1,
            gap: 12,
          },
        },
        ...rowCards.map((card) => buildCard(card)),
      ),
    );
  }

  return h(
    'div',
    {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#111',
        padding: '0',
      },
    },
    // Header bar
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          padding: '20px 32px',
          gap: 16,
        },
      },
      h(
        'div',
        {
          style: {
            fontSize: 18,
            color: '#888',
          },
        },
        'Progressive identity tier list',
      ),
      h(
        'div',
        {
          style: {
            fontSize: 14,
            color: '#555',
          },
        },
        'tantaman.com',
      ),
    ),
    // Tier label + cards area
    h(
      'div',
      {
        style: {
          display: 'flex',
          flex: 1,
          margin: '0 32px 32px 32px',
          borderRadius: 8,
          overflow: 'hidden',
        },
      },
      // Tier label
      h(
        'div',
        {
          style: {
            width: 120,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tier.color,
            padding: '16px 12px',
            flexShrink: 0,
          },
        },
        h(
          'div',
          {
            style: {
              fontSize: 64,
              fontWeight: 700,
              color: tier.labelColor,
              lineHeight: 1,
            },
          },
          tier.letter,
        ),
        h(
          'div',
          {
            style: {
              fontSize: 12,
              color: tier.labelColor,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginTop: 8,
              textAlign: 'center',
              opacity: 0.9,
            },
          },
          tier.desc,
        ),
      ),
      // Cards area
      h(
        'div',
        {
          style: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 16,
            backgroundColor: '#1e1e1e',
          },
        },
        ...cardRows,
      ),
    ),
  );
}

// --- Render ---

async function renderSlide(element, fonts) {
  const svg = await satori(element, {
    width: WIDTH,
    height: HEIGHT,
    fonts,
  });
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  const [boldFont, regularFont] = await Promise.all([
    fetchFont(FONT_BOLD_URL, FONT_PATH),
    fetchFont(FONT_REGULAR_URL, FONT_PATH_REGULAR),
  ]);

  const fonts = [
    { name: 'Inter', data: boldFont, weight: 700, style: 'normal' },
    { name: 'Inter', data: regularFont, weight: 400, style: 'normal' },
  ];

  await mkdir(OUTPUT_DIR, { recursive: true });

  for (let i = 0; i < TIERS.length; i++) {
    const tier = TIERS[i];
    const name = `slide-${i}-${tier.letter.toLowerCase()}-tier`;
    console.log(`Rendering ${name}...`);
    const element = buildTierSlide(tier);
    const png = await renderSlide(element, fonts);
    await writeFile(join(OUTPUT_DIR, `${name}.png`), png);
  }

  console.log(`\nDone! 6 slides in ${OUTPUT_DIR}/`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
