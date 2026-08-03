# MOBILE PLAY

スマホ専用ミニゲーム集（縦画面・タッチ操作）。

## ゲーム

| ゲーム | 操作 |
|--------|------|
| [TAP STORM](games/tap-storm/) | 膨張する玉をタップ |
| [DODGE DROP](games/dodge-drop/) | 左右タップで落下回避 |
| [COLOR SNAP](games/color-snap/) | 色が揃ったらタップ |
| [FLICK OUT](games/flick-out/) | 弾をフリックで払う |
| [STACK PULSE](games/stack-pulse/) | タイミングで積み上げ |

## ローカル

```bash
cd tap-storm
py -m http.server 5173 --bind 0.0.0.0
```

- PC: http://127.0.0.1:5173/
- スマホ（同じWi‑Fi）: http://（PCのIP）:5173/

## GitHub Pages

https://yumagame.github.io/tap-storm/
