/* eslint-disable */
// @ts-nocheck
import { getPayloadClient } from '../../../../lib/payload'

export async function GET(req: Request) {
  const payload = await getPayloadClient()
  return new Response(JSON.stringify({ message: 'Payload API' }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(req: Request) {
  return GET(req)
}

export { POST as PUT, POST as PATCH, POST as DELETE }
