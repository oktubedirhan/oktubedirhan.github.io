---
title: Köprü
---

Köprü ("bridge" in Turkish) is a launcher I wrote for my own use that runs Windows games on Apple Silicon Macs. I wanted a tool that actually works, and I wanted to learn step by step how tools like this (Wine, D3DMetal, CrossOver, GameToMac) work.

It's a Mac app; it doesn't run in the browser. The source code is open, but I don't ship a ready-made package: everyone downloads D3DMetal from Apple themselves, and the games are each person's own Steam copies.

## Games that run

- **The Witcher 3** (Steam, DirectX 12, D3DMetal 4)
- **Batman: Arkham Asylum** (DirectX 9 → wined3d/OpenGL, 32-bit; a sound issue is still open)

Newer games such as Elden Ring and RDR2 are on hold for now.

## Roadmap

| Task | Status |
|---|---|
| Install Wine and open a Windows program from the terminal | Done |
| Hook D3DMetal from Apple's Game Porting Toolkit into Wine | Done |
| Install Windows Steam inside a prefix and run a DirectX game | Done |
| Compile Wine (CrossOver 26.3) from source and add my own patches | Done |
| My own SwiftUI launcher: game list, one-click launch, settings | In progress |
| New games: Elden Ring, RDR2, Batman: Arkham Knight… | On hold |

## Try it yourself

You need an Apple Silicon Mac with macOS 15 or later. The step-by-step setup is in [docs/KURULUM.md](https://github.com/oktubedirhan/kopru/blob/main/docs/KURULUM.md) (in Turkish).
