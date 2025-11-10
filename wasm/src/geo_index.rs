use wasm_bindgen::prelude::*;
use geo_index::rtree::sort::HilbertSort;
use geo_index::rtree::{RTree, RTreeBuilder, RTreeIndex};

fn build_spatial_index(xs: &[f64], ys: &[f64], widths: &[f64], heights: &[f64]) -> RTree<f64> {
    let len = xs.len();
    let mut builder = RTreeBuilder::new(len as u32);
    for i in 0..len {
        let min_x = xs[i];
        let min_y = ys[i];
        let max_x = xs[i] + widths[i];
        let max_y = ys[i] + heights[i];
        builder.add(min_x, min_y, max_x, max_y);
    }
    builder.finish::<HilbertSort>()
}

#[wasm_bindgen]
pub fn geo_index(xs: &mut [f64], ys: &mut [f64], widths: &mut [f64], heights: &mut [f64], moveds: &mut [u8], max_iterations: u32, overlap_threshold: f64) -> u32 {
    let len = xs.len();
    let mut num_iterations = 0;

    // Build initial spatial index from current box positions
    let mut tree = build_spatial_index(xs, ys, widths, heights);

    loop {
        let mut moved = false;

        // For each box, find potential collisions using spatial search
        for i in 0..len {
            let min_x = xs[i];
            let min_y = ys[i];
            let max_x = xs[i] + widths[i];
            let max_y = ys[i] + heights[i];

            // Search for boxes that might overlap with this box
            let candidate_indices = tree.search(min_x, min_y, max_x, max_y);

            for &j_u32 in candidate_indices.iter() {
                let j = j_u32 as usize;
                // Skip self
                if i == j {
                    continue;
                }

                // Calculate center positions
                let center_a_x = xs[i] + widths[i] * 0.5;
                let center_a_y = ys[i] + heights[i] * 0.5;
                let center_b_x = xs[j] + widths[j] * 0.5;
                let center_b_y = ys[j] + heights[j] * 0.5;

                // Calculate distance between centers
                let dx = center_a_x - center_b_x;
                let dy = center_a_y - center_b_y;

                // Calculate overlap along each axis
                let px = (widths[i] + widths[j]) * 0.5 - dx.abs();
                let py = (heights[i] + heights[j]) * 0.5 - dy.abs();

                // Check if there's significant overlap
                if px > overlap_threshold && py > overlap_threshold {
                    moved = true;
                    moveds[i] = 1;
                    moveds[j] = 1;

                    // Resolve along the smallest overlap axis
                    if px < py {
                        // Move along x-axis
                        let sx = if dx > 0.0 { 1.0 } else { -1.0 };
                        let move_amount = px * 0.5 * sx;

                        xs[i] += move_amount;
                        xs[j] -= move_amount;
                    } else {
                        // Move along y-axis
                        let sy = if dy > 0.0 { 1.0 } else { -1.0 };
                        let move_amount = py * 0.5 * sy;

                        ys[i] += move_amount * sy;
                        ys[j] -= move_amount * sy;
                    }
                }
            }
        }

        // Increment iteration count (this iteration completed)
        num_iterations += 1;

        // Early exit if no overlaps were found
        if !moved {
            break;
        }

        // Rebuild spatial index after moving boxes for next iteration
        tree = build_spatial_index(xs, ys, widths, heights);

        // Check if we've reached the maximum iterations (unless infinite)
        if num_iterations >= max_iterations {
            break;
        }
    }

    num_iterations
}

