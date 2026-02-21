import ContractDetailPage from './ContractDetailClient';

export function generateStaticParams() {
  return [{ id: '0' }];
}

export default function Page() {
  return <ContractDetailPage />;
}
