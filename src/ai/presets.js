// Realistic visual presets for testing citizen grievance submissions
// Each has a distinct SVG graphic rendered as base64 Data URL, rich description, and expected AI diagnosis

function svgToDataUrl(svgString) {
  return `data:image/svg+xml;base64,${Buffer.from(svgString).toString('base64')}`;
}

// 1. Pothole Preset Graphic (Asphalt road with jagged deep pothole, cracks, and hazard water puddle)
const potholeSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="roadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2d3436" />
      <stop offset="100%" stop-color="#1e272e" />
    </linearGradient>
    <radialGradient id="holeDepth" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0a0a0a" />
      <stop offset="60%" stop-color="#181818" />
      <stop offset="100%" stop-color="#3a3d40" />
    </radialGradient>
  </defs>
  <!-- Road Surface -->
  <rect width="800" height="600" fill="url(#roadGrad)" />
  
  <!-- Road Centerline (worn out yellow dashed line) -->
  <line x1="400" y1="0" x2="400" y2="120" stroke="#f1c40f" stroke-width="14" stroke-dasharray="40,30" opacity="0.8" />
  <line x1="400" y1="360" x2="400" y2="600" stroke="#f1c40f" stroke-width="14" stroke-dasharray="40,30" opacity="0.8" />
  
  <!-- Outer Pothole Fracture Zone -->
  <path d="M 280,240 Q 320,200 420,210 Q 520,220 540,280 Q 560,340 500,410 Q 420,440 340,420 Q 260,400 250,330 Z" fill="#202224" stroke="#485460" stroke-width="6" />
  
  <!-- Deep Cavity -->
  <path d="M 310,260 Q 360,230 440,240 Q 500,260 510,300 Q 520,350 470,390 Q 410,410 350,390 Q 290,370 290,320 Z" fill="url(#holeDepth)" />
  
  <!-- Exposed Aggregate & Rocks -->
  <ellipse cx="370" cy="300" rx="16" ry="10" fill="#7f8c8d" />
  <ellipse cx="440" cy="320" rx="22" ry="12" fill="#95a5a6" />
  <ellipse cx="340" cy="340" rx="12" ry="8" fill="#57606f" />
  <ellipse cx="410" cy="270" rx="14" ry="9" fill="#747d8c" />
  <ellipse cx="470" cy="350" rx="18" ry="11" fill="#4b6584" />
  
  <!-- Murky Water Puddle in depression -->
  <path d="M 360,320 Q 400,310 440,325 Q 460,345 430,360 Q 380,365 350,345 Z" fill="#1b2a38" opacity="0.85" />
  
  <!-- Asphalt Stress Cracks spreading out -->
  <path d="M 280,240 L 220,180 L 170,160 M 220,180 L 200,220" stroke="#1e272e" stroke-width="4" stroke-linecap="round" />
  <path d="M 540,280 L 630,260 L 680,290 M 630,260 L 650,220" stroke="#1e272e" stroke-width="4" stroke-linecap="round" />
  <path d="M 500,410 L 560,470 L 620,510" stroke="#1e272e" stroke-width="4" stroke-linecap="round" />
  <path d="M 340,420 L 300,500 L 240,540" stroke="#1e272e" stroke-width="4" stroke-linecap="round" />
  <path d="M 420,210 L 430,130 L 470,90" stroke="#1e272e" stroke-width="4" stroke-linecap="round" />

  <!-- Stamp Label -->
  <rect x="20" y="20" width="310" height="50" rx="8" fill="#000000" opacity="0.75" />
  <text x="35" y="52" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ff4757">DEFECT: SEVERE POTHOLE</text>
