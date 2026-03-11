/**
 * Convert Clerk ID (string) to numeric ID
 * Uses a hash function to generate consistent numeric IDs from string IDs
 */
export function clerkIdToNumber(clerkId: string): number {
  // Simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < clerkId.length; i++) {
    const char = clerkId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Return absolute value to ensure positive number
  return Math.abs(hash);
}

/**
 * Get numeric ID from either Clerk ID or custom ID
 */
export function getNumericId(id: string | number): number {
  if (typeof id === 'number') {
    return id;
  }
  
  // If it's already a numeric string, parse it
  const parsed = parseInt(id);
  if (!isNaN(parsed) && parsed.toString() === id) {
    return parsed;
  }
  
  // Otherwise, convert Clerk ID to number
  return clerkIdToNumber(id);
}

/**
 * Get student ID that works with both systems
 * Returns both string and numeric versions
 */
export function getStudentIds(id: string | number) {
  const stringId = id.toString();
  const numericId = getNumericId(id);
  
  return {
    stringId,
    numericId,
    originalId: id
  };
}
