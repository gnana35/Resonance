/**
 * layerThumb.ts
 *
 * Renders a single layer's data onto a small canvas for use as a thumbnail
 * in the Layers Panel. Does not use any React hooks.
 */

import type { Layer } from "@/context/DesignerContext";

export function renderLayerThumb(
  canvas: HTMLCanvasElement,
  layer: Layer,
  thumbW: number,
  thumbH: number,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Use layer's design dimensions as virtual canvas (approximate)
  const VW = 1200;
  const VH = 560;
  const scaleX = thumbW / VW;
  const scaleY = thumbH / VH;

  ctx.clearRect(0, 0, thumbW, thumbH);
  ctx.save();
  ctx.scale(scaleX, scaleY);

  for (const stroke of layer.data.strokes) {
    if (stroke.erase) continue;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    stroke.points.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    );
    ctx.stroke();
  }

  for (const shape of layer.data.shapes) {
    ctx.strokeStyle = shape.color;
    ctx.fillStyle = shape.color;
    ctx.lineWidth = shape.width;
    if (shape.kind === "rect") {
      if (shape.fill) ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
      else ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
    } else if (shape.kind === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(
        shape.x + shape.w / 2, shape.y + shape.h / 2,
        Math.abs(shape.w / 2), Math.abs(shape.h / 2),
        0, 0, Math.PI * 2
      );
      if (shape.fill) ctx.fill(); else ctx.stroke();
    }
  }

  for (const txt of layer.data.texts) {
    ctx.fillStyle = txt.color;
    ctx.font = `${txt.fontSize}px sans-serif`;
    ctx.fillText(txt.text, txt.x, txt.y + txt.fontSize);
  }

  ctx.restore();
}