</svg>
`;

// 1-RESOLVED. Pothole Resolved Proof Graphic (Same road, cavity filled with smooth compacted dark asphalt patch)
const potholeResolvedSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="roadGradRes" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2d3436" />
      <stop offset="100%" stop-color="#1e272e" />
    </linearGradient>
    <linearGradient id="patchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#111111" />
      <stop offset="100%" stop-color="#1c1c1c" />
    </linearGradient>
  </defs>
  <!-- Road Surface (Identical background) -->
  <rect width="800" height="600" fill="url(#roadGradRes)" />
  
  <!-- Road Centerline restored -->
  <line x1="400" y1="0" x2="400" y2="120" stroke="#f1c40f" stroke-width="14" stroke-dasharray="40,30" opacity="0.9" />
  <line x1="400" y1="360" x2="400" y2="600" stroke="#f1c40f" stroke-width="14" stroke-dasharray="40,30" opacity="0.9" />
  
  <!-- Fresh Rectangular / Engineered Asphalt Patch (Fully Compacted & Leveled) -->
  <rect x="250" y="210" width="320" height="210" rx="12" fill="url(#patchGrad)" stroke="#090a0a" stroke-width="4" />
  
  <!-- Roller Compactor Texture lines (shows proof of machine compaction) -->
  <line x1="260" y1="250" x2="560" y2="250" stroke="#252525" stroke-width="3" />
  <line x1="260" y1="290" x2="560" y2="290" stroke="#252525" stroke-width="3" />
  <line x1="260" y1="330" x2="560" y2="330" stroke="#252525" stroke-width="3" />
  <line x1="260" y1="370" x2="560" y2="370" stroke="#252525" stroke-width="3" />
  <line x1="260" y1="400" x2="560" y2="400" stroke="#252525" stroke-width="3" />

  <!-- Bituminous Joint Sealant Line around border -->
  <rect x="246" y="206" width="328" height="218" rx="14" fill="none" stroke="#000000" stroke-width="5" opacity="0.9" />

  <!-- Road Administration Verification Badge -->
  <rect x="20" y="20" width="380" height="50" rx="8" fill="#000000" opacity="0.85" />
  <text x="35" y="52" font-family="sans-serif" font-size="20" font-weight="bold" fill="#2ed573">PROOF: ASPHALT PATCH COMPACTED</text>
  <text x="590" y="560" font-family="sans-serif" font-size="16" font-weight="bold" fill="#2ed573">✓ ZERO DEFECT VISIBLE</text>
</svg>
`;

// 2. Garbage Preset Graphic (Overflowing dumpster, piled black trash bags, cardboard, loose plastic waste)
const garbageSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="wallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#bdc3c7" />
      <stop offset="100%" stop-color="#95a5a6" />
    </linearGradient>
    <linearGradient id="binGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#27ae60" />
      <stop offset="100%" stop-color="#1e8449" />
    </linearGradient>
  </defs>
  <!-- Background Wall & Pavement -->
  <rect width="800" height="400" fill="url(#wallGrad)" />
  <rect y="400" width="800" height="200" fill="#57606f" />
  <line x1="0" y1="400" x2="800" y2="400" stroke="#2f3542" stroke-width="6" />

  <!-- Municipal Green Dumpster Bin (Full) -->
  <polygon points="260,220 540,220 510,430 290,430" fill="url(#binGrad)" stroke="#145a32" stroke-width="5" />
  <rect x="250" y="200" width="300" height="25" rx="5" fill="#1e8449" stroke="#145a32" stroke-width="4" />
  <!-- Municipal Dumpster Wheels -->
  <circle cx="310" cy="445" r="18" fill="#2d3436" />
  <circle cx="490" cy="445" r="18" fill="#2d3436" />
  
  <!-- Overflowing Trash heap over top of bin -->
  <path d="M 270,205 Q 320,110 400,100 Q 480,90 530,205 Z" fill="#2c3e50" />
  
  <!-- Plastic Trash Bags (Black, White, Blue) -->
  <ellipse cx="360" cy="150" rx="45" ry="35" fill="#1e272e" stroke="#2f3542" stroke-width="3" />
  <ellipse cx="440" cy="140" rx="50" ry="40" fill="#34495e" stroke="#1e272e" stroke-width="3" />
  <ellipse cx="410" cy="120" rx="35" ry="25" fill="#d2dae2" opacity="0.9" />
  
  <!-- Giant roadside pile spillover on ground -->
  <ellipse cx="230" cy="480" rx="90" ry="55" fill="#1e272e" />
  <ellipse cx="380" cy="510" rx="120" ry="60" fill="#2f3542" />
  <ellipse cx="560" cy="490" rx="110" ry="55" fill="#1e272e" />
  <ellipse cx="470" cy="460" rx="80" ry="45" fill="#34495e" />
  
  <!-- Cardboard Boxes & Scattered Debris -->
  <polygon points="180,430 250,420 270,470 200,480" fill="#cd853f" stroke="#8b4513" stroke-width="3" />
  <polygon points="580,440 660,430 670,480 590,490" fill="#d2b48c" stroke="#8b4513" stroke-width="3" />
  
  <!-- Loose Colorful Waste Items (bottles, tin cans, wrappers) -->
  <rect x="310" y="520" width="40" height="15" rx="5" fill="#ff4757" transform="rotate(15 310 520)" />
  <rect x="420" y="535" width="45" height="18" rx="6" fill="#3742fa" transform="rotate(-25 420 535)" />
  <rect x="520" y="515" width="35" height="14" rx="4" fill="#ffa502" transform="rotate(40 520 515)" />
  <ellipse cx="370" cy="460" rx="18" ry="10" fill="#2ed573" />
  <ellipse cx="460" cy="505" rx="15" ry="8" fill="#e056fd" />

  <!-- Stamp Label -->
  <rect x="20" y="20" width="330" height="50" rx="8" fill="#000000" opacity="0.75" />
  <text x="35" y="52" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffa502">DEFECT: SOLID WASTE OVERFLOW</text>
