use wasm_bindgen::prelude::*;

/// Collision resolution state using Struct of Arrays (SoA) layout
/// for optimal cache performance
#[wasm_bindgen]
pub struct CollisionState {
    xs: Vec<f64>,
    ys: Vec<f64>,
    widths: Vec<f64>,
    heights: Vec<f64>,
    moved: Vec<u8>, // 0 = false, 1 = true (wasm-bindgen doesn't support Vec<bool>)
}

#[wasm_bindgen]
impl CollisionState {
    /// Create a new collision state from flat arrays
    #[wasm_bindgen(constructor)]
    pub fn new(
        xs: Vec<f64>,
        ys: Vec<f64>,
        widths: Vec<f64>,
        heights: Vec<f64>,
    ) -> Self {
        let len = xs.len();
        Self {
            xs,
            ys,
            widths,
            heights,
            moved: vec![0; len], // 0 = not moved
        }
    }

    /// Resolve collisions using iterative separation
    /// Returns the actual number of iterations used
    /// Note: iterations parameter can be u32::MAX to represent Infinity
    #[wasm_bindgen]
    pub fn resolve(
        &mut self,
        iterations: u32,
        overlap_threshold: f64,
    ) -> u32 {
        let len = self.xs.len();
        let mut num_iterations = 0;
        let max_iterations = iterations;
        let is_infinite = iterations == u32::MAX;

        loop {
            let mut moved = false;
            // Note: We don't reset moved flags here - they accumulate across iterations
            // This matches the TypeScript behavior where box.moved stays true once set

            // Check all pairs for collisions (O(n²))
            for i in 0..len {
                for j in (i + 1)..len {
                    // Calculate center positions
                    let center_a_x = self.xs[i] + self.widths[i] * 0.5;
                    let center_a_y = self.ys[i] + self.heights[i] * 0.5;
                    let center_b_x = self.xs[j] + self.widths[j] * 0.5;
                    let center_b_y = self.ys[j] + self.heights[j] * 0.5;

                    // Calculate distance between centers
                    let dx = center_a_x - center_b_x;
                    let dy = center_a_y - center_b_y;

                    // Calculate overlap along each axis
                    let px = (self.widths[i] + self.widths[j]) * 0.5 - dx.abs();
                    let py = (self.heights[i] + self.heights[j]) * 0.5 - dy.abs();

                    // Check if there's significant overlap
                    if px > overlap_threshold && py > overlap_threshold {
                        moved = true;

                        // Resolve along the smallest overlap axis
                        if px < py {
                            // Move along x-axis
                            let sx = if dx > 0.0 { 1.0 } else { -1.0 };
                            let move_amount = px * 0.5;

                            self.xs[i] += move_amount * sx;
                            self.xs[j] -= move_amount * sx;
                            self.moved[i] = 1;
                            self.moved[j] = 1;
                        } else {
                            // Move along y-axis
                            let sy = if dy > 0.0 { 1.0 } else { -1.0 };
                            let move_amount = py * 0.5;

                            self.ys[i] += move_amount * sy;
                            self.ys[j] -= move_amount * sy;
                            self.moved[i] = 1;
                            self.moved[j] = 1;
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

    /// Get the x positions (returns a copy)
    #[wasm_bindgen(getter)]
    pub fn xs(&self) -> Vec<f64> {
        self.xs.clone()
    }

    /// Get the y positions (returns a copy)
    #[wasm_bindgen(getter)]
    pub fn ys(&self) -> Vec<f64> {
        self.ys.clone()
    }

    /// Get the moved flags (returns a copy)
    /// Returns Vec<u8> where 0 = false, 1 = true
    #[wasm_bindgen(getter)]
    pub fn moved(&self) -> Vec<u8> {
        self.moved.clone()
    }
}
