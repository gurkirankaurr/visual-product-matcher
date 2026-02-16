export function cosineSimilarity(vecA, vecB) {
  let dot = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }

  return dot; // vectors already normalized
}
