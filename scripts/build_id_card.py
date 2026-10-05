#!/usr/bin/env python3
"""Builds assets/src/id-card.svg (canonical cyan; scripts/apply-theme.mjs recolours it per theme): an ID card hanging from a lanyard (neck strap),
swinging like a pendulum, floating, glowing, colour-cycling through the palette.
Swap assets/id-card-source.jpg (2:3 ratio) and run:  python3 scripts/build_id_card.py
"""
import base64, math, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
b64 = base64.b64encode((ROOT / "assets/id-card-source.jpg").read_bytes()).decode()

CYCLE = "#00D9FF;#0099FF;#7C5CFF;#FF3CAC;#00F5A0;#00D9FF"   # cyan > blue > violet > magenta > green
DUR = "14s"
SWING = "6.4s"                                               # pendulum period
EASE = 'calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"'

def cyc(attr, begin="0s"):
    return f'<animate attributeName="{attr}" values="{CYCLE}" dur="{DUR}" begin="{begin}" repeatCount="indefinite"/>'

CW, CH = 700, 1100                     # canvas
X, Y, W, H, R = 90, 262, 520, 780, 28  # card box
CX = X + W / 2                         # 350
PIV = (CX, -30)                        # lanyard pivot (above the canvas)
RING = (CX, Y - 10)                    # where the ring hangs from the clip
S = W / 1024
ring_cx, ring_cy, ring_r = X + 245 * S, Y + 243 * S, 165 * S + 7
dot_x, dot_y = X + 203 * S, Y + 1408 * S

def band(xt, xb, yt=-60, yb=238, hw=24):
    dx, dy = xb - xt, yb - yt
    L = math.hypot(dx, dy); nx, ny = -dy / L * hw, dx / L * hw
    return (f"{xt + nx:.1f},{yt + ny:.1f} {xt - nx:.1f},{yt - ny:.1f} "
            f"{xb - nx:.1f},{yb - ny:.1f} {xb + nx:.1f},{yb + ny:.1f}")

LX_T, RX_T, XB = CX - 150, CX + 150, 0
band_l = band(LX_T, CX - 16)
band_r = band(RX_T, CX + 16)
TEXT = "DP1110 \u2022 AI \u2022 SECURITY \u2022 EMBEDDED \u2022 AUTOMATION \u2022 " * 3

particles = ""
for i, (x, d, r) in enumerate([(70,9,2),(160,12,1.5),(270,8,2.5),(380,11,1.5),(470,10,2),(560,13,1.5),(640,9,2.5),(120,14,1.5),(520,7,2)]):
    particles += (f'<circle cx="{x}" cy="1060" r="{r}" fill="#3DEBFF">'
                  f'<animate attributeName="cy" values="1060;260" dur="{d}s" begin="-{i*1.3:.1f}s" repeatCount="indefinite"/>'
                  f'<animate attributeName="opacity" values="0;0.8;0" dur="{d}s" begin="-{i*1.3:.1f}s" repeatCount="indefinite"/></circle>')

