#!/usr/bin/env python3
"""Builds assets/id-card.svg: a floating, colour-cycling, animated identity card.
Swap assets/id-card-source.jpg (2:3 ratio) and run:  python3 scripts/build_id_card.py
"""
import base64, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
b64 = base64.b64encode((ROOT / "assets/id-card-source.jpg").read_bytes()).decode()

# Palette colour cycle (cyan > blue > violet > magenta > green > cyan)
CYCLE = "#00D9FF;#0099FF;#7C5CFF;#FF3CAC;#00F5A0;#00D9FF"
DUR = "14s"

def cyc(attr, begin="0s"):
    return f'<animate attributeName="{attr}" values="{CYCLE}" dur="{DUR}" begin="{begin}" repeatCount="indefinite"/>'

X, Y, W, H, R = 60, 50, 520, 780, 28          # card box inside 640x960 canvas
S = W / 1024                                    # source px -> svg px
ring_cx, ring_cy, ring_r = X + 245 * S, Y + 243 * S, 165 * S + 7
dot_x, dot_y = X + 203 * S, Y + 1408 * S        # "open to freelance" status dot

particles = ""
for i, (x, d, r) in enumerate([(70,9,2),(150,12,1.5),(250,8,2.5),(340,11,1.5),(430,10,2),(520,13,1.5),(590,9,2.5),(110,14,1.5),(480,7,2)]):
    particles += (f'<circle cx="{x}" cy="900" r="{r}" fill="#3DEBFF">'
                  f'<animate attributeName="cy" values="900;40" dur="{d}s" begin="-{i*1.3:.1f}s" repeatCount="indefinite"/>'
                  f'<animate attributeName="opacity" values="0;0.8;0" dur="{d}s" begin="-{i*1.3:.1f}s" repeatCount="indefinite"/></circle>')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="640" height="960" viewBox="0 0 640 960" role="img" aria-label="Identity card: Dipak Mane, DP1110, AI agent and automation developer. Open to freelance projects.">
  <defs>
    <clipPath id="card"><rect x="{X}" y="{Y}" width="{W}" height="{H}" rx="{R}"/></clipPath>
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
  </defs>

  <!-- ambient colour-cycling aura -->
  <ellipse cx="320" cy="440" rx="300" ry="440" fill="#00D9FF" opacity="0.10" filter="url(#blur)">{cyc("fill")}</ellipse>

  <!-- rising particles -->
  {particles}

  <!-- ground shadow breathes with the float -->
  <ellipse cx="320" cy="905" rx="190" ry="14" fill="url(#shadow)">
    <animate attributeName="rx" values="190;150;190" dur="6s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
    <animate attributeName="opacity" values="1;0.55;1" dur="6s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
  </ellipse>

  <!-- floating card group -->
  <g>
    <animateTransform attributeName="transform" type="translate" values="0 0;0 -16;0 0" dur="6s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
    <animateTransform attributeName="transform" type="rotate" additive="sum" values="-0.9 320 440;0.9 320 440;-0.9 320 440" dur="9s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>

    <!-- glow halo -->
    <rect x="{X}" y="{Y}" width="{W}" height="{H}" rx="{R}" fill="none" stroke="#00D9FF" stroke-width="10" opacity="0.75" filter="url(#blur)">{cyc("stroke")}</rect>

    <!-- the card -->
    <image x="{X}" y="{Y}" width="{W}" height="{H}" preserveAspectRatio="xMidYMid slice" clip-path="url(#card)" xlink:href="data:image/jpeg;base64,{b64}" href="data:image/jpeg;base64,{b64}"/>

    <!-- scan sweep -->
    <g clip-path="url(#card)">
      <rect x="{X}" y="{Y-120}" width="{W}" height="120" fill="url(#sweep)">
        <animate attributeName="y" values="{Y-120};{Y+H}" dur="5.5s" repeatCount="indefinite"/>
      </rect>
    </g>

    <!-- spinning dashed ring around the photo -->
    <circle cx="{ring_cx:.1f}" cy="{ring_cy:.1f}" r="{ring_r:.1f}" fill="none" stroke="#00D9FF" stroke-width="2" stroke-dasharray="3 12" stroke-linecap="round">
      {cyc("stroke")}
      <animateTransform attributeName="transform" type="rotate" values="0 {ring_cx:.1f} {ring_cy:.1f};360 {ring_cx:.1f} {ring_cy:.1f}" dur="14s" repeatCount="indefinite"/>
    </circle>
    <circle cx="{ring_cx:.1f}" cy="{ring_cy:.1f}" r="{ring_r+9:.1f}" fill="none" stroke="#7C5CFF" stroke-width="1.5" stroke-dasharray="40 90" stroke-linecap="round" opacity="0.9">
      <animateTransform attributeName="transform" type="rotate" values="360 {ring_cx:.1f} {ring_cy:.1f};0 {ring_cx:.1f} {ring_cy:.1f}" dur="9s" repeatCount="indefinite"/>
    </circle>

    <!-- "open to freelance" status pulse -->
    <circle cx="{dot_x:.1f}" cy="{dot_y:.1f}" r="5" fill="none" stroke="#00F5A0" stroke-width="2">
      <animate attributeName="r" values="5;17" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.9;0" dur="2s" repeatCount="indefinite"/>
    </circle>

    <!-- border + corner brackets -->
    <rect x="{X}" y="{Y}" width="{W}" height="{H}" rx="{R}" fill="none" stroke="#00D9FF" stroke-width="2">{cyc("stroke")}</rect>
    <g fill="none" stroke="#3DEBFF" stroke-width="4" stroke-linecap="round">
      <path d="M{X-10},{Y+34} V{Y-10} H{X+34}"/>
      <path d="M{X+W+10},{Y+34} V{Y-10} H{X+W-34}"/>
      <path d="M{X-10},{Y+H-34} V{Y+H+10} H{X+34}"/>
      <path d="M{X+W+10},{Y+H-34} V{Y+H+10} H{X+W-34}"/>
      <animate attributeName="opacity" values="1;0.35;1" dur="3s" repeatCount="indefinite"/>
    </g>

    <!-- orbiting sparks around the frame -->
    <g>
      <circle r="9" fill="#00D9FF" opacity="0.35" filter="url(#soft)">{cyc("fill")}
        <animateMotion dur="10s" repeatCount="indefinite" path="M{X-14},{Y-14} H{X+W+14} V{Y+H+14} H{X-14} Z"/>
      </circle>
      <circle r="3.5" fill="#FFFFFF">
        <animateMotion dur="10s" repeatCount="indefinite" path="M{X-14},{Y-14} H{X+W+14} V{Y+H+14} H{X-14} Z"/>
      </circle>
      <circle r="9" fill="#A855F7" opacity="0.35" filter="url(#soft)">
        <animateMotion dur="10s" begin="-5s" repeatCount="indefinite" path="M{X-14},{Y-14} H{X+W+14} V{Y+H+14} H{X-14} Z"/>
      </circle>
      <circle r="3.5" fill="#FFFFFF">
        <animateMotion dur="10s" begin="-5s" repeatCount="indefinite" path="M{X-14},{Y-14} H{X+W+14} V{Y+H+14} H{X-14} Z"/>
      </circle>
    </g>
  </g>
</svg>
'''
out = ROOT / "assets/id-card.svg"
out.write_text(svg, encoding="utf-8")
print(f"wrote {out} ({out.stat().st_size // 1024} KB)")
