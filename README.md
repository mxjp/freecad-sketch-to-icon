# `@mpt/freecad-sketch-to-icon`
This package provides an API or CLI to clean up and minimize a FreeCAD sketch that was exported as a "Flattened SVG" for use as an icon.

## API
```js
import { sketchToIcon } from "@mpt/freecad-sketch-to-icon";

const output = sketchToIcon({
  input: await readFile("./input.svg"),
});
```

## CLI
```bash
npm i -g @mpt/freecad-sketch-to-icon

freecad-sketch-to-icon -i ./input.svg -o ./output.svg
```
