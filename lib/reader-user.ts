import { headers } from 'next/headers';
// This Site is owner-private. Its platform gateway authenticates the visitor.
// A stable owner key keeps progress independent of optional identity headers.
export async function getReaderUser() {
  const h=await headers();
  if(!h.get('oai-authenticated-user-email'))return null;
  return {userId:'owner'};
}
