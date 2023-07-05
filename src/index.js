"use strict";

import { parseFragment } from "parse5";

/**
 * @typedef {{
 *   translate: [number, number],
 *   scale: [number, number],
 * }} TransformContext
 */

/**
 * Convert an svg that was exported from FreeCAD as a "Flattened SVG" to a normalized and optimized svg for use as an icon.
 *
 * @param {Object} options
 * @param {string} options.input The svg file content that was exported from FreeCAD as a "Flattened SVG".
 * @param {number} options.exportedPaddingFactor The padding used by FreeCAD during export as a factor. Default is 0.01.
 * @param {string} options.fill The fill color to use. Default is `"currentColor"`.
 * @param {string} options.fillRule The fill rule to use. Default is `"evenodd"`.
 * @param {number} options.precision The maximum number of floating point digits to use. Default is 5.
 *
 * @returns {string} The normalized and optimized svg code.
 */
export function sketchToIcon(options) {
	const tree = parseFragment(options.input);
	const precision = options.precision ?? 5;

	const root = (
		/**
		 * @param {import("parse5/dist/tree-adapters/default").Element} node
		 */
		function findRoot(node) {
			if (node.nodeName === "svg") return node;
			if (node.childNodes) {
				for (const child of node.childNodes) {
					const result = findRoot(child);
					if (result) return result;
				}
			}
		}
	)(tree);

	if (!root) {
		throw new Error(`input svg does not contain an <svg> element`);
	}

	const exportedPaddingFactor = options.exportedPaddingFactor ?? 0.01;
	const viewBoxStr = getAttrValue(root, "viewBox");
	if (!viewBoxStr) {
		throw new Error(`<svg> element does not have a viewBox attribute`);
	}
	const viewBoxParts = viewBoxStr.split(" ");
	const width = Number.parseFloat(viewBoxParts[2]) / (1 + exportedPaddingFactor * 2);
	const height = Number.parseFloat(viewBoxParts[3]) / (1 + exportedPaddingFactor * 2);
	const xOffset = Number.parseFloat(viewBoxParts[0]) - width * exportedPaddingFactor;
	const yOffset = Number.parseFloat(viewBoxParts[1]) - height * exportedPaddingFactor;
	if ([xOffset, yOffset, width, height].some(Number.isNaN, Number)) {
		throw new Error(`<svg> element has an invalid viewBox attribute`);
	}

	/** @type {string[]} */
	const paths = [];
	(
		/**
		 * @param {import("parse5/dist/tree-adapters/default").Element} node
		 * @param {TransformContext} context
		 */
		function extractPaths(node, context) {
			const style = getAttrValue(node, "style");
			if (style?.includes("transform")) {
				throw new Error("style transforms are currently not supported");
			}

			const transform = getAttrValue(node, "transform");
			const tfrx = /([a-z]+)\(([^\)]*)\)/g;
			for (let match = tfrx.exec(transform); match; match = tfrx.exec(transform)) {
				const parts = match[2].split(",");
				switch (match[1]) {
					case "translate": {
						if (parts.length !== 2) {
							throw new Error(`invalid translate parameters: ${JSON.stringify(match[2])}`);
						}
						context = {
							...context,
							translate: [
								context.scale[0] * Number.parseFloat(parts[0].trim()) + context.translate[0],
								context.scale[1] * Number.parseFloat(parts[1].trim()) + context.translate[1],
							],
						};
					} break;

					case "scale": {
						if (parts.length !== 2) {
							throw new Error(`invalid translate parameters: ${JSON.stringify(match[2])}`);
						}
						context = {
							...context,
							scale: [
								context.scale[0] * Number.parseFloat(parts[0].trim()),
								context.scale[1] * Number.parseFloat(parts[1].trim()),
							],
						};
					} break;

					default: throw new Error(`transform command "${match[1]}" is currently not supported`);
				}
			}

			switch (node.nodeName) {
				case "rect":
				case "circle":
				case "ellipse":
				case "line":
				case "polyline":
					throw new Error(`<${node.nodeName}> is currently not supported`);

				case "path": {
					const data = getAttrValue(node, "d");
					if (data) {
						paths.push(normalizePathData(data, context, precision));
					}
				} break;
			}

			node.childNodes?.forEach(c => extractPaths(c, context));
		}
	)(root, {
		translate: [xOffset, yOffset],
		scale: [1, 1],
	});

	const fill = options.fill ?? "currentColor";
	const fillRule = options.fillRule ?? "evenodd";

	return `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${width} ${height}"><path d="${paths.join(" ")}" fill="${fill}" fill-rule="${fillRule}" /></svg>`;
}

/**
 * @param {import("parse5/dist/tree-adapters/default").Element} node
 * @param {string} name
 */
function getAttrValue(node, name) {
	return node.attrs?.find(attr => attr.name === name)?.value;
}

/**
 * @param {string} data
 * @param {TransformContext} context
 * @param {number} precision
 */
function normalizePathData(data, context, precision) {
	const { translate, scale } = context;
	const invertArcs = scale[0] * scale[1] < 0;

	return data
		// Add spaces between values and following path commands:
		.replace(/([^a-z]+)([a-z])/ig, "$1 $2")
		// Collapse whitespace:
		.replace(/\s\s+/g, " ")
		// Apply transforms:
		.replace(/[a-z][^a-z]+/ig, command => {
			const parts = command.split(" ");
			switch (parts[0]) {
				case "M":
				case "L": {
					parts[1] = Number.parseFloat(parts[1]) * scale[0] + translate[0];
					parts[2] = Number.parseFloat(parts[2]) * scale[1] + translate[1];
				} break;

				case "A": {
					parts[1] = Number.parseFloat(parts[1]) * scale[0];
					parts[2] = Number.parseFloat(parts[2]) * scale[1];
					if (invertArcs) {
						parts[3] = Number.parseFloat(parts[3]) * -1;
						parts[5] = Number.parseFloat(parts[5]) === 1 ? "0" : "1";
					}
					parts[6] = Number.parseFloat(parts[6]) * scale[0] + translate[0];
					parts[7] = Number.parseFloat(parts[7]) * scale[1] + translate[1];
				} break;

				default: throw new Error(`path command "${parts[0]}" is currently not supported`);
			}
			return parts.join(" ");
		})
		// Apply precision limit:
		.replace(/(-?\d+)(\.\d+)/g, x => {
			return Number(Number(x).toFixed(precision));
		});
}
