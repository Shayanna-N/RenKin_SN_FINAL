'use client'

import { useStore } from '@/lib/store'
import { PageHeader } from '@/components/page-header'
import { DigitalCard } from '@/components/digital-card'
import { ModeSwitcher } from '@/components/mode-switcher'
import { CardEditor } from '@/components/card/card-editor'
import { Appearance } from '@/components/card/appearance'
import { CompanionCustomizer } from '@/components/card/companion-customizer'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ContactChannelRecommender } from '@/components/card/contact-channel-recommender'
import { CreditCard, Smile, Sparkles } from 'lucide-react'

export default function CardPage() {
  const { state } = useStore()

  return (
    <>
      <PageHeader title="My card" description="One living card that adapts to how you're networking right now." />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-3">
            <DigitalCard
              profile={state.profile}
              mode={state.settings.mode}
              style={state.settings.cardStyle}
              companion={state.settings.companion}
              className="mx-auto max-w-md"
            />
            <div className="flex justify-center">
              <ModeSwitcher />
            </div>
          </div>

          {/* Tabbed widget: Card details (1) + Companion & Profile Customization (2) */}
          <div className="overflow-hidden rounded-2xl border bg-card">
            <Tabs defaultValue="card-details">
              <div className="border-b px-5 pt-3">
                <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="card-details" className="flex-1 gap-1.5 sm:flex-none">
                      <CreditCard className="size-4" aria-hidden />
                      Card details
                    </TabsTrigger>
                    <TabsTrigger value="companion" className="flex-1 gap-1.5 sm:flex-none">
                      <Smile className="size-4" aria-hidden />
                      Companion
                    </TabsTrigger>
                    <TabsTrigger value="channels" className="flex-1 gap-1.5 sm:flex-none">
                      <Sparkles className="size-4" aria-hidden />
                      Channels
                    </TabsTrigger>
                  </TabsList>
              </div>
              <TabsContent value="card-details" className="p-5 md:p-6">
                {/* Strip the outer section wrapper — we're already inside the card */}
                <CardEditor embedded />
              </TabsContent>
              <TabsContent value="companion" className="p-5 md:p-6">
                <CompanionCustomizer embedded />
              </TabsContent>
              <TabsContent value="channels" className="p-5 md:p-6">
                <ContactChannelRecommender />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Appearance />
        </div>
      </div>
    </>
  )
}
