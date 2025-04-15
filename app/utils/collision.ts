import * as THREE from 'three';

/**
 * Checks if two spheres are colliding
 * @param sphere1Center Center position of the first sphere
 * @param sphere1Radius Radius of the first sphere
 * @param sphere2Center Center position of the second sphere
 * @param sphere2Radius Radius of the second sphere
 * @returns boolean indicating if the spheres are colliding
 */
export function didSpheresCollide(
  sphere1Center: THREE.Vector3,
  sphere1Radius: number,
  sphere2Center: THREE.Vector3,
  sphere2Radius: number
): boolean {
  // Create copies of the vectors to avoid reference issues
  const center1 = new THREE.Vector3().copy(sphere1Center);
  const center2 = new THREE.Vector3().copy(sphere2Center);
  
  // Calculate the distance between sphere centers
  const distance = center1.distanceTo(center2);
  
  // Spheres collide if the distance is less than or equal to the sum of their radii
  const collides = distance <= sphere1Radius + sphere2Radius;
  
  // Optional debug logging
  console.log(`Sphere collision check:
  Sphere 1: position(${center1.x.toFixed(2)}, ${center1.y.toFixed(2)}, ${center1.z.toFixed(2)}), radius: ${sphere1Radius}
  Sphere 2: position(${center2.x.toFixed(2)}, ${center2.y.toFixed(2)}, ${center2.z.toFixed(2)}), radius: ${sphere2Radius}
  Distance: ${distance.toFixed(2)}
  Sum of radii: ${(sphere1Radius + sphere2Radius).toFixed(2)}
  Collision: ${collides}`);
  
  return collides;
}
