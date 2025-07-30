async function handler() {
  return null;
}
export async function POST(request) {
  return handler(await request.json());
}