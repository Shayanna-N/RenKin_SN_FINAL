import { Suspense } from 'react'
import { PageHeader } from '@/components/page-header'
import { ContactsView } from '@/components/contacts/contacts-view'

export default function ContactsPage() {
  return (
    <>
      <PageHeader title="Contacts" description="Every connection with the who, what and why already filled in." />
      <Suspense>
        <ContactsView />
      </Suspense>
    </>
  )
}
