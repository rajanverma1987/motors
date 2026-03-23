/**
 * CM “best match” combinations (±10% of target circular mils).
 * Max 3 wire sizes per combination; respects min/max total conductor count.
 * No persistence — compute only.
 *
 * @param {{ size: string, cm: number }[]} wires - selected wires with circular mils as `cm`
 * @param {number} targetedCM
 * @param {number} minWires
 * @param {number} maxWires
 * @returns {object[]} sorted by cmDifference ascending
 */
export function calculateCMBestMatch(wires, targetedCM, minWires, maxWires) {
  const results = [];
  const seen = new Set();

  if (!Array.isArray(wires) || wires.length === 0) return results;
  if (!Number.isFinite(targetedCM) || targetedCM <= 0) return results;
  if (!Number.isFinite(minWires) || !Number.isFinite(maxWires) || minWires < 1 || maxWires < minWires) {
    return results;
  }

  const low = targetedCM * 0.9;
  const high = targetedCM * 1.1;

  // One wire type
  for (let a = 0; a < wires.length; a++) {
    const w1 = wires[a];
    if (!w1?.cm || w1.cm <= 0) continue;
    for (let i = 0; i <= maxWires; i++) {
      const t1 = i * w1.cm;
      if (t1 > high) break;
      if (i >= minWires && t1 >= low && t1 <= high) {
        push(results, seen, { w1, i, j: 0, k: 0, total: t1, targetedCM });
      }
    }
  }

  // Two distinct wire types
  for (let a = 0; a < wires.length; a++) {
    for (let b = 0; b < wires.length; b++) {
      if (b === a) continue;
      const w1 = wires[a];
      const w2 = wires[b];
      if (!w1?.cm || !w2?.cm || w1.cm <= 0 || w2.cm <= 0) continue;
      for (let i = 0; i <= maxWires; i++) {
        let t1 = i * w1.cm;
        if (t1 > high) break;
        for (let j = 0; j <= maxWires - i; j++) {
          let t2 = t1 + j * w2.cm;
          if (t2 > high) break;
          if (i + j >= minWires && t2 >= low && t2 <= high) {
            push(results, seen, { w1, w2, i, j, k: 0, total: t2, targetedCM });
          }
        }
      }
    }
  }

  // Three distinct wire types (original nested structure)
  if (wires.length >= 3) {
    for (let a = 0; a < wires.length; a++) {
      for (let b = 0; b < wires.length; b++) {
        if (b === a) continue;
        for (let c = 0; c < wires.length; c++) {
          if (c === a || c === b) continue;
          const w1 = wires[a];
          const w2 = wires[b];
          const w3 = wires[c];
          if (!w1?.cm || !w2?.cm || !w3?.cm || w1.cm <= 0 || w2.cm <= 0 || w3.cm <= 0) continue;

          for (let i = 0; i <= maxWires; i++) {
            let t1 = i * w1.cm;
            if (t1 > high) break;

            if (i >= minWires && t1 >= low && t1 <= high) {
              push(results, seen, { w1, w2: null, w3: null, i, j: 0, k: 0, total: t1, targetedCM });
            }

            for (let j = 0; j <= maxWires - i; j++) {
              let t2 = i * w1.cm + j * w2.cm;
              if (t2 > high) break;

              if (i + j >= minWires && t2 >= low && t2 <= high) {
                push(results, seen, { w1, w2, w3: null, i, j, k: 0, total: t2, targetedCM });
              }

              for (let k = Math.max(0, minWires - i - j); k <= maxWires - i - j; k++) {
                let t3 = i * w1.cm + j * w2.cm + k * w3.cm;
                if (t3 >= low && t3 <= high) {
                  push(results, seen, { w1, w2, w3, i, j, k, total: t3, targetedCM });
                }
              }
            }
          }
        }
      }
    }
  }

  return results.sort((a, b) => a.cmDifference - b.cmDifference);
}

function push(results, seen, d) {
  const wires = [];
  if (d.i > 0) wires.push({ size: d.w1.size, qty: d.i });
  if (d.j > 0 && d.w2) wires.push({ size: d.w2.size, qty: d.j });
  if (d.k > 0 && d.w3) wires.push({ size: d.w3.size, qty: d.k });

  if (wires.length === 0) return;

  const key = wires
    .map((w) => `${w.size}-${w.qty}`)
    .sort()
    .join("|");
  if (seen.has(key)) return;
  seen.add(key);

  const wiresInHand = wires.reduce((s, w) => s + w.qty, 0);

  const percentDifference = ((d.total - d.targetedCM) / d.targetedCM) * 100;

  let noOfWires = 1;
  wires.forEach(() => {
    noOfWires += 2;
  });

  const row = {
    totalCM: d.total,
    targetedCM: d.targetedCM,
    wiresInHand,
    percentDifference: Number(percentDifference.toFixed(2)),
    cmDifference: Math.abs(d.total - d.targetedCM),
    noOfWires,
  };

  wires.forEach((w, idx) => {
    row[`wireSize${idx + 1}`] = w.size;
    row[`wires${idx + 1}`] = w.qty;
  });

  results.push(row);
}
