#!/usr/bin/env node
"use strict";

import { resolve } from "node:path";

import parseArgs from "yargs-parser";

import { sketchToIcon } from "./index.js";
import { readFile, writeFile } from "node:fs/promises";

class UsageError extends Error {}
const usage = `
Usage: freecad-sketch-to-icon [...args]

	--input <path> | -i <path>
		The svg file that was exported from FreeCAD as a "Flattened SVG".
		This argument is required.

	--output <path> | -o <path>
		The path to store the normalized and optimized svg icon.
		This argument is required.

	--exported-padding-factor <factor>
		The padding factor that was used by FreeCAD.
		Default is 0.01

	--fill <color>
		The fill color to use.
		Default is "currentColor".

	--fill-rule <rule>
		The fill rule to use.
		Default is "evenodd".

	--precision <digits>
		The maximum number of floating point digits to use.
		Default is 5.
`.replace(/\t/g, "  ");

(async () => {
	const args = parseArgs(process.argv.slice(2), {
		string: [
			"input",
			"output",
			"fill",
			"fill-rule",
		],
		number: [
			"exported-padding-factor",
			"precision",
		],
		alias: {
			input: "i",
			output: "o",
		},
	});

	if (!args.input) {
		throw new UsageError("--input or -i is required");
	}
	const inputFilename = resolve(args.input);

	if (!args.output) {
		throw new UsageError("--output or -o is required");
	}
	const outputFilename = resolve(args.output);

	const input = await readFile(inputFilename, "utf-8");
	const output = sketchToIcon({
		input,
		exportedPaddingFactor: args.exportedPaddingFactor,
		fill: args.fill,
		fillRule: args.fillRule,
		precision: args.precision,
	});

	await writeFile(outputFilename, output);
})().catch(error => {
	if (error instanceof UsageError) {
		console.error(error.message);
		console.error(usage);
		process.exit(2);
	} else {
		console.error(error);
		process.exit(1);
	}
});