</svg>
`;

// 2-RESOLVED. Garbage Resolved Proof Graphic (Same background, dumpster empty & closed, pavement swept clean, disinfected)
const garbageResolvedSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="wallGradRes" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#bdc3c7" />
      <stop offset="100%" stop-color="#95a5a6" />
    </linearGradient>
    <linearGradient id="binGradRes" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#27ae60" />
      <stop offset="100%" stop-color="#1e8449" />
    </linearGradient>
  </defs>
  <!-- Background Wall & Clean Pavement -->
  <rect width="800" height="400" fill="url(#wallGradRes)" />
  <rect y="400" width="800" height="200" fill="#57606f" />
  <line x1="0" y1="400" x2="800" y2="400" stroke="#2f3542" stroke-width="6" />

  <!-- Municipal Green Dumpster Bin (Closed Lid & Clean) -->
  <polygon points="260,240 540,240 510,430 290,430" fill="url(#binGradRes)" stroke="#145a32" stroke-width="5" />
  <!-- Closed flat bin lid -->
  <rect x="240" y="225" width="320" height="20" rx="6" fill="#145a32" stroke="#0e3f23" stroke-width="3" />
  <circle cx="310" cy="445" r="18" fill="#2d3436" />
  <circle cx="490" cy="445" r="18" fill="#2d3436" />

  <!-- Clean Swept Ground with White Sanitation Disinfectant Chalk Lines -->
  <line x1="150" y1="480" x2="650" y2="480" stroke="#ffffff" stroke-width="4" stroke-dasharray="15,10" opacity="0.7" />
  <line x1="180" y1="520" x2="620" y2="520" stroke="#ffffff" stroke-width="4" stroke-dasharray="15,10" opacity="0.7" />
  
  <!-- Disinfection Sparkle Icons -->
  <text x="210" y="470" font-size="28" fill="#2ed573">✨</text>
  <text x="400" y="510" font-size="28" fill="#2ed573">✨</text>
  <text x="590" y="470" font-size="28" fill="#2ed573">✨</text>

  <!-- Sanitation Dept Verification Badge -->
  <rect x="20" y="20" width="390" height="50" rx="8" fill="#000000" opacity="0.85" />
  <text x="35" y="52" font-family="sans-serif" font-size="20" font-weight="bold" fill="#2ed573">PROOF: WASTE CLEARED & SANITIZED</text>
  <text x="590" y="560" font-family="sans-serif" font-size="16" font-weight="bold" fill="#2ed573">✓ GROUND DISINFECTED</text>
</svg>
`;

