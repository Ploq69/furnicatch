/**
 * AtlasMipmapGenerator — generates tile-boundary-respecting mipmaps for a
 * zero-padding texture atlas. Each tile is downsampled independently so
 * neighbouring atlas tiles never bleed into one another.
 */

/**
 * Generate custom mipmaps for an atlas image.
 *
 * @param {HTMLImageElement} image — the loaded atlas image
 * @param {number} tileSize — tile width/height in pixels (default 64)
 * @returns {HTMLCanvasElement[]} — array of canvases, one per mipmap level.
 *   Index 0 is a canvas of the original image; subsequent indices are
 *   progressively halved dimensions suitable for THREE.Texture.mipmaps.
 */
export function generateTileAwareMipmaps(image, tileSize = 64) {
  const atlasW = image.naturalWidth || image.width;
  const atlasH = image.naturalHeight || image.height;

  if (atlasW % tileSize !== 0 || atlasH % tileSize !== 0) {
    console.warn(
      `[AtlasMipmapGenerator] Atlas dimensions (${atlasW}x${atlasH}) are not multiples of tileSize (${tileSize}).`
    );
  }

  const maxLevel = Math.floor(Math.log2(Math.min(atlasW, atlasH)));
  const mipmaps = [];

  // Level 0: draw original image to a canvas (THREE.Texture expects this format)
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = atlasW;
  baseCanvas.height = atlasH;
  const baseCtx = baseCanvas.getContext('2d');
  baseCtx.drawImage(image, 0, 0);
  mipmaps.push(baseCanvas);

  // Previous level pixel data for CPU downsampling
  let prevData = baseCtx.getImageData(0, 0, atlasW, atlasH).data;
  let prevW = atlasW;
  let prevH = atlasH;

  const tilesX = Math.floor(atlasW / tileSize);
  const tilesY = Math.floor(atlasH / tileSize);

  for (let level = 1; level <= maxLevel; level++) {
    const w = atlasW >> level;
    const h = atlasH >> level;
    const tileSizeLevel = tileSize >> level;

    const data = new Uint8ClampedArray(w * h * 4);

    if (tileSizeLevel >= 1) {
      // Per-tile downsampling — no cross-tile bleeding
      const prevTileSize = tileSize >> (level - 1);
      for (let ty = 0; ty < tilesY; ty++) {
        for (let tx = 0; tx < tilesX; tx++) {
          const srcTileX = tx * prevTileSize;
          const srcTileY = ty * prevTileSize;
          const dstTileX = tx * tileSizeLevel;
          const dstTileY = ty * tileSizeLevel;

          for (let py = 0; py < tileSizeLevel; py++) {
            for (let px = 0; px < tileSizeLevel; px++) {
              const baseX = srcTileX + px * 2;
              const baseY = srcTileY + py * 2;

              let r = 0, g = 0, b = 0, a = 0, count = 0;
              for (let dy = 0; dy < 2; dy++) {
                for (let dx = 0; dx < 2; dx++) {
                  const sx = baseX + dx;
                  const sy = baseY + dy;
                  if (sx < prevW && sy < prevH) {
                    const idx = (sy * prevW + sx) * 4;
                    r += prevData[idx];
                    g += prevData[idx + 1];
                    b += prevData[idx + 2];
                    a += prevData[idx + 3];
                    count++;
                  }
                }
              }

              const outX = dstTileX + px;
              const outY = dstTileY + py;
              if (outX < w && outY < h) {
                const outIdx = (outY * w + outX) * 4;
                data[outIdx] = count ? Math.round(r / count) : 0;
                data[outIdx + 1] = count ? Math.round(g / count) : 0;
                data[outIdx + 2] = count ? Math.round(b / count) : 0;
                data[outIdx + 3] = count ? Math.round(a / count) : 0;
              }
            }
          }
        }
      }
    } else {
      // Tile size dropped below 1 pixel — do a simple global 2×2 downsample.
      // At these tiny resolutions any cross-tile bleeding is imperceptible.
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let r = 0, g = 0, b = 0, a = 0, count = 0;
          for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              const sx = x * 2 + dx;
              const sy = y * 2 + dy;
              if (sx < prevW && sy < prevH) {
                const idx = (sy * prevW + sx) * 4;
                r += prevData[idx];
                g += prevData[idx + 1];
                b += prevData[idx + 2];
                a += prevData[idx + 3];
                count++;
              }
            }
          }
          const outIdx = (y * w + x) * 4;
          data[outIdx] = count ? Math.round(r / count) : 0;
          data[outIdx + 1] = count ? Math.round(g / count) : 0;
          data[outIdx + 2] = count ? Math.round(b / count) : 0;
          data[outIdx + 3] = count ? Math.round(a / count) : 0;
        }
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(data, w, h), 0, 0);
    mipmaps.push(canvas);

    prevData = data;
    prevW = w;
    prevH = h;
  }

  return mipmaps;
}
