This package provides an API or CLI to clean up and minimize a FreeCAD sketch that was exported as a "Flattened SVG" for use as an icon.

```bash
npm i -g @mpt/freecad-sketch-to-icon

# Example CLI usage:
freecad-sketch-to-icon -i ./input.svg -o ./output.svg
```

```js
// Example API usage:
import { sketchToIcon } from "@mpt/freecad-sketch-to-icon";

const output = sketchToIcon({
  input: await readFile("./input.svg"),
});
```

## Changelog

### **1.1.x**
+ Add support for `<circle>` elements.