// 3. Water Pipe Leakage Preset Graphic (Burst main pipeline gushing water, street flooding puddle)
const waterBurstSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#74b9ff" />
      <stop offset="100%" stop-color="#dfe6e9" />
    </linearGradient>
    <radialGradient id="waterGeyser" cx="50%" cy="80%" r="70%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="40%" stop-color="#00cec9" />
      <stop offset="100%" stop-color="#0984e3" />
    </radialGradient>
    <linearGradient id="puddleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0984e3" stop-opacity="0.7" />
      <stop offset="50%" stop-color="#74b9ff" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#0984e3" stop-opacity="0.7" />
    </linearGradient>
  </defs>
  <!-- Background Curb & Sidewalk -->
  <rect width="800" height="280" fill="url(#skyGrad)" />
  <rect y="280" width="800" height="90" fill="#b2bec3" />
  <line x1="0" y1="370" x2="800" y2="370" stroke="#636e72" stroke-width="8" />
  <!-- Roadway -->
  <rect y="370" width="800" height="230" fill="#2d3436" />

  <!-- Ruptured Sidewalk Opening & Exposed Iron Pipe -->
  <ellipse cx="400" cy="360" rx="110" ry="45" fill="#3d3d3d" stroke="#1e272e" stroke-width="4" />
  <rect x="330" y="350" width="140" height="30" rx="10" fill="#636e72" stroke="#2d3436" stroke-width="4" />
  
  <!-- High Pressure Water Gush Fountain / Plume -->
  <path d="M 370,350 Q 320,180 380,80 Q 400,60 420,80 Q 480,180 430,350 Z" fill="url(#waterGeyser)" opacity="0.85" />
  <ellipse cx="400" cy="90" rx="60" ry="25" fill="#ffffff" opacity="0.9" />
  
  <!-- Water Spray Arcs -->
  <path d="M 400,120 Q 300,150 240,240" stroke="#ffffff" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.8" />
  <path d="M 400,120 Q 500,150 560,240" stroke="#ffffff" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.8" />

  <!-- Expansive Flooded Water Pool on Street -->
  <ellipse cx="400" cy="490" rx="360" ry="90" fill="url(#puddleGrad)" />
  <ellipse cx="400" cy="490" rx="280" ry="60" fill="#ffffff" opacity="0.3" />

  <!-- Stamp Label -->
  <rect x="20" y="20" width="370" height="50" rx="8" fill="#000000" opacity="0.75" />
  <text x="35" y="52" font-family="sans-serif" font-size="20" font-weight="bold" fill="#00cec9">DEFECT: WATER MAIN BURST</text>
</svg>
`;

// 3-RESOLVED. Water Burst Resolved Proof Graphic (Same background, trench cleanly backfilled & dry paved, new valve box installed, road completely dry)
const waterBurstResolvedSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="skyGradRes" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#74b9ff" />
      <stop offset="100%" stop-color="#dfe6e9" />
    </linearGradient>
  </defs>
  <!-- Background Curb & Sidewalk -->
  <rect width="800" height="280" fill="url(#skyGradRes)" />
  <rect y="280" width="800" height="90" fill="#b2bec3" />
  <line x1="0" y1="370" x2="800" y2="370" stroke="#636e72" stroke-width="8" />
  <!-- Completely Dry Roadway -->
  <rect y="370" width="800" height="230" fill="#2d3436" />

  <!-- Backfilled and Sealed Concrete Sidewalk Restoration Slab -->
  <rect x="300" y="310" width="200" height="90" rx="6" fill="#a4b0be" stroke="#747d8c" stroke-width="3" />
  
  <!-- Heavy Duty Cast-Iron Water Valve Access Hatch (Closed) -->
  <ellipse cx="400" cy="355" rx="35" ry="18" fill="#2f3542" stroke="#1e272e" stroke-width="3" />
  <circle cx="400" cy="355" r="8" fill="#57606f" />
  <text x="382" y="358" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ced6e0">WATER</text>

  <!-- Completely Dry Asphalt with Clean White Road Marking -->
  <line x1="100" y1="480" x2="700" y2="480" stroke="#ffffff" stroke-width="8" stroke-dasharray="60,40" opacity="0.8" />

  <!-- Water Board Verification Badge -->
  <rect x="20" y="20" width="390" height="50" rx="8" fill="#000000" opacity="0.85" />
  <text x="35" y="52" font-family="sans-serif" font-size="20" font-weight="bold" fill="#2ed573">PROOF: PIPELINE REPAIRED & DRY</text>
  <text x="590" y="560" font-family="sans-serif" font-size="16" font-weight="bold" fill="#2ed573">✓ NO LEAKAGE DETECTED</text>
</svg>
`;

