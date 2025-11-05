use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn naive(xs: &mut [f64], ys: &mut [f64], widths: &mut [f64], heights: &mut [f64], moveds: &mut [u8], iterations: u32, overlap_threshold: f64) -> u32 {
        let len = xs.len();
        let mut num_iterations = 0;
        let max_iterations = iterations;
        let is_infinite = iterations == u32::MAX;

        loop {
            let mut moved = false;

            // Check all pairs for collisions (O(n²))
            for i in 0..len {
                for j in (i + 1)..len {
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
                            let move_amount = px * 0.5;

                            xs[i] += move_amount * sx;
                            xs[j] -= move_amount * sx;
                        } else {
                            // Move along y-axis
                            let sy = if dy > 0.0 { 1.0 } else { -1.0 };
                            let move_amount = py * 0.5;

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

            // Check if we've reached the maximum iterations (unless infinite)
            if !is_infinite && num_iterations >= max_iterations {
                break;
            }
        }

    num_iterations
}