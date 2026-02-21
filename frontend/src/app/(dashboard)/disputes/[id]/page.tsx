import DisputeDetailPage from './DisputeDetailClient';

export function generateStaticParams() {
  return [{ id: '0' }];
}

export default function Page() {
  return <DisputeDetailPage />;
}
