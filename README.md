# Minefield Insight

Minesweeper game with:
- Standard grid sizes (Beginner 9x9 with 10 mines, Intermediate 16x16 with 40 mines, Expert 30x16 with 99 mines) plus Custom size allowing the player to specify grid width, height, and number of mines.
- Classic gameplay: left click reveals a tile, right click flags it as a mine, second right click marks as unknown (?).
- Mobile / touch controls: long press to flag.
- First click guarantee: opening cascade (safe 3x3 zone around the first clicked tile guaranteed to have zero mines).
- Learn Mode toggle: when enabled, unrevealed blocks change color based on the exact probability of a mine being there, on a color scale from green (0% probability / guaranteed safe) to red (100% probability / guaranteed mine).
- Dynamic probability readout: render the percentage text directly inside the cell if the cell is large enough to display it comfortably, otherwise show via tooltip / hover.
- Exact probability calculation: constraint satisfaction solver dividing boundary tiles into independent connected components, evaluating valid configurations weighted combinatorially against remaining hidden interior mines, and calculating uniform background probability for floating interior tiles.
- Clean, responsive UI with game timer, mine counter, reset smiley/button, and smooth visual feedback.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/566ed658-4911-4780-80a4-7da904fabb5f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