// 4. Electrical Hazard Preset Graphic (Fallen live electric wire sparking on sidewalk)
const electricalHazardSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="nightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#192a56" />
      <stop offset="100%" stop-color="#273c75" />
    </linearGradient>
    <radialGradient id="sparkGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fbc531" />
      <stop offset="40%" stop-color="#e84118" stop-opacity="0.7" />
      <stop offset="100%" stop-color="#273c75" stop-opacity="0" />
    </radialGradient>
  </defs>
  <!-- Night Sky & Road -->
  <rect width="800" height="420" fill="url(#nightGrad)" />
  <rect y="420" width="800" height="180" fill="#1e272e" />

  <!-- Leaning Damaged Concrete Utility Pole -->
  <polygon points="120,450 160,450 210,50 180,50" fill="#718093" stroke="#2f3640" stroke-width="4" />
  <rect x="150" y="70" width="120" height="16" fill="#353b48" />

  <!-- Broken Snapped Heavy Power Cable dropping to ground -->
  <path d="M 230,80 Q 290,140 330,260 T 480,480" stroke="#000000" stroke-width="8" fill="none" stroke-linecap="round" />
  
  <!-- Intense High-Voltage Electrical Spark Explosion -->
  <circle cx="480" cy="480" r="90" fill="url(#sparkGlow)" />
  <polygon points="480,480 440,430 460,420 420,380 470,440" fill="#fbc531" />
  <polygon points="480,480 520,420 500,410 550,370 510,440" fill="#ffffff" />
  <polygon points="480,480 560,470 550,490 610,480 540,510" fill="#fbc531" />

  <!-- Stamp Label -->
  <rect x="20" y="20" width="370" height="50" rx="8" fill="#000000" opacity="0.75" />
  <text x="35" y="52" font-family="sans-serif" font-size="20" font-weight="bold" fill="#fbc531">DEFECT: LIVE WIRE SPARKING</text>
</svg>
`;

// 4-RESOLVED. Electrical Hazard Resolved Proof Graphic (Pole upright, high-voltage conductors strung tight overhead on crossarms, ground 100% cleared)
const electricalHazardResolvedSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="nightGradRes" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#192a56" />
      <stop offset="100%" stop-color="#273c75" />
    </linearGradient>
  </defs>
  <!-- Clear Sky & Safe Road -->
  <rect width="800" height="420" fill="url(#nightGradRes)" />
  <rect y="420" width="800" height="180" fill="#1e272e" />

  <!-- Vertical Straight Reinforced Concrete Pole -->
  <polygon points="170,450 210,450 210,40 170,40" fill="#718093" stroke="#2f3640" stroke-width="4" />
  <rect x="130" y="60" width="160" height="18" fill="#353b48" />

  <!-- High-Voltage Aerial Conductors Restrung High Overhead (Safe aloft) -->
  <line x1="0" y1="65" x2="800" y2="65" stroke="#111111" stroke-width="6" />
  <line x1="0" y1="85" x2="800" y2="85" stroke="#111111" stroke-width="6" />
  
  <!-- High Voltage Insulators (Ceramic Bell stacks) -->
  <rect x="140" y="70" width="16" height="25" fill="#f5cd79" stroke="#e67e22" stroke-width="2" />
  <rect x="260" y="70" width="16" height="25" fill="#f5cd79" stroke="#e67e22" stroke-width="2" />

  <!-- Ground is completely empty and safe -->
  <circle cx="480" cy="480" r="10" fill="#2ed573" opacity="0.3" />

  <!-- Electricity Board Verification Badge -->
  <rect x="20" y="20" width="400" height="50" rx="8" fill="#000000" opacity="0.85" />
  <text x="35" y="52" font-family="sans-serif" font-size="20" font-weight="bold" fill="#2ed573">PROOF: POWER CABLES RESTORED ALOFT</text>
  <text x="590" y="560" font-family="sans-serif" font-size="16" font-weight="bold" fill="#2ed573">✓ ZERO GROUND VOLTAGE</text>
</svg>
`;

