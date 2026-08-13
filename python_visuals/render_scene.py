#!/usr/bin/env python3
"""Render a deterministic, self-contained SVG scene for one code-story step.

The renderer intentionally uses only the Python standard library. It reads a
small JSON payload on stdin and writes a JSON response to stdout, making it
safe to call as a short-lived child process from the Node server.
"""

import json
import sys
import textwrap
from html import escape


WIDTH = 1280
HEIGHT = 720

SCENE_DETAILS = {
    "workbench": ("#6EE7E0", "#3576FF", "Work station"),
    "storage-shelf": ("#F6C36A", "#EF7E52", "Storage shelf"),
    "sorting-tray": ("#A78BFA", "#5B77F7", "Sorting tray"),
    "linked-chain": ("#63E6BE", "#35A7E8", "Connected chain"),
    "family-tree": ("#A3E635", "#22C55E", "Family tree"),
    "conveyor-loop": ("#FDBA74", "#F97316", "Conveyor belt"),
    "recursion-stairs": ("#E9A8FF", "#A855F7", "Step staircase"),
    "city-map": ("#67E8F9", "#2D7DFF", "City route"),
    "decision-gate": ("#FDE68A", "#F59E0B", "Decision gate"),
    "workshop": ("#A5B4FC", "#6366F1", "Workshop"),
    "delivery-desk": ("#F9A8D4", "#EC4899", "Delivery desk"),
}


def clipped(value, limit):
    return str(value or "").strip()[:limit]


def svg_text(text, x, y, size, color, weight="400", max_chars=52):
    lines = textwrap.wrap(clipped(text, 340), width=max_chars) or [""]
    return "".join(
        f'<text x="{x}" y="{y + index * (size + 8)}" fill="{color}" '
        f'font-family="Inter, ui-sans-serif, system-ui" font-size="{size}" '
        f'font-weight="{weight}">{escape(line)}</text>'
        for index, line in enumerate(lines[:3])
    )


def stage_svg(accent, accent_two):
    """A shared isometric floor and light rig that gives every scene depth."""
    return f'''
      <g opacity=".94">
        <ellipse cx="640" cy="510" rx="398" ry="96" fill="#020712" opacity=".72" filter="url(#softShadow)"/>
        <path d="M190 454L640 346 1090 454 640 591z" fill="#102843" stroke="{accent}" stroke-opacity=".34" stroke-width="3"/>
        <path d="M190 454L640 591V632L190 495z" fill="#08182B" stroke="#294663" stroke-width="2"/>
        <path d="M1090 454L640 591V632L1090 495z" fill="#0A2038" stroke="#294663" stroke-width="2"/>
        <path d="M310 469L640 390 970 469M420 496L640 443 860 496M640 371V587M450 405L750 565M830 405L530 565" stroke="#8BDCF4" stroke-opacity=".10" stroke-width="2" fill="none"/>
        <path d="M190 454L640 346 1090 454" fill="none" stroke="{accent_two}" stroke-opacity=".42" stroke-width="5"/>
        <ellipse cx="640" cy="416" rx="260" ry="74" fill="{accent}" fill-opacity=".10" filter="url(#glow)"/>
      </g>'''


