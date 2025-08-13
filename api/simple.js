export function GET() {
  return new Response('Hello from Vercel!', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}