const PRESETS = [
  {
    id: 'pothole',
    title: 'Hazardous Road Pothole',
    badge: 'Road Infrastructure',
    icon: 'cone',
    location: 'Sector 14 Arterial Highway, Near Metro Pillar 108',
    description: 'Deep crater-like pothole in the active vehicular lane. Motorcyclists are swerving dangerously into oncoming traffic to avoid it. Edge is sharply fractured and water has accumulated inside.',
    expectedDepartment: 'road_admin',
    expectedCriticality: 'HIGH',
    imageDataUrl: svgToDataUrl(potholeSvg),
    resolvedProofDataUrl: svgToDataUrl(potholeResolvedSvg),
    sampleProofTitle: 'Bitumen Asphalt Cold-Mix Patch Proof'
  },
  {
    id: 'garbage',
    title: 'Overflowing Municipal Garbage Pile',
    badge: 'Sanitation & Health',
    icon: 'trash-2',
    location: 'Central Market Road, Behind Vegetable Wholesale Shed',
    description: 'Massive unattended mountain of rotting solid waste overflowing the community bins for 4 days. Severe stench, swarms of flies, and plastic debris spilling across both pedestrian sidewalk and driving lane.',
    expectedDepartment: 'municipal_corp',
    expectedCriticality: 'HIGH',
    imageDataUrl: svgToDataUrl(garbageSvg),
    resolvedProofDataUrl: svgToDataUrl(garbageResolvedSvg),
    sampleProofTitle: 'Compactor Waste Cleared & Sanitized Proof'
  },
  {
    id: 'water_leak',
    title: 'High-Pressure Water Main Burst',
    badge: 'Public Utilities',
    icon: 'droplets',
    location: 'Corner of 5th Main Avenue & Garden Street, Opposite Public Hospital',
    description: 'High-pressure 12-inch drinking water municipal supply pipeline ruptured under sidewalk. Clean drinking water gushing up to 3 meters into the air and flooding road for over 200 meters.',
    expectedDepartment: 'water_board',
    expectedCriticality: 'CRITICAL',
    imageDataUrl: svgToDataUrl(waterBurstSvg),
    resolvedProofDataUrl: svgToDataUrl(waterBurstResolvedSvg),
    sampleProofTitle: 'Pipeline Repaired & Trench Dry Proof'
  },
  {
    id: 'electric_wire',
    title: 'Live Hanging Electric Cable',
    badge: 'Emergency Hazard',
    icon: 'zap',
    location: 'Oakwood Avenue, Near Primary School Crossing',
    description: 'Heavy storm snapped overhead high-voltage cable from bent concrete utility pole. Live wire is hanging loose down to the pavement and sparking intermittently. Immediate electrocution risk to pedestrians!',
    expectedDepartment: 'power_board',
    expectedCriticality: 'CRITICAL',
    imageDataUrl: svgToDataUrl(electricalHazardSvg),
    resolvedProofDataUrl: svgToDataUrl(electricalHazardResolvedSvg),
    sampleProofTitle: 'Conductor Restrung Overhead Proof'
  }
];

module.exports = {
  PRESETS,
  svgToDataUrl
};