def icon_svg(kind, accent, accent_two):
    glow = f'filter="url(#glow)" fill="{accent}"'
    stroke = f'stroke="{accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"'
    stage = stage_svg(accent, accent_two)

    if kind == "storage-shelf":
        return stage + f'''
          <g transform="translate(260 305)">
            <rect x="0" y="0" width="520" height="230" rx="20" fill="#0F1E36" stroke="#355070" stroke-width="3"/>
            <path d="M22 78H498M22 154H498" stroke="#355070" stroke-width="8"/>
            <rect x="56" y="28" width="105" height="46" rx="10" {glow}/><rect x="230" y="25" width="158" height="48" rx="10" fill="{accent_two}" opacity=".9"/>
            <rect x="95" y="101" width="150" height="48" rx="10" fill="{accent_two}" opacity=".85"/><rect x="335" y="102" width="92" height="46" rx="10" {glow}/>
            <rect x="55" y="177" width="110" height="38" rx="9" fill="{accent_two}"/><rect x="285" y="177" width="170" height="38" rx="9" {glow}/>
          </g>'''
    if kind == "linked-chain":
        return stage + f'''
          <g transform="translate(250 345)">
            <path d="M100 55H550" {stroke} opacity=".55"/>
            <path d="M160 55H250M340 55H430" stroke="{accent_two}" stroke-width="10" stroke-linecap="round"/>
            <circle cx="80" cy="55" r="58" fill="#13233D" stroke="{accent}" stroke-width="5"/><circle cx="295" cy="55" r="58" fill="#13233D" stroke="{accent_two}" stroke-width="5"/><circle cx="510" cy="55" r="58" fill="#13233D" stroke="{accent}" stroke-width="5"/>
            <circle cx="80" cy="55" r="13" {glow}/><circle cx="295" cy="55" r="13" fill="{accent_two}"/><circle cx="510" cy="55" r="13" {glow}/>
          </g>'''
    if kind == "family-tree":
        return stage + f'''
          <g transform="translate(280 275)">
            <path d="M300 58V125M300 125L105 225M300 125L495 225" {stroke}/>
            <path d="M105 225V285M495 225V285" {stroke} opacity=".7"/>
            <circle cx="300" cy="42" r="48" fill="#11293A" stroke="{accent}" stroke-width="5"/>
            <circle cx="105" cy="225" r="45" fill="#11293A" stroke="{accent_two}" stroke-width="5"/><circle cx="495" cy="225" r="45" fill="#11293A" stroke="{accent_two}" stroke-width="5"/>
            <circle cx="105" cy="310" r="35" {glow}/><circle cx="495" cy="310" r="35" fill="{accent_two}"/>
          </g>'''
    if kind == "conveyor-loop":
        return stage + f'''
          <g transform="translate(230 330)">
            <rect x="0" y="45" width="620" height="112" rx="56" fill="#10233A" stroke="#355070" stroke-width="4"/>
            <path d="M45 101H575" stroke="#46617D" stroke-width="18" stroke-dasharray="20 18" stroke-linecap="round"/>
            <rect x="92" y="54" width="84" height="88" rx="14" fill="{accent}" filter="url(#glow)"/><rect x="280" y="54" width="84" height="88" rx="14" fill="{accent_two}"/><rect x="468" y="54" width="84" height="88" rx="14" fill="{accent}" filter="url(#glow)"/>
            <path d="M620 100l-35-26v52z" fill="{accent}"/>
          </g>'''
    if kind == "recursion-stairs":
        return stage + f'''
          <g transform="translate(310 280)">
            <path d="M0 330h150V250h150V170h150V90h150V10h150" stroke="{accent}" stroke-width="52" stroke-linejoin="round" fill="none" filter="url(#glow)"/>
            <path d="M0 330h150V250h150V170h150V90h150V10h150" stroke="{accent_two}" stroke-width="22" stroke-linejoin="round" fill="none"/>
            <circle cx="75" cy="300" r="17" fill="#FFF"/><circle cx="375" cy="140" r="17" fill="#FFF"/><circle cx="675" cy="-15" r="17" fill="#FFF"/>
          </g>'''
    if kind == "city-map":
        return stage + f'''
          <g transform="translate(250 270)">
            <path d="M80 80L330 38 565 120 460 300 210 285zM80 80l130 205M330 38l130 262M565 120L210 285" {stroke} opacity=".8"/>
            <path d="M80 80L330 38 565 120" stroke="{accent_two}" stroke-width="12" stroke-linecap="round" fill="none" filter="url(#glow)"/>
            <g fill="#122540" stroke="{accent}" stroke-width="5"><circle cx="80" cy="80" r="34"/><circle cx="330" cy="38" r="34"/><circle cx="565" cy="120" r="34"/><circle cx="460" cy="300" r="34"/><circle cx="210" cy="285" r="34"/></g>
            <circle cx="80" cy="80" r="12" fill="{accent}"/><circle cx="565" cy="120" r="12" fill="{accent_two}"/>
          </g>'''
    if kind == "decision-gate":
        return stage + f'''
          <g transform="translate(430 255)">
            <path d="M210 0L420 150 210 300 0 150z" fill="#162B46" stroke="{accent}" stroke-width="6" filter="url(#glow)"/>
            <path d="M210 88v90M210 218h1" stroke="{accent_two}" stroke-width="24" stroke-linecap="round"/>
            <path d="M-150 150H-22M442 150H590" {stroke}/><path d="M-150 150l35-25v50zM590 150l-35-25v50z" fill="{accent}"/>
          </g>'''
    if kind == "sorting-tray":
        return stage + f'''
          <g transform="translate(245 320)">
            <rect x="0" y="0" width="670" height="190" rx="44" fill="#10243C" stroke="#355070" stroke-width="4"/>
            <circle cx="155" cy="95" r="60" fill="{accent}" opacity=".95" filter="url(#glow)"/><circle cx="335" cy="95" r="60" fill="{accent_two}" opacity=".9"/><circle cx="515" cy="95" r="60" fill="{accent}" opacity=".8"/>
            <path d="M155 35v120M335 35v120M515 35v120" stroke="#FFF" stroke-opacity=".35" stroke-width="5"/>
          </g>'''
    if kind == "workshop":
        return stage + f'''
          <g transform="translate(280 290)">
            <rect x="0" y="85" width="600" height="145" rx="22" fill="#10243C" stroke="#355070" stroke-width="4"/>
            <rect x="62" y="20" width="140" height="120" rx="18" fill="#1B3656" stroke="{accent}" stroke-width="4"/><path d="M97 76h70M97 101h45" {stroke}/>
            <circle cx="408" cy="92" r="64" fill="#152B48" stroke="{accent_two}" stroke-width="5"/><path d="M408 55v74M371 92h74" stroke="{accent}" stroke-width="8" stroke-linecap="round"/>
            <rect x="85" y="230" width="30" height="100" fill="#355070"/><rect x="485" y="230" width="30" height="100" fill="#355070"/>
          </g>'''
    if kind == "delivery-desk":
        return stage + f'''
          <g transform="translate(275 300)">
            <rect x="0" y="120" width="620" height="110" rx="18" fill="#10243C" stroke="#355070" stroke-width="4"/>
            <rect x="95" y="26" width="160" height="118" rx="16" fill="{accent}" filter="url(#glow)"/><rect x="352" y="47" width="165" height="98" rx="16" fill="{accent_two}"/>
            <path d="M175 26v118M434 47v98" stroke="#FFF" stroke-opacity=".35" stroke-width="5"/><path d="M268 85h70" {stroke}/><path d="M338 85l-20-15v30z" fill="{accent}"/>
          </g>'''
    return stage + f'''
      <g transform="translate(290 290)">
        <rect x="0" y="105" width="600" height="150" rx="26" fill="#10243C" stroke="#355070" stroke-width="4"/>
        <rect x="55" y="35" width="190" height="155" rx="24" fill="#163553" stroke="{accent}" stroke-width="5"/>
        <rect x="350" y="72" width="150" height="118" rx="20" fill="{accent_two}" opacity=".95" filter="url(#glow)"/>
        <path d="M285 117h45" {stroke}/><path d="M330 117l-18-14v28z" fill="{accent}"/>
        <circle cx="150" cy="112" r="26" fill="{accent}"/><circle cx="425" cy="130" r="26" fill="#FFF" opacity=".75"/>
      </g>'''