ORBIT = f"M{X-14},{Y-14} H{X+W+14} V{Y+H+14} H{X-14} Z"

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{CW}" height="{CH}" viewBox="0 0 {CW} {CH}" role="img" aria-label="Identity card of Dipak Mane (DP1110), AI agent and automation developer, hanging from a lanyard. Open to freelance projects.">
  <defs>
    <clipPath id="card"><rect x="{X}" y="{Y}" width="{W}" height="{H}" rx="{R}"/></clipPath>
    <clipPath id="photo"><circle cx="{ring_cx:.1f}" cy="{ring_cy:.1f}" r="{154*S:.1f}"/></clipPath>
    <filter id="hue" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="hueRotate" values="__HUE__"/></filter>
    <image id="cardimg" x="{X}" y="{Y}" width="{W}" height="{H}" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/jpeg;base64,{b64}" href="data:image/jpeg;base64,{b64}"/>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
    <linearGradient id="sweep" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#00D9FF" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#00D9FF" stop-opacity="0.28">{cyc("stop-color")}</stop>
      <stop offset="1" stop-color="#00D9FF" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="shadow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#00D9FF" stop-opacity="0.45">{cyc("stop-color")}</stop>
      <stop offset="1" stop-color="#00D9FF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#E8F1F5"/><stop offset="0.5" stop-color="#9AA7AF"/><stop offset="1" stop-color="#61717C"/>
    </linearGradient>
    <linearGradient id="strapShade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0.35"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.10"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/>
    </linearGradient>
    <path id="spL" d="M{LX_T},-60 L{CX-16},238"/>
    <path id="spR" d="M{RX_T},-60 L{CX+16},238"/>
  </defs>

  <!-- ambient colour-cycling aura -->
  <ellipse cx="{CX}" cy="650" rx="330" ry="470" fill="#00D9FF" opacity="0.10" filter="url(#blur)">{cyc("fill")}</ellipse>

  {particles}

  <!-- ground shadow: drifts with the swing, breathes with the bob -->
  <ellipse cx="{CX}" cy="1078" rx="190" ry="13" fill="url(#shadow)">
    <animate attributeName="cx" values="{CX-16};{CX+16};{CX-16}" dur="{SWING}" repeatCount="indefinite" {EASE}/>
    <animate attributeName="rx" values="190;160;190" dur="5s" repeatCount="indefinite" {EASE}/>
  </ellipse>

  <!-- PENDULUM: lanyard + card sway together around the top pivot -->
  <g>
    <animateTransform attributeName="transform" type="rotate" values="-1.4 {PIV[0]} {PIV[1]};1.4 {PIV[0]} {PIV[1]};-1.4 {PIV[0]} {PIV[1]}" dur="{SWING}" repeatCount="indefinite" {EASE}/>

    <!-- lanyard (neck strap): two bands meeting at the clip -->
    <g>
      <polygon points="{band_l}" fill="#00D9FF">{cyc("fill")}</polygon>
      <polygon points="{band_r}" fill="#00D9FF">{cyc("fill")}</polygon>
      <polygon points="{band_l}" fill="url(#strapShade)"/>
      <polygon points="{band_r}" fill="url(#strapShade)"/>
      <path d="M{LX_T-17},-60 L{CX-33},238 M{LX_T+17},-60 L{CX+1},238 M{RX_T-17},-60 L{CX-1},238 M{RX_T+17},-60 L{CX+33},238" stroke="#05080A" stroke-opacity="0.35" stroke-width="1.2" stroke-dasharray="5 6" fill="none"/>
      <g {'font-family="' + "'JetBrains Mono','Fira Code',Consolas,monospace" + '"'} font-size="14" font-weight="800" letter-spacing="3" fill="#05080A" fill-opacity="0.85">
        <text dy="5"><textPath xlink:href="#spL" href="#spL" startOffset="0">{TEXT}<animate attributeName="startOffset" values="-330;0" dur="12s" repeatCount="indefinite"/></textPath></text>
        <text dy="5"><textPath xlink:href="#spR" href="#spR" startOffset="0">{TEXT}<animate attributeName="startOffset" values="-330;0" dur="12s" repeatCount="indefinite"/></textPath></text>
      </g>
    </g>

    <!-- metal clasp -->
    <rect x="{CX-38}" y="206" width="76" height="40" rx="10" fill="url(#metal)" stroke="#33414B" stroke-width="2"/>
    <rect x="{CX-24}" y="219" width="48" height="12" rx="6" fill="#05080A" stroke="#33414B"/>
    <rect x="{CX-30}" y="210" width="60" height="3" rx="1.5" fill="#fff" opacity="0.5"/>

    <!-- CARD: swings a little behind the strap (phase lag) and bobs -->
    <g>
      <animateTransform attributeName="transform" type="rotate" additive="sum" values="-1.2 {RING[0]} {RING[1]};1.2 {RING[0]} {RING[1]};-1.2 {RING[0]} {RING[1]}" dur="{SWING}" begin="-1.1s" repeatCount="indefinite" {EASE}/>
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 -8;0 0" dur="5s" repeatCount="indefinite" {EASE}/>

        <rect x="{X}" y="{Y}" width="{W}" height="{H}" rx="{R}" fill="none" stroke="#00D9FF" stroke-width="10" opacity="0.75" filter="url(#blur)">{cyc("stroke")}</rect>

        <g clip-path="url(#card)">
          <use xlink:href="#cardimg" href="#cardimg" filter="url(#hue)"/>
          <use xlink:href="#cardimg" href="#cardimg" clip-path="url(#photo)"/>
        </g>

        <g clip-path="url(#card)">
          <rect x="{X}" y="{Y-120}" width="{W}" height="120" fill="url(#sweep)">
            <animate attributeName="y" values="{Y-120};{Y+H}" dur="5.5s" repeatCount="indefinite"/>
          </rect>
        </g>

        <circle cx="{ring_cx:.1f}" cy="{ring_cy:.1f}" r="{ring_r:.1f}" fill="none" stroke="#00D9FF" stroke-width="2" stroke-dasharray="3 12" stroke-linecap="round">
          {cyc("stroke")}
          <animateTransform attributeName="transform" type="rotate" values="0 {ring_cx:.1f} {ring_cy:.1f};360 {ring_cx:.1f} {ring_cy:.1f}" dur="14s" repeatCount="indefinite"/>
        </circle>
        <circle cx="{ring_cx:.1f}" cy="{ring_cy:.1f}" r="{ring_r+9:.1f}" fill="none" stroke="#7C5CFF" stroke-width="1.5" stroke-dasharray="40 90" stroke-linecap="round" opacity="0.9">
          <animateTransform attributeName="transform" type="rotate" values="360 {ring_cx:.1f} {ring_cy:.1f};0 {ring_cx:.1f} {ring_cy:.1f}" dur="9s" repeatCount="indefinite"/>
        </circle>

        <circle cx="{dot_x:.1f}" cy="{dot_y:.1f}" r="5" fill="none" stroke="#00F5A0" stroke-width="2">
          <animate attributeName="r" values="5;17" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.9;0" dur="2s" repeatCount="indefinite"/>
        </circle>

        <rect x="{X}" y="{Y}" width="{W}" height="{H}" rx="{R}" fill="none" stroke="#00D9FF" stroke-width="2">{cyc("stroke")}</rect>
        <g fill="none" stroke="#3DEBFF" stroke-width="4" stroke-linecap="round">
          <path d="M{X-10},{Y+34} V{Y-10} H{X+34}"/><path d="M{X+W+10},{Y+34} V{Y-10} H{X+W-34}"/>
          <path d="M{X-10},{Y+H-34} V{Y+H+10} H{X+34}"/><path d="M{X+W+10},{Y+H-34} V{Y+H+10} H{X+W-34}"/>
          <animate attributeName="opacity" values="1;0.35;1" dur="3s" repeatCount="indefinite"/>
        </g>

        <g>
          <circle r="9" fill="#00D9FF" opacity="0.35" filter="url(#soft)">{cyc("fill")}<animateMotion dur="10s" repeatCount="indefinite" path="{ORBIT}"/></circle>
          <circle r="3.5" fill="#FFFFFF"><animateMotion dur="10s" repeatCount="indefinite" path="{ORBIT}"/></circle>
          <circle r="9" fill="#A855F7" opacity="0.35" filter="url(#soft)"><animateMotion dur="10s" begin="-5s" repeatCount="indefinite" path="{ORBIT}"/></circle>
          <circle r="3.5" fill="#FFFFFF"><animateMotion dur="10s" begin="-5s" repeatCount="indefinite" path="{ORBIT}"/></circle>
        </g>

        <!-- card slot + ring that hooks onto the clasp -->
        <rect x="{CX-28}" y="{Y+10}" width="56" height="12" rx="6" fill="#05080A" stroke="#33414B" stroke-width="2"/>
        <ellipse cx="{CX}" cy="{Y+4}" rx="10" ry="19" fill="none" stroke="url(#metal)" stroke-width="5"/>
      </g>
    </g>
  </g>
</svg>
'''
out = ROOT / "assets/src/id-card.svg"
out.write_text(svg, encoding="utf-8")
print(f"wrote {out} ({out.stat().st_size // 1024} KB)")
