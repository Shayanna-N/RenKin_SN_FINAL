import { AccountView } from '@/components/account/account-view'

export const metadata = { title: 'Account & sync · RenKin' }

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams
  return <AccountView welcome={welcome === '1'} />
}
