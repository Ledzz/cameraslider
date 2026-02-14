import {useEffect, useState} from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { PositionMode } from '@/components/modes/PositionMode';
import { VelocityMode } from '@/components/modes/VelocityMode';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import {useSliderStore, ActiveMode, autoConnect, setActiveMode} from '@/store/sliderStore';

const Index = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    autoConnect();
  }, []);

  const error  = useSliderStore(s => s.error);
  const activeMode  = useSliderStore(s => s.activeMode);

  return (
    <div className="min-h-screen bg-background technical-grid">
      <Header onSettingsClick={() => setSettingsOpen(true)} />

      <main className="container max-w-lg mx-auto px-4 py-4">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {error}
          </div>
        )}

        <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as ActiveMode)}>
          <TabsList className="bg-secondary w-full mb-4">
            <TabsTrigger value="position" className="flex-1 text-xs">
              Position
            </TabsTrigger>
            <TabsTrigger value="velocity" className="flex-1 text-xs">
              Velocity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="position" className="mt-0">
            <PositionMode />
          </TabsContent>

          <TabsContent value="velocity" className="mt-0">
            <VelocityMode />
          </TabsContent>
        </Tabs>
      </main>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Index;