def render(payload):
    kind = clipped(payload.get("kind"), 40)
    accent, accent_two, scene_name = SCENE_DETAILS.get(kind, SCENE_DETAILS["workbench"])
    title = clipped(payload.get("title"), 90) or "Your code takes one clear step"
    focus = clipped(payload.get("visualFocus"), 180) or scene_name
    plain_english = clipped(payload.get("plainEnglish"), 260)
    code_line = clipped(payload.get("codeLine"), 220)
    line_number = max(1, int(payload.get("lineNumber") or 1))
    icon = icon_svg(kind, accent, accent_two)

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="{escape(title)}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07111F"/><stop offset=".55" stop-color="#0C1C31"/><stop offset="1" stop-color="#08111D"/></linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#173551" stop-opacity=".78"/><stop offset="1" stop-color="#081526" stop-opacity=".93"/></linearGradient>
        <radialGradient id="halo"><stop stop-color="{accent}" stop-opacity=".24"/><stop offset="1" stop-color="{accent}" stop-opacity="0"/></radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="softShadow" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="17"/></filter>
        <filter id="depthShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="18" stdDeviation="12" flood-color="#00040A" flood-opacity=".56"/></filter>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)"/>
      <path d="M0 0H1280L1060 325H220z" fill="{accent}" fill-opacity=".045"/>
      <circle cx="210" cy="120" r="290" fill="url(#halo)"/><circle cx="1110" cy="650" r="300" fill="url(#halo)" opacity=".65"/>
      <rect x="42" y="42" width="1196" height="636" rx="34" fill="url(#glass)" stroke="#294663" stroke-width="2"/>
      <path d="M77 132H1203" stroke="#8BC9E8" stroke-opacity=".12"/><path d="M77 560H1203" stroke="#8BC9E8" stroke-opacity=".09"/>
      <rect x="78" y="78" width="178" height="38" rx="19" fill="{accent}" fill-opacity=".14" stroke="{accent}" stroke-opacity=".6"/>
      <text x="99" y="103" fill="{accent}" font-family="Inter, ui-sans-serif, system-ui" font-size="15" font-weight="700" letter-spacing="1.8">CINEMATIC SCENE</text>
      <text x="1135" y="103" fill="#89A4C4" font-family="ui-monospace, SFMono-Regular, monospace" font-size="16">LINE {line_number:02d}</text>
      {svg_text(title, 80, 165, 42, "#F3F8FF", "700", 39)}
      {svg_text(focus, 82, 255, 21, "#AFC5DD", "500", 72)}
      <g filter="url(#depthShadow)">{icon}</g>
      <rect x="80" y="572" width="1120" height="1" fill="#294663"/>
      <rect x="80" y="604" width="1120" height="44" rx="12" fill="#0E2339" stroke="#294663"/>
      <text x="105" y="632" fill="{accent}" font-family="ui-monospace, SFMono-Regular, monospace" font-size="16">{escape(code_line or "Code step")}</text>
      {svg_text(plain_english, 80, 555, 18, "#D9E8F7", "400", 105)}
    </svg>'''
    return {"svg": svg, "caption": f"{scene_name}: {focus}", "renderer": "python-svg"}


def main():
    try:
        raw = sys.stdin.read(6000)
        payload = json.loads(raw)
        if not isinstance(payload, dict):
            raise ValueError("Expected a JSON object")
        print(json.dumps(render(payload), separators=(",", ":")))
    except Exception as error:
        print(json.dumps({"error": str(error)[:180]}))
        sys.exit(1)


if __name__ == "__main__":
    main()
