import { permanentRedirect } from 'next/navigation';

export default function Page() {
  permanentRedirect('/terms-of-service/');
}
