import Reader from './reader';
import { requireChatGPTUser } from './chatgpt-auth';
export const dynamic = 'force-dynamic';
async function AuthenticatedReader() {
  await requireChatGPTUser('/');
  return <Reader />;
}
export default function Home() { return <AuthenticatedReader />; }
