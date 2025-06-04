// Simulated database
let leaderboard = [];

export async function POST(request) {
  const { user, score } = await request.json();
  
  // Anti-cheat: Basic score validation
  if (typeof score !== 'number' || score > 1000000) {
    return new Response('Invalid score', { status: 400 });
  }

  leaderboard.push({ user, score, timestamp: Date.now() });
  leaderboard = leaderboard
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);

  return new Response(JSON.stringify(leaderboard));
}